import { Controller, Post, Body } from '@nestjs/common';
import { OpenAiService } from './openai.service';

@Controller('openai')
export class OpenAiController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post('generate-response')
  async generateResponse(@Body('question') question: string) {
    if (!question) {
      return { error: 'Question is required' };
    }
    const response = await this.openAiService.generateResponse(question);
    return { response };
  }
}