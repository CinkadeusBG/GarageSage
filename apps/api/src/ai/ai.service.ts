import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '@garagesage/prisma';

const OLLAMA_HOST  = () => process.env.OLLAMA_HOST        ?? 'http://localhost:11434';
const CHAT_MODEL   = () => process.env.OLLAMA_MODEL       ?? 'phi4-mini';
const EMBED_MODEL  = () => process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
const CONTEXT_K    = 8;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Embedding ─────────────────────────────────────────────────────────────

  async embed(text: string): Promise<number[]> {
    try {
      const res = await fetch(`${OLLAMA_HOST()}/api/embeddings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model: EMBED_MODEL(), prompt: text }),
      });
      if (!res.ok) throw new Error(`Ollama embeddings error: ${res.status}`);
      const { embedding } = await res.json();
      return embedding as number[];
    } catch (err) {
      this.logger.warn(`Embedding failed: ${err}`);
      return [];
    }
  }

  // ─── Index a maintenance log for RAG ───────────────────────────────────────

  async indexMaintenanceLog(logId: string): Promise<void> {
    try {
      const log = await this.prisma.maintenanceLog.findUniqueOrThrow({
        where:   { id: logId },
        include: { vehicle: true },
      });

      const text = [
        `${log.vehicle.year} ${log.vehicle.make} ${log.vehicle.model}`,
        `Service: ${log.type}`,
        log.description ? `Notes: ${log.description}` : '',
        `Date: ${log.date.toISOString().slice(0, 10)}`,
        `Mileage: ${log.mileage}`,
        log.cost    ? `Cost: $${log.cost}` : '',
        log.shop    ? `Shop: ${log.shop}`  : '',
        log.tags?.length ? `Tags: ${log.tags.join(', ')}` : '',
      ].filter(Boolean).join('. ');

      const vector = await this.embed(text);
      if (!vector.length) return;

      await this.prisma.$executeRaw`
        UPDATE "MaintenanceLog"
        SET    embedding = ${`[${vector.join(',')}]`}::vector
        WHERE  id = ${logId}
      `;
      this.logger.debug(`Indexed log ${logId}`);
    } catch (err) {
      this.logger.warn(`Failed to index log ${logId}: ${err}`);
    }
  }

  // ─── RAG Chat ──────────────────────────────────────────────────────────────

  async chat(userId: string, question: string, vehicleIds?: string[]): Promise<string> {
    // 1. Get user's vehicle IDs (scope to specific vehicles if requested)
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        userId,
        isActive: true,
        ...(vehicleIds?.length ? { id: { in: vehicleIds } } : {}),
      },
      select: { id: true, make: true, model: true, year: true, currentMileage: true },
    });

    if (!vehicles.length) {
      return "You don't have any vehicles yet. Add a vehicle to get started!";
    }

    const ids = vehicles.map(v => v.id);

    // 2. Embed the question
    const qVector = await this.embed(question);

    // 3. Retrieve relevant maintenance logs via cosine similarity
    let contextLogs: Array<{
      date: Date; mileage: number; type: string;
      description: string | null; cost: number | null;
      shop: string | null; make: string; model: string; year: number;
    }> = [];

    if (qVector.length) {
      contextLogs = await this.prisma.$queryRaw`
        SELECT
          ml.date, ml.mileage, ml.type, ml.description, ml.cost, ml.shop,
          v.make, v.model, v.year
        FROM   "MaintenanceLog" ml
        JOIN   "Vehicle" v ON v.id = ml."vehicleId"
        WHERE  ml."vehicleId" = ANY(${ids}::text[])
          AND  ml.embedding IS NOT NULL
        ORDER BY ml.embedding <-> ${`[${qVector.join(',')}]`}::vector
        LIMIT  ${CONTEXT_K}
      `;
    } else {
      // Fallback: just grab recent logs if embedding unavailable
      const fallback = await this.prisma.maintenanceLog.findMany({
        where:   { vehicleId: { in: ids } },
        orderBy: { date: 'desc' },
        take:    CONTEXT_K,
        include: { vehicle: { select: { make: true, model: true, year: true } } },
      });
      contextLogs = fallback.map(l => ({
        date: l.date, mileage: l.mileage, type: l.type,
        description: l.description, cost: l.cost, shop: l.shop,
        make: l.vehicle.make, model: l.vehicle.model, year: l.vehicle.year,
      }));
    }

    // 4. Also pull recent fuel stats
    const fuelStats = await this.prisma.fuelLog.findMany({
      where:   { vehicleId: { in: ids }, mpg: { not: null } },
      orderBy: { date: 'desc' },
      take:    5,
      select:  { mpg: true, l100km: true, date: true, totalCost: true },
    });

    // 5. Build prompt context
    const vehicleSummary = vehicles
      .map(v => `- ${v.year} ${v.make} ${v.model} (${v.currentMileage.toLocaleString()} miles)`)
      .join('\n');

    const logContext = contextLogs.length
      ? contextLogs.map(r =>
          `  • ${r.date.toISOString().slice(0, 10)} | ${r.year} ${r.make} ${r.model} | ` +
          `${r.type} @ ${r.mileage.toLocaleString()} mi` +
          (r.cost    ? ` | $${r.cost.toFixed(2)}` : '') +
          (r.shop    ? ` | ${r.shop}`              : '') +
          (r.description ? ` | ${r.description}`  : ''),
        ).join('\n')
      : '  (no maintenance records found)';

    const fuelContext = fuelStats.length
      ? fuelStats.map(f =>
          `  • ${f.date.toISOString().slice(0, 10)}` +
          (f.mpg    ? ` | ${f.mpg.toFixed(1)} MPG`           : '') +
          (f.l100km ? ` | ${f.l100km.toFixed(1)} L/100km`    : '') +
          (f.totalCost ? ` | $${f.totalCost.toFixed(2)} fill` : ''),
        ).join('\n')
      : '  (no fuel records)';

    const systemPrompt = `You are GarageSage, a knowledgeable and friendly car maintenance assistant.
Answer questions based on the user's vehicle data below. Be concise and practical.
If the answer is not in the data, say so clearly — do not invent maintenance history.
Use plain text only (no markdown).

VEHICLES:
${vehicleSummary}

RELEVANT MAINTENANCE RECORDS:
${logContext}

RECENT FUEL RECORDS:
${fuelContext}`;

    // 6. Call Ollama chat API
    try {
      const res = await fetch(`${OLLAMA_HOST()}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:  CHAT_MODEL(),
          stream: false,
          options: { temperature: 0.3, num_predict: 512 },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: question },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Ollama chat error: ${res.status}`);
      const data = await res.json();
      return data.message?.content?.trim() ?? 'Sorry, I could not generate a response.';
    } catch (err) {
      this.logger.error(`Chat failed: ${err}`);
      return 'AI is currently unavailable. Make sure Ollama is running and a model is pulled.';
    }
  }

  // ─── Smart suggestions (auto-called on dashboard) ─────────────────────────

  async suggestions(userId: string): Promise<string[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where:   { userId, isActive: true },
      select:  { id: true, make: true, model: true, year: true, currentMileage: true },
    });
    if (!vehicles.length) return [];

    const ids = vehicles.map(v => v.id);

    const [recentLogs, overdueReminders] = await Promise.all([
      this.prisma.maintenanceLog.findMany({
        where:   { vehicleId: { in: ids } },
        orderBy: { date: 'desc' },
        take:    10,
        include: { vehicle: { select: { make: true, model: true, year: true, currentMileage: true } } },
      }),
      this.prisma.reminder.findMany({
        where: {
          vehicleId: { in: ids },
          status:    'ACTIVE',
          OR: [
            { nextDueDate:    { lte: new Date() } },
            { nextDueMileage: { lte: vehicles[0]?.currentMileage ?? 0 } },
          ],
        },
        include: { vehicle: { select: { make: true, model: true } } },
        take:    5,
      }),
    ]);

    const logSummary = recentLogs.map(l =>
      `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}: ${l.type} @ ${l.mileage.toLocaleString()} mi on ${l.date.toISOString().slice(0,10)}`
    ).join('\n');

    const overdueList = overdueReminders.map(r =>
      `${r.vehicle.make} ${r.vehicle.model}: ${r.title} (overdue)`
    ).join('\n');

    const prompt = `Based on this car maintenance data, give exactly 3 short, actionable suggestions (one sentence each). Return only a JSON array of strings, nothing else.

Recent maintenance:
${logSummary || 'none'}

Overdue reminders:
${overdueList || 'none'}`;

    try {
      const res = await fetch(`${OLLAMA_HOST()}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:  CHAT_MODEL(),
          stream: false,
          options: { temperature: 0.2, num_predict: 256 },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.message?.content?.trim() ?? '[]';
      // Strip any markdown fences if the model adds them
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  }

  // ─── Health check ──────────────────────────────────────────────────────────

  async ollamaStatus(): Promise<{ available: boolean; models: string[] }> {
    try {
      const res = await fetch(`${OLLAMA_HOST()}/api/tags`);
      if (!res.ok) return { available: false, models: [] };
      const data = await res.json();
      const models = (data.models ?? []).map((m: { name: string }) => m.name);
      return { available: true, models };
    } catch {
      return { available: false, models: [] };
    }
  }
}
