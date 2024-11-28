import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiModule } from './openai/openai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }
    ),
    OpenAiModule,
  ],
})
export class AppModule {}