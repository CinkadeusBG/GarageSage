import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService }    from './ai.service';
import { AiChatDto }    from '@garagesage/shared';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Ask a natural language question about your vehicles' })
  async chat(@Body() dto: AiChatDto, @Request() req) {
    const answer = await this.svc.chat(req.user.id, dto.question, dto.vehicleIds);
    return { answer };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI-generated maintenance suggestions for dashboard' })
  suggestions(@Request() req) {
    return this.svc.suggestions(req.user.id).then(items => ({ suggestions: items }));
  }

  @Get('status')
  @ApiOperation({ summary: 'Check Ollama availability and loaded models' })
  status() {
    return this.svc.ollamaStatus();
  }
}
