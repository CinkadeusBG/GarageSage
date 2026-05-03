import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { ButtonModule }   from 'primeng/button';
import { CardModule }     from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule }      from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface Message {
  role:    'user' | 'assistant';
  content: string;
  ts:      Date;
}

const STARTER_QUESTIONS = [
  'What maintenance is overdue on my vehicles?',
  'How much have I spent on oil changes this year?',
  'What is my average fuel efficiency?',
  'When should I rotate my tires next?',
  'Which vehicle has cost the most to maintain?',
];

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule, TagModule, ProgressSpinnerModule],
  template: `
    <div class="ai-page">
      <div class="ai-header">
        <div class="ai-title">
          <i class="pi pi-sparkles ai-icon"></i>
          <div>
            <h1>AI Assistant</h1>
            <p class="subtitle">Ask anything about your vehicles and maintenance history</p>
          </div>
        </div>
        <div class="ai-status">
          <span class="status-dot" [class.online]="ollamaOnline()" [class.offline]="!ollamaOnline()"></span>
          <span class="status-label">{{ ollamaOnline() ? 'AI ready' : 'AI offline' }}</span>
        </div>
      </div>

      <!-- Chat messages -->
      <div class="chat-window" #chatWindow>
        <!-- Empty state with starter questions -->
        <div *ngIf="!messages().length" class="starter-state">
          <p class="starter-hint">Try asking:</p>
          <div class="starter-chips">
            <button *ngFor="let q of starterQuestions" class="starter-chip" (click)="ask(q)">
              {{ q }}
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div *ngFor="let msg of messages()" class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
          <div class="message-bubble">
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-time">{{ msg.ts | date:'shortTime' }}</div>
          </div>
        </div>

        <!-- Thinking indicator -->
        <div *ngIf="loading()" class="message assistant">
          <div class="message-bubble thinking">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="chat-input-area">
        <input pInputText
          [(ngModel)]="inputText"
          placeholder="Ask about your vehicles..."
          class="chat-input"
          (keyup.enter)="send()"
          [disabled]="loading()"
        />
        <p-button
          icon="pi pi-send" (onClick)="send()"
          [loading]="loading()"
          [disabled]="!inputText.trim()"
        />
      </div>

      <p class="disclaimer" *ngIf="!ollamaOnline()">
        <i class="pi pi-info-circle"></i>
        Ollama is not reachable. Start it with: <code>docker compose up -d ollama</code>
        then pull a model: <code>docker compose exec ollama ollama pull phi4-mini</code>
      </p>
    </div>
  `,
  styles: [`
    .ai-page { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 3rem); }
    .ai-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem; }
    .ai-title { display:flex;align-items:flex-start;gap:0.75rem; }
    .ai-icon { font-size:1.75rem;color:var(--p-primary-500);margin-top:2px; }
    h1 { margin:0;font-size:1.4rem;font-weight:600; }
    .subtitle { margin:0.2rem 0 0;font-size:0.8rem;color:var(--p-text-muted-color); }
    .ai-status { display:flex;align-items:center;gap:0.4rem;font-size:0.8rem; }
    .status-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .status-dot.online { background:#22c55e; } .status-dot.offline { background:#ef4444; }
    .status-label { color:var(--p-text-muted-color); }
    .chat-window {
      flex:1;overflow-y:auto;background:white;border-radius:12px;
      padding:1rem;margin-bottom:0.75rem;min-height:0;
      box-shadow:0 1px 3px rgba(0,0,0,.08);
    }
    .starter-state { padding:1rem 0; }
    .starter-hint { font-size:0.875rem;color:var(--p-text-muted-color);margin-bottom:0.75rem; }
    .starter-chips { display:flex;flex-wrap:wrap;gap:0.5rem; }
    .starter-chip {
      background:var(--p-surface-100);border:1px solid var(--p-surface-300);
      border-radius:20px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;
      transition:background .15s;color:var(--p-text-color);
    }
    .starter-chip:hover { background:var(--p-primary-50);border-color:var(--p-primary-300); }
    .message { display:flex;margin-bottom:0.75rem; }
    .message.user { justify-content:flex-end; }
    .message-bubble {
      max-width:75%;padding:0.65rem 0.9rem;border-radius:12px;
      background:var(--p-surface-100);
    }
    .message.user .message-bubble { background:var(--p-primary-500);color:white; }
    .message-content { font-size:0.9rem;line-height:1.5;white-space:pre-wrap; }
    .message-time { font-size:0.7rem;opacity:.6;margin-top:0.25rem;text-align:right; }
    .thinking { display:flex;gap:4px;align-items:center;padding:0.75rem 1rem; }
    .dot { width:8px;height:8px;border-radius:50%;background:var(--p-text-muted-color);
      animation:bounce .9s infinite; }
    .dot:nth-child(2){animation-delay:.15s;} .dot:nth-child(3){animation-delay:.3s;}
    @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    .chat-input-area { display:flex;gap:0.5rem; }
    .chat-input { flex:1; }
    .disclaimer {
      font-size:0.78rem;color:var(--p-text-muted-color);margin-top:0.5rem;
      display:flex;align-items:center;gap:0.4rem;
    }
    .disclaimer code { background:var(--p-surface-100);padding:0.1rem 0.4rem;border-radius:4px;font-size:0.75rem; }
  `],
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatWindow') chatWindow!: ElementRef<HTMLDivElement>;

  messages     = signal<Message[]>([]);
  inputText    = '';
  loading      = signal(false);
  ollamaOnline = signal(false);
  starterQuestions = STARTER_QUESTIONS;

  constructor(private readonly http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ available: boolean }>('/api/ai/status').subscribe({
      next:  r => this.ollamaOnline.set(r.available),
      error: () => this.ollamaOnline.set(false),
    });
  }

  ngAfterViewChecked() {
    const el = this.chatWindow?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  ask(question: string) {
    this.inputText = question;
    this.send();
  }

  send() {
    const q = this.inputText.trim();
    if (!q || this.loading()) return;

    this.messages.update(m => [...m, { role: 'user', content: q, ts: new Date() }]);
    this.inputText = '';
    this.loading.set(true);

    this.http.post<{ answer: string }>('/api/ai/chat', { question: q }).subscribe({
      next: r => {
        this.messages.update(m => [...m, { role: 'assistant', content: r.answer, ts: new Date() }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update(m => [...m, {
          role: 'assistant',
          content: 'Sorry, I could not connect to the AI. Check that Ollama is running.',
          ts: new Date(),
        }]);
        this.loading.set(false);
      },
    });
  }
}
