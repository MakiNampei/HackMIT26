import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ createAuthClient: async () => ({ auth }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { authenticate, logout, resendConfirmation } from '@/app/auth/actions';
function form(confirm = 'test-password') {
  const data = new FormData();
  data.set('email', 'student@example.test'); data.set('password', 'test-password');
  data.set('name', 'Test Student'); data.set('confirmPassword', confirm);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
});
afterEach(() => vi.unstubAllEnvs());
it('rejects mismatched passwords before registering', async () => {
  expect(await authenticate('register', {}, form('different'))).toEqual({ error: 'Passwords do not match.' });
  expect(auth.signUp).not.toHaveBeenCalled();
});
it('requires email verification when signup has no session', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  expect(await authenticate('register', {}, form())).toHaveProperty('message');
  expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { data: { display_name: 'Test Student' } } }));
});
it('explains when signup rolls back because confirmation email cannot be sent', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: { code: 'unexpected_failure' } });
  expect(await authenticate('register', {}, form())).toEqual({
    error: 'Registration could not be completed because the confirmation email could not be sent. No usable account was created. Please try again later or contact the StudySync team.',
  });
});
it('redirects only after successful password authentication', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: null });
  await expect(authenticate('login', {}, form())).rejects.toThrow('redirect:/dashboard');
});
it('shows an error without redirecting when credentials are rejected', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
  expect(await authenticate('login', {}, form())).toEqual({ error: 'Email or password is incorrect. If you just registered, confirm your email first.' });
});
it('distinguishes an existing unconfirmed account at login', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { code: 'email_not_confirmed' } });
  expect(await authenticate('login', {}, form())).toEqual({ error: 'Your account exists, but your email is not confirmed. Resend the confirmation email below.' });
});
it('resends signup confirmation without exposing whether an account exists', async () => {
  auth.resend.mockResolvedValue({ error: null });
  const data = new FormData();
  data.set('email', 'student@example.test');
  expect(await resendConfirmation({}, data)).toEqual({ message: 'If an unconfirmed account exists for this email, a new confirmation link has been sent.' });
  expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'student@example.test' });
});
it('revokes the session before redirecting on logout', async () => {
  auth.signOut.mockResolvedValue({ error: null });
  await expect(logout()).rejects.toThrow('redirect:/login');
  expect(auth.signOut).toHaveBeenCalledOnce();
});
