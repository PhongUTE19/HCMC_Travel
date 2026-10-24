-- Disposable-project executable release gate. Never run in production.
-- Usage: psql "$SUPABASE_DB_URL" -v user_a='UUID' -v user_b='UUID' -f receipt_disposable_project_integration.sql
-- Requires the migration and two existing auth.users rows. Every assertion
-- raises an error (non-zero psql exit); the transaction is always rolled back.
\set ON_ERROR_STOP on
BEGIN;
create temporary table receipt_test_ids (receipt_id uuid, tx_id uuid) on commit drop;

-- Simulate authenticated user A JWT claims for SECURITY DEFINER auth.uid().
select set_config('request.jwt.claim.sub', :'user_a', true), set_config('request.jwt.claim.role', 'authenticated', true);
do $$ begin if auth.uid()::text <> current_setting('request.jwt.claim.sub',true) then raise exception 'JWT claim context unavailable'; end if; end $$;
with fixture as (select gen_random_uuid() as id), inserted as (
  insert into public.receipts(id,user_id,storage_path,original_filename,mime_type,file_size,sha256,status,extraction)
  select id, :'user_a'::uuid, :'user_a'||'/'||id||'/original','fixture.png','image/png',1,repeat('a',64),'review_required','{}' from fixture returning id
) insert into receipt_test_ids(receipt_id) select id from inserted;

-- Owner can read/preview/retry intent; direct server transition must fail.
select * from public.authorize_receipt_preview((select receipt_id from receipt_test_ids));
do $$ begin perform public.server_mark_receipt_failed((select receipt_id from receipt_test_ids),gen_random_uuid(),'X'); raise exception 'authenticated executed server-only RPC'; exception when others then if position('server context required' in sqlerrm)=0 and position('permission denied' in sqlerrm)=0 then raise; end if; end $$;

-- User B cannot read/preview/retry/delete A's receipt.
select set_config('request.jwt.claim.sub', :'user_b', true);
do $$ begin perform public.authorize_receipt_preview((select receipt_id from receipt_test_ids)); raise exception 'cross-user preview allowed'; exception when others then null; end $$;
do $$ begin perform public.retry_receipt_processing((select receipt_id from receipt_test_ids)); raise exception 'cross-user retry allowed'; exception when others then null; end $$;
do $$ begin perform public.begin_receipt_delete((select receipt_id from receipt_test_ids)); raise exception 'cross-user delete allowed'; exception when others then null; end $$;

-- Static grants/owner/search_path assertions.
do $$ declare f record; begin for f in select p.oid,p.proname,p.proowner::regrole as owner,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('server_complete_receipt_extraction','server_mark_receipt_failed') loop if f.owner::text <> 'receipt_lifecycle_owner' then raise exception 'wrong owner %',f.proname; end if; if not has_function_privilege('service_role',f.oid,'execute') or has_function_privilege('authenticated',f.oid,'execute') then raise exception 'wrong grant %',f.proname; end if; if coalesce(array_to_string(f.proconfig,','),'') not like '%search_path=pg_catalog, public%' then raise exception 'missing fixed search_path %',f.proname; end if; end loop; end $$;
do $$ begin if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and (roles && array['public','anon','authenticated']::name[] or coalesce(qual,'') ilike '%receipts%' or coalesce(with_check,'') ilike '%receipts%')) then raise exception 'unsafe storage policy found'; end if; end $$;

-- Concurrency gate: run `run_receipt_concurrent_confirm.ps1` with this
-- disposable database URL and user_a UUID. It creates a committed fixture,
-- launches two independent psql sessions, asserts one transaction/replay, and
-- cleans up the fixture. This SQL file intentionally does not fake concurrency.
ROLLBACK;
