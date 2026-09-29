import { z } from "zod";

export const privateBookingLocationSchema = z.object({
  mode: z.enum(["studio", "private"]).optional(),
  name: z.string().trim().max(120),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(4000),
}).transform((value) => ({ ...value, mode: value.mode ?? (value.address ? "private" as const : "studio" as const) }));
export type PrivateBookingLocation = z.infer<typeof privateBookingLocationSchema>;
