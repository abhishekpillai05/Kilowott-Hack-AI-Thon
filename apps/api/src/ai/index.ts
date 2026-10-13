import { isAiEnabled } from '../config/env';
import { GeminiProvider } from './geminiProvider';
import { DemoProvider } from './demoProvider';
import type { AIProvider } from './provider';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  if (isAiEnabled()) {
    try {
      _provider = new GeminiProvider();
    } catch {
      _provider = new DemoProvider();
    }
  } else {
    _provider = new DemoProvider();
  }

  return _provider;
}

// Allow swapping provider in tests
export function setAIProvider(provider: AIProvider): void {
  _provider = provider;
}

export type { AIProvider, GenerateOptions, GenerateResult } from './provider';
