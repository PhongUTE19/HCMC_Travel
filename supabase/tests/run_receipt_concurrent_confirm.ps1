param(
  [Parameter(Mandatory = $true)][string]$DatabaseUrl,
  [Parameter(Mandatory = $true)][string]$UserAId,
  [string]$Psql = 'psql'
)
$ErrorActionPreference = 'Stop'
# Disposable-project release gate only. Requires psql and the approved receipt migration.
function Invoke-Sql([string]$Sql) { & $Psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -Atqc $Sql }
try {
  $fixtureSql = "begin; select set_config('request.jwt.claim.sub','$UserAId',true),set_config('request.jwt.claim.role','authenticated',true); with x as (select gen_random_uuid() id), r as (insert into public.receipts(id,user_id,storage_path,original_filename,mime_type,file_size,sha256,status,extraction) select id,'$UserAId'::uuid,'$UserAId/'||id||'/original','concurrent.png','image/png',1,repeat('a',64),'review_required','{}'::jsonb from x returning id) select id from r; commit;"
  $receiptId = (Invoke-Sql $fixtureSql | Select-Object -Last 1).Trim()
  if ($receiptId -notmatch '^[0-9a-f-]{36}$') { throw "Fixture creation did not return a receipt UUID: $receiptId" }
  $payload = '{"type":"expense","amount":1,"date":"2026-10-24","category":"Food & dining","merchant":"Concurrency fixture","note":"","items":[]}'
  # SET LOCAL claims and confirmation are deliberately one psql transaction.
  # -qAt emits only the JSON SELECT tuple; command tags are not parsed.
  $sql = "BEGIN; SET LOCAL request.jwt.claim.sub = '$UserAId'; SET LOCAL request.jwt.claim.role = 'authenticated'; SELECT public.confirm_receipt_transaction('$receiptId'::uuid,'$payload'::jsonb); COMMIT;"
  $job1 = Start-Job -ScriptBlock { param($exe,$url,$q) & $exe $url -X -v ON_ERROR_STOP=1 -qAtc $q } -ArgumentList $Psql,$DatabaseUrl,$sql
  $job2 = Start-Job -ScriptBlock { param($exe,$url,$q) & $exe $url -X -v ON_ERROR_STOP=1 -qAtc $q } -ArgumentList $Psql,$DatabaseUrl,$sql
  $a = ((Receive-Job -Job $job1 -Wait -AutoRemoveJob | Where-Object { $_ -match '^\{' } | Select-Object -Last 1) | ConvertFrom-Json)
  $b = ((Receive-Job -Job $job2 -Wait -AutoRemoveJob | Where-Object { $_ -match '^\{' } | Select-Object -Last 1) | ConvertFrom-Json)
  $txA = $a.transaction.id; $txB = $b.transaction.id
  if (!$txA -or $txA -ne $txB) { throw "Concurrent confirms did not replay one transaction: $txA / $txB" }
  $count = (Invoke-Sql "select count(*) from public.expense_transactions where id='$txA'::uuid and user_id='$UserAId'::uuid;").Trim()
  if ($count -ne '1') { throw "Expected exactly one linked transaction, found $count" }
  Write-Host "PASS concurrent confirmation: receipt=$receiptId transaction=$txA"
} finally {
  if ($receiptId) { try { Invoke-Sql "begin; delete from public.receipts where id='$receiptId'::uuid; delete from public.expense_transactions where id='$txA'::uuid and user_id='$UserAId'::uuid; commit;" | Out-Null } catch { Write-Warning "Cleanup failed; disposable DB may retain receipt/transaction. Receipt: $receiptId Transaction: $txA" } }
}
