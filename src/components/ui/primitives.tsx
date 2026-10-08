"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, useReducedMotion } from "motion/react";
import type { Tone } from "@/lib/domain/catalog";
import { formatAmount } from "@/lib/domain/money";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */

export function Badge({ tone = "neutral", plain, children, className }: { tone?: Tone; plain?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx("wos-badge", tone !== "neutral" && `wos-badge--${tone}`, plain && "wos-badge--plain", className)}>
      {children}
    </span>
  );
}

export function SideChip({ side }: { side: "bride" | "groom" }) {
  return (
    <span className={`wos-side wos-side--${side}`}>
      <b aria-hidden="true">{side === "bride" ? "B" : "G"}</b>
      {side === "bride" ? "Bride" : "Groom"}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function ProgressBar({ value, label, detail, tone, className }: { value: number; label?: ReactNode; detail?: ReactNode; tone?: "sage" | "bride" | "groom"; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = tone === "bride" ? "var(--bride)" : tone === "groom" ? "var(--groom)" : undefined;
  return (
    <div className={cx("wos-progress", tone === "sage" && "wos-progress--sage", className)} style={{ minWidth: 0 }}>
      {(label || detail) && (
        <div className="wos-progress__top">
          <span>{label}</span>
          <span>{detail}</span>
        </div>
      )}
      <div className="wos-progress__track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={typeof label === "string" ? label : undefined}>
        <div className="wos-progress__fill" style={{ width: `${clamped}%`, background: fill }} />
      </div>
    </div>
  );
}

export function Ring({ value, size = 132, label = "Ready", className }: { value: number; size?: number; label?: string; className?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className={cx("wos-ring", className)} role="img" aria-label={`Wedding readiness ${value} percent`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="wos-ring__track" cx="60" cy="60" r={r} />
        <circle className="wos-ring__fill" cx="60" cy="60" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} />
      </svg>
      <div className="wos-ring__label">
        <b style={{ fontSize: size < 110 ? 28 : 40, lineHeight: 1.1 }}>{value}%</b>
        <span style={{ fontSize: size < 110 ? 10 : undefined }}>{label}</span>
      </div>
    </div>
  );
}

/** Budget figures count to their new value over --dur-slow (instant under reduced motion). */
export function AnimatedAmount({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      el.textContent = formatAmount(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.48,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => (el.textContent = formatAmount(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return (
    <span ref={ref} className={className}>
      {formatAmount(value)}
    </span>
  );
}

export function Money({ value, animated, className, size }: { value: number; animated?: boolean; className?: string; size?: "sm" | "xs" }) {
  const style = size === "sm" ? { fontSize: 30, lineHeight: "34px" } : size === "xs" ? { fontSize: 24, lineHeight: "30px" } : undefined;
  return (
    <span className={cx("wos-stat__value", className)} style={style}>
      <small>LKR</small>
      {animated ? <AnimatedAmount value={value} /> : formatAmount(value)}
    </span>
  );
}

export function Stat({ overline, value, label, delta, deltaTone, keyFigure }: {
  overline: string;
  value: ReactNode;
  label?: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "ok";
  keyFigure?: boolean;
}) {
  return (
    <div className={cx("wos-stat", keyFigure && "wos-stat--key")}>
      <span className="wos-overline">{overline}</span>
      {value}
      {label && <span className="wos-stat__label">{label}</span>}
      {delta && <span className={cx("wos-stat__delta", deltaTone === "up" ? "wos-stat__delta--up" : "wos-stat__delta--ok")}>{delta}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Notice({ tone, icon, title, children, action, role }: {
  tone?: "warning" | "success" | "danger" | "info";
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <div className={cx("wos-notice", tone && `wos-notice--${tone}`)} role={role}>
      <span className="wos-notice__icon" aria-hidden="true">{icon}</span>
      <div className="wos-notice__body">
        <b>{title}</b>
        {children && <span>{children}</span>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ mark = "lotus", title, children, action }: { mark?: "lotus" | "jasmine" | "poruwa"; title: string; children?: ReactNode; action?: ReactNode }) {
  const Mark = mark === "jasmine" ? JasmineMark : mark === "poruwa" ? PoruwaMark : LotusMark;
  return (
    <div className="wos-empty">
      <Mark className="wos-empty__mark" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cx("wos-skel", className)} style={style} aria-hidden="true" />;
}

export function Card({ title, action, children, className, id, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string; padded?: boolean }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={cx("wos-card flex flex-col gap-4", className)} id={id} aria-labelledby={title ? headingId : undefined} style={padded ? undefined : { padding: 0 }}>
      {(title || action) && (
        <div className="wos-card__head" style={{ margin: 0 }}>
          {title && <h2 className="wos-card__title" id={headingId}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ overline, title, lead, actions }: { overline?: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {overline && <span className="wos-overline">{overline}</span>}
        <h1 className="wos-h1">{title}</h1>
        {lead && <p className="m-0 text-[16px] leading-[26px] text-ink-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Cultural line marks: single weight, champagne-700, never filled.     */
/* ------------------------------------------------------------------ */

const markProps = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function LotusMark({ className }: { className?: string }) {
  return (
    <svg className={className} {...markProps}>
      <path d="M32 14c-6 7-6 18 0 26 6-8 6-19 0-26z" />
      <path d="M32 40c-9-1-17-8-19-17 9 0 16 6 19 17z" />
      <path d="M32 40c9-1 17-8 19-17-9 0-16 6-19 17z" />
      <path d="M32 40c-12 2-22-2-26-8 9-3 19 0 26 8zM32 40c12 2 22-2 26-8-9-3-19 0-26 8z" />
      <path d="M18 48h28" />
    </svg>
  );
}

export function JasmineMark({ className }: { className?: string }) {
  return (
    <svg className={className} {...markProps}>
      <circle cx="32" cy="32" r="3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M32 29c-4-6-4-12 0-16 4 4 4 10 0 16z" transform={`rotate(${a} 32 32)`} />
      ))}
    </svg>
  );
}

export function PoruwaMark({ className }: { className?: string }) {
  return (
    <svg className={className} {...markProps}>
      <path d="M12 24c6-8 34-8 40 0" />
      <path d="M14 24v24M50 24v24M24 24v24M40 24v24" />
      <path d="M10 48h44M12 54h40" />
      <path d="M32 12v4M28 16h8" />
    </svg>
  );
}
