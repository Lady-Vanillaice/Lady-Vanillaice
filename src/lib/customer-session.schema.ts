import { z } from "zod";
export const customerEmailSchema = z.string().trim().email().max(255).transform(value => value.toLowerCase());
export const customerSessionSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Bitte ein gültiges Datum angeben."),
  time: z.string().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/),
  place: z.string().trim().max(300),
  activities: z.string().trim().max(6000),
  liked: z.string().trim().max(3000),
  disliked: z.string().trim().max(3000),
  nextTime: z.string().trim().max(3000),
  notes: z.string().trim().max(6000),
});
export type CustomerSession = z.infer<typeof customerSessionSchema>;
export const storedCustomerSessionSchema = customerSessionSchema.extend({ updatedAt: z.string().datetime() });
