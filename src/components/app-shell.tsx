import {
  BookOpen,
  LayoutDashboard,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/auth/actions";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/sessions/new", label: "Create session", icon: PlusCircle },
];

export function AppShell({ children, name }: { children: ReactNode; name: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>StudySync</span>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }, index) => (
            <Link className={`nav-link ${index === 0 ? "active" : ""}`} href={href} key={href} aria-label={label}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
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
