import type {
  DocumentKind,
  BudgetCategoryId,
  BudgetItemStatus,
  InvitationStatus,
  MealPreference,
  PersonRole,
  PartyType,
  Priority,
  Relation,
  RsvpStatus,
  TaskStatus,
  VendorDayStatus,
  VendorStatus,
  WeddingStyle,
} from "./types";

/* ------------------------------------------------------------------ */
/* Budget categories                                                   */
/* ------------------------------------------------------------------ */

export interface BudgetCategory {
  id: BudgetCategoryId;
  label: string;
  /** Typical share of a Sri Lankan wedding budget, in percent. Sums to 100. */
  defaultShare: number;
  /** Whether this category is normally delivered by a booked vendor. */
  vendorBacked: boolean;
  /** Features compared across quotes in this category. */
  compareFeatures: { key: string; label: string }[];
}

const PHOTO_FEATURES = [
  { key: "album", label: "Album" },
  { key: "edited_photos", label: "500+ edited photos" },
  { key: "video", label: "Highlight video" },
  { key: "drone", label: "Drone" },
  { key: "second_shooter", label: "Second shooter" },
  { key: "pre_shoot", label: "Pre-shoot" },
];

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: "venue", label: "Venue", defaultShare: 12, vendorBacked: true, compareFeatures: [
    { key: "poruwa_space", label: "Poruwa space" }, { key: "parking", label: "Parking" }, { key: "rooms", label: "Bridal suite" }, { key: "generator", label: "Generator backup" }, { key: "ac", label: "Air-conditioned hall" },
  ] },
  { id: "catering", label: "Catering", defaultShare: 29, vendorBacked: true, compareFeatures: [
    { key: "tasting", label: "Menu tasting" }, { key: "welcome_drink", label: "Welcome drink" }, { key: "dessert", label: "Dessert table" }, { key: "kids_menu", label: "Kids' menu" }, { key: "service_staff", label: "Service staff" },
  ] },
  { id: "photography", label: "Photography", defaultShare: 8, vendorBacked: true, compareFeatures: PHOTO_FEATURES },
  { id: "videography", label: "Videography", defaultShare: 4, vendorBacked: true, compareFeatures: [
    { key: "highlight", label: "Highlight film" }, { key: "full_length", label: "Full-length film" }, { key: "drone", label: "Drone" }, { key: "same_day_edit", label: "Same-day edit" },
  ] },
  { id: "decoration", label: "Decoration", defaultShare: 7, vendorBacked: true, compareFeatures: [
    { key: "fresh_flowers", label: "Fresh flowers" }, { key: "jasmine", label: "Fresh jasmine" }, { key: "entrance", label: "Entrance arch" }, { key: "table_centres", label: "Table centrepieces" }, { key: "setup_teardown", label: "Setup and teardown" },
  ] },
  { id: "flowers", label: "Flowers", defaultShare: 3, vendorBacked: true, compareFeatures: [
    { key: "bouquet", label: "Bridal bouquet" }, { key: "jasmine", label: "Jasmine strings" }, { key: "lotus", label: "Lotus" }, { key: "buttonholes", label: "Buttonholes" },
  ] },
  { id: "poruwa", label: "Poruwa", defaultShare: 3, vendorBacked: true, compareFeatures: [
    { key: "ashtaka", label: "Ashtaka chanting" }, { key: "decoration", label: "Poruwa decoration" }, { key: "items", label: "Ceremony items" }, { key: "girls", label: "Jayamangala gatha girls" },
  ] },
  { id: "attire", label: "Attire", defaultShare: 8, vendorBacked: true, compareFeatures: [
    { key: "fittings", label: "Fittings" }, { key: "alterations", label: "Alterations" }, { key: "accessories", label: "Accessories" },
  ] },
  { id: "jewelry", label: "Jewellery", defaultShare: 4, vendorBacked: true, compareFeatures: [] },
  { id: "makeup", label: "Hair & makeup", defaultShare: 3, vendorBacked: true, compareFeatures: [
    { key: "trial", label: "Trial session" }, { key: "dressing", label: "Saree dressing" }, { key: "touch_up", label: "Touch-up for going-away" }, { key: "family", label: "Family makeup" },
  ] },
  { id: "transport", label: "Transport", defaultShare: 2, vendorBacked: true, compareFeatures: [] },
  { id: "entertainment", label: "Entertainment", defaultShare: 3, vendorBacked: true, compareFeatures: [
    { key: "drummers", label: "Kandyan drummers" }, { key: "dancers", label: "Dancers" }, { key: "dj", label: "DJ" }, { key: "band", label: "Live band" },
  ] },
  { id: "cake", label: "Cake", defaultShare: 1, vendorBacked: true, compareFeatures: [] },
  { id: "invitations", label: "Invitations", defaultShare: 2, vendorBacked: true, compareFeatures: [] },
  { id: "accommodation", label: "Accommodation", defaultShare: 1, vendorBacked: true, compareFeatures: [] },
  { id: "lighting", label: "Lighting", defaultShare: 1, vendorBacked: true, compareFeatures: [] },
  { id: "sound", label: "Sound", defaultShare: 1, vendorBacked: true, compareFeatures: [] },
  { id: "gifts", label: "Gifts & favours", defaultShare: 1, vendorBacked: false, compareFeatures: [] },
  { id: "album", label: "Album", defaultShare: 1, vendorBacked: true, compareFeatures: [] },
  { id: "miscellaneous", label: "Miscellaneous", defaultShare: 1, vendorBacked: false, compareFeatures: [] },
  { id: "emergency", label: "Contingency", defaultShare: 5, vendorBacked: false, compareFeatures: [] },
];

