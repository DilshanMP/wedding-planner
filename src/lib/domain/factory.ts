import { suggestAllocation } from "./budget";
import { budgetCategory } from "./catalog";
import { categoriesMentioned } from "./insights";
import { newId } from "./ids";
import { generateTasks } from "./tasks";
import type {
  BudgetCategoryId,
  BudgetItem,
  Guest,
  ISODate,
  Person,
  Payment,
  SimulatorScene,
  Task,
  TimelineEvent,
  Vendor,
  VendorQuote,
  Wedding,
  WeddingData,
  WeddingStyle,
} from "./types";

/** What onboarding collects. */
export interface WeddingSetup {
  brideName: string;
  groomName: string;
  weddingDate: ISODate;
  venue: string;
  location: string;
  estimatedGuests: number;
  budget: number;
  style: WeddingStyle;
  priorities: BudgetCategoryId[];
  mustHave: string[];
  niceToHave: string[];
  avoidOverspending: string[];
}

export function stamp(now: string) {
  return { createdAt: now, updatedAt: now };
}

export const DEFAULT_DAY: { time: string; durationMinutes: number; title: string; location: string; scene: SimulatorScene; description: string }[] = [
  { time: "05:00", durationMinutes: 180, title: "Bride preparation", location: "Bridal suite", scene: "preparation", description: "Hair, makeup and saree dressing." },
  { time: "06:30", durationMinutes: 90, title: "Getting-ready photography", location: "Bridal suite", scene: "preparation", description: "Details, jewellery and family moments." },
  { time: "08:00", durationMinutes: 90, title: "Groom preparation", location: "Groom's suite", scene: "groom", description: "National Suit dressing." },
  { time: "09:00", durationMinutes: 30, title: "Venue opens and guests arrive", location: "Main entrance", scene: "arrival", description: "Welcome drinks and seating." },
  { time: "09:30", durationMinutes: 30, title: "Groom's arrival with drummers", location: "Main entrance", scene: "groom", description: "Kandyan drummers lead the groom's party in." },
  { time: "10:00", durationMinutes: 20, title: "Bride's arrival", location: "Main entrance", scene: "bride", description: "The bride is welcomed by the groom's family." },
  { time: "10:30", durationMinutes: 60, title: "Poruwa ceremony", location: "Poruwa", scene: "poruwa", description: "At the auspicious time, with Jayamangala Gatha." },
  { time: "11:30", durationMinutes: 30, title: "Marriage registration", location: "Registration table", scene: "poruwa", description: "Signing with the registrar and witnesses." },
  { time: "12:00", durationMinutes: 45, title: "Family photos", location: "Garden terrace", scene: "photos", description: "Follow the family photo list." },
  { time: "12:45", durationMinutes: 30, title: "Reception opens", location: "Main hall", scene: "reception", description: "Couple's entrance and welcome." },
  { time: "13:15", durationMinutes: 75, title: "Lunch", location: "Main hall", scene: "dinner", description: "Buffet lunch." },
  { time: "14:30", durationMinutes: 45, title: "Entertainment and first dance", location: "Main hall", scene: "entertainment", description: "Band, dance and speeches." },
  { time: "15:15", durationMinutes: 20, title: "Cake cutting", location: "Main hall", scene: "cake", description: "" },
  { time: "16:00", durationMinutes: 30, title: "Going-away", location: "Main entrance", scene: "going_away", description: "At the going-away nekath time." },
];

export function defaultTimeline(now: string): TimelineEvent[] {
  return DEFAULT_DAY.map((e) => ({ id: newId(), ...e, vendorIds: [], ownerId: null, ...stamp(now) }));
}

export function defaultPeople(brideName: string, groomName: string): Person[] {
  return [
    { id: newId(), name: brideName.trim() || "Bride", role: "bride", phone: "" },
    { id: newId(), name: groomName.trim() || "Groom", role: "groom", phone: "" },
    { id: newId(), name: "Bride's family", role: "bride_family", phone: "" },
    { id: newId(), name: "Groom's family", role: "groom_family", phone: "" },
    { id: newId(), name: "Coordinator", role: "coordinator", phone: "" },
  ];
}

/** A starter budget: one line per category from the suggested allocation. */
export function starterBudget(setup: Pick<WeddingSetup, "budget" | "priorities" | "mustHave" | "avoidOverspending">, now: string): BudgetItem[] {
  const priorities = [...new Set([...setup.priorities, ...categoriesMentioned(setup.mustHave)])];
  const avoid = categoriesMentioned(setup.avoidOverspending).filter((c) => !priorities.includes(c));
  const allocation = suggestAllocation({ budget: setup.budget, priorities, avoid });
  return (Object.entries(allocation) as [BudgetCategoryId, number][])
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, planned]) => ({
      id: newId(),
      categoryId,
      name: budgetCategory(categoryId).label,
      planned,
      quoted: null,
      final: null,
      vendorId: null,
      status: "planned",
      notes: "",
      ...stamp(now),
    }));
}

export function emptyBlueprint() {
  return { vision: "", guestExperience: "", ceremony: "", photography: "", food: "" };
}

export function createWeddingData(setup: WeddingSetup, today: ISODate, now: string): WeddingData {
  const people = defaultPeople(setup.brideName, setup.groomName);
  const wedding: Wedding = {
    id: newId(),
    brideName: setup.brideName.trim(),
    groomName: setup.groomName.trim(),
    weddingDate: setup.weddingDate,
    venue: setup.venue.trim(),
    location: setup.location.trim(),
    estimatedGuests: setup.estimatedGuests,
    budget: setup.budget,
    style: setup.style,
    priorities: setup.priorities,
    mustHave: setup.mustHave,
    niceToHave: setup.niceToHave,
    avoidOverspending: setup.avoidOverspending,
    blueprint: emptyBlueprint(),
    pendingAttendanceRate: 0.75,
    plannerQuotes: {},
    dayNotes: [],
    setupComplete: true,
    rsvpEnabled: false,
    ...stamp(now),
  };
  const tasks: Task[] = generateTasks({ weddingDate: setup.weddingDate, today, people, now });
  return {
    wedding,
    people,
    tasks,
    guests: [] as Guest[],
    budgetItems: starterBudget(setup, now),
    vendors: [] as Vendor[],
    quotes: [] as VendorQuote[],
    payments: [] as Payment[],
    timeline: defaultTimeline(now),
    documents: [],
  };
}
