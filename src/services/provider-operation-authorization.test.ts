import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { shouldConsumeProviderQuota } from "./provider-operation-authorization.server";

describe("provider-operation quota policy", () => {
  test("does not throttle database-authorized administrator operations", () => {
    assert.equal(shouldConsumeProviderQuota({ adminOnly: true }), false);
  });

  test("continues throttling customer provider operations", () => {
    assert.equal(shouldConsumeProviderQuota({ adminOnly: false }), true);
    assert.equal(shouldConsumeProviderQuota({}), true);
  });
});
