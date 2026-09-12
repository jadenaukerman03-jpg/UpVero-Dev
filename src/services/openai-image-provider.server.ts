import type { SiteSpecV3 } from "@/generation/contracts/site-spec-v3";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "demo-images";

function sizeForAspectRatio(
  aspectRatio: SiteSpecV3["media"]["assets"][number]["aspectRatio"],
): "1024x1024" | "1536x1024" | "1024x1536" {
  const [width, height] = aspectRatio.split(":").map(Number);
  if (width === height) return "1024x1024";
  return width! > height! ? "1536x1024" : "1024x1536";
}

/**
 * Bespoke, on-brand AI imagery for a single V3 media-plan asset — built from the same
 * art-direction the model authored for this exact business (designSystem.imagery), rather than
 * generic stock-photo search. Persisted to Supabase Storage since OpenAI doesn't host generated
 * images durably. Returns undefined (caller falls back to Pexels) if unconfigured or it fails.
 */
export async function generateAiImageForAsset(
  asset: SiteSpecV3["media"]["assets"][number],
  imagery: SiteSpecV3["designSystem"]["imagery"],
  conceptName: string,
): Promise<{ imageUrl: string; provider: string } | undefined> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    console.error(`[ai-image] skipped ${asset.id}: OPENAI_API_KEY is not configured`);
    return undefined;
  }
  if (process.env["IMAGE_PROVIDER"] === "pexels") {
    console.error(`[ai-image] skipped ${asset.id}: IMAGE_PROVIDER=pexels`);
    return undefined;
  }

  const cropStyle: Record<typeof imagery.cropBehavior, string> = {
    documentary: "candid documentary photography, natural unposed moments",
    architectural: "clean architectural photography, strong geometric composition",
    editorial: "editorial magazine-style photography, considered styling",
    "product-focused": "crisp product/detail photography, shallow depth of field",
  };
  const prompt = `Original, photorealistic ${cropStyle[imagery.cropBehavior]} for a website. Visual concept: "${conceptName}". Direction: ${imagery.direction}. Subject: ${asset.query}. Purpose: ${asset.purpose}. No people, no faces, no hands, no human subjects, no text, no letters, no numbers, no logos, no watermarks, no UI elements. Natural lighting, strong composition, calm negative space suitable for a website crop.`;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const response = await client.images.generate({
      model: process.env["OPENAI_IMAGE_MODEL"] || "gpt-image-1",
      prompt,
      size: sizeForAspectRatio(asset.aspectRatio),
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`[ai-image] ${asset.id}: no b64_json in response`, JSON.stringify(response));
      return undefined;
    }

    const bytes = Buffer.from(b64, "base64");
    const cacheKey = `ai-${asset.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${cacheKey}.png`;

    const admin = createSupabaseAdminClient();
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error(
        `[ai-image] ${asset.id}: Supabase Storage upload failed: ${JSON.stringify(uploadError)}`,
      );
      return undefined;
    }
    const { data: publicUrl } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    console.error(`[ai-image] ${asset.id}: succeeded -> ${publicUrl.publicUrl}`);
    return { imageUrl: publicUrl.publicUrl, provider: "OpenAI" };
  } catch (error) {
    const err = error as { status?: unknown; code?: unknown; message?: unknown; name?: unknown };
    console.error(
      `[ai-image] ${asset.id}: generation threw — status=${err?.status} code=${err?.code} name=${err?.name} message=${err?.message}`,
    );
    return undefined;
  }
}
