import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { validateSiteConfig } from "@/data/site";
import { generateSiteConfigFromLead } from "./generate-site-config-from-lead";
import { findBannedGenericPhrases, hasConcreteOfferLanguage } from "./site-generation-quality";

describe("website generation quality gates", () => {
  test("rejects the generic copy patterns that previously reached previews", () => {
    const failures = findBannedGenericPhrases(
      "A thoughtful next step starts here. We make flight instructor straightforward with professional service tailored to your needs.",
    );

    assert.ok(failures.includes("a thoughtful next step"));
    assert.ok(failures.includes("make flight instructor straightforward"));
    assert.ok(failures.includes("professional service"));
    assert.ok(failures.includes("tailored to your needs"));
  });

  test("allows specific offer-led copy", () => {
    assert.deepEqual(
      findBannedGenericPhrases(
        "Clean cut lawns, tidy landscape beds, and seasonal cleanup across Elkhart County.",
      ),
      [],
    );
  });

  test("allows natural straightforward language for customer actions", () => {
    assert.deepEqual(
      findBannedGenericPhrases(
        "A clear contact section and short form make contact straightforward.",
      ),
      [],
    );
  });

  test("accepts an art-directed headline when the complete hero names the offer", () => {
    assert.equal(
      hasConcreteOfferLanguage(
        "The view changes up here. Build cockpit confidence through focused flight lessons and ground school.",
        ["Flight instruction", "Private pilot flight lessons", "Ground school"],
      ),
      true,
    );
  });

  test("still rejects a hero introduction unrelated to the supplied offer", () => {
    assert.equal(
      hasConcreteOfferLanguage("A polished experience created around your next step.", [
        "Shoe repair",
        "Leather restoration",
        "Sole replacement",
      ]),
      false,
    );
  });

  test("matches normal singular and plural offer wording", () => {
    assert.equal(
      hasConcreteOfferLanguage("Fresh pastries for the celebration table.", ["Seasonal pastry"]),
      true,
    );
  });

  test("builds a valid temporary draft from only one supplied service", () => {
    const config = generateSiteConfigFromLead({
      id: "sparse-lead",
      businessName: "Sparse Business",
      industry: "Consulting",
      services: ["Strategy"],
      source: "test",
      createdAt: new Date().toISOString(),
    });

    assert.ok(config.services.items.length >= 3);
    assert.doesNotThrow(() => validateSiteConfig(config));
  });

  test("upgrades saved legacy blueprints with safe visual defaults", () => {
    const legacy = structuredClone(
      generateSiteConfigFromLead({
        id: "legacy-lead",
        businessName: "Legacy Business",
        industry: "Bakery",
        source: "test",
        createdAt: new Date().toISOString(),
      }),
    );
    const blueprint = legacy.design?.blueprint as unknown as Record<string, unknown>;
    delete blueprint["accentStyle"];
    delete blueprint["sectionFlow"];

    const restored = validateSiteConfig(legacy);
    assert.equal(restored.design?.blueprint?.accentStyle, "grid");
    assert.equal(restored.design?.blueprint?.sectionFlow, "stacked");
  });
});
