import type { Guest, Side, Wedding } from "./types";
import { percent } from "./money";

export const partySize = (g: Guest) => g.adults + g.children;

export type GuestGroupId =
  | "bride_family"
  | "bride_friends"
  | "bride_colleagues"
  | "groom_family"
  | "groom_friends"
  | "groom_colleagues"
  | "vip"
  | "other";

export const GUEST_GROUP_LABEL: Record<GuestGroupId, string> = {
  bride_family: "Bride Family",
  bride_friends: "Bride Friends",
  bride_colleagues: "Bride Colleagues",
  groom_family: "Groom Family",
  groom_friends: "Groom Friends",
  groom_colleagues: "Groom Colleagues",
  vip: "VIP",
  other: "Other",
};

/** Guest group is derived from side + relation, with VIP taking precedence. */
export function guestGroup(g: Guest): GuestGroupId {
  if (g.vip) return "vip";
  if (g.relation === "other") return "other";
  const rel = g.relation === "family" ? "family" : g.relation === "friend" ? "friends" : "colleagues";
  return `${g.side}_${rel}` as GuestGroupId;
}

export interface GuestMetrics {
  parties: number;
  /** Total people on the list (adults + children). */
  total: number;
  adults: number;
  children: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  /** People whose invitation has not been sent. */
  notInvited: number;
  invitedPeople: number;
  /** Share of people whose invitation has been sent, whole %. */
  invitationCoverage: number;
  /** Share of invited people who have answered (yes / no / maybe), whole %. */
  rsvpCompletion: number;
  /** confirmed + 50% of maybe + pendingRate × pending (rounded). */
  expectedAttendance: number;
  bySide: Record<Side, { total: number; confirmed: number; pending: number }>;
  meals: { veg: number; nonVeg: number; unknown: number };
  tablesAssigned: number;
  needsTransport: number;
  needsAccommodation: number;
}

export function guestMetrics(guests: Guest[], wedding: Pick<Wedding, "pendingAttendanceRate">): GuestMetrics {
  const m: GuestMetrics = {
    parties: guests.length,
    total: 0,
    adults: 0,
    children: 0,
    confirmed: 0,
    declined: 0,
    maybe: 0,
    pending: 0,
    notInvited: 0,
    invitedPeople: 0,
    invitationCoverage: 0,
    rsvpCompletion: 0,
    expectedAttendance: 0,
    bySide: { bride: { total: 0, confirmed: 0, pending: 0 }, groom: { total: 0, confirmed: 0, pending: 0 } },
    meals: { veg: 0, nonVeg: 0, unknown: 0 },
    tablesAssigned: 0,
    needsTransport: 0,
    needsAccommodation: 0,
  };
  let answered = 0;
  for (const g of guests) {
    const size = partySize(g);
    m.total += size;
    m.adults += g.adults;
    m.children += g.children;
    m.bySide[g.side].total += size;
    const invited = g.invitation !== "not_sent";
    if (!invited) m.notInvited += size;
    else m.invitedPeople += size;
    switch (g.rsvp) {
      case "yes":
        m.confirmed += size;
        m.bySide[g.side].confirmed += size;
        answered += size;
        break;
      case "no":
        m.declined += size;
        answered += size;
        break;
      case "maybe":
        m.maybe += size;
        answered += size;
        break;
      default:
        m.pending += size;
        m.bySide[g.side].pending += size;
    }
    if (g.rsvp === "yes") {
      if (g.meal === "veg") m.meals.veg += size;
      else if (g.meal === "non_veg") m.meals.nonVeg += size;
      else if (g.meal === "mixed") {
        const veg = Math.min(size, g.vegCount);
        m.meals.veg += veg;
        m.meals.nonVeg += size - veg;
      } else m.meals.unknown += size;
      if (g.table.trim()) m.tablesAssigned += 1;
    }
    if (g.needsTransport) m.needsTransport += size;
    if (g.needsAccommodation) m.needsAccommodation += size;
  }
  m.invitationCoverage = percent(m.invitedPeople, m.total);
  m.rsvpCompletion = percent(answered, m.invitedPeople);
  m.expectedAttendance = Math.round(m.confirmed + m.maybe * 0.5 + m.pending * wedding.pendingAttendanceRate);
  return m;
}

/** Distinct table names in use, naturally sorted. */
export function tableNames(guests: Guest[]): string[] {
  const set = new Set(guests.map((g) => g.table.trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
