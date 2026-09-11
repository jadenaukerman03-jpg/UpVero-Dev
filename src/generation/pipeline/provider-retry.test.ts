import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isRetryableProviderError,
  providerAttemptLimit,
  providerFallbackModel,
  providerRetryDelayMs,
  safeProviderErrorDetails,
} from "./provider-retry";

describe("generation provider retry policy", () => {
  test("automatically retries transient OpenAI upstream failures", () => {
    const error = { status: 502, message: "Upstream error", request_id: "not-logged" };
    assert.equal(isRetryableProviderError(error), true);
    assert.equal(providerAttemptLimit(error), 4);
    assert.deepEqual(safeProviderErrorDetails(error), {
      name: undefined,
      status: 502,
      code: undefined,
      type: undefined,
    });
  });

  test("does not repeatedly retry invalid structured output", () => {
    const error = new Error("OpenAI returned malformed structured JSON for copy.");
    assert.equal(isRetryableProviderError(error), false);
    assert.equal(providerAttemptLimit(error), 2);
  });

  test("uses bounded exponential backoff", () => {
    assert.deepEqual([1, 2, 3, 8].map(providerRetryDelayMs), [750, 1_500, 3_000, 8_000]);
  });

  test("uses a configured fallback or a compatible default model", () => {
    assert.equal(providerFallbackModel("gpt-5.4-mini", "gpt-5.4"), "gpt-5.4");
    assert.equal(providerFallbackModel("gpt-5.4-mini"), "gpt-5.4");
    assert.equal(providerFallbackModel("custom-model"), "gpt-5.4-mini");
  });
});
