import { auth } from '@clerk/nextjs/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthButtons } from './AuthButtons';

/** Create a new Users table record, if needed, for the currently logged-in user. */
export async function createUser() {
  const { userId, getToken } = auth();
  if (!userId) {
    return;
  }
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('Users').upsert({}).eq('id', userId).select('*');
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

export async function SignupOrLogin({ text }: { text?: string }) {
  await createUser();
  return <AuthButtons text={text} />;
}
