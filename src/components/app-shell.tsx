import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions/new", label: "Create session", icon: PlusCircle },
  { href: "/sessions/demo-session-1", label: "My session", icon: Users },
  { href: "/sessions/demo-session-1/availability", label: "Availability", icon: CalendarDays },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>StudySync</span>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }, index) => (
            <Link className={`nav-link ${index === 0 ? "active" : ""}`} href={href} key={href}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="user-chip">
          <span className="avatar">MK</span>
          <span>
            <strong>Maki</strong><br />
            <small style={{ opacity: 0.65 }}>Demo student</small>
          </span>
          <Sparkles size={16} style={{ marginLeft: "auto" }} />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
