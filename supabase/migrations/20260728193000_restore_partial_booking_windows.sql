-- Keep day-wide availability windows open when individual bookings only
-- occupy a concrete start time and duration. The booking rows themselves,
-- including the configured buffer, remain the source of occupied ranges.

DROP TRIGGER IF EXISTS trg_bookings_hold_slot ON public.bookings;
DROP TRIGGER IF EXISTS trg_bookings_sync_slot ON public.bookings;

UPDATE public.availability_slots AS slot
   SET status = 'open'
 WHERE slot.status IN ('held', 'booked')
   AND slot.ends_at > now()
   AND EXISTS (
     SELECT 1
       FROM public.bookings AS booking
      WHERE booking.slot_id = slot.id
        AND booking.requested_start IS NOT NULL
        AND booking.duration_minutes IS NOT NULL
   );