const BUDGET_CATEGORY_MAP = new Map(BUDGET_CATEGORIES.map((c) => [c.id, c]));

export function budgetCategory(id: BudgetCategoryId): BudgetCategory {
  const found = BUDGET_CATEGORY_MAP.get(id);
  if (!found) throw new Error(`Unknown budget category: ${id}`);
  return found;
}

export const budgetCategoryLabel = (id: BudgetCategoryId) => budgetCategory(id).label;

/* ------------------------------------------------------------------ */
/* Task categories                                                     */
/* ------------------------------------------------------------------ */

export type JourneyStageId =
  | "vision"
  | "budget"
  | "venue"
  | "guests"
  | "vendors"
  | "ceremony"
  | "reception"
  | "attire"
  | "invitations"
  | "final"
  | "day"
  | "post";

export const JOURNEY_STAGES: { id: JourneyStageId; label: string }[] = [
  { id: "vision", label: "Vision" },
  { id: "budget", label: "Budget" },
  { id: "venue", label: "Venue" },
  { id: "guests", label: "Guest Planning" },
  { id: "vendors", label: "Vendors" },
  { id: "ceremony", label: "Ceremony" },
  { id: "reception", label: "Reception" },
  { id: "attire", label: "Attire" },
  { id: "invitations", label: "Invitations" },
  { id: "final", label: "Final Preparation" },
  { id: "day", label: "Wedding Day" },
  { id: "post", label: "Post Wedding" },
];

