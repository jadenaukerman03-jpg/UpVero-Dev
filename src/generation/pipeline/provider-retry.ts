type ProviderError = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
  type?: unknown;
};

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Only retries failures that can plausibly recover without changing the input.
 * Schema and deterministic-quality failures deliberately remain limited to the
 * normal correction attempt so invalid output cannot spin indefinitely.
 */
export function isRetryableProviderError(error: unknown) {
  const providerError = error as ProviderError;
  const status = typeof providerError?.status === "number" ? providerError.status : undefined;
  if (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (status !== undefined && status >= 500)
  ) {
    return true;
  }

  const searchable = [
    normalized(providerError?.name),
    normalized(providerError?.code),
    normalized(providerError?.type),
    normalized(providerError?.message),
  ].join(" ");
  return [
    "aborterror",
    "apiconnectionerror",
    "connection error",
    "connection reset",
    "econnreset",
    "etimedout",
    "internal_server_error",
    "overloaded",
    "server_error",
    "temporarily unavailable",
    "timeout",
    "upstream error",
  ].some((candidate) => searchable.includes(candidate));
}

export function providerRetryDelayMs(completedAttempt: number) {
  return Math.min(8_000, 750 * 2 ** Math.max(0, completedAttempt - 1));
}

export function providerAttemptLimit(error: unknown) {
  return isRetryableProviderError(error) ? 4 : 2;
}

export function providerFallbackModels(
  primaryModel: string,
  configuredFallback?: string,
  configuredGeneralModel?: string,
) {
  const candidates = [
    configuredFallback?.trim(),
    configuredGeneralModel?.trim(),
    primaryModel === "gpt-5.4-mini" ? "gpt-5.4" : "gpt-5.4-mini",
    "gpt-4.1-mini",
  ];
  return [
    ...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))),
  ].filter((candidate) => candidate !== primaryModel);
}

export function providerRecoveryModel(
  primaryModel: string,
  fallbackModels: string[],
  completedAttempt: number,
) {
  if (!fallbackModels.length) return primaryModel;
  return fallbackModels[Math.min(completedAttempt - 1, fallbackModels.length - 1)] ?? primaryModel;
}

/** Older general-purpose models accept Responses structured output but not reasoning controls. */
export function supportsReasoningConfiguration(model: string) {
  const normalizedModel = model.trim().toLowerCase();
  return normalizedModel.startsWith("gpt-5") || /^o[1-9](?:-|$)/.test(normalizedModel);
}

export function safeProviderErrorDetails(error: unknown) {
  const providerError = error as ProviderError;
  return {
    name: normalized(providerError?.name) || undefined,
    status: typeof providerError?.status === "number" ? providerError.status : undefined,
    code: normalized(providerError?.code) || undefined,
    type: normalized(providerError?.type) || undefined,
  };
}
