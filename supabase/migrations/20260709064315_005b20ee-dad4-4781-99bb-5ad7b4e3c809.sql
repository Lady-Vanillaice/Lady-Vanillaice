DROP TRIGGER IF EXISTS trg_bookings_hold_slot ON public.bookings;
DROP TRIGGER IF EXISTS trg_bookings_sync_slot ON public.bookings;

UPDATE public.availability_slots
   SET status = 'open'
 WHERE status = 'held';