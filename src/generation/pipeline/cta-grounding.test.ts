import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  copyDeckSchema,
  informationArchitectureSchema,
  researchPacketSchema,
} from "../contracts/site-spec-v3";
import {
  isGroundedCtaDestination,
  repairCopyCtaDestinations,
} from "./generate-site-spec-v3.server";

const research = researchPacketSchema.parse({
  businessSummary: "A verified local business.",
  facts: [
    {
      field: "phone",
      value: "(574) 555-0100",
      provenance: "user-supplied",
      confidence: 1,
    },
    {
      field: "email",
      value: "hello@example.com",
      provenance: "publicly-verified",
      confidence: 0.9,
    },
    {
      field: "website",
      value: "https://example.com",
      provenance: "publicly-verified",
      confidence: 0.9,
    },
  ],
  missingInformation: [],
  reasonableInferences: [],
  completeness: 80,
});

const architecture = informationArchitectureSchema.parse({
  rationale: "A short path from understanding the offer to contacting the business.",
  pages: [
    {
      id: "home",
      path: "/",
      navigationLabel: "Home",
      title: "Home",
      purpose: "Explain the offer and provide a contact route.",
      conversionObjective: "Help the visitor make contact.",
      sectionPlan: [
        { id: "home-hero", purpose: "hero", job: "Introduce", reasonForPosition: "First" },
        { id: "home-offer", purpose: "offer", job: "Explain", reasonForPosition: "Second" },
        {
          id: "home-contact",
          purpose: "contact",
          job: "Make contact",
          reasonForPosition: "Last",
        },
      ],
    },
  ],
});

describe("generated CTA grounding", () => {
  test("allows known anchors and verified external destinations", () => {
    assert.equal(isGroundedCtaDestination("#home-contact", research, architecture), true);
    assert.equal(isGroundedCtaDestination("tel:+15745550100", research, architecture), true);
    assert.equal(
      isGroundedCtaDestination("mailto:hello@example.com", research, architecture),
      true,
    );
    assert.equal(
      isGroundedCtaDestination("https://example.com/contact", research, architecture),
      true,
    );
  });

  test("rejects unknown anchors and unsupported external destinations", () => {
    assert.equal(isGroundedCtaDestination("#missing", research, architecture), false);
    assert.equal(
      isGroundedCtaDestination("https://unverified.example/contact", research, architecture),
      false,
    );
    assert.equal(isGroundedCtaDestination("tel:+15745550199", research, architecture), false);
  });

  test("repairs unsupported destinations to the existing contact section", () => {
    const copy = copyDeckSchema.parse({
      brandTagline: "Clear help",
      seoTitle: "Example business",
      seoDescription: "A clear description of the example business.",
      claimAudit: [],
      blocks: ["home-hero", "home-offer", "home-contact"].map((id) => ({
        id,
        eyebrow: "Example",
        heading: "A useful heading",
        body: "Specific copy about the business offer.",
        items: [],
        cta: { label: "Get started", href: "https://unverified.example/contact" },
      })),
    });
    const repaired = repairCopyCtaDestinations(copy, research, architecture);
    assert.ok(repaired.blocks.every((block) => block.cta?.href === "#home-contact"));
  });
});
