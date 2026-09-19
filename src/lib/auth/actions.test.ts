import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ createAuthClient: async () => ({ auth }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { authenticate, logout } from '@/app/auth/actions';
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
it('redirects only after successful password authentication', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: null });
  await expect(authenticate('login', {}, form())).rejects.toThrow('redirect:/dashboard');
});
it('shows an error without redirecting when credentials are rejected', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
  expect(await authenticate('login', {}, form())).toHaveProperty('error');
});
it('revokes the session before redirecting on logout', async () => {
  auth.signOut.mockResolvedValue({ error: null });
  await expect(logout()).rejects.toThrow('redirect:/login');
  expect(auth.signOut).toHaveBeenCalledOnce();
});
