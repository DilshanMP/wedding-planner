"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./primitives";

/**
 * Native <dialog>: focus trapping, Esc to close and the backdrop come from the
 * platform. `sheet` is a bottom sheet on mobile and a right-hand drawer from
 * 1024px; `modal` is a centred confirmation.
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = "sheet" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "sheet" | "modal";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("wos-dialog", variant === "sheet" ? "wos-dialog--sheet" : "wos-dialog--modal")}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      // Only user actions close it (Esc, backdrop, close button). The native
      // "close" event also fires when we close it programmatically, e.g. to
      // hand over to a confirmation, so it must not call onClose.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <>
          <div className="wos-dialog__head">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="wos-h2">{title}</h2>
              {description && <p id={descId} className="m-0 text-ink-muted">{description}</p>}
            </div>
            <button type="button" className="wos-iconbtn" onClick={onClose} aria-label="Close">
              <X className="wos-icon" aria-hidden="true" />
            </button>
          </div>
          {children && <div className="wos-dialog__body">{children}</div>}
          {footer && <div className="wos-dialog__foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, body, confirmLabel, danger }: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={body}
      variant="modal"
      footer={
        <>
          <button type="button" className="wos-btn wos-btn--secondary" onClick={onCancel}>Keep it</button>
          <button type="button" className={cx("wos-btn", danger ? "wos-btn--danger" : "wos-btn--primary")} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
