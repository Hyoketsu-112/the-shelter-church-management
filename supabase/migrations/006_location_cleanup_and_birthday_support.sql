-- Keep only the three approved Shelter locations. This migration is intentionally
-- conservative: it deletes obsolete locations only when they have no attached records.
DO $$
DECLARE obsolete uuid;
BEGIN
  FOR obsolete IN SELECT id FROM public.churches WHERE lower(trim(name)) IN ('the shelter','excellent church') OR location_key='excellent' LOOP
    IF EXISTS (SELECT 1 FROM public.children WHERE church_id=obsolete)
       OR EXISTS (SELECT 1 FROM public.classes WHERE church_id=obsolete)
       OR EXISTS (SELECT 1 FROM public.attendance WHERE church_id=obsolete)
       OR EXISTS (SELECT 1 FROM public.profiles WHERE church_id=obsolete) THEN
      UPDATE public.churches SET is_active=false WHERE id=obsolete;
    ELSE
      DELETE FROM public.user_church_access WHERE church_id=obsolete;
      DELETE FROM public.churches WHERE id=obsolete;
    END IF;
  END LOOP;
END $$;

-- Fast birthday lookups by active church/date of birth.
CREATE INDEX IF NOT EXISTS children_birthday_lookup_idx
ON public.children(church_id, date_of_birth)
WHERE archived_at IS NULL;
