'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/auth/server';

export type AuthState = { error?: string; message?: string };
const credentials = z.object({ email: z.email(), password: z.string().min(1).max(128) });
export async function authenticate(mode: 'login' | 'register', _state: AuthState, form: FormData): Promise<AuthState> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { error: 'Sign-in is not available yet. Please contact the StudySync team.' };
  const parsed = credentials.safeParse({ email: String(form.get('email') || '').trim(), password: form.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  if (mode === 'register' && parsed.data.password.length < 8) return { error: 'Use a password with at least 8 characters.' };
  const name = String(form.get('name') || '').trim();
  if (mode === 'register' && (!name || name.length > 80)) return { error: 'Enter your name (up to 80 characters).' };
  if (mode === 'register' && form.get('confirmPassword') !== parsed.data.password) return { error: 'Passwords do not match.' };
  try {
    const client = await createAuthClient();
    if (mode === 'register') {
      const { data, error } = await client.auth.signUp({ ...parsed.data, options: { data: { display_name: name } } });
      if (error) return { error: error.code === 'over_email_send_rate_limit' ? 'Too many attempts. Please wait before trying again.' : 'Unable to create your account. Try again, or log in if you already have an account.' };
      if (!data.session) return { message: 'Check your email to confirm your account, then return here to log in.' };
    } else {
      const { error } = await client.auth.signInWithPassword(parsed.data);
      if (error) return { error: 'Unable to log in. Check your email and password, and confirm your email first.' };
    }
  } catch { return { error: 'We could not connect. Please try again shortly.' }; }
  redirect('/dashboard');
}
export async function logout() {
  const client = await createAuthClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error('Could not sign out. Please try again.');
  redirect('/login');
}
