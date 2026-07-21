
CREATE TABLE public.cash_book_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio TEXT NOT NULL,
  datum DATE NOT NULL,
  kunde TEXT NOT NULL,
  anzahlung NUMERIC(10,2) NOT NULL DEFAULT 0,
  bar NUMERIC(10,2) NOT NULL DEFAULT 0,
  gesamt NUMERIC(10,2) GENERATED ALWAYS AS (anzahlung + bar) STORED,
  notiz TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_book_entries TO authenticated;
GRANT ALL ON public.cash_book_entries TO service_role;

ALTER TABLE public.cash_book_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cash book"
  ON public.cash_book_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert cash book"
  ON public.cash_book_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cash book"
  ON public.cash_book_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cash book"
  ON public.cash_book_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cash_book_entries_updated_at
  BEFORE UPDATE ON public.cash_book_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_cash_book_datum ON public.cash_book_entries (datum DESC);
