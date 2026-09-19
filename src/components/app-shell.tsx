import { PrimaryNav } from "@/components/primary-nav";
import {
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/auth/actions";

export function AppShell({ children, name }: { children: ReactNode; name: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>StudySync</span>
        </Link>
        <PrimaryNav />
        <div className="user-chip">
          <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{name}</strong><br />
            <small style={{ opacity: 0.65 }}>Student</small>
          </span>

        </div>
        <form action={logout}><button type="submit" className="logout-button">Log out</button></form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
