import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import type { ImageRequirement } from "@/data/visuals";
import { findPexelsImage } from "./pexels-image-provider.server";

const originalApiKey = process.env["PEXELS_API_KEY"];
const originalFetch = globalThis.fetch;

const requirement: ImageRequirement = {
  section: "hero",
  dimensions: "1536x1024",
  orientation: "landscape",
  searchQuery: "finished residential roofing exterior",
  searchQueries: ["roof replacement home exterior", "architectural roof detail"],
  alt: "A completed residential roofing project",
};

afterEach(() => {
  if (originalApiKey === undefined) delete process.env["PEXELS_API_KEY"];
  else process.env["PEXELS_API_KEY"] = originalApiKey;
  globalThis.fetch = originalFetch;
});

describe("Pexels image provider", () => {
  test("rejects an unconfigured server before making a provider request", async () => {
    delete process.env["PEXELS_API_KEY"];
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response();
    }) as typeof fetch;

    await assert.rejects(
      () => findPexelsImage(requirement, new Set()),
      /Pexels image sourcing is not configured/,
    );
    assert.equal(fetchCalled, false);
  });

  test("uses the first relevant Pexels result without spending extra search requests", async () => {
    process.env["PEXELS_API_KEY"] = "test-only-key";
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          photos: [
            {
              id: 123,
              width: 1800,
              height: 1200,
              url: "https://www.pexels.com/photo/finished-residential-roofing-123/",
              photographer: "Test Photographer",
              photographer_url: "https://www.pexels.com/@test-photographer",
              alt: "Finished residential roofing exterior",
              src: {
                large2x: "https://images.pexels.com/photos/123/pexels-photo-123.jpeg",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const asset = await findPexelsImage(requirement, new Set());

    assert.equal(fetchCount, 1);
    assert.equal(asset?.sourceType, "pexels");
    assert.equal(new URL(asset?.src ?? "").hostname, "images.pexels.com");
  });
});
