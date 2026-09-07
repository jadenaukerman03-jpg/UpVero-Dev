import { z } from "zod";

export const supportContactMessageSchema = z.object({
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(3000),
  // Visually hidden honeypot: normal visitors never populate this field.
  website: z.string().max(0).optional(),
});

export type SupportContactMessage = z.infer<typeof supportContactMessageSchema>;
