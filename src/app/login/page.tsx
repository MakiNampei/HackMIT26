export const dynamic = 'force-dynamic';
import { AuthForm } from '@/components/auth-form';
import { getUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
export default async function LoginPage() {
  if (await getUser()) redirect('/dashboard');
  return <AuthForm mode="login" />;
}
