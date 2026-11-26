export const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: "At least 8 characters long", test: (value) => value.length >= 8 },
  {
    label: "Include uppercase and lowercase letters",
    test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  { label: "Include at least one number", test: (value) => /\d/.test(value) },
];

export function passwordRuleStates(value: string) {
  return PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(value) }));
}

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const ALL = UPPER + LOWER + DIGITS;

function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % max;
}

function pick(characters: string): string {
  return characters.charAt(randomInt(characters.length));
}

export function generatePassword(length = 12): string {
  const size = Math.max(8, length);
  const characters = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (characters.length < size) characters.push(pick(ALL));

  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join("");
}
