import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { visualDirections } from "./demo-themes";
import { scaleDirectionValue, v3VisualDirectionProfiles } from "./v3-visual-directions";

describe("V3 post-generation visual directions", () => {
  test("defines a complete and visibly distinct profile for every direction", () => {
    assert.deepEqual(Object.keys(v3VisualDirectionProfiles), [...visualDirections]);
    assert.equal(
      new Set(visualDirections.map((id) => v3VisualDirectionProfiles[id].shadow)).size,
      5,
    );
    assert.equal(
      new Set(visualDirections.map((id) => v3VisualDirectionProfiles[id].radiusScale)).size,
      5,
    );
  });

  test("keeps transformed design values within renderer-safe bounds", () => {
    assert.equal(scaleDirectionValue(2, 0.2, 4, 48), 4);
    assert.equal(scaleDirectionValue(100, 2, 40, 160), 160);
    assert.equal(scaleDirectionValue(72, 0.9, 40, 160), 65);
  });
});
