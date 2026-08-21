import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/** Return a Supabase client that is authenticated using the given token. */
export async function getSupabaseClientWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}

/**
 * Return a Supabase client authenticated with the service role key, bypassing RLS.
 *
 * For trusted server-side entry points that have no user session, such as third-party
 * webhook callbacks. Those arrive minutes after the work was kicked off, by which point any
 * Clerk token minted at kickoff has expired -- the podverse-supabase template issues tokens
 * with a 60 second lifetime. Never call this from a path that handles untrusted input
 * without authenticating the caller first.
 */
export function getSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Return a Supabase client that is authenticated using the Clerk JWT. */
export async function getSupabaseClient() {
  const { getToken } = auth();
  try {
    const supabaseAccessToken = await getToken({ template: 'podverse-supabase' });
    if (!supabaseAccessToken) {
      throw new Error('No Supabase access token');
    }
    return getSupabaseClientWithToken(supabaseAccessToken);
  } catch (error) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
}