export interface TaskCategory {
  id: string;
  label: string;
  stage: JourneyStageId;
  budgetCategoryId?: BudgetCategoryId;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: "vision", label: "Vision & blueprint", stage: "vision" },
  { id: "budget", label: "Budget", stage: "budget" },
  { id: "venue", label: "Venue", stage: "venue", budgetCategoryId: "venue" },
  { id: "planner", label: "Wedding planner", stage: "vendors" },
  { id: "coordinator", label: "Coordinator", stage: "vendors" },
  { id: "photographer", label: "Photographer", stage: "vendors", budgetCategoryId: "photography" },
  { id: "videographer", label: "Videographer", stage: "vendors", budgetCategoryId: "videography" },
  { id: "caterer", label: "Caterer", stage: "reception", budgetCategoryId: "catering" },
  { id: "baker", label: "Cake", stage: "reception", budgetCategoryId: "cake" },
  { id: "florist", label: "Florist", stage: "vendors", budgetCategoryId: "flowers" },
  { id: "decor", label: "Decor & rentals", stage: "vendors", budgetCategoryId: "decoration" },
  { id: "officiant", label: "Officiant & registrar", stage: "ceremony" },
  { id: "music", label: "DJ / band", stage: "reception", budgetCategoryId: "entertainment" },
  { id: "entertainment", label: "Reception entertainment", stage: "reception", budgetCategoryId: "entertainment" },
  { id: "ceremony_music", label: "Traditional musicians", stage: "ceremony", budgetCategoryId: "entertainment" },
  { id: "invitations", label: "Invitations & stationery", stage: "invitations", budgetCategoryId: "invitations" },
  { id: "rsvp", label: "Website / online RSVP", stage: "invitations" },
  { id: "attire", label: "Bridal saree & attire", stage: "attire", budgetCategoryId: "attire" },
  { id: "groom_attire", label: "National Suit & groom styling", stage: "attire", budgetCategoryId: "attire" },
  { id: "makeup", label: "Hair & makeup", stage: "attire", budgetCategoryId: "makeup" },
  { id: "jewelry", label: "Rings & jewellery", stage: "attire", budgetCategoryId: "jewelry" },
  { id: "transport", label: "Transportation", stage: "final", budgetCategoryId: "transport" },
  { id: "rentals", label: "Rentals & tent", stage: "vendors", budgetCategoryId: "decoration" },
  { id: "lighting", label: "Lighting & sound", stage: "reception", budgetCategoryId: "lighting" },
  { id: "bar", label: "Bar service", stage: "reception", budgetCategoryId: "catering" },
  { id: "parking", label: "Valet / parking & security", stage: "final" },
  { id: "favors", label: "Favours & gifts", stage: "reception", budgetCategoryId: "gifts" },
  { id: "registry", label: "Registry", stage: "guests" },
  { id: "accommodation", label: "Accommodation & travel", stage: "guests", budgetCategoryId: "accommodation" },
  { id: "insurance", label: "Event insurance", stage: "budget" },
  { id: "wellness", label: "Health & wellness", stage: "final" },
  { id: "photo_booth", label: "Photo booth", stage: "reception" },
  { id: "childcare", label: "Childcare", stage: "guests" },
  { id: "ceremony_script", label: "Ceremony script & speeches", stage: "ceremony" },
  { id: "album", label: "Album & video editing", stage: "post", budgetCategoryId: "album" },
  { id: "fireworks", label: "Fireworks", stage: "reception" },
  { id: "poruwa", label: "Poruwa ceremony", stage: "ceremony", budgetCategoryId: "poruwa" },
  { id: "rituals", label: "Traditional rituals & family roles", stage: "ceremony" },
  { id: "legal", label: "Marriage registration & documents", stage: "ceremony" },
  { id: "guests", label: "Guest list", stage: "guests" },
  { id: "seating", label: "Seating", stage: "final" },
  { id: "day_kit", label: "Day emergency kit", stage: "day" },
  { id: "day", label: "Wedding day execution", stage: "day" },
  { id: "going_away", label: "Going-away", stage: "day" },
  { id: "honeymoon", label: "Honeymoon", stage: "post" },
  { id: "post", label: "After the wedding", stage: "post" },
];

const TASK_CATEGORY_MAP = new Map(TASK_CATEGORIES.map((c) => [c.id, c]));

export function taskCategory(id: string): TaskCategory {
  return TASK_CATEGORY_MAP.get(id) ?? { id, label: id, stage: "final" };
}

