# Calendar free-window repair

The public booking card must derive its displayed free windows from **day-wide actual bookings**, not only bookings attached to the currently selected availability slot.

Display semantics:
- confirmed and active waiting-deposit bookings block their real start/end time
- no buffer is added to the displayed free-time text
- booking validation may still enforce buffer separately
- cross-midnight bookings are applied to both affected Berlin calendar days

This prevents stale ranges such as `15:30–21:30` from being shown when another slot on the same day contains the real booking that blocks that period.
