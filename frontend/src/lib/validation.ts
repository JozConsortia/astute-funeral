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
