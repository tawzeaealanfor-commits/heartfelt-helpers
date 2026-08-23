ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS rating smallint,
  ADD COLUMN IF NOT EXISTS author_id uuid DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'complaints_rating_range'
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.owns_order_as_seller(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.profiles p ON p.seller_id = o.seller_id
    WHERE o.id = _order_id AND p.id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Allow admins and complaint managers to create complaints" ON public.complaints;
CREATE POLICY "complaints_insert" ON public.complaints
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_perm(auth.uid(), 'Complaints.Manage'::text)
  OR public.owns_order_as_seller(auth.uid(), order_id)
);

DROP POLICY IF EXISTS complaints_seller_read ON public.complaints;
CREATE POLICY complaints_seller_read ON public.complaints
FOR SELECT TO authenticated
USING (public.owns_order_as_seller(auth.uid(), order_id));