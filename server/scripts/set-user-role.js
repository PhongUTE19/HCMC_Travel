import { getSupabaseClient } from '../src/shared/integrations/supabase.js';

const [userId, requestedRole] = process.argv.slice(2);
const validRoles = new Set(['user', 'admin']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!uuidPattern.test(userId || '') || !validRoles.has(requestedRole)) {
  console.error('Usage: npm run set-role -- <Supabase-user-UUID> <user|admin>');
  process.exit(1);
}

const client = getSupabaseClient();
if (!client) {
  console.error('Supabase server credentials are not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY locally.');
  process.exit(1);
}

const { data: current, error: lookupError } = await client.auth.admin.getUserById(userId);
if (lookupError || !current.user) {
  console.error(`Unable to find the requested user: ${lookupError?.message || 'not found'}`);
  process.exit(1);
}

const { error: updateError } = await client.auth.admin.updateUserById(userId, {
  app_metadata: { ...(current.user.app_metadata || {}), role: requestedRole },
});
if (updateError) {
  console.error(`Unable to update role: ${updateError.message}`);
  process.exit(1);
}

console.log(`Role updated to "${requestedRole}" for user ${userId}. Ask the user to sign out and sign in again to refresh the JWT.`);
