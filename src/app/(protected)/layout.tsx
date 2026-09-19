export const dynamic = 'force-dynamic';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth/server';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell name={user.user_metadata.display_name || user.email?.split('@')[0] || 'Student'}>{children}</AppShell>;
}
