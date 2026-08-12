import validator from 'validator';

export const ALLOWED_LEVELS = ['100', '200', '300', '400', '500', 'PG', 'Other'];

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

/**
 * Validates registration form fields. Returns { valid, errors } where errors
 * is a field -> message map. Always run this on the backend regardless of
 * what the frontend already checked.
 */
export function validateRegistrationInput(body) {
  const errors = {};
  const fullName = (body.fullName || '').trim();
  const matricNumber = (body.matricNumber || '').trim();
  const level = (body.level || '').trim();
  const phone = (body.phone || '').trim();
  const email = (body.email || '').trim();

  if (!fullName || fullName.length < 3 || fullName.length > 100) {
    errors.fullName = 'Enter your full name (3-100 characters).';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(fullName)) {
    errors.fullName = 'Full name contains invalid characters.';
  }

  if (!matricNumber || matricNumber.length < 3 || matricNumber.length > 30) {
    errors.matricNumber = 'Enter a valid matric number.';
  } else if (!/^[a-zA-Z0-9/.-]+$/.test(matricNumber)) {
    errors.matricNumber = 'Matric number contains invalid characters.';
  }

  if (!ALLOWED_LEVELS.includes(level)) {
    errors.level = 'Select a valid level.';
  }

  if (!phone || !validator.isMobilePhone(phone, 'any', { strictMode: false })) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (!email || !validator.isEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { fullName, matricNumber, level, phone, email },
  };
}

export function normalizeMatric(matricNumber) {
  return matricNumber.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
