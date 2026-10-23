-- Post-migration database contract test.
--
-- Run only against an isolated Supabase test project after applying
-- 202610230001_expense_transactions_ownership.sql. It makes no persistent
-- changes and intentionally does not need to know the application's other
-- transaction columns.
--
-- This test validates the catalog-level RLS contract. Behavioural cross-user
-- CRUD tests belong in the application integration suite, where valid payloads
-- for the pre-existing transaction schema are available.

begin;

do $$
declare
  policy_record record;
  expected_policy_count integer := 0;
begin
  if not exists (
    select 1
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_type data_type on data_type.oid = attribute.atttypid
    where namespace.nspname = 'public'
      and relation.relname = 'expense_transactions'
      and attribute.attname = 'user_id'
      and attribute.attnotnull
      and data_type.typname = 'uuid'
      and not attribute.attisdropped
  ) then
    raise exception 'Expected non-null uuid public.expense_transactions.user_id';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint
    join pg_class relation on relation.oid = constraint.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_class referenced_relation on referenced_relation.oid = constraint.confrelid
    join pg_namespace referenced_namespace on referenced_namespace.oid = referenced_relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'expense_transactions'
      and constraint.contype = 'f'
      and referenced_namespace.nspname = 'auth'
      and referenced_relation.relname = 'users'
      and constraint.confdeltype = 'c'
  ) then
    raise exception 'Expected user_id foreign key to auth.users with ON DELETE CASCADE';
  end if;

  if not exists (
    select 1 from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'expense_transactions'
      and relation.relrowsecurity
  ) then
    raise exception 'Expected RLS to be enabled on public.expense_transactions';
  end if;

  for policy_record in
    select policyname, cmd, roles::text, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_transactions'
      and policyname in (
        'expense_transactions_select_own',
        'expense_transactions_insert_own',
        'expense_transactions_update_own',
        'expense_transactions_delete_own'
      )
  loop
    expected_policy_count := expected_policy_count + 1;

    if policy_record.roles <> '{authenticated}' then
      raise exception 'Policy % must be limited to authenticated, got %',
        policy_record.policyname, policy_record.roles;
    end if;

    if policy_record.policyname = 'expense_transactions_select_own'
      and (policy_record.cmd <> 'SELECT' or policy_record.qual not like '%auth.uid()%user_id%') then
      raise exception 'SELECT ownership policy does not enforce auth.uid() = user_id';
    end if;

    if policy_record.policyname = 'expense_transactions_insert_own'
      and (policy_record.cmd <> 'INSERT' or policy_record.with_check not like '%auth.uid()%user_id%') then
      raise exception 'INSERT ownership policy does not enforce auth.uid() = user_id';
    end if;

    if policy_record.policyname = 'expense_transactions_update_own'
      and (policy_record.cmd <> 'UPDATE'
        or policy_record.qual not like '%auth.uid()%user_id%'
        or policy_record.with_check not like '%auth.uid()%user_id%') then
      raise exception 'UPDATE ownership policy does not enforce auth.uid() = user_id';
    end if;

    if policy_record.policyname = 'expense_transactions_delete_own'
      and (policy_record.cmd <> 'DELETE' or policy_record.qual not like '%auth.uid()%user_id%') then
      raise exception 'DELETE ownership policy does not enforce auth.uid() = user_id';
    end if;
  end loop;

  if expected_policy_count <> 4 then
    raise exception 'Expected four owner-only policies, found %', expected_policy_count;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'expense_transactions'
      and indexname = 'expense_transactions_user_id_transaction_date_idx'
      and indexdef like '%(user_id, transaction_date DESC)%'
  ) then
    raise exception 'Expected (user_id, transaction_date desc) index';
  end if;

  -- A missing app_metadata.role intentionally defaults to user in trusted
  -- backend authorization code. No trigger is installed on auth.users, which
  -- avoids overwriting roles assigned through the privileged Admin API.
end;
$$;

rollback;
