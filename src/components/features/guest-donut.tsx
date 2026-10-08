import type { GuestMetrics } from "@/lib/domain/guests";

/** Attendance donut: bride confirmed, groom confirmed, pending, not invited. */
export function GuestDonut({ m, size = 132 }: { m: GuestMetrics; size?: number }) {
  const segments = [
    { label: "Bride side", value: m.bySide.bride.confirmed, color: "var(--bride)" },
    { label: "Groom side", value: m.bySide.groom.confirmed, color: "var(--groom)" },
    { label: "Awaiting reply", value: m.pending - m.notInvited + m.maybe, color: "var(--champagne-300)" },
    { label: "Not invited yet", value: m.notInvited, color: "var(--surface-sunken)" },
  ];
  const total = Math.max(1, segments.reduce((s, x) => s + Math.max(0, x.value), 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div
        role="img"
        aria-label={`${m.total} guests: ${segments.map((s) => `${Math.max(0, s.value)} ${s.label.toLowerCase()}`).join(", ")}`}
        className="relative flex-none"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth="12" />
          {segments.map((s) => {
            const len = (Math.max(0, s.value) / total) * c;
            const el = (
              <circle key={s.label} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <b className="wos-num font-display text-[32px] leading-[34px] font-medium">{m.confirmed}</b>
          <span className="text-[10px] leading-[14px] font-bold tracking-[.14em] uppercase text-ink-muted">Attending</span>
        </div>
      </div>
      <ul className="m-0 flex min-w-[140px] flex-1 list-none flex-col gap-2 p-0 text-[13px] leading-[18px] font-medium">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-[10px] rounded-[3px]" style={{ background: s.color, boxShadow: s.color.includes("sunken") ? "inset 0 0 0 1px var(--line-strong)" : undefined }} />
            <span className="flex-1">{s.label}</span>
            <b className="wos-num">{Math.max(0, s.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
