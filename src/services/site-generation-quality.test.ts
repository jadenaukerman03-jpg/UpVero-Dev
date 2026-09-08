import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { validateSiteConfig } from "@/data/site";
import { generateSiteConfigFromLead } from "./generate-site-config-from-lead";
import { findBannedGenericPhrases } from "./site-generation-quality";

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
