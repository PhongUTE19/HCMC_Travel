-- Static/post-migration contract assertions for 202610230002_secure_receipts.sql.
-- Run only in an isolated Supabase test database after the migration is approved.
do $$
declare fn record;
begin
  for fn in select p.proname, p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('server_complete_receipt_extraction','server_mark_receipt_failed') loop
    if has_function_privilege('authenticated', format('public.%I',fn.proname), 'execute') then raise exception 'authenticated must not execute %',fn.proname; end if;
    if not has_function_privilege('service_role', format('public.%I',fn.proname), 'execute') then raise exception 'service_role must execute %',fn.proname; end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'receipt_lifecycle_owner') then
    raise exception 'receipt_lifecycle_owner is missing';
  end if;
  if has_schema_privilege('receipt_lifecycle_owner', 'public', 'create') then
    raise exception 'receipt_lifecycle_owner must not retain public CREATE';
  end if;
  if not has_function_privilege('receipt_lifecycle_owner', 'public.receipt_auth_uid()', 'execute')
     or not has_function_privilege('receipt_lifecycle_owner', 'public.receipt_auth_role()', 'execute') then
    raise exception 'receipt_lifecycle_owner lacks required JWT helper access';
  end if;
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('receipt_auth_uid', 'receipt_auth_role')
      and p.prosecdef
      and p.proowner = 'postgres'::regrole
  ) then
    raise exception 'JWT helpers must be postgres-owned SECURITY DEFINER functions';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'receipts' and policyname = 'receipts_lifecycle_owner_update')
     or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'expense_transactions' and policyname = 'expense_transactions_lifecycle_owner_insert') then
    raise exception 'dedicated lifecycle-owner RLS policies are missing';
  end if;
end $$;
