import { createWeddingData, stamp } from "./factory";
import { addDays, compareISO } from "./dates";
import { newId } from "./ids";
import { generateTasks } from "./tasks";
import type {
  BudgetCategoryId,
  BudgetItem,
  Guest,
  InvitationStatus,
  ISODate,
  MealPreference,
  PartyType,
  Payment,
  Relation,
  RsvpStatus,
  Side,
  Vendor,
  VendorQuote,
  WeddingData,
} from "./types";

/**
 * A realistic Sri Lankan demo wedding: Nethmi & Kasun, 12 June 2027,
 * Lotus Hall, Kandy. Payment and task dates are placed relative to `today`
 * so the demo always looks alive, whatever day it is opened.
 */

export const SAMPLE_WEDDING_DATE = "2027-06-12";

/** Small deterministic PRNG so the sample list is stable between loads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURNAMES = [
  "Perera", "Fernando", "de Silva", "Jayasinghe", "Wickramasinghe", "Bandara", "Rathnayake", "Gunawardena",
  "Senanayake", "Dissanayake", "Herath", "Karunaratne", "Wijesinghe", "Ekanayake", "Rajapaksha", "Samarasinghe",
  "Abeysekera", "Amarasinghe", "Weerasinghe", "Kumarasinghe", "Pathirana", "Liyanage", "Gamage", "Jayawardena",
  "Wanigasekara", "Ranasinghe", "Kodikara", "Munasinghe", "Hettiarachchi", "Siriwardena",
];
const FIRST_M = ["Kasun", "Nuwan", "Chamara", "Dilan", "Ruwan", "Tharindu", "Sahan", "Lahiru", "Pradeep", "Asanka", "Dinesh", "Chathura", "Isuru", "Malith", "Upul", "Sunil", "Nimal", "Ajith", "Rohan", "Mahesh"];
const FIRST_F = ["Nethmi", "Dilani", "Sanduni", "Ishara", "Chathurika", "Kaveesha", "Nadeesha", "Hiruni", "Sachini", "Tharushi", "Anushka", "Malsha", "Piumi", "Yasara", "Kumari", "Shalini", "Sandya", "Nirmala", "Chandrika", "Iresha"];

function pick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function sampleGuests(now: string): Guest[] {
  const rand = mulberry32(20270612);
  const guests: Guest[] = [];
  const plan: { side: Side; relation: Relation; count: number; vip?: boolean }[] = [
    { side: "bride", relation: "family", count: 28 },
    { side: "bride", relation: "friend", count: 18 },
    { side: "bride", relation: "colleague", count: 12 },
    { side: "groom", relation: "family", count: 26 },
    { side: "groom", relation: "friend", count: 18 },
    { side: "groom", relation: "colleague", count: 12 },
    { side: "bride", relation: "other", count: 3, vip: true },
    { side: "groom", relation: "other", count: 3, vip: true },
    { side: "groom", relation: "other", count: 4 },
  ];
  let i = 0;
  for (const block of plan) {
    for (let n = 0; n < block.count; n++, i++) {
      const surname = pick(rand, SURNAMES);
      const roll = rand();
      let partyType: PartyType;
      let adults: number;
      let children = 0;
      if (block.relation === "family") {
        partyType = roll < 0.55 ? "family" : roll < 0.9 ? "couple" : "single";
      } else if (block.relation === "colleague") {
        partyType = roll < 0.6 ? "single" : roll < 0.85 ? "couple" : "group";
      } else {
        partyType = roll < 0.45 ? "single" : roll < 0.85 ? "couple" : "group";
      }
      if (partyType === "single") adults = 1;
      else if (partyType === "couple") adults = 2;
      else if (partyType === "family") {
        adults = 2 + (rand() < 0.3 ? 1 : 0);
        children = 1 + Math.floor(rand() * 2);
      } else adults = 3 + Math.floor(rand() * 3);

      const name =
        partyType === "family"
          ? `${surname} family`
          : partyType === "couple"
            ? `Mr & Mrs ${pick(rand, FIRST_M)} ${surname}`
            : partyType === "group"
              ? `${block.side === "bride" ? "Bride's" : "Groom's"} ${block.relation === "colleague" ? "office team" : "school friends"} (${surname})`
              : `${rand() < 0.5 ? pick(rand, FIRST_F) : pick(rand, FIRST_M)} ${surname}`;

      // Invitations: most families sent; a block of groom-side friends and colleagues not yet.
      let invitation: InvitationStatus;
      const inviteRoll = rand();
      const lateBlock = block.side === "groom" && (block.relation === "colleague" || block.relation === "friend") && n >= block.count - 7;
      if (lateBlock || inviteRoll < 0.06) invitation = "not_sent";
      else invitation = inviteRoll < 0.2 ? "sent" : inviteRoll < 0.45 ? "delivered" : inviteRoll < 0.6 ? "opened" : "confirmed";

      let rsvp: RsvpStatus = "pending";
      if (invitation !== "not_sent") {
        const r = rand();
        rsvp = invitation === "confirmed" ? (r < 0.9 ? "yes" : "maybe") : r < 0.55 ? "yes" : r < 0.65 ? "no" : r < 0.72 ? "maybe" : "pending";
      }
      const mealRoll = rand();
      const meal: MealPreference = rsvp !== "yes" ? "unknown" : mealRoll < 0.35 ? "veg" : mealRoll < 0.75 ? "non_veg" : "mixed";
      const size = adults + children;
      guests.push({
        id: newId(),
        name,
        phone: `07${Math.floor(rand() * 8)} ${String(Math.floor(rand() * 900) + 100)} ${String(Math.floor(rand() * 9000) + 1000)}`,
        email: "",
        side: block.side,
        relation: block.relation,
        vip: Boolean(block.vip),
        partyType,
        adults,
        children,
        invitation,
        rsvp,
        meal,
        vegCount: meal === "mixed" ? Math.ceil(size / 2) : 0,
        table: rsvp === "yes" && rand() < 0.6 ? `Table ${1 + Math.floor(rand() * 32)}` : "",
        needsTransport: rand() < 0.08,
        needsAccommodation: block.relation === "family" && rand() < 0.12,
        notes: block.vip ? "Seat near the Poruwa." : "",
        rsvpToken: newId(),
        ...stamp(now),
      });
    }
  }
  return guests;
}

interface SampleVendor {
  key: string;
  name: string;
  categoryId: BudgetCategoryId;
  status: Vendor["status"];
  rating: number | null;
  contactName: string;
  location: string;
  notes?: string;
  arrivalTime: string;
}

const VENDORS: SampleVendor[] = [
  { key: "lotus", name: "Lotus Hall", categoryId: "venue", status: "booked", rating: 4.6, contactName: "Mr Senaka Herath", location: "Kandy", arrivalTime: "07:00", notes: "Hall, catering and generator backup in one contract." },
  { key: "lotus-catering", name: "Lotus Hall Catering", categoryId: "catering", status: "booked", rating: 4.5, contactName: "Chef Ruwan", location: "Kandy", arrivalTime: "10:00" },
  { key: "ceylon-frames", name: "Ceylon Frames", categoryId: "photography", status: "negotiating", rating: 4.7, contactName: "Lahiru Bandara", location: "Colombo", arrivalTime: "05:30" },
  { key: "lens-lanka", name: "Lens of Lanka", categoryId: "photography", status: "quoted", rating: 4.1, contactName: "Isuru Perera", location: "Kandy", arrivalTime: "05:30" },
  { key: "studio-serendib", name: "Studio Serendib", categoryId: "photography", status: "quoted", rating: 4.9, contactName: "Malith Fernando", location: "Colombo", arrivalTime: "05:30" },
  { key: "hill-films", name: "Hill Country Films", categoryId: "videography", status: "quoted", rating: 4.4, contactName: "Dinesh Gamage", location: "Kandy", arrivalTime: "06:00" },
  { key: "jasmine-co", name: "Jasmine & Co. Decor", categoryId: "decoration", status: "quoted", rating: 4.5, contactName: "Ishara Wijesinghe", location: "Kandy", arrivalTime: "06:00" },
  { key: "kandy-blooms", name: "Kandy Blooms", categoryId: "decoration", status: "quoted", rating: 4.3, contactName: "Piumi Ekanayake", location: "Kandy", arrivalTime: "06:00" },
  { key: "araliya", name: "Araliya Designs", categoryId: "decoration", status: "quoted", rating: 4.8, contactName: "Chathura Liyanage", location: "Colombo", arrivalTime: "06:00" },
  { key: "poruwa-ashtaka", name: "Poruwa & Ashtaka", categoryId: "poruwa", status: "booked", rating: 4.8, contactName: "Upul Siriwardena", location: "Kandy", arrivalTime: "08:30" },
  { key: "udarata", name: "Udarata Drummers", categoryId: "entertainment", status: "booked", rating: 4.6, contactName: "Sunil Herath", location: "Kandy", arrivalTime: "09:00" },
  { key: "silk-route", name: "Silk Route Sarees", categoryId: "attire", status: "booked", rating: 4.5, contactName: "Kumari Jayasinghe", location: "Colombo", arrivalTime: "05:00" },
  { key: "glow", name: "Glow by Ishara", categoryId: "makeup", status: "booked", rating: 4.7, contactName: "Ishara Samarasinghe", location: "Kandy", arrivalTime: "04:45" },
  { key: "heritage-jewel", name: "Heritage Jewellers", categoryId: "jewelry", status: "completed", rating: 4.4, contactName: "Rohan Abeysekera", location: "Kandy", arrivalTime: "05:00" },
  { key: "paper-lotus", name: "Paper Lotus Invitations", categoryId: "invitations", status: "completed", rating: 4.2, contactName: "Sachini Munasinghe", location: "Colombo", arrivalTime: "09:00" },
  { key: "vintage-rides", name: "Vintage Rides Kandy", categoryId: "transport", status: "contacted", rating: null, contactName: "Nimal Kodikara", location: "Kandy", arrivalTime: "09:00" },
  { key: "sweet-ceylon", name: "Sweet Ceylon Cakes", categoryId: "cake", status: "researching", rating: null, contactName: "Yasara Pathirana", location: "Kandy", arrivalTime: "11:00" },
];

export function createSampleWedding(today: ISODate, now: string): WeddingData {
  const base = createWeddingData(
    {
      brideName: "Nethmi",
      groomName: "Kasun",
      weddingDate: SAMPLE_WEDDING_DATE,
      venue: "Lotus Hall",
      location: "Kandy",
      estimatedGuests: 320,
      budget: 3_500_000,
      style: "traditional",
      priorities: ["catering", "poruwa", "photography"],
      mustHave: ["Excellent food", "Beautiful Poruwa", "Photography", "Family experience"],
      niceToHave: ["Photo booth", "Fireworks", "Premium invitations"],
      avoidOverspending: ["Excessive decoration", "Unnecessary favours"],
    },
    today,
    now,
  );
  base.wedding.blueprint = {
    vision: "A calm, elegant Kandyan wedding that feels like family — jasmine, white and red roses, and a Poruwa everyone remembers.",
    guestExperience: "Every elder seated comfortably, food served hot, and nobody waiting in the sun.",
    ceremony: "A traditional Poruwa at the auspicious time with Jayamangala Gatha, kept unhurried.",
    photography: "Natural, candid family moments over posed shots. Drone for the Poruwa.",
    food: "Excellent rice and curry, a good vegetarian spread, and a proper dessert table.",
  };
  base.wedding.plannerQuotes = { decoration: 475_000, venue: 450_000, catering: 1_100_000, photography: 325_000, poruwa: 160_000, entertainment: 150_000, transport: 90_000, flowers: 110_000 };
  base.wedding.dayNotes = [];

  const personId = (role: string) => base.people.find((m) => m.role === role)?.id ?? null;
  base.people.find((m) => m.role === "coordinator")!.name = "Dilani (coordinator)";
  base.people.find((m) => m.role === "bride_family")!.name = "Perera family";
  base.people.find((m) => m.role === "groom_family")!.name = "Jayasinghe family";

  // Tasks: generated as if planning started 15 months out, then progressed to today.
  const tasks = generateTasks({ weddingDate: SAMPLE_WEDDING_DATE, today: addDays(SAMPLE_WEDDING_DATE, -460), people: base.people, now });
  let overdueKept = 0;
  base.tasks = tasks.map((t) => {
    if (!t.dueDate) return t;
    if (compareISO(t.dueDate, today) < 0) {
      if (overdueKept < 2 && (t.templateKey === "video-book" || t.templateKey === "decor-quotes")) {
        overdueKept++;
        return { ...t, status: "in_progress" };
      }
      return { ...t, status: "completed", completedAt: `${t.dueDate}T10:00:00.000Z` };
    }
    if (compareISO(t.dueDate, addDays(today, 45)) <= 0) return { ...t, status: "in_progress" };
    if (compareISO(t.dueDate, addDays(today, 90)) <= 0) return { ...t, status: "planning" };
    return t;
  });

  // Vendors
  const vendorIds = new Map<string, string>();
  base.vendors = VENDORS.map((v) => {
    const id = newId();
    vendorIds.set(v.key, id);
    return {
      id,
      name: v.name,
      categoryId: v.categoryId,
      contactName: v.contactName,
      phone: "077 000 0000",
      email: "",
      location: v.location,
      status: v.status,
      rating: v.rating,
      notes: v.notes ?? "",
      dayStatus: "not_arrived",
      arrivalTime: v.arrivalTime,
      ...stamp(now),
    } satisfies Vendor;
  });
  const vid = (key: string) => vendorIds.get(key)!;

  // Budget lines (LKR). planned / quoted / final / status / vendor
  const lines: [BudgetCategoryId, string, number, number | null, number | null, BudgetItem["status"], string | null][] = [
    ["venue", "Lotus Hall — hall hire", 400_000, 400_000, 400_000, "booked", "lotus"],
    ["catering", "Lunch buffet, 320 guests", 950_000, 1_030_000, 1_030_000, "booked", "lotus-catering"],
    ["photography", "Photography package", 300_000, 280_000, null, "negotiating", "ceylon-frames"],
    ["videography", "Wedding film", 150_000, 160_000, null, "quoted", "hill-films"],
    ["decoration", "Hall and entrance decoration", 300_000, 345_000, null, "quoted", "jasmine-co"],
    ["flowers", "Jasmine, lotus and roses", 80_000, null, null, "planned", null],
    ["poruwa", "Poruwa, decoration and Ashtaka", 145_000, 140_000, 140_000, "booked", "poruwa-ashtaka"],
    ["attire", "Bridal saree and National Suit", 300_000, 320_000, 320_000, "booked", "silk-route"],
    ["jewelry", "Rings and bridal jewellery", 150_000, 150_000, 150_000, "booked", "heritage-jewel"],
    ["makeup", "Bridal makeup and saree dressing", 100_000, 95_000, 95_000, "booked", "glow"],
    ["transport", "Wedding and going-away cars", 70_000, null, null, "planned", "vintage-rides"],
    ["entertainment", "Kandyan drummers and dancers", 120_000, 120_000, 120_000, "booked", "udarata"],
    ["cake", "Wedding cake and cake structure", 35_000, null, null, "planned", "sweet-ceylon"],
    ["invitations", "Invitations and envelopes", 70_000, 75_000, 75_000, "booked", "paper-lotus"],
    ["accommodation", "Rooms for out-of-town family", 40_000, null, null, "planned", null],
    ["lighting", "Lighting", 35_000, null, null, "planned", null],
    ["sound", "Sound system", 35_000, null, null, "planned", null],
    ["gifts", "Favours and attendant gifts", 20_000, null, null, "planned", null],
    ["album", "Printed album", 30_000, null, null, "planned", null],
    ["miscellaneous", "Miscellaneous", 20_000, null, null, "planned", null],
    ["emergency", "Contingency", 150_000, null, null, "planned", null],
  ];
  const itemIds = new Map<string, string>();
  base.budgetItems = lines.map(([categoryId, name, planned, quoted, final, status, vendorKey]) => {
    const id = newId();
    if (vendorKey) itemIds.set(vendorKey, id);
    return { id, categoryId, name, planned, quoted, final, status, vendorId: vendorKey ? vid(vendorKey) : null, notes: "", ...stamp(now) };
  });

  // Payments, placed around today so the schedule feels current.
  const pay = (vendorKey: string, label: string, amount: number, due: ISODate, paid: boolean): Payment => ({
    id: newId(),
    vendorId: vid(vendorKey),
    budgetItemId: itemIds.get(vendorKey) ?? null,
    label,
    amount,
    dueDate: due,
    paidDate: paid ? due : null,
    status: paid ? "paid" : "scheduled",
    method: paid ? "Bank transfer" : "",
    reference: "",
    ...stamp(now),
  });
  base.payments = [
    pay("lotus", "First instalment", 200_000, addDays(today, -116), true),
    pay("lotus", "Second instalment", 200_000, addDays(today, 5), false),
    pay("lotus-catering", "Catering advance", 300_000, addDays(today, -116), true),
    pay("lotus-catering", "Catering balance", 730_000, addDays(SAMPLE_WEDDING_DATE, -14), false),
    pay("ceylon-frames", "Advance", 100_000, addDays(today, 24), false),
    pay("poruwa-ashtaka", "Advance", 70_000, addDays(today, -60), true),
    pay("poruwa-ashtaka", "Balance", 70_000, addDays(today, 68), false),
    pay("silk-route", "Fitting deposit", 160_000, addDays(today, -30), true),
    pay("silk-route", "Balance", 160_000, addDays(today, 94), false),
    pay("heritage-jewel", "Full payment", 150_000, addDays(today, -45), true),
    pay("glow", "Booking advance", 30_000, addDays(today, -20), true),
    pay("glow", "Balance", 65_000, addDays(SAMPLE_WEDDING_DATE, -7), false),
    pay("udarata", "Booking deposit", 40_000, addDays(today, 43), false),
    pay("udarata", "Balance on the day", 80_000, SAMPLE_WEDDING_DATE, false),
    pay("paper-lotus", "Full payment", 75_000, addDays(today, -10), true),
  ];

  // Quotes
  const quote = (vendorKey: string, packageName: string, price: number, extras: Partial<VendorQuote>, features: string[], selected = false): VendorQuote => ({
    id: newId(),
    vendorId: vid(vendorKey),
    packageName,
    price,
    additionalCharges: 0,
    overtime: 0,
    transport: 0,
    taxes: 0,
    hours: null,
    deliverables: "",
    paymentTerms: "",
    reviewScore: null,
    selected,
    ...extras,
    features: Object.fromEntries(features.map((f) => [f, true])),
    ...stamp(now),
  });
  base.quotes = [
    quote("ceylon-frames", "Signature", 280_000, { transport: 15_000, hours: 12, deliverables: "600 edited photos, 40-page album, highlight video, drone", paymentTerms: "35% advance, balance one week before", reviewScore: 4.7 }, ["album", "edited_photos", "video", "drone", "pre_shoot"], true),
    quote("lens-lanka", "Classic", 220_000, { overtime: 15_000, transport: 10_000, hours: 10, deliverables: "400 edited photos, 30-page album", paymentTerms: "50% advance", reviewScore: 4.1 }, ["album", "second_shooter"]),
    quote("studio-serendib", "Heirloom", 420_000, { transport: 25_000, taxes: 30_000, hours: 14, deliverables: "800 edited photos, two albums, film, drone, second shooter", paymentTerms: "50% advance, balance on delivery", reviewScore: 4.9 }, ["album", "edited_photos", "video", "drone", "second_shooter", "pre_shoot"]),
    quote("jasmine-co", "Kandyan Elegance", 345_000, { additionalCharges: 25_000, deliverables: "Entrance arch, stage, 32 table centres, fresh jasmine", paymentTerms: "40% advance" }, ["fresh_flowers", "jasmine", "entrance", "table_centres", "setup_teardown"], true),
    quote("kandy-blooms", "Garden White", 290_000, { additionalCharges: 10_000, deliverables: "Entrance, stage, table centres with fresh jasmine", paymentTerms: "50% advance" }, ["fresh_flowers", "jasmine", "entrance", "table_centres", "setup_teardown"]),
    quote("araliya", "Grand Lotus", 520_000, { additionalCharges: 40_000, transport: 20_000, deliverables: "Full floral ceiling, lotus pond entrance, premium linens", paymentTerms: "50% advance" }, ["fresh_flowers", "jasmine", "entrance", "table_centres", "setup_teardown"]),
  ];

  // Timeline: link vendors to the moments they serve.
  base.timeline = base.timeline.map((e) => {
    const links: Record<string, string[]> = {
      "Bride preparation": ["glow", "silk-route"],
      "Getting-ready photography": ["ceylon-frames"],
      "Groom's arrival with drummers": ["udarata"],
      "Poruwa ceremony": ["poruwa-ashtaka", "ceylon-frames"],
      "Family photos": ["ceylon-frames"],
      Lunch: ["lotus-catering"],
      "Going-away": ["vintage-rides"],
    };
    return { ...e, vendorIds: (links[e.title] ?? []).map(vid), ownerId: e.title === "Poruwa ceremony" ? personId("bride_family") : null };
  });

  base.guests = sampleGuests(now);
  return base;
}
