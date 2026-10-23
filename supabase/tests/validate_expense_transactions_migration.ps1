$ErrorActionPreference = 'Stop'

$migrationPath = Join-Path $PSScriptRoot '..\migrations\202610230001_expense_transactions_ownership.sql'
$sql = Get-Content -Raw $migrationPath

$requiredFragments = @(
  'public.expense_transactions must be empty',
  'add column user_id uuid not null',
  'references auth.users(id) on delete cascade',
  '(user_id, transaction_date desc)',
  'enable row level security',
  'to authenticated',
  'using (auth.uid() = user_id)',
  'with check (auth.uid() = user_id)',
  'missing app_metadata.role is interpreted as "user"',
  'Supabase Admin API action may assign admin'
)

foreach ($fragment in $requiredFragments) {
  if (-not $sql.Contains($fragment)) {
    throw "Migration is missing required security fragment: $fragment"
  }
}

if ($sql -match '\(user_id,\s*date\s+desc\)') {
  throw 'Migration incorrectly indexes date instead of transaction_date.'
}

Write-Output 'Expense transaction ownership migration static validation passed.'
