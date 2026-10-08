"use client";

import { useId, useState, type ReactNode } from "react";
import { formatAmount, parseLKR } from "@/lib/domain/money";
import { cx } from "./primitives";

interface Base {
  label: string;
  error?: string;
  help?: string;
  className?: string;
}

function Shell({ id, label, error, help, className, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={cx("wos-field", error && "wos-field--error", className)}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className="wos-field__error" role="alert">{error}</span>
      ) : help ? (
        <span id={`${id}-msg`} className="wos-field__help">{help}</span>
      ) : null}
    </div>
  );
}

export function TextField({ label, error, help, className, value, onChange, type = "text", ...rest }: Base & {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "date" | "time" | "search";
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  min?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} help={help} className={className}>
      <input
        id={id}
        className="wos-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? `${id}-msg` : undefined}
        {...rest}
      />
    </Shell>
  );
}

export function NumberField({ label, error, help, className, value, onChange, min = 0, max, step = 1 }: Base & {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} help={help} className={className}>
      <input
        id={id}
        className="wos-input wos-num"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? `${id}-msg` : undefined}
      />
    </Shell>
  );
}

/** LKR input with a currency prefix; shows grouping when not focused. */
export function MoneyField({ label, error, help, className, value, onChange, optional }: Base & {
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : formatAmount(value));
  return (
    <Shell id={id} label={label} error={error} help={help ?? (optional ? "Optional" : undefined)} className={className}>
      <div className="wos-input wos-input--prefix">
        <span aria-hidden="true">LKR</span>
        <input
          id={id}
          inputMode="numeric"
          value={shown}
          // Keep the text as typed while editing; regroup digits on blur.
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(parseLKR(e.target.value));
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error || help || optional ? `${id}-msg` : undefined}
        />
      </div>
    </Shell>
  );
}

export function SelectField<T extends string>({ label, error, help, className, value, onChange, options }: Base & {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} help={help} className={className}>
      <select
        id={id}
        className="wos-input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? `${id}-msg` : undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Shell>
  );
}

export function TextArea({ label, error, help, className, value, onChange, rows = 3, placeholder }: Base & {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} help={help} className={className}>
      <textarea
        id={id}
        className="wos-input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? `${id}-msg` : undefined}
      />
    </Shell>
  );
}

export function Toggle({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx("wos-toggle", className)}>
      <input id={id} type="checkbox" className="wos-check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** A labelled group of pill choices (single select). */
export function ChoiceChips<T extends string>({ label, value, onChange, options, className }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("wos-field", className)} role="radiogroup" aria-labelledby={id}>
      <span id={id} className="font-semibold text-[14px] leading-5">{label}</span>
      <div className="wos-chips">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className="wos-chip"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Multi-select chips. */
export function MultiChips<T extends string>({ label, values, onChange, options, max, help }: {
  label: string;
  values: T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: string }[];
  max?: number;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="wos-field" role="group" aria-labelledby={id}>
      <span id={id} className="font-semibold text-[14px] leading-5">{label}</span>
      {help && <span className="wos-field__help">{help}</span>}
      <div className="wos-chips">
        {options.map((o) => {
          const on = values.includes(o.value);
          const full = !on && max !== undefined && values.length >= max;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={full}
              title={full ? `Choose up to ${max}` : undefined}
              className="wos-chip disabled:opacity-45"
              onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Free-text list editor (must-haves, nice-to-haves …). */
export function TagInput({ label, values, onChange, placeholder, help }: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  help?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="wos-field">
      <label htmlFor={id}>{label}</label>
      {help && <span className="wos-field__help">{help}</span>}
      {values.length > 0 && (
        <ul className="wos-chips m-0 p-0 list-none" aria-label={`${label} list`}>
          {values.map((v) => (
            <li key={v}>
              <button type="button" className="wos-chip" aria-pressed="true" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                {v} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className="wos-input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="wos-btn wos-btn--secondary" onClick={add} disabled={!draft.trim()}>Add</button>
      </div>
    </div>
  );
}
