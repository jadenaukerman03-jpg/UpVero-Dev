import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createLead } from "@/data/leads";
import type { BusinessResearchProfile } from "@/data/research";

import { buildResearchPacket } from "./build-research-packet";

describe("buildResearchPacket", () => {
  test("distinguishes cited public facts from user-supplied facts", () => {
    const lead = createLead({ businessName: "Aster Flight School", city: "Elkhart" });
    const profile = {
      sources: [],
      completeness: 10,
      additionalNotes: "",
      phone: {
        value: "(555) 010-0200",
        confidence: "high",
        sources: [
          {
            source: "web-search",
            sourceUrl: "https://example.com/contact",
            timestamp: new Date().toISOString(),
            rawFindings: "Public contact page",
            confidence: "high",
            fields: { phone: "(555) 010-0200" },
            isMock: false,
          },
        ],
      },
    } satisfies BusinessResearchProfile;

    const packet = buildResearchPacket(lead, profile);
    assert.equal(
      packet.facts.find((fact) => fact.field === "businessName")?.provenance,
      "user-supplied",
    );
    assert.equal(
      packet.facts.find((fact) => fact.field === "phone")?.provenance,
      "publicly-verified",
    );
    assert.equal(
      packet.facts.find((fact) => fact.field === "phone")?.sourceUrl,
      "https://example.com/contact",
    );
  });
});
