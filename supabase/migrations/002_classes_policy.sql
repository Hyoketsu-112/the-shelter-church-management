-- Allow Super Admins and Department Heads to manage classes
create policy "Admins can manage church classes"
on public.classes
for all
to authenticated
using (
  public.is_admin()
  and church_id = public.get_my_church_id()
)
with check (
  public.is_admin()
  and church_id = public.get_my_church_id()
);
