import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decideWebhookEventAction,
  WEBHOOK_PROCESSING_LEASE_MS,
  type WebhookEventRecord,
} from "./idempotency";

const now = Date.parse("2026-09-10T12:00:00.000Z");

function event(overrides: Partial<WebhookEventRecord> = {}): WebhookEventRecord {
  return {
    id: "event-record-id",
    processing_status: "processing",
    attempt_count: 1,
    updated_at: new Date(now).toISOString(),
    ...overrides,
  };
}

describe("Stripe webhook idempotency decisions", () => {
  test("never reprocesses a completed event", () => {
    assert.equal(
      decideWebhookEventAction(event({ processing_status: "processed" }), now),
      "already_processed",
    );
  });

  test("does not concurrently process a delivery with a live lease", () => {
    assert.equal(decideWebhookEventAction(event(), now), "in_progress");
  });

  test("allows a failed delivery to be reclaimed", () => {
    assert.equal(
      decideWebhookEventAction(event({ processing_status: "failed" }), now),
      "claim_retry",
    );
  });

  test("allows an abandoned processing lease to be reclaimed", () => {
    assert.equal(
      decideWebhookEventAction(
        event({ updated_at: new Date(now - WEBHOOK_PROCESSING_LEASE_MS).toISOString() }),
        now,
      ),
      "claim_retry",
    );
  });
});
