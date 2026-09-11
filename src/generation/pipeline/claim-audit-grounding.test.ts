import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ResearchPacket } from "@/generation/contracts/site-spec-v3";
import { isGroundedClaimAuditEntry } from "./generate-site-spec-v3.server";

const research: ResearchPacket = {
  businessSummary: "A roofing business with supplied services and service areas.",
  facts: [
    {
      field: "serviceAreas",
      value: "Maplewood, Westfield, Carmel",
      provenance: "user-supplied",
      confidence: 1,
    },
    {
      field: "services",
      value: "Roof repair, Roof replacement, Storm inspections, Gutter installation",
      provenance: "publicly-verified",
      confidence: 0.95,
      sourceUrl: "https://example.com/services",
    },
  ],
  missingInformation: [],
  reasonableInferences: [],
  completeness: 50,
};

describe("generated claim-audit grounding", () => {
  test("accepts grammatical summaries of verified list facts", () => {
    assert.equal(
      isGroundedClaimAuditEntry("The business serves Maplewood, Westfield, and Carmel.", research),
      true,
    );
    assert.equal(
      isGroundedClaimAuditEntry(
        "The confirmed services are roof repair, roof replacement, storm inspections, and gutter installation.",
        research,
      ),
      true,
    );
  });

  test("rejects material facts absent from trusted research", () => {
    assert.equal(
      isGroundedClaimAuditEntry("The business has served Carmel for 25 years.", research),
      false,
    );
    assert.equal(
      isGroundedClaimAuditEntry("The company is an award-winning roofing contractor.", research),
      false,
    );
  });

  test("does not ground claims using reasonable inferences", () => {
    assert.equal(
      isGroundedClaimAuditEntry("The business serves Indianapolis.", {
        ...research,
        facts: [
          {
            field: "serviceAreas",
            value: "Indianapolis",
            provenance: "reasonable-inference",
            confidence: 0.5,
          },
        ],
      }),
      false,
    );
  });
});
