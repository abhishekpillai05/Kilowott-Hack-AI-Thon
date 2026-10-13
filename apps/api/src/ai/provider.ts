/**
 * AI Provider Interface
 * All LLM calls go through this interface — swap providers without touching business logic.
 */

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  isDemo: boolean;
  tokensUsed?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly isDemo: boolean;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  isAvailable(): boolean;
}
