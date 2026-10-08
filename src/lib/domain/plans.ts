/**
 * SaaS plans and entitlements. Every feature checks `can(plan, feature)`, so
 * billing can be added later without touching screens. Today every couple is
 * on Free, which includes everything a single couple needs.
 */

export type PlanId = "free" | "premium" | "planner" | "vendor";

export type Feature =
  | "plan_wedding"
  | "share_family"
  | "online_rsvp"
  | "document_vault"
  | "reports"
  | "assistant_deep"
  | "multiple_client_weddings"
  | "white_label_reports"
  | "vendor_profile"
  | "vendor_leads";

export interface Plan {
  id: PlanId;
  name: string;
  audience: string;
  available: boolean;
  /** Max weddings a user can own; null = unlimited. */
  weddings: number | null;
  /** Max people with access to one wedding, including the owner; null = unlimited. */
  collaborators: number | null;
  /** Document vault storage per wedding, in MB. */
  storageMb: number;
  features: Feature[];
  highlights: string[];
}

const COUPLE: Feature[] = ["plan_wedding", "share_family", "online_rsvp", "document_vault", "reports"];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    audience: "For couples",
    available: true,
    weddings: 2,
    collaborators: 6,
    storageMb: 250,
    features: [...COUPLE],
    highlights: ["Everything in this app today", "Share with both families", "Online RSVP and WhatsApp invitations", "Budget, vendor and guest reports"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    audience: "For couples who want more",
    available: false,
    weddings: 3,
    collaborators: 20,
    storageMb: 5_000,
    features: [...COUPLE, "assistant_deep"],
    highlights: ["Assistant answers in your own words", "More family members", "5 GB document vault"],
  },
  planner: {
    id: "planner",
    name: "Planner",
    audience: "For wedding planners",
    available: false,
    weddings: null,
    collaborators: null,
    storageMb: 50_000,
    features: [...COUPLE, "assistant_deep", "multiple_client_weddings", "white_label_reports"],
    highlights: ["Unlimited client weddings", "Your branding on reports", "Planner workspace"],
  },
  vendor: {
    id: "vendor",
    name: "Vendor",
    audience: "For photographers, decorators, caterers…",
    available: false,
    weddings: 0,
    collaborators: null,
    storageMb: 5_000,
    features: ["vendor_profile", "vendor_leads"],
    highlights: ["Marketplace profile", "Quote requests from couples", "Booking calendar"],
  },
};

export function can(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan].features.includes(feature);
}

export function canCreateWedding(plan: PlanId, ownedWeddings: number): boolean {
  const limit = PLANS[plan].weddings;
  return limit === null || ownedWeddings < limit;
}
