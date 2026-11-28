import { describe, expect, it } from 'vitest';

import { stripShipNameBbCode, validateShipName } from './ship-name.js';

describe('ship names with BB-Code', () => {
  it('accepts inline formatting and plain names', () => {
    expect(validateShipName('Falcon')).toBeNull();
    expect(validateShipName('[b]Falcon[/b] [color=red]II[/color]')).toBeNull();
    expect(validateShipName('[Alpha] Wing')).toBeNull();
  });

  it('rejects empty, unbalanced, bad-color and tag-only names', () => {
    expect(validateShipName('  ')).not.toBeNull();
    expect(validateShipName('[b]Falcon')).not.toBeNull();
    expect(validateShipName('[b]A[i]B[/b][/i]')).not.toBeNull();
    expect(validateShipName('[color=javascript:x]A[/color]')).not.toBeNull();
    expect(validateShipName('[b][/b]')).not.toBeNull();
  });

  it('limits the visible length, not the tags', () => {
    expect(validateShipName(`[b]${'a'.repeat(40)}[/b]`)).toBeNull();
    expect(validateShipName('a'.repeat(41))).not.toBeNull();
  });

  it('strips allowed tags only', () => {
    expect(stripShipNameBbCode('[b]Fal[/b][color=#fff]con[/color] [x]')).toBe('Falcon [x]');
  });
});
