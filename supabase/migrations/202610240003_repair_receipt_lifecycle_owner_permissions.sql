-- Repair migration for projects that applied 202610230002 before the
-- dedicated receipt_lifecycle_owner privilege fix. Apply only after
-- 202610230002_secure_receipts.sql has completed successfully.
begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'receipt_lifecycle_owner') then
    raise exception 'receipt_lifecycle_owner is missing; apply 202610230002_secure_receipts.sql first';
  end if;
end $$;

-- Repair deployed functions regardless of the exact historical signature.
-- PostgreSQL requires both SET ROLE capability for the migration runner and
-- CREATE on public for ALTER FUNCTION ... OWNER TO. These are revoked below.
grant receipt_lifecycle_owner to postgres;
grant usage, create on schema public to receipt_lifecycle_owner;
create or replace function public.receipt_auth_uid() returns uuid language sql stable security definer set search_path=pg_catalog,auth as $$ select auth.uid() $$;
create or replace function public.receipt_auth_role() returns text language sql stable security definer set search_path=pg_catalog,auth as $$ select auth.role() $$;
revoke all on function public.receipt_auth_uid(), public.receipt_auth_role() from public, anon, authenticated, service_role;
grant execute on function public.receipt_auth_uid(), public.receipt_auth_role() to receipt_lifecycle_owner;

-- SECURITY DEFINER still observes RLS. Keep the owner constrained by request
-- JWT identity; only service-role extraction completion/failure can cross the
-- user branch through the narrowly scoped receipt_auth_role() helper.
drop policy if exists receipts_lifecycle_owner_select on public.receipts;
drop policy if exists receipts_lifecycle_owner_insert on public.receipts;
drop policy if exists receipts_lifecycle_owner_update on public.receipts;
drop policy if exists receipts_lifecycle_owner_delete on public.receipts;
create policy receipts_lifecycle_owner_select on public.receipts for select to receipt_lifecycle_owner using (user_id = public.receipt_auth_uid() or public.receipt_auth_role() = 'service_role');
create policy receipts_lifecycle_owner_insert on public.receipts for insert to receipt_lifecycle_owner with check (user_id = public.receipt_auth_uid());
create policy receipts_lifecycle_owner_update on public.receipts for update to receipt_lifecycle_owner using (user_id = public.receipt_auth_uid() or public.receipt_auth_role() = 'service_role') with check (user_id = public.receipt_auth_uid() or public.receipt_auth_role() = 'service_role');
create policy receipts_lifecycle_owner_delete on public.receipts for delete to receipt_lifecycle_owner using (user_id = public.receipt_auth_uid());

drop policy if exists expense_transactions_lifecycle_owner_select on public.expense_transactions;
drop policy if exists expense_transactions_lifecycle_owner_insert on public.expense_transactions;
drop policy if exists expense_transactions_lifecycle_owner_delete on public.expense_transactions;
create policy expense_transactions_lifecycle_owner_select on public.expense_transactions for select to receipt_lifecycle_owner using (user_id = public.receipt_auth_uid());
create policy expense_transactions_lifecycle_owner_insert on public.expense_transactions for insert to receipt_lifecycle_owner with check (user_id = public.receipt_auth_uid());
create policy expense_transactions_lifecycle_owner_delete on public.expense_transactions for delete to receipt_lifecycle_owner using (user_id = public.receipt_auth_uid());

grant select, insert, update, delete on public.receipts to receipt_lifecycle_owner;
grant select, insert, delete on public.expense_transactions to receipt_lifecycle_owner;

-- Do not hard-code argument lists: projects may have applied an earlier
-- receipt migration with pre-lease server RPC signatures. Every matching
-- public receipt RPC is transferred to the dedicated owner.
do $$
declare fn record;
begin
  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
      replace(replace(pg_get_functiondef(p.oid), 'auth.uid()', 'public.receipt_auth_uid()'), 'auth.role()', 'public.receipt_auth_role()') as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_receipt_upload', 'start_receipt_processing',
        'retry_receipt_processing', 'server_complete_receipt_extraction',
        'server_mark_receipt_failed', 'begin_receipt_delete',
        'finalize_receipt_delete', 'begin_confirmed_receipt_transaction_delete',
        'finalize_confirmed_receipt_transaction_delete', 'authorize_receipt_preview',
        'confirm_receipt_transaction'
      )
  loop
    execute fn.definition;
    execute format('alter function %I.%I(%s) owner to receipt_lifecycle_owner', fn.nspname, fn.proname, fn.args);
  end loop;
end $$;

