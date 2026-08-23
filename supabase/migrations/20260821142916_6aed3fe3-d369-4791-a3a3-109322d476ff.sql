CREATE POLICY "Allow admins and complaint managers to create complaints"
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_perm(auth.uid(), 'Complaints.Manage'::text)
);