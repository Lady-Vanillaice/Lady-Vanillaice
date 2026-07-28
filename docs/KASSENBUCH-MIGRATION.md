# Kassenbuch-Erweiterung aktivieren

Nach dem Merge muss die Migration `supabase/migrations/20260728213000_kassenbuch_accounting_fields.sql` einmal in Supabase ausgeführt werden.

Supabase → SQL Editor → New query → Inhalt der Migration einfügen → Run.

Danach das Vercel-Projekt neu deployen. Bestehende Buchungen bleiben erhalten; die neuen Datumsfelder sind zunächst leer und können im Kassenbuch über „Bearbeiten“ ergänzt werden.
