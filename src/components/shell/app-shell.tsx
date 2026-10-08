"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CreditCard,
  FileBarChart,
  FolderClosed,
  Home,
  ListChecks,
  MessageCircleQuestion,
  Plus,
  Search,
  Settings,
  Sparkles,
  Store,
  SunMedium,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth, useWeddingData } from "@/lib/store/provider";
import { useOnline } from "@/lib/hooks/use-online";
import { useClock } from "@/lib/hooks/use-clock";
import { computeReadiness } from "@/lib/domain/readiness";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import { taskMetrics } from "@/lib/domain/tasks";
import { bucketPayments } from "@/lib/domain/budget";
import { guestMetrics } from "@/lib/domain/guests";
import { reminders } from "@/lib/domain/notifications";
import { budgetCategoryLabel } from "@/lib/domain/catalog";
import { Dialog } from "@/components/ui/dialog";
import { cx } from "@/components/ui/primitives";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  count?: ReactNode;
}

export function AppShell({ children }: { children: ReactNode }) {
  const data = useWeddingData();
  const clock = useClock();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const { wedding } = data;

  const stats = useMemo(() => {
    if (!clock) return null;
    return {
      tasks: taskMetrics(data.tasks, clock.today),
      payments: bucketPayments(data.payments, clock.today),
      guests: guestMetrics(data.guests, data.wedding),
      readiness: computeReadiness(data).overall,
      daysLeft: daysBetween(clock.today, wedding.weddingDate),
    };
  }, [data, clock, wedding.weddingDate]);

  const dueSoon = stats ? stats.payments.overdue.length + stats.payments.thisWeek.length : 0;
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Plan",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/tasks", label: "Checklist", icon: ListChecks, count: stats?.tasks.open },
        { href: "/timeline", label: "Timeline", icon: CalendarClock },
      ],
    },
    {
      title: "People",
      items: [
        {
          href: "/guests",
          label: "Guests",
          icon: Users,
          count: stats && stats.guests.pending > 0 ? <span className="wos-badge wos-badge--warning wos-badge--plain" style={{ height: 20, padding: "0 8px" }}>{stats.guests.pending}</span> : undefined,
        },
        { href: "/vendors", label: "Vendors", icon: Store },
      ],
    },
    {
      title: "Money",
      items: [
        { href: "/budget", label: "Investment", icon: Wallet },
        { href: "/budget?tab=payments", label: "Payments", icon: CreditCard, count: dueSoon ? `${dueSoon} due` : undefined },
      ],
    },
    {
      title: "Records",
      items: [
        { href: "/documents", label: "Documents", icon: FolderClosed, count: data.documents.length || undefined },
        { href: "/reports", label: "Reports", icon: FileBarChart },
      ],
    },
  ];

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (href.includes("?")) return false;
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  return (
    <div className="app-shell">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 wos-btn wos-btn--secondary">Skip to content</a>

      <nav className="wos-nav app-sidebar" aria-label="Main">
        <Link href="/dashboard" className="!h-auto !p-0 !bg-transparent" aria-label={`${wedding.brideName} and ${wedding.groomName}, dashboard`}>
          <div className="flex items-center gap-3 px-1 pb-5 lg:px-3">
            <span aria-hidden="true" className="flex">
              <span className="nav-avatar nav-avatar--bride">{wedding.brideName.charAt(0)}</span>
              <span className="nav-avatar nav-avatar--groom">{wedding.groomName.charAt(0)}</span>
            </span>
            <span className="nav-extra">
              <span className="block font-display text-[22px] leading-[26px] font-medium text-ink">{wedding.brideName} &amp; {wedding.groomName}</span>
              <span className="block text-[12px] leading-4 font-medium text-ink-muted">
                {formatDate(wedding.weddingDate)}
                {wedding.location ? ` · ${wedding.location}` : ""}
              </span>
            </span>
          </div>
        </Link>

        {sections.map((section, i) => (
          <div key={section.title} className="flex flex-col gap-[2px]">
            <span className={cx("wos-overline nav-section", i === 0 ? "pt-2" : "pt-4")} style={{ padding: undefined, color: "var(--ink-muted)", paddingLeft: 12, paddingBottom: 6 }}>
              {section.title}
            </span>
            {section.items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} title={item.label}>
                <item.icon className="wos-icon" aria-hidden="true" />
                <span className="nav-label flex-1">{item.label}</span>
                {item.count !== undefined && <span className="nav-extra wos-num text-[12px] font-semibold text-ink-muted">{item.count}</span>}
              </Link>
            ))}
          </div>
        ))}

        <div className="mt-4 flex flex-col gap-[2px]">
          <Link href="/assistant" aria-current={isActive("/assistant") ? "page" : undefined} title="Ask about your wedding">
            <MessageCircleQuestion className="wos-icon" aria-hidden="true" />
            <span className="nav-label">Ask</span>
          </Link>
          <Link href="/simulator" aria-current={isActive("/simulator") ? "page" : undefined} title="Experience your wedding">
            <Sparkles className="wos-icon" aria-hidden="true" />
            <span className="nav-label">Simulator</span>
          </Link>
          <Link href="/settings" aria-current={isActive("/settings") ? "page" : undefined} title="Settings">
            <Settings className="wos-icon" aria-hidden="true" />
            <span className="nav-label">Settings</span>
          </Link>
        </div>

        <div className="nav-card flex-col gap-[10px] rounded-2xl bg-champagne-100 p-4" style={{ marginTop: "auto" }}>
          <div className="flex items-baseline justify-between">
            <span className="wos-overline">Readiness</span>
            <span className="font-display text-[22px] leading-[26px]">{stats ? `${stats.readiness}%` : "—"}</span>
          </div>
          <div className="wos-progress__track" style={{ background: "var(--surface-raised)" }}>
            <div className="wos-progress__fill" style={{ width: `${stats?.readiness ?? 0}%` }} />
          </div>
          <Link href="/wedding-day" className="wos-btn wos-btn--secondary wos-btn--sm !h-9 !px-3 !text-wine-600" style={{ background: "var(--surface-raised)" }}>
            <SunMedium className="wos-icon" aria-hidden="true" />
            Wedding Day Mode
          </Link>
        </div>
        <Link href="/wedding-day" className="nav-day-icon mt-auto" title="Wedding Day Mode" aria-label="Wedding Day Mode">
          <SunMedium className="wos-icon" aria-hidden="true" />
        </Link>
      </nav>

      <main id="main" className="app-main">
        <div className="app-content">
          <TopBar onAdd={() => setAddOpen(true)} />
          {children}
        </div>
      </main>

      <nav className="wos-bottomnav app-bottomnav" aria-label="Main">
        <Link href="/dashboard" aria-current={isActive("/dashboard") ? "page" : undefined}><Home className="wos-icon" style={{ width: 24, height: 24 }} aria-hidden="true" />Home</Link>
        <Link href="/tasks" aria-current={isActive("/tasks") ? "page" : undefined}><ListChecks className="wos-icon" style={{ width: 24, height: 24 }} aria-hidden="true" />Tasks</Link>
        <button type="button" className="wos-bottomnav__fab" aria-label="Add" style={{ border: 0, cursor: "pointer" }} onClick={() => setAddOpen(true)}>
          <Plus className="wos-icon" style={{ width: 24, height: 24 }} aria-hidden="true" />
        </button>
        <Link href="/guests" aria-current={isActive("/guests") ? "page" : undefined}><Users className="wos-icon" style={{ width: 24, height: 24 }} aria-hidden="true" />Guests</Link>
        <Link href="/budget" aria-current={isActive("/budget") ? "page" : undefined}><Wallet className="wos-icon" style={{ width: 24, height: 24 }} aria-hidden="true" />Budget</Link>
      </nav>

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const options = [
    { label: "Task", detail: "Something to get done", href: "/tasks?new=1", icon: ListChecks },
    { label: "Guest", detail: "A person, couple, family or group", href: "/guests?new=1", icon: Users },
    { label: "Vendor", detail: "Someone you're considering or booked", href: "/vendors?new=1", icon: Store },
    { label: "Quote", detail: "A package to compare", href: "/vendors?tab=compare&newQuote=1", icon: Sparkles },
    { label: "Payment", detail: "Scheduled or already paid", href: "/budget?tab=payments&newPayment=1", icon: CreditCard },
    { label: "Expense", detail: "A budget line", href: "/budget?tab=categories&newItem=1", icon: Wallet },
    { label: "Wedding day moment", detail: "Add to the day timeline", href: "/timeline?new=1", icon: CalendarClock },
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Add to your wedding">
      <ul className="wos-list">
        {options.map((o) => (
          <li key={o.label} style={{ padding: 0 }}>
            <button type="button" onClick={() => go(o.href)} className="flex w-full items-center gap-4 rounded-[10px] px-2 py-3 text-left hover:bg-champagne-100 cursor-pointer bg-transparent border-0 text-ink">
              <span className="grid size-10 place-items-center rounded-[10px] bg-champagne-100 text-champagne-700"><o.icon className="wos-icon" aria-hidden="true" /></span>
              <span className="flex flex-col">
                <b className="text-[15px] leading-[22px] font-semibold">{o.label}</b>
                <span className="text-[13px] leading-[18px] text-ink-muted">{o.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function TopBar({ onAdd }: { onAdd: () => void }) {
  const online = useOnline();
  const auth = useAuth();
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line pb-5">
      {!online && (
        <p role="status" className="m-0 w-full rounded-xl bg-warning-50 px-4 py-2 text-[13px] font-semibold text-warning">
          {auth.mode === "local" ? "You're offline. Everything still works and is saved on this device." : "You're offline. Changes can't sync until you reconnect — avoid editing until then."}
        </p>
      )}
      <GlobalSearch />
      <div className="flex-1" />
      <Notifications />
      <button type="button" className="wos-btn wos-btn--primary hidden md:inline-flex" onClick={onAdd}>
        <Plus className="wos-icon" aria-hidden="true" />
        Add
      </button>
    </div>
  );
}

function GlobalSearch() {
  const data = useWeddingData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { href: string; label: string; meta: string }[] = [];
    for (const g of data.guests) if (g.name.toLowerCase().includes(term) || g.phone.includes(term)) out.push({ href: `/guests?guest=${g.id}`, label: g.name, meta: `Guest · ${g.side === "bride" ? "Bride" : "Groom"} side` });
    for (const v of data.vendors) if (v.name.toLowerCase().includes(term)) out.push({ href: `/vendors?vendor=${v.id}`, label: v.name, meta: `Vendor · ${budgetCategoryLabel(v.categoryId)}` });
    for (const t of data.tasks) if (t.title.toLowerCase().includes(term)) out.push({ href: `/tasks?task=${t.id}`, label: t.title, meta: "Task" });
    return out.slice(0, 8);
  }, [q, data]);

  const open = focused && q.trim().length >= 2;
  const go = (href: string) => {
    setQ("");
    router.push(href);
  };

  return (
    <div className="relative flex-[1_1_240px] max-w-[440px]">
      <label htmlFor="global-search" className="sr-only">Search guests, vendors and tasks</label>
      <div className="wos-input wos-input--prefix" style={{ borderColor: "var(--line)" }}>
        <Search className="wos-icon text-ink-muted" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          placeholder="Search guests, vendors, tasks"
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => (blurTimer.current = setTimeout(() => setFocused(false), 150))}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && results[active]) go(results[active].href);
            if (e.key === "Escape") setQ("");
          }}
        />
      </div>
      {open && (
        <div className="wos-search-results" id="global-search-results" role="listbox">
          {results.length === 0 ? (
            <p className="m-0 px-3 py-2 text-[14px] text-ink-muted">Nothing matches “{q}”.</p>
          ) : (
            results.map((r, i) => (
              <a key={r.href} href={r.href} role="option" aria-selected={i === active} data-active={i === active} onMouseDown={(e) => { e.preventDefault(); go(r.href); }}>
                <span className="flex-1">{r.label}</span>
                <span className="text-[12px] text-ink-muted">{r.meta}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const data = useWeddingData();
  const clock = useClock();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => (clock ? reminders(data, clock.today) : []), [data, clock]);
  const urgent = items.filter((i) => i.tone !== "info").length;

  return (
    <div className="relative">
      <button
        type="button"
        className="wos-iconbtn relative"
        style={{ width: 44, height: 44 }}
        aria-label={urgent ? `Reminders, ${urgent} need attention` : "Reminders"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="wos-icon" aria-hidden="true" />
        {urgent > 0 && <span className="absolute right-[10px] top-[9px] size-2 rounded-full bg-danger" style={{ boxShadow: "0 0 0 2px var(--surface-raised)" }} />}
      </button>
      {open && (
        <div className="wos-popover" role="dialog" aria-label="Reminders" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="wos-card__title">Reminders</h2>
            <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setOpen(false)}>Close</button>
          </div>
          {items.length === 0 ? (
            <p className="m-0 text-ink-muted">Nothing needs you right now. Enjoy the moment.</p>
          ) : (
            <ul className="wos-list">
              {items.map((r) => (
                <li key={r.id}>
                  <span className={cx("size-2 flex-none rounded-full", r.tone === "danger" ? "bg-danger" : r.tone === "warning" ? "bg-warning" : "bg-info")} aria-hidden="true" />
                  <Link href={r.href} onClick={() => setOpen(false)} className="flex flex-1 flex-col text-ink no-underline">
                    <b className="text-[14px] leading-5 font-semibold">{r.title}</b>
                    <span className="text-[13px] leading-[18px] text-ink-muted">{r.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
