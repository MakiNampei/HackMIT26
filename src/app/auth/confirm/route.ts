import { NextResponse, type NextRequest } from 'next/server';
import { createAuthClient } from '@/lib/auth/server';
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  if (token_hash) {
    const client = await createAuthClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return new NextResponse('This confirmation link is invalid or expired. Return to /login and try signing in.', { status: 400 });
}
