import { describe, expect, test } from '@jest/globals';
import { GooseAI } from '../src/utils/goose';

describe('GooseAI', () => {
  let goose: GooseAI;
  
  beforeEach(() => {
    goose = new GooseAI();
  });

  test('should be instantiable', () => {
    expect(goose).toBeInstanceOf(GooseAI);
  });

  test('should have prompt method', () => {
    expect(typeof goose.prompt).toBe('function');
  });

  // Note: We don't test the actual CLI interaction here since it requires
  // goose to be installed and configured. In a real environment, integration
  // tests would verify the CLI interaction works correctly.
  // Unit tests focus on the interface and error handling patterns.
});
