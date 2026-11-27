// Client-side checks mirroring ApplicationValidator.java, for instant feedback.
// The server always re-validates.

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** 13-digit SA ID (Luhn check digit) or an alphanumeric passport number. */
export function isValidIdNumber(value: string) {
  const v = value.replace(/\s/g, '');
  return /^\d{13}$/.test(v) ? luhn(v) : /^[A-Z0-9]{6,20}$/i.test(v) && !/^\d+$/.test(v);
}

/** A full 13-digit number was typed but the check digit doesn't match: almost always a typo. */
export function isMistypedSaId(value: string) {
  const v = value.replace(/\s/g, '');
  return /^\d{13}$/.test(v) && !luhn(v);
}

/**
 * Date of birth (YYYY-MM-DD) and gender read from a valid 13-digit SA ID number (YYMMDD SSSS C A Z; SSSS
 * from 5000 is male). Null for passports and invalid numbers. The ID only has two year digits: `adult`
 * picks the 1900s when the 2000s would make the person younger than 18.
 */
export function readSaId(value: string, { adult = false } = {}): { dateOfBirth: string; gender: 'female' | 'male' } | null {
  const v = value.replace(/\s/g, '');
  if (!/^\d{13}$/.test(v) || !luhn(v)) return null;
  const yy = Number(v.slice(0, 2));
  const month = Number(v.slice(2, 4));
  const day = Number(v.slice(4, 6));
  const now = new Date();
  let year = 2000 + yy;
  if (year > now.getFullYear() || (adult && now.getFullYear() - year < 18)) year -= 100;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { dateOfBirth: `${year}-${pad(month)}-${pad(day)}`, gender: Number(v[6]) >= 5 ? 'male' : 'female' };
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[0-9 ()-]+$/.test(value) && digits >= 9 && digits <= 15;
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export function isFutureDate(value: string) {
  return new Date(value) > new Date();
}

export function isUnder18(value: string) {
  const adult = new Date();
  adult.setFullYear(adult.getFullYear() - 18);
  return new Date(value) > adult;
}
