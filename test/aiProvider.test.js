import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAIProvider,
  registerAIProvider,
  generateAnswer,
  generateAnswerStream,
  embedText,
  geminiProvider,
} from '../server/src/shared/integrations/ai/index.js';

describe('AI Provider Abstraction Suite', () => {
  it('resolves the default configured AI provider as gemini', () => {
    const provider = getAIProvider();
    assert.ok(provider, 'Expected default provider to be resolved');
    assert.equal(provider.name, 'gemini');
    assert.equal(typeof provider.embedText, 'function');
    assert.equal(typeof provider.generateAnswer, 'function');
    assert.equal(typeof provider.generateAnswerStream, 'function');
  });

  it('resolves provider by name case-insensitively with trimming', () => {
    const provider = getAIProvider('  GEMINI  ');
    assert.equal(provider, geminiProvider);
  });

  it('throws an informative error when an unknown or unsupported provider is requested', () => {
    assert.throws(
      () => getAIProvider('unsupported-provider'),
      (err) =>
        err instanceof Error &&
        err.message.includes('Unsupported AI provider: "unsupported-provider"') &&
        err.message.includes('Available providers:')
    );
  });

  it('allows registering a custom AI provider implementation without changing business logic', async () => {
    const mockProvider = {
      name: 'mock-llm',
      async generateAnswer(prompt) {
        return `Mock answer for: ${prompt}`;
      },
      async *generateAnswerStream(prompt) {
        yield { text: `Mock stream for: ${prompt}` };
      },
      async embedText(text) {
        return [0.1, 0.2, 0.3];
      },
    };

    registerAIProvider('mock-llm', mockProvider);

    const resolved = getAIProvider('mock-llm');
    assert.equal(resolved, mockProvider);

    // Test routing generateAnswer through shared interface with provider override
    const ans = await generateAnswer('Hello', { provider: 'mock-llm' });
    assert.equal(ans, 'Mock answer for: Hello');

    // Test routing generateAnswerStream through shared interface with provider override
    const stream = await generateAnswerStream('Hello stream', { provider: 'mock-llm' });
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk.text);
    }
    assert.deepEqual(chunks, ['Mock stream for: Hello stream']);

    // Test routing embedText through shared interface with provider override
    const embedding = await embedText('Hello embed', { provider: 'mock-llm' });
    assert.deepEqual(embedding, [0.1, 0.2, 0.3]);
  });

  it('validates provider registration arguments strictly', () => {
    assert.throws(
      () => registerAIProvider('', {}),
      (err) => err instanceof Error && err.message.includes('non-empty string')
    );
    assert.throws(
      () => registerAIProvider('invalid', null),
      (err) => err instanceof Error && err.message.includes('Invalid AI provider instance')
    );
  });

  it('validates provider capability support when an operation is not implemented', async () => {
    const textOnlyProvider = {
      name: 'text-only',
      async generateAnswer(prompt) {
        return 'text only';
      },
      // does NOT implement embedText or generateAnswerStream
    };

    registerAIProvider('text-only', textOnlyProvider);

    await assert.rejects(
      () => embedText('some text', { provider: 'text-only' }),
      (err) =>
        err instanceof Error &&
        err.message.includes('AI provider "text-only" does not support embedText')
    );

    await assert.rejects(
      () => generateAnswerStream('prompt', { provider: 'text-only' }),
      (err) =>
        err instanceof Error &&
        err.message.includes('AI provider "text-only" does not support generateAnswerStream')
    );
  });
});
