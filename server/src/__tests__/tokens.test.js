import { describe, it, expect } from 'vitest';
import { generateTicketCode, generateTicketToken, generateAccessToken, generateId } from '../utils/tokens.js';

describe('generateTicketCode', () => {
  it('has the PIC- prefix and a 6-character unambiguous suffix', () => {
    const code = generateTicketCode();
    expect(code).toMatch(/^PIC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('never contains ambiguous characters (0, O, 1, I) in its random suffix', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateTicketCode();
      const suffix = code.slice(4); // strip the fixed "PIC-" prefix, which legitimately contains "I"
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });

  it('generates distinct codes across many calls', () => {
    const codes = new Set(Array.from({ length: 200 }, generateTicketCode));
    // Collisions are possible but should be exceedingly rare at this sample size.
    expect(codes.size).toBeGreaterThan(195);
  });
});

describe('generateTicketToken', () => {
  it('is long and unguessable', () => {
    const token = generateTicketToken();
    expect(token.length).toBe(48);
  });

  it('generates distinct tokens', () => {
    expect(generateTicketToken()).not.toBe(generateTicketToken());
  });
});

describe('generateAccessToken', () => {
  it('is long enough to be unguessable', () => {
    expect(generateAccessToken().length).toBe(40);
  });
});

describe('generateId', () => {
  it('prefixes the id as requested', () => {
    expect(generateId('adm')).toMatch(/^adm_/);
    expect(generateId('reg')).toMatch(/^reg_/);
  });

  it('generates distinct ids for the same prefix', () => {
    expect(generateId('tkt')).not.toBe(generateId('tkt'));
  });
});