/** Task categories that make up the ceremony readiness score. */
export const CEREMONY_TASK_CATEGORIES = ["poruwa", "rituals", "legal", "officiant", "ceremony_music", "ceremony_script"];
export const WEDDING_DAY_TASK_CATEGORIES = ["day", "day_kit", "going_away", "transport", "seating"];

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not started",
  planning: "Planning",
  in_progress: "In progress",
  waiting: "Waiting",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export const INVITATION_LABEL: Record<InvitationStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  confirmed: "Confirmed",
};

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: "Pending",
  yes: "Attending",
  no: "Not attending",
  maybe: "Maybe",
};

export const RELATION_LABEL: Record<Relation, string> = {
  family: "Family",
  friend: "Friends",
  colleague: "Colleagues",
  other: "Other",
};

export const PARTY_LABEL: Record<PartyType, string> = {
  single: "Single guest",
  couple: "Couple",
  family: "Family",
  group: "Group",
};

export const MEAL_LABEL: Record<MealPreference, string> = {
  unknown: "Not asked",
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  mixed: "Mixed",
};

export const BUDGET_STATUS_LABEL: Record<BudgetItemStatus, string> = {
  planned: "Planned",
  quoted: "Quoted",
  negotiating: "Negotiating",
  booked: "Booked",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  researching: "Researching",
  contacted: "Contacted",
  quoted: "Quoted",
  negotiating: "Negotiating",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const VENDOR_DAY_LABEL: Record<VendorDayStatus, string> = {
  not_arrived: "Not arrived",
  on_the_way: "On the way",
  on_site: "On site",
  ready: "Ready",
  delayed: "Delayed",
  done: "Done",
};

export const ROLE_LABEL: Record<PersonRole, string> = {
  bride: "Bride",
  groom: "Groom",
  bride_family: "Bride's family",
  groom_family: "Groom's family",
  planner: "Planner",
  coordinator: "Coordinator",
};

export const STYLE_LABEL: Record<WeddingStyle, string> = {
  traditional: "Traditional Kandyan",
  "modern-minimal": "Modern minimal",
  garden: "Garden",
  "hotel-ballroom": "Hotel ballroom",
  destination: "Destination",
  intimate: "Intimate",
};

/** Badge tone for statuses, matching the design system's state colours. */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "wine" | "champagne";

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  not_started: "neutral",
  planning: "info",
  in_progress: "champagne",
  waiting: "warning",
  completed: "success",
  cancelled: "neutral",
};

export const VENDOR_STATUS_TONE: Record<VendorStatus, Tone> = {
  researching: "neutral",
  contacted: "neutral",
  quoted: "info",
  negotiating: "warning",
  booked: "success",
  completed: "success",
  cancelled: "neutral",
};

export const BUDGET_STATUS_TONE: Record<BudgetItemStatus, Tone> = {
  planned: "neutral",
  quoted: "info",
  negotiating: "warning",
  booked: "success",
  partially_paid: "champagne",
  paid: "success",
  cancelled: "neutral",
};

export const RSVP_TONE: Record<RsvpStatus, Tone> = {
  pending: "warning",
  yes: "success",
  no: "danger",
  maybe: "info",
};

export const INVITATION_TONE: Record<InvitationStatus, Tone> = {
  not_sent: "neutral",
  sent: "info",
  delivered: "info",
  opened: "info",
  confirmed: "success",
};

export const VENDOR_DAY_TONE: Record<VendorDayStatus, Tone> = {
  not_arrived: "neutral",
  on_the_way: "info",
  on_site: "success",
  ready: "success",
  delayed: "warning",
  done: "neutral",
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  contract: "Contract",
  quotation: "Quotation",
  receipt: "Receipt",
  invoice: "Invoice",
  guest: "Guest document",
  wedding: "Wedding document",
  vendor: "Vendor document",
  other: "Other",
};
