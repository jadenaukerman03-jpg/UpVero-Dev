import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { sourceImagesForSite } from "./source-images-for-site.server";

const originalApiKey = process.env["PEXELS_API_KEY"];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env["PEXELS_API_KEY"] = "test-only-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env["PEXELS_API_KEY"];
  else process.env["PEXELS_API_KEY"] = originalApiKey;
});

describe("site image sourcing", () => {
  test("preserves valid Pexels images when another section has no result", async () => {
    let requestCount = 0;
    globalThis.fetch = (async () => {
      requestCount += 1;
      return new Response(
        JSON.stringify({
          photos:
            requestCount === 1
              ? [
                  {
                    id: 123,
                    width: 2400,
                    height: 1600,
                    url: "https://www.pexels.com/photo/123/",
                    photographer: "Example Photographer",
                    photographer_url: "https://www.pexels.com/@example/",
                    alt: "Fresh green lawn and landscaped garden",
                    src: {
                      large2x: "https://images.pexels.com/photos/123/pexels-photo-123.jpeg",
                    },
                  },
                ]
              : [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await sourceImagesForSite({
      lead: {
        id: "partial-image-test",
        businessName: "Green Lawn",
        industry: "Lawn care",
        services: ["Lawn mowing"],
        createdAt: new Date().toISOString(),
      },
      style: "modern",
      sections: ["hero", "about"],
    });

    assert.equal(result.assets.length, 1);
    assert.equal(result.assets[0]?.section, "hero");
    assert.deepEqual(result.unavailableSections, ["about"]);
  });
});
