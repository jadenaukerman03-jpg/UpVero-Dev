const BANNED_GENERIC_PATTERNS = [
  /\bmakes?\b (?!(?:contact|booking|scheduling|communication|coordination|planning|ordering|enrollment|registration|setup|support|checkout|payment|appointments?|reservations?|getting started|the next steps?)\b)[^".]{1,80} straightforward/,
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

const OFFER_STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "available",
  "based",
  "before",
  "business",
  "company",
  "customer",
  "customers",
  "details",
  "help",
  "helps",
  "idea",
  "make",
  "makes",
  "modern",
  "more",
  "people",
  "provide",
  "provides",
  "service",
  "services",
  "site",
  "their",
  "them",
  "they",
  "this",
  "want",
  "website",
  "with",
  "your",
]);

function stemOfferWord(word: string) {
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function meaningfulOfferWords(values: Array<string | undefined>) {
  return new Set(
    values
      .filter((value): value is string => Boolean(value?.trim()))
      .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
      .filter((word) => word.length >= 4 && !OFFER_STOP_WORDS.has(word))
      .map(stemOfferWord),
  );
}

/**
 * Checks concrete relevance without requiring an art-directed headline to copy
 * one exact input word. The complete hero introduction (headline, supporting
 * copy, and offer cues) is evaluated so semantically sound headlines are not
 * rejected when their supporting copy names the actual work.
 */
export function hasConcreteOfferLanguage(
  heroIntroduction: string,
  offerSources: Array<string | undefined>,
) {
  const offerWords = meaningfulOfferWords(offerSources);
  if (offerWords.size === 0) return true;
  const heroWords = meaningfulOfferWords([heroIntroduction]);
  return [...offerWords].some((word) => heroWords.has(word));
}

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
