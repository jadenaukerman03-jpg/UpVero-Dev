import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isRetryableProviderError,
  providerAttemptLimit,
  providerFallbackModels,
  providerRecoveryModel,
  providerRetryDelayMs,
  safeProviderErrorDetails,
  supportsReasoningConfiguration,
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

  test("prefers configured recovery models and removes duplicates", () => {
    assert.deepEqual(providerFallbackModels("gpt-5.4-mini", "gpt-5.4", "gpt-4.1-mini"), [
      "gpt-5.4",
      "gpt-4.1-mini",
    ]);
    assert.deepEqual(providerFallbackModels("custom-model", undefined, "gpt-4.1-mini"), [
      "gpt-4.1-mini",
      "gpt-5.4-mini",
    ]);
  });

  test("moves to a recovery model after the first transient failure", () => {
    const fallbacks = ["gpt-4.1-mini", "gpt-5.4"];
    assert.equal(providerRecoveryModel("gpt-5.4-mini", fallbacks, 1), "gpt-4.1-mini");
    assert.equal(providerRecoveryModel("gpt-5.4-mini", fallbacks, 2), "gpt-5.4");
    assert.equal(providerRecoveryModel("gpt-5.4-mini", fallbacks, 3), "gpt-5.4");
  });

  test("only sends reasoning controls to compatible model families", () => {
    assert.equal(supportsReasoningConfiguration("gpt-5.4-mini"), true);
    assert.equal(supportsReasoningConfiguration("o3-mini"), true);
    assert.equal(supportsReasoningConfiguration("gpt-4.1-mini"), false);
  });
});
