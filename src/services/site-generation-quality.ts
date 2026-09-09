const BANNED_GENERIC_PATTERNS = [
  /\bmakes?\b [^".]{1,80} straightforward/,
  /tailored to your needs/,
  /a local team/,
  /\blocal (?:service|business|expert|professional)s?\b/,
  /\blocally\b/,
  /demo content/,
  /lorem ipsum/,
  /a thoughtful next step/,
  /how we can help/,
  /professional service/,
  /project support/,
  /ongoing care/,
  /built around your (?:\w+ ){0,3}goals/,
  /solutions for (?:your|every) needs/,
  /quality you can trust/,
  /we(?:'|’)ve got you covered/,
  /your vision,? our (?:mission|passion)/,
  /excellence (?:in|at) every/,
  /\b(?:the )?(?:better|real) after\b/,
  /customer outcome/,
] as const;

/** Returns the actual generic fragments so a repair model knows exactly what failed. */
export function findBannedGenericPhrases(value: string): string[] {
  const normalized = value.toLowerCase();
  return [
    ...new Set(
      BANNED_GENERIC_PATTERNS.map((pattern) => normalized.match(pattern)?.[0]).filter(
        (match): match is string => Boolean(match),
      ),
    ),
  ];
}
