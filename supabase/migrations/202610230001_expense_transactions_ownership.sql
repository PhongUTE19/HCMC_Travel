-- Phase 2 preparation only. Do not apply this migration to a remote project
-- without the separate approval recorded in ADR 0001.
--
-- Preconditions:
--   * public.expense_transactions already exists.
--   * It is empty. Existing rows cannot safely be assigned an owner by this
--     migration, so the migration fails rather than guessing a user_id.
--
-- The existing transaction columns and API field names are intentionally not
-- changed. In particular, the date field is transaction_date.

begin;

do $$
begin
  if to_regclass('public.expense_transactions') is null then
    raise exception
      'Precondition failed: public.expense_transactions must exist before applying this migration';
  end if;

  if exists (select 1 from public.expense_transactions limit 1) then
    raise exception
      'Precondition failed: public.expense_transactions must be empty; backfill ownership in an approved migration first';
  end if;
end;
$$;

-- Add ownership only after the empty-table precondition has been checked.
alter table public.expense_transactions
  add column user_id uuid not null
    references auth.users(id) on delete cascade;

-- A missing app_metadata.role is interpreted as "user" by the backend.
-- Do not attach a general trigger to auth.users: it could overwrite an
-- intentional role set through a trusted administrative provisioning flow.
-- Only a privileged server-side Supabase Admin API action may assign admin.

create index expense_transactions_user_id_transaction_date_idx
  on public.expense_transactions (user_id, transaction_date desc);

alter table public.expense_transactions enable row level security;

create policy "expense_transactions_select_own"
  on public.expense_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "expense_transactions_insert_own"
  on public.expense_transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "expense_transactions_update_own"
  on public.expense_transactions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expense_transactions_delete_own"
  on public.expense_transactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
