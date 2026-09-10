const MINIMUM_COMPLETION_TIME_MS = 1_000;
const MAXIMUM_FORM_AGE_MS = 2 * 60 * 60 * 1_000;

/** Filters instant bot posts and stale replayed forms before any database or email work. */
export function isPlausiblePublicFormTiming(startedAt: number, now = Date.now()) {
  const elapsed = now - startedAt;
  return elapsed >= MINIMUM_COMPLETION_TIME_MS && elapsed <= MAXIMUM_FORM_AGE_MS;
}
