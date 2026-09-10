import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isPlausiblePublicFormTiming } from "./public-form-abuse";
import { supportContactMessageSchema } from "@/services/support-contact-message-schema";
import { publicWebsiteLeadSchema } from "@/services/website-contact-lead-schema";

describe("public form abuse protection", () => {
  test("rejects instant submissions", () => {
    assert.equal(isPlausiblePublicFormTiming(9_500, 10_000), false);
  });

  test("accepts a normally completed form", () => {
    assert.equal(isPlausiblePublicFormTiming(5_000, 10_000), true);
  });

  test("rejects stale and future timestamps", () => {
    assert.equal(isPlausiblePublicFormTiming(1_000, 10_000_000), false);
    assert.equal(isPlausiblePublicFormTiming(11_000, 10_000), false);
  });

  test("accepts valid bounded public-form payloads", () => {
    assert.equal(
      supportContactMessageSchema.safeParse({
        email: "visitor@example.com",
        message: "Please contact me.",
        startedAt: Date.now() - 5_000,
        website: "",
      }).success,
      true,
    );
    assert.equal(
      publicWebsiteLeadSchema.safeParse({
        target: { kind: "published_website", websiteId: crypto.randomUUID() },
        name: "Visitor",
        contactMethod: "visitor@example.com",
        startedAt: Date.now() - 5_000,
        website: "",
      }).success,
      true,
    );
  });

  test("public form schemas reject missing timing and unexpected fields", () => {
    assert.equal(
      supportContactMessageSchema.safeParse({
        email: "visitor@example.com",
        message: "Please contact me.",
      }).success,
      false,
    );
    assert.equal(
      publicWebsiteLeadSchema.safeParse({
        target: { kind: "published_website", websiteId: crypto.randomUUID() },
        name: "Visitor",
        contactMethod: "visitor@example.com",
        startedAt: Date.now() - 5_000,
        unexpected: "not accepted",
      }).success,
      false,
    );
  });
});
