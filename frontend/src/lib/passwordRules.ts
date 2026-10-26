// Same rules as PasswordPolicy.java on the server, so the checklist matches what gets accepted.

export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { label: 'An uppercase letter (A–Z)', test: (p) => /\p{Lu}/u.test(p) },
  { label: 'A lowercase letter (a–z)', test: (p) => /\p{Ll}/u.test(p) },
  { label: 'A number (0–9)', test: (p) => /\d/.test(p) },
  { label: 'A special character, e.g. ! @ # ?', test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
];

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((r) => r.test(password));
