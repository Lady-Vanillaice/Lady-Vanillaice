# Cashbook stabilization

The final cashbook build pass runs after all legacy patch scripts and enforces three invariants before Vite builds:

1. `isPureCustomContent` is always defined in the booking mapper before any use.
2. Custom-content helper logic exists when referenced.
3. Unfinished booking income rows remain visible across month boundaries.

If any invariant cannot be established, the build fails instead of shipping a runtime-broken Kassenbuch.
