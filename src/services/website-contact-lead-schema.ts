import { z } from "zod";

export const websiteLeadTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("private_demo"), token: z.string().uuid() }),
  z.object({ kind: z.literal("published_website"), websiteId: z.string().uuid() }),
]);

export const publicWebsiteLeadSchema = z.object({
  target: websiteLeadTargetSchema,
  name: z.string().trim().min(1).max(160),
  contactMethod: z.string().trim().min(1).max(320),
  service: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(3000).optional(),
  website: z.string().max(0).optional(),
});

export type PublicWebsiteLead = z.infer<typeof publicWebsiteLeadSchema>;
