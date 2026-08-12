import { describe, it, expect } from 'vitest';
import { validateRegistrationInput, normalizeMatric, normalizeEmail } from '../utils/validators.js';

describe('validateRegistrationInput', () => {
  const validBody = {
    fullName: 'Jane Doe',
    matricNumber: 'ANB/2021/045',
    level: '300',
    phone: '+2348012345678',
    email: 'jane.doe@example.com',
  };

  it('accepts a fully valid submission', () => {
    const { valid, errors } = validateRegistrationInput(validBody);
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it('rejects a name that is too short', () => {
    const { valid, errors } = validateRegistrationInput({ ...validBody, fullName: 'Al' });
    expect(valid).toBe(false);
    expect(errors.fullName).toBeDefined();
  });

  it('rejects a name with disallowed characters', () => {
    const { valid, errors } = validateRegistrationInput({ ...validBody, fullName: 'Jane123 Doe' });
    expect(valid).toBe(false);
    expect(errors.fullName).toBeDefined();
  });

  it('rejects an invalid level', () => {
    const { valid, errors } = validateRegistrationInput({ ...validBody, level: '999' });
    expect(valid).toBe(false);
    expect(errors.level).toBeDefined();
  });

  it('rejects an invalid email', () => {
    const { valid, errors } = validateRegistrationInput({ ...validBody, email: 'not-an-email' });
    expect(valid).toBe(false);
    expect(errors.email).toBeDefined();
  });

  it('rejects an invalid phone number', () => {
    const { valid, errors } = validateRegistrationInput({ ...validBody, phone: '123' });
    expect(valid).toBe(false);
    expect(errors.phone).toBeDefined();
  });

  it('trims whitespace from every field', () => {
    const { data } = validateRegistrationInput({ ...validBody, fullName: '  Jane Doe  ' });
    expect(data.fullName).toBe('Jane Doe');
  });
});

describe('normalizeMatric', () => {
  it('uppercases and strips whitespace', () => {
    expect(normalizeMatric(' anb/2021/045 ')).toBe('ANB/2021/045');
    expect(normalizeMatric('anb 2021 045')).toBe('ANB2021045');
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Jane.Doe@EXAMPLE.com ')).toBe('jane.doe@example.com');
  });
});
