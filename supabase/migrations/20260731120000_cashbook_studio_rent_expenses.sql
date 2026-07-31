ALTER TABLE public.cash_book_entries
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'income',
  ADD COLUMN IF NOT EXISTS expense_category text,
  ADD COLUMN IF NOT EXISTS expense_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.cash_book_entries
  DROP CONSTRAINT IF EXISTS cash_book_entries_entry_type_check,
  ADD CONSTRAINT cash_book_entries_entry_type_check
    CHECK (entry_type IN ('income', 'expense')),
  DROP CONSTRAINT IF EXISTS cash_book_entries_expense_amount_check,
  ADD CONSTRAINT cash_book_entries_expense_amount_check
    CHECK (expense_amount >= 0),
  DROP CONSTRAINT IF EXISTS cash_book_entries_expense_fields_check,
  ADD CONSTRAINT cash_book_entries_expense_fields_check
    CHECK (
      entry_type = 'income'
      OR (
        expense_category IS NOT NULL
        AND expense_amount > 0
        AND payment_method IS NOT NULL
      )
    );

CREATE INDEX IF NOT EXISTS idx_cash_book_entry_type_datum
  ON public.cash_book_entries (entry_type, datum DESC);
