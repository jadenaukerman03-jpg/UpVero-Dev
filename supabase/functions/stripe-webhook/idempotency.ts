export const WEBHOOK_PROCESSING_LEASE_MS = 5 * 60 * 1_000;

export type WebhookEventRecord = {
  id: string;
  processing_status: "processing" | "processed" | "failed";
  attempt_count: number;
  updated_at: string;
};

export type WebhookEventDecision = "already_processed" | "in_progress" | "claim_retry";

/**
 * Prevents concurrent Stripe deliveries from processing the same event while
 * still allowing a failed or abandoned attempt to be retried safely.
 */
export function decideWebhookEventAction(
  event: WebhookEventRecord,
  now = Date.now(),
): WebhookEventDecision {
  if (event.processing_status === "processed") return "already_processed";
  if (event.processing_status === "failed") return "claim_retry";

  const updatedAt = Date.parse(event.updated_at);
  if (!Number.isFinite(updatedAt)) return "claim_retry";
  return now - updatedAt >= WEBHOOK_PROCESSING_LEASE_MS ? "claim_retry" : "in_progress";
}
