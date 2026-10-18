"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/invitations", label: "My invitations" },
  { href: "/invitations/rsvps", label: "RSVPs" },
  { href: "/invitations/send", label: "Send to guests" },
  { href: "/invitations/canva", label: "Canva" },
];

/** Navigation between the EverAfter Studio pages inside the planner. */
export function StudioTabs() {
  const path = usePathname();
  return (
    <nav className="wos-tabs self-start" aria-label="EverAfter Studio">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="wos-tab" aria-current={path === t.href ? "page" : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
