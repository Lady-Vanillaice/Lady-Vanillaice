import { z } from "zod";

export const privateBookingLocationSchema = z.object({
  name: z.string().trim().max(120),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(4000),
});
export type PrivateBookingLocation = z.infer<typeof privateBookingLocationSchema>;
