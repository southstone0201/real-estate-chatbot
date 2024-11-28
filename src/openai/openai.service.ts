import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Pinecone, Index } from '@pinecone-database/pinecone';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private pineconeIndex: Index;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('PINECONE_API_KEY'),
    });
    this.pineconeIndex = this.pinecone.index('seoul');
  }

  // 질문에 응답 생성
  async generateResponse(question: string): Promise<{ 주소: string; gpt응답: string }[]> {
    try {
      // 1. 질문을 임베딩으로 변환
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: question,
      });
      const embedding = embeddingResponse.data[0].embedding;

      // 2. Pinecone에서 유사한 벡터 검색
      const queryResponse = await this.pineconeIndex.namespace("gangnam").query({
        vector: embedding,
        topK: 3, // 가장 유사한 3개의 결과 반환
        includeMetadata: true,
        includeValues: false,
      });

      console.log('Query response:', queryResponse);

      if (!queryResponse.matches || queryResponse.matches.length === 0) {
        return [{ 주소: '정보 없음', gpt응답: '죄송합니다, 관련 정보를 찾을 수 없습니다.' }];
      }

      // 3. 유사한 콘텐츠 정보 가져오기
      const similarMetadata = queryResponse.matches.map((match) => match.metadata);
      console.log('Similar metadata:', similarMetadata);

      // 4. 주소 추출 및 GPT 응답 생성
      const responses = [];
      for (const metadata of similarMetadata) {
        // text 속성이 문자열인지 확인
        const text = typeof metadata.text === 'string' ? metadata.text : '';
        if (!text) {
          console.error('metadata.text는 문자열이 아니거나 비어 있습니다:', metadata.text);
          continue;
        }

        // 주소 추출 (주소: 뒤에 나오는 텍스트 추출)
        const addressMatch = text.match(/주소:([^용도]+)/); // "주소:" 다음부터 "용도:" 이전까지 추출
        const address = addressMatch ? addressMatch[1].trim() : '주소 정보 없음';

        const prompt = `
          아래는 사용자 질문과 관련된 부동산 정보입니다:
          ${metadata.text}

          사용자의 질문: ${question}

          위 정보를 기반으로 적절한 답변을 작성하세요.
        `;

        const chatResponse = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7,
        });

        const gptAnswer = chatResponse.choices[0].message?.content.trim() || '응답 생성 실패';

        responses.push({ 주소: address, gpt응답: gptAnswer });
      }

      return responses;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate response.');
    }
  }
}