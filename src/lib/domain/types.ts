/**
 * Core domain model for Wedding OS.
 *
 * All money is stored as whole LKR (integers). Dates are ISO `YYYY-MM-DD`
 * strings (local calendar dates, no time zone), times are `HH:mm` (24h).
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;
export type LKR = number;

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Wedding                                                             */
/* ------------------------------------------------------------------ */

export type WeddingStyle =
  | "traditional"
  | "modern-minimal"
  | "garden"
  | "hotel-ballroom"
  | "destination"
  | "intimate";

export interface Blueprint {
  vision: string;
  guestExperience: string;
  ceremony: string;
  photography: string;
  food: string;
}

export interface Wedding extends Timestamps {
  id: ID;
  brideName: string;
  groomName: string;
  weddingDate: ISODate;
  venue: string;
  location: string;
  estimatedGuests: number;
  budget: LKR;
  style: WeddingStyle;
  /** Budget categories the couple ranks highest, in order. */
  priorities: BudgetCategoryId[];
  mustHave: string[];
  niceToHave: string[];
  avoidOverspending: string[];
  blueprint: Blueprint;
  /** Share of pending RSVPs expected to attend (0–1). Used for expected attendance. */
  pendingAttendanceRate: number;
  /** Planner quotation per budget category, for the self-plan comparison. */
  plannerQuotes: Partial<Record<BudgetCategoryId, LKR>>;
  /** Wedding Day Mode coordinator notes, newest first. */
  dayNotes: DayNote[];
  setupComplete: boolean;
  /** Guests can answer through their personal RSVP link (cloud mode). */
  rsvpEnabled: boolean;
}

export interface DayNote {
  id: ID;
  author: string;
  body: string;
  at: ISODateTime;
}

export type PersonRole =
  | "bride"
  | "groom"
  | "bride_family"
  | "groom_family"
  | "planner"
  | "coordinator";

export interface Person {
  id: ID;
  name: string;
  role: PersonRole;
  phone: string;
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export const TASK_STATUSES = [
  "not_started",
  "planning",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Priority = "high" | "medium" | "low";

export interface Task extends Timestamps {
  id: ID;
  title: string;
  categoryId: TaskCategoryId;
  description: string;
  priority: Priority;
  dueDate: ISODate | null;
  ownerId: ID | null;
  estimatedCost: LKR | null;
  actualCost: LKR | null;
  vendorId: ID | null;
  notes: string;
  dependsOn: ID[];
  status: TaskStatus;
  completedAt: ISODateTime | null;
  /** Template key for generated tasks, null for tasks the couple added. */
  templateKey: string | null;
}

export type TaskCategoryId = string;

/* ------------------------------------------------------------------ */
/* Guests                                                              */
/* ------------------------------------------------------------------ */

export type Side = "bride" | "groom";
export type Relation = "family" | "friend" | "colleague" | "other";
export type PartyType = "single" | "couple" | "family" | "group";
export const INVITATION_STATUSES = ["not_sent", "sent", "delivered", "opened", "confirmed"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];
export const RSVP_STATUSES = ["pending", "yes", "no", "maybe"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
export type MealPreference = "unknown" | "veg" | "non_veg" | "mixed";

/** A guest is an invited party: one person, a couple, a family or a group. */
export interface Guest extends Timestamps {
  id: ID;
  name: string;
  phone: string;
  email: string;
  side: Side;
  relation: Relation;
  vip: boolean;
  partyType: PartyType;
  adults: number;
  children: number;
  invitation: InvitationStatus;
  rsvp: RsvpStatus;
  meal: MealPreference;
  /** For mixed parties: how many of the party eat vegetarian. */
  vegCount: number;
  table: string;
  needsTransport: boolean;
  needsAccommodation: boolean;
  notes: string;
  /** Secret token in the guest's personal RSVP link. */
  rsvpToken: string;
}

/* ------------------------------------------------------------------ */
/* Budget, vendors, payments                                           */
/* ------------------------------------------------------------------ */

export type BudgetCategoryId =
  | "venue"
  | "catering"
  | "photography"
  | "videography"
  | "decoration"
  | "flowers"
  | "poruwa"
  | "attire"
  | "jewelry"
  | "makeup"
  | "transport"
  | "entertainment"
  | "cake"
  | "invitations"
  | "accommodation"
  | "lighting"
  | "sound"
  | "gifts"
  | "album"
  | "miscellaneous"
  | "emergency";

export const BUDGET_ITEM_STATUSES = [
  "planned",
  "quoted",
  "negotiating",
  "booked",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export type BudgetItemStatus = (typeof BUDGET_ITEM_STATUSES)[number];

export interface BudgetItem extends Timestamps {
  id: ID;
  categoryId: BudgetCategoryId;
  name: string;
  planned: LKR;
  quoted: LKR | null;
  final: LKR | null;
  vendorId: ID | null;
  status: BudgetItemStatus;
  notes: string;
}

export const VENDOR_STATUSES = [
  "researching",
  "contacted",
  "quoted",
  "negotiating",
  "booked",
  "completed",
  "cancelled",
] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export type VendorDayStatus = "not_arrived" | "on_the_way" | "on_site" | "ready" | "delayed" | "done";

export interface Vendor extends Timestamps {
  id: ID;
  name: string;
  categoryId: BudgetCategoryId;
  contactName: string;
  phone: string;
  email: string;
  location: string;
  status: VendorStatus;
  /** 0–5, the couple's own rating after meeting / reviews. */
  rating: number | null;
  notes: string;
  dayStatus: VendorDayStatus;
  /** Day-of arrival time, HH:mm. */
  arrivalTime: string;
}

/** A vendor's package quotation, used for side-by-side comparison. */
export interface VendorQuote extends Timestamps {
  id: ID;
  vendorId: ID;
  packageName: string;
  price: LKR;
  additionalCharges: LKR;
  overtime: LKR;
  transport: LKR;
  taxes: LKR;
  hours: number | null;
  deliverables: string;
  /** Included features keyed by the category's comparison feature key. */
  features: Record<string, boolean>;
  paymentTerms: string;
  reviewScore: number | null;
  selected: boolean;
}

export type PaymentStatus = "scheduled" | "paid";

export interface Payment extends Timestamps {
  id: ID;
  vendorId: ID | null;
  budgetItemId: ID | null;
  label: string;
  amount: LKR;
  dueDate: ISODate;
  paidDate: ISODate | null;
  status: PaymentStatus;
  method: string;
  reference: string;
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

export interface TimelineEvent extends Timestamps {
  id: ID;
  /** HH:mm on the wedding day. */
  time: string;
  durationMinutes: number;
  title: string;
  location: string;
  description: string;
  vendorIds: ID[];
  ownerId: ID | null;
  /** Simulator scene this event maps to. */
  scene: SimulatorScene;
}

export type SimulatorScene =
  | "venue"
  | "arrival"
  | "groom"
  | "bride"
  | "poruwa"
  | "photos"
  | "reception"
  | "dinner"
  | "entertainment"
  | "cake"
  | "going_away"
  | "preparation"
  | "other";

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export const DOCUMENT_KINDS = ["contract", "quotation", "receipt", "invoice", "guest", "wedding", "vendor", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Metadata for a file in the document vault. The file itself lives in a FileStore. */
export interface WeddingDocument extends Timestamps {
  id: ID;
  kind: DocumentKind;
  title: string;
  /** Path inside the file store: `<weddingId>/<documentId>-<fileName>`. */
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  notes: string;
  vendorId: ID | null;
  budgetItemId: ID | null;
  taskId: ID | null;
}

/* ------------------------------------------------------------------ */
/* Aggregate                                                           */
/* ------------------------------------------------------------------ */

export interface WeddingData {
  wedding: Wedding;
  people: Person[];
  tasks: Task[];
  guests: Guest[];
  budgetItems: BudgetItem[];
  vendors: Vendor[];
  quotes: VendorQuote[];
  payments: Payment[];
  timeline: TimelineEvent[];
  documents: WeddingDocument[];
}

/** Collections that are edited item by item. */
export type CollectionKey = Exclude<keyof WeddingData, "wedding">;
export type CollectionItem<K extends CollectionKey> = WeddingData[K][number];
