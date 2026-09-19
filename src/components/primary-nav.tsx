"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, PlusCircle } from "lucide-react";
const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/sessions/new", label: "Create session", icon: PlusCircle },
];
export function PrimaryNav() {
  const pathname = usePathname();
  return <nav className="nav-list" aria-label="Primary navigation">{items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href === "/courses" && pathname.startsWith("/courses/"));
    return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>;
  })}</nav>;
}
