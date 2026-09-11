# UpVero Generative Pipeline V3

V3 produces a business-specific, validated `SiteSpecV3` before rendering. It does not choose a complete template or a named visual-direction preset. Existing saved V1/V2 websites remain readable through their compatibility renderers; every newly generated website uses V3.

## Stages and boundaries

1. **Research** converts form data and optional public-web research into an immutable packet. Every fact is labeled `user-supplied`, `publicly-verified`, `reasonable-inference`, or `unknown`. Public facts retain their source URL.
2. **Strategy** defines audiences, conversion objectives, concerns, value proposition, trust plan, voice, and journey.
3. **Information architecture** creates a site-specific sitemap and ordered section jobs. Section IDs are unique across the site.
4. **Art direction** creates semantic palette, typography, spacing, surfaces, imagery, and reduced-motion rules.
5. **Layout composition** assigns numeric grid constraints and responsive behavior to each planned section. It does not select a finished layout.
6. **Copy** writes only the blocks required by the architecture. Unsupported reviews, statistics, credentials, addresses, prices, guarantees, and claims are forbidden.
7. **Image planning and selection** creates variable media requirements. The server searches Pexels, records attribution and source URLs, and preserves partial valid results.
8. **Specification validation** uses Zod cross-document validation, safe-URL rules, concrete-offer checks, generic-language checks, deterministic contrast repair, and structural-similarity checks.
9. **Rendering** interprets the constraint document through low-level accessible primitives.
10. **QA and repair** use the existing DOM contrast/overflow audit and the refinement endpoint. The V3 ledger migration adds durable stage, artifact, defect, fingerprint, and preference records for the automated worker/visual-evaluation expansion.

All OpenAI and Pexels calls remain behind the existing authenticated server functions, ownership checks, entitlement checks, and quotas. No provider key enters the browser bundle.

## Model/provider configuration

The OpenAI provider is isolated in `generate-site-spec-v3.server.ts`. `OPENAI_SITE_MODEL` can replace it without changing schemas or renderers. Defaults are:

- Efficient: `gpt-5.4-nano`
- Studio: `gpt-5.4-mini`
- Signature: `gpt-5.4`

Pexels remains the licensed image provider. A future provider implements the same media-plan boundary and must return image URL, source URL, provider, attribution, alt text, focal point, and licensing metadata.

## Cost controls

- Stage outputs are bounded with strict JSON schemas and maximum token limits.
- Transient or malformed stages retry at most once.
- Each request has a 90-second timeout.
- Existing per-user quotas and admin daily budgets run before paid calls.
- Unaffected stages are represented as separate artifacts so a worker can resume or repair them independently after the ledger migration is applied.
- Token usage, models, estimated cost, stage duration, attempts, failures, and final quality score are recorded.

## Benchmarks

UpVero does not claim parity with another product without comparative evidence. Release targets are:

| Metric                                           | Required target                        |
| ------------------------------------------------ | -------------------------------------- |
| Unsupported factual claims                       | 0                                      |
| Normal-text contrast                             | 100% at 4.5:1 or higher                |
| Large text/UI contrast                           | 100% at 3:1 or higher                  |
| Critical/serious accessibility defects           | 0                                      |
| Broken selected images                           | 0                                      |
| Mobile/tablet/laptop/desktop overflow failures   | 0                                      |
| Generation success within two attempts           | at least 97%                           |
| Average repair iterations                        | at most 1.2                            |
| Visual quality score                             | at least 85/100; no dimension below 75 |
| Duplicate normalized structure within recent 200 | 0                                      |

Time and cost targets must be measured in production telemetry rather than assumed. Initial planning ceilings are 3 minutes/$0.25 for Efficient, 8 minutes/$1.25 for Studio, and $4 for Signature.

## Database rollout

Apply `20260910120000_add_generation_pipeline_v3_ledger.sql` before relying on durable V3 stage artifacts. The migration is additive, enables RLS on every new table, grants no browser-role access, and does not alter existing customer, billing, authentication, or website rows.
