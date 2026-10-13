import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../config/logger';
import type { AIProvider, GenerateOptions, GenerateResult } from './provider';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model: string;
  readonly isDemo = false;
  private client: GoogleGenerativeAI;

  constructor() {
    if (!config.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is required for GeminiProvider');
    }
    this.client = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
    this.model = config.GEMINI_MODEL;
  }

  isAvailable(): boolean {
    return !!config.GOOGLE_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const { prompt, systemInstruction, maxOutputTokens = 2048, temperature = 0.4 } = options;

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction:
        systemInstruction ??
        'You are a product catalog expert helping improve e-commerce product data.',
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    });

    logger.debug('Gemini generate', { model: this.model, promptLen: prompt.length });

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger.debug('Gemini response received', { chars: text.length });
        return {
          text,
          provider: 'gemini',
          model: this.model,
          isDemo: false,
        };
      } catch (err: unknown) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (attempt >= maxAttempts) {
          logger.error('Gemini generate failed after retries', {
            error: errMsg,
            attempts: attempt,
          });
          throw new Error(`AI generation failed: ${errMsg}`);
        }
        // Exponential backoff
        await sleep(500 * Math.pow(2, attempt));
        logger.warn('Gemini retry', { attempt, error: errMsg });
      }
    }

    throw new Error('Unreachable');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
