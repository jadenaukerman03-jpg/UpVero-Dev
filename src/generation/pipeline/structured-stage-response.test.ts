import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { z } from "zod";

import { parseStructuredStageResponse } from "./generate-site-spec-v3.server";

const schema = z.object({ copy: z.string() });

describe("structured generation response parsing", () => {
  test("accepts a completed schema-valid response", () => {
    assert.deepEqual(
      parseStructuredStageResponse(
        { status: "completed", output_text: JSON.stringify({ copy: "Specific copy" }) },
        schema,
        "copy",
      ),
      { copy: "Specific copy" },
    );
  });

  test("identifies a token-limited response before attempting JSON parsing", () => {
    assert.throws(
      () =>
        parseStructuredStageResponse(
          {
            status: "incomplete",
            incomplete_details: { reason: "max_output_tokens" },
            output_text: '{"copy":"truncated',
          },
          schema,
          "copy",
        ),
      /incomplete copy response \(max_output_tokens\)/,
    );
  });

  test("reports malformed completed JSON without including its contents", () => {
    assert.throws(
      () =>
        parseStructuredStageResponse(
          { status: "completed", output_text: '{"copy":"truncated' },
          schema,
          "copy",
        ),
      /malformed structured JSON for copy \(18 characters\)/,
    );
  });
});
