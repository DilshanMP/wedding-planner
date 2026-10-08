import { compareISO, daysBetween, formatShortDate, relativeDue } from "./dates";
import { guestMetrics } from "./guests";
import { formatLKR } from "./money";
import { isOpen } from "./tasks";
import type { ISODate, WeddingData } from "./types";

/**
 * In-app reminders. Deliberately few: only what needs action in the next
 * few days, grouped so a busy week doesn't become a wall of alerts.
 */

export interface Reminder {
  id: string;
  kind: "task_due" | "payment_due" | "rsvp_pending" | "invitation_pending" | "final_confirmation";
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
}

export function reminders(data: WeddingData, today: ISODate): Reminder[] {
  const out: Reminder[] = [];
  const { tasks, payments, vendors, guests, wedding } = data;
  const daysLeft = daysBetween(today, wedding.weddingDate);

  const duePayments = payments
    .filter((p) => p.status === "scheduled" && daysBetween(today, p.dueDate) <= 7)
    .sort((a, b) => compareISO(a.dueDate, b.dueDate));
  for (const p of duePayments.slice(0, 3)) {
    const vendor = vendors.find((v) => v.id === p.vendorId)?.name ?? "Payment";
    const overdue = compareISO(p.dueDate, today) < 0;
    out.push({
      id: `pay-${p.id}`,
      kind: "payment_due",
      tone: overdue ? "danger" : "warning",
      title: `${vendor}: ${p.label}`,
      detail: `${formatLKR(p.amount)} · ${relativeDue(p.dueDate, today)}`,
      href: `/budget?tab=payments&pay=${p.id}`,
    });
  }

  const dueTasks = tasks
    .filter((t) => isOpen(t) && t.dueDate && daysBetween(today, t.dueDate) <= 3)
    .sort((a, b) => compareISO(a.dueDate!, b.dueDate!));
  if (dueTasks.length > 3) {
    const overdue = dueTasks.filter((t) => compareISO(t.dueDate!, today) < 0).length;
    out.push({
      id: "tasks-due",
      kind: "task_due",
      tone: overdue ? "danger" : "warning",
      title: `${dueTasks.length} tasks need you in the next few days`,
      detail: overdue ? `${overdue} already overdue` : "Due within three days",
      href: "/tasks?filter=soon",
    });
  } else {
    for (const t of dueTasks) {
      out.push({
        id: `task-${t.id}`,
        kind: "task_due",
        tone: compareISO(t.dueDate!, today) < 0 ? "danger" : "warning",
        title: t.title,
        detail: `${relativeDue(t.dueDate!, today)} · ${formatShortDate(t.dueDate!)}`,
        href: `/tasks?task=${t.id}`,
      });
    }
  }

  const gm = guestMetrics(guests, wedding);
  if (gm.notInvited > 0 && daysLeft <= 120) {
    out.push({ id: "invites", kind: "invitation_pending", tone: "info", title: `${gm.notInvited} guests haven't received invitations`, detail: "Invitations usually go out three to four months before.", href: "/guests?invitation=not_sent" });
  }
  if (gm.pending > 0 && daysLeft <= 45) {
    out.push({ id: "rsvp", kind: "rsvp_pending", tone: "info", title: `${gm.pending} guests still to reply`, detail: "The caterer needs a final headcount about three weeks before.", href: "/guests?rsvp=pending" });
  }
  if (daysLeft >= 0 && daysLeft <= 7) {
    const unconfirmed = vendors.filter((v) => v.status === "booked").length;
    out.push({ id: "final", kind: "final_confirmation", tone: "warning", title: "Final confirmations week", detail: `Confirm arrival times with your ${unconfirmed} booked vendors.`, href: "/vendors" });
  }
  return out;
}
