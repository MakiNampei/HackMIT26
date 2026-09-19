'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { BookOpen, ArrowRight, Users, CalendarCheck, ShieldCheck } from 'lucide-react';
import { authenticate, resendConfirmation } from '@/app/auth/actions';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), {});
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmation, {});
  return <main className="auth-page">
    <section className="auth-story">
      <Link href="/login" className="brand"><span className="brand-mark"><BookOpen size={22} /></span>StudySync</Link>
      <div><p className="eyebrow">BETTER TOGETHER</p><h1>A little less chaos.<br />A lot more learning.</h1><p className="auth-intro">Find your people, make a plan, and turn your next study session into real progress.</p>
      <div className="auth-benefits"><p><Users size={20} /> Meet classmates working on the same things</p><p><CalendarCheck size={20} /> Find a time that works for everyone</p><p><ShieldCheck size={20} /> Collaborate with confidence</p></div></div>
      <small>Your next great study session starts here.</small>
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <p className="eyebrow">YOUR STUDY CIRCLE AWAITS</p><h2>{register ? 'Create your account' : 'Welcome back.'}</h2><p className="subtle">{register ? 'A shared goal starts with a simple introduction.' : 'Log in and pick up where your study group left off.'}</p>
      <form action={action} className="auth-form">
        {register && <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Your name" maxLength={80} required /></div>}
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@university.edu" required /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={128} placeholder={register ? 'At least 8 characters' : 'Enter your password'} required /></div>
        {register && <div className="field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div>}
        {state.error && <p className="error" role="alert">{state.error}</p>}
        {state.message && <p className="notice" role="status">{state.message}</p>}
        <button disabled={pending} type="submit">{pending ? 'Please wait…' : register ? 'Create account' : 'Log in'}<ArrowRight size={18} /></button>
      </form>
      {!register && <form action={resendAction} className="auth-resend-form">
        <label htmlFor="resend-email">Registered but not confirmed?</label>
        <div className="auth-resend-row">
          <input id="resend-email" name="email" type="email" autoComplete="email" placeholder="you@university.edu" required />
          <button className="secondary" disabled={resendPending} type="submit">{resendPending ? 'Sending…' : 'Resend email'}</button>
        </div>
        {resendState.error && <p className="error" role="alert">{resendState.error}</p>}
        {resendState.message && <p className="notice" role="status">{resendState.message}</p>}
      </form>}
      <p className="auth-switch">{register ? 'Already have an account?' : 'New to StudySync?'} <Link href={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></p>
    </div></section>
  </main>;
}