-- PostgreSQL does not implicitly cast JSON text to a date column. Replace this
-- RPC explicitly so projects that already ran the original migration receive
-- the same correction, then return ownership to the dedicated role.
create or replace function public.confirm_receipt_transaction(p_receipt_id uuid,p_final_transaction jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$ declare r public.receipts; tx public.expense_transactions; v uuid:=public.receipt_auth_uid(); begin select * into r from public.receipts where id=p_receipt_id and user_id=v for update; if not found then raise exception 'receipt not found'; end if; if r.status='confirmed' then select * into tx from public.expense_transactions where id=r.transaction_id; return jsonb_build_object('receipt',to_jsonb(r),'transaction',to_jsonb(tx)); end if; if r.status<>'review_required' then raise exception 'receipt is not ready'; end if; if coalesce((p_final_transaction->>'amount')::numeric,0)<=0 or coalesce(p_final_transaction->>'merchant','')='' or coalesce(p_final_transaction->>'category','')='' or coalesce(p_final_transaction->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_final_transaction->>'type','') not in('income','expense') then raise exception 'invalid transaction'; end if; insert into public.expense_transactions(user_id,type,amount,transaction_date,category,merchant,note,items) values(v,p_final_transaction->>'type',(p_final_transaction->>'amount')::numeric,(p_final_transaction->>'date')::date,p_final_transaction->>'category',p_final_transaction->>'merchant',coalesce(p_final_transaction->>'note',''),coalesce(p_final_transaction->'items','[]'::jsonb)) returning * into tx; update public.receipts set status='confirmed',transaction_id=tx.id,confirmed_at=now(),updated_at=now() where id=r.id returning * into r; return jsonb_build_object('receipt',to_jsonb(r),'transaction',to_jsonb(tx)); end $$;
alter function public.confirm_receipt_transaction(uuid,jsonb) owner to receipt_lifecycle_owner;

create or replace function public.begin_confirmed_receipt_transaction_delete(p_transaction_id uuid) returns public.receipts language plpgsql security definer set search_path=pg_catalog,public as $$ declare r public.receipts; begin select * into r from public.receipts where transaction_id=p_transaction_id and user_id=public.receipt_auth_uid() for update; if not found then raise exception 'linked receipt not found'; end if; if r.status not in ('confirmed','deleting') then raise exception 'linked receipt cannot be deleted'; end if; if r.status='confirmed' then update public.receipts set status='deleting',updated_at=now() where id=r.id returning * into r; end if; return r; end $$;
create or replace function public.finalize_confirmed_receipt_transaction_delete(p_receipt_id uuid,p_transaction_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$ declare r public.receipts; tx public.expense_transactions; begin select * into r from public.receipts where id=p_receipt_id and transaction_id=p_transaction_id and user_id=public.receipt_auth_uid() and status='deleting' for update; if not found then raise exception 'linked receipt cannot be finalized'; end if; delete from public.receipts where id=r.id returning * into r; delete from public.expense_transactions where id=p_transaction_id and user_id=public.receipt_auth_uid() returning * into tx; if not found then raise exception 'linked transaction not found'; end if; return jsonb_build_object('receipt',to_jsonb(r),'transaction',to_jsonb(tx)); end $$;
alter function public.begin_confirmed_receipt_transaction_delete(uuid) owner to receipt_lifecycle_owner;
alter function public.finalize_confirmed_receipt_transaction_delete(uuid,uuid) owner to receipt_lifecycle_owner;
revoke all on function public.begin_confirmed_receipt_transaction_delete(uuid),public.finalize_confirmed_receipt_transaction_delete(uuid,uuid) from public,anon;
grant execute on function public.begin_confirmed_receipt_transaction_delete(uuid),public.finalize_confirmed_receipt_transaction_delete(uuid,uuid) to authenticated;

do $$
begin
  if not has_function_privilege('receipt_lifecycle_owner', 'public.receipt_auth_uid()', 'execute')
     or not has_function_privilege('receipt_lifecycle_owner', 'public.receipt_auth_role()', 'execute') then
    raise exception 'receipt_lifecycle_owner JWT helper privileges were not applied';
  end if;
  if exists (
    select 1
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_receipt_upload', 'start_receipt_processing',
        'retry_receipt_processing', 'server_complete_receipt_extraction',
        'server_mark_receipt_failed', 'begin_receipt_delete',
        'finalize_receipt_delete', 'begin_confirmed_receipt_transaction_delete',
        'finalize_confirmed_receipt_transaction_delete', 'authorize_receipt_preview',
        'confirm_receipt_transaction'
      )
      and p.proowner <> 'receipt_lifecycle_owner'::regrole
  ) then
    raise exception 'one or more receipt RPCs are not owned by receipt_lifecycle_owner';
  end if;
end $$;

revoke create on schema public from receipt_lifecycle_owner;
revoke receipt_lifecycle_owner from postgres;

commit;
