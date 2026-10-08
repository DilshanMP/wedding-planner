import { formatLongDate } from "./dates";
import type { Guest, Wedding } from "./types";

/**
 * WhatsApp invitations. Sri Lankan mobile numbers are written locally
 * (077 123 4567); wa.me needs the international form without "+" (94771234567).
 */
export function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = `94${digits.slice(1)}`;
  else if (digits.length === 9 && digits.startsWith("7")) digits = `94${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function rsvpUrl(origin: string, guest: Guest): string {
  return `${origin}/rsvp/${guest.rsvpToken}`;
}

export function invitationMessage(wedding: Wedding, guest: Guest, link: string | null): string {
  const place = [wedding.venue, wedding.location].filter(Boolean).join(", ");
  const lines = [
    `Ayubowan ${guest.name},`,
    "",
    `${wedding.brideName} & ${wedding.groomName} warmly invite you to celebrate our wedding on ${formatLongDate(wedding.weddingDate)}${place ? ` at ${place}` : ""}.`,
  ];
  if (link) lines.push("", `Please let us know if you can join us: ${link}`);
  return lines.join("\n");
}

export function whatsAppLink(guest: Guest, message: string): string | null {
  const number = toWhatsAppNumber(guest.phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
