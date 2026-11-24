import { describe, expect, it } from 'vitest';
import { messagePreview } from './message-preview';

describe('messagePreview', () => {
  it('strips BBCode and collapses line breaks', () => {
    expect(messagePreview('[b]Betreff: Wartung[/b]\n\nMorgen [color=red]ab[/color] 20 Uhr')).toBe(
      'Betreff: Wartung Morgen ab 20 Uhr',
    );
  });

  it('cuts after 200 characters', () => {
    expect(messagePreview('x'.repeat(201))).toBe(`${'x'.repeat(200)}…`);
    expect(messagePreview('x'.repeat(200))).toBe('x'.repeat(200));
  });
});
