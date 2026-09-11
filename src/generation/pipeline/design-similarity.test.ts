import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { designSimilarity } from "./generate-site-spec-v3.server";

describe("V3 design similarity", () => {
  test("identifies duplicate structures and distinguishes different compositions", () => {
    const first = {
      paths: ["/"],
      sectionOrders: [["hero", "offer", "contact"]],
      layoutGrammar: [[[12, 7, 5, 3, "plain", "after", "base"]]],
      typography: ["Sans", "Sans", "Sans"],
    };
    const different = {
      paths: ["/", "/work"],
      sectionOrders: [
        ["hero", "process", "work-sample"],
        ["comparison", "contact"],
      ],
      layoutGrammar: [[[8, 4, 4, 1, "divided", "before", "contrast"]]],
      typography: ["Serif", "Serif", "Sans"],
    };
    assert.equal(designSimilarity(first, first), 1);
    assert.ok(designSimilarity(first, different) < 0.5);
  });
});
