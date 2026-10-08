import { z } from "zod";
import { BUDGET_CATEGORIES } from "./catalog";
import { isISODate, isTime } from "./dates";
import {
  BUDGET_ITEM_STATUSES,
  INVITATION_STATUSES,
  RSVP_STATUSES,
  TASK_STATUSES,
  VENDOR_STATUSES,
  type BudgetCategoryId,
} from "./types";

/** Form validation. Messages are written for the couple, not for developers. */

const isoDate = z.string().refine(isISODate, "Choose a valid date.");
const optionalIsoDate = z.union([z.literal(""), isoDate]).transform((v) => (v === "" ? null : v));
const money = z.number({ error: "Enter an amount in LKR." }).int("Use whole rupees.").min(0, "Amount can't be negative.").max(1_000_000_000, "That amount looks too large.");
const optionalMoney = money.nullable();
const name = (label: string) => z.string().trim().min(1, `${label} is required.`).max(120, `${label} is too long.`);
const categoryIds = BUDGET_CATEGORIES.map((c) => c.id) as [BudgetCategoryId, ...BudgetCategoryId[]];
export const budgetCategoryId = z.enum(categoryIds);

export const setupSchema = z.object({
  brideName: name("Bride's name"),
  groomName: name("Groom's name"),
  weddingDate: isoDate,
  venue: z.string().trim().max(120),
  location: z.string().trim().max(120),
  estimatedGuests: z.number().int().min(1, "Enter an estimated guest count.").max(5000, "That guest count looks too large."),
  budget: money.min(1, "Set a budget so we can plan around it."),
  style: z.enum(["traditional", "modern-minimal", "garden", "hotel-ballroom", "destination", "intimate"]),
  priorities: z.array(budgetCategoryId).max(5),
  mustHave: z.array(z.string().trim().min(1)).max(20),
  niceToHave: z.array(z.string().trim().min(1)).max(20),
  avoidOverspending: z.array(z.string().trim().min(1)).max(20),
});

export const taskSchema = z.object({
  title: name("Task name"),
  categoryId: z.string().min(1),
  description: z.string().max(2000),
  priority: z.enum(["high", "medium", "low"]),
  dueDate: optionalIsoDate,
  ownerId: z.string().nullable(),
  estimatedCost: optionalMoney,
  actualCost: optionalMoney,
  vendorId: z.string().nullable(),
  notes: z.string().max(2000),
  dependsOn: z.array(z.string()),
  status: z.enum(TASK_STATUSES),
});

export const guestSchema = z
  .object({
    name: name("Guest name"),
    phone: z.string().trim().max(40),
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
    side: z.enum(["bride", "groom"]),
    relation: z.enum(["family", "friend", "colleague", "other"]),
    vip: z.boolean(),
    partyType: z.enum(["single", "couple", "family", "group"]),
    adults: z.number().int().min(0).max(100),
    children: z.number().int().min(0).max(100),
    invitation: z.enum(INVITATION_STATUSES),
    rsvp: z.enum(RSVP_STATUSES),
    meal: z.enum(["unknown", "veg", "non_veg", "mixed"]),
    vegCount: z.number().int().min(0).max(200),
    table: z.string().trim().max(40),
    needsTransport: z.boolean(),
    needsAccommodation: z.boolean(),
    notes: z.string().max(2000),
  })
  .refine((g) => g.adults + g.children >= 1, { message: "A party needs at least one person.", path: ["adults"] });

export const budgetItemSchema = z.object({
  categoryId: budgetCategoryId,
  name: name("Item"),
  planned: money,
  quoted: optionalMoney,
  final: optionalMoney,
  vendorId: z.string().nullable(),
  status: z.enum(BUDGET_ITEM_STATUSES),
  notes: z.string().max(2000),
});

export const vendorSchema = z.object({
  name: name("Vendor name"),
  categoryId: budgetCategoryId,
  contactName: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  location: z.string().trim().max(120),
  status: z.enum(VENDOR_STATUSES),
  rating: z.number().min(0).max(5).nullable(),
  notes: z.string().max(4000),
  arrivalTime: z.union([z.literal(""), z.string().refine(isTime, "Use a time like 08:30.")]),
});

export const quoteSchema = z.object({
  vendorId: z.string().min(1, "Choose a vendor."),
  packageName: name("Package"),
  price: money,
  additionalCharges: money,
  overtime: money,
  transport: money,
  taxes: money,
  hours: z.number().min(0).max(48).nullable(),
  deliverables: z.string().max(2000),
  paymentTerms: z.string().max(500),
  features: z.record(z.string(), z.boolean()),
});

export const paymentSchema = z.object({
  vendorId: z.string().nullable(),
  budgetItemId: z.string().nullable(),
  label: name("Payment description"),
  amount: money.min(1, "Enter the payment amount."),
  dueDate: isoDate,
  paidDate: optionalIsoDate,
  status: z.enum(["scheduled", "paid"]),
  method: z.string().max(60),
  reference: z.string().max(120),
});

export const timelineEventSchema = z.object({
  time: z.string().refine(isTime, "Use a time like 10:30."),
  durationMinutes: z.number().int().min(0, "Duration can't be negative.").max(24 * 60),
  title: name("Moment"),
  location: z.string().trim().max(120),
  description: z.string().max(1000),
  vendorIds: z.array(z.string()),
  ownerId: z.string().nullable(),
  scene: z.enum(["venue", "arrival", "groom", "bride", "poruwa", "photos", "reception", "dinner", "entertainment", "cake", "going_away", "preparation", "other"]),
});

/** Flatten a zod error into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
