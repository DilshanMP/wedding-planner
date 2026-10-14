import type { BudgetItem, ID, ISODateTime, LKR, SimulatorScene, TimelineEvent } from "./types";

/**
 * The couple's creative plan: wedding colours, menu, table layout, cards and
 * the vision board. Each part is saved on its own so two people can work on
 * different parts at the same time without overwriting each other.
 */

/* ------------------------------------------------------------------ */
/* Colours                                                             */
/* ------------------------------------------------------------------ */

export interface ThemePlan {
  name: string;
  /** 3–5 hex colours: [0] main, [1] second, [2] accent, then extras. */
  colors: string[];
  /** Recolour the app with the wedding colours. */
  applyToApp: boolean;
  /** Document (photo) shown behind the home screen, usually the venue. */
  heroDocumentId: ID | null;
}

export const PALETTES: { name: string; colors: string[] }[] = [
  { name: "Kandyan maroon & gold", colors: ["#7b1e2b", "#c9a24a", "#f6efe3", "#2f5d50"] },
  { name: "Dusty blue & silver", colors: ["#3d5a80", "#a9bcd0", "#f4f1ea", "#8d99ae"] },
  { name: "Blush & ivory", colors: ["#b5546a", "#f2c4ce", "#fbf6ef", "#c9a24a"] },
  { name: "Emerald & gold", colors: ["#1f6f54", "#d4af37", "#f7f3e8", "#7a4f32"] },
  { name: "Navy & champagne", colors: ["#1f2a44", "#d8c3a5", "#faf7f0", "#9e1b2a"] },
  { name: "Lilac & sage", colors: ["#7d5ba6", "#a8bba3", "#f8f5fa", "#d4af37"] },
  { name: "Peach & coral", colors: ["#c8553d", "#f5b994", "#fff8f0", "#2d6a6a"] },
  { name: "Ivory & white gold", colors: ["#8a6d3b", "#e8dcc4", "#fffdf8", "#5c4a3a"] },
];

export const DEFAULT_THEME: ThemePlan = { name: "Kandyan maroon & gold", colors: PALETTES[0].colors, applyToApp: false, heroDocumentId: null };

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export interface MenuSection {
  id: string;
  title: string;
  /** How many dishes the package lets you choose; 0 = included as listed. */
  pick: number;
  items: string[];
}

export interface MenuPlan {
  venue: string;
  menuName: string;
  pricePerHead: LKR;
  /** Price printed on the menu card, for reference. */
  listedPrice: LKR | null;
  sections: MenuSection[];
  /** Section id → chosen dishes. */
  chosen: Record<string, string[]>;
  notes: string;
  /** When the couple marked the menu final. */
  finalizedAt: ISODateTime | null;
}

const s = (id: string, title: string, pick: number, items: string[]): MenuSection => ({ id, title, pick, items });

/** Paradise Inn, Bolgoda — "Crystal Glow" wedding menu (2027 card). */
export const CRYSTAL_GLOW_2027: Omit<MenuPlan, "chosen" | "notes" | "finalizedAt"> = {
  venue: "Paradise Inn, Bolgoda — Crystal Atrium",
  menuName: "Crystal Glow",
  pricePerHead: 11_000,
  listedPrice: 10_770,
  sections: [
    s("drink", "Welcome drink", 1, ["Apple", "Guava", "Orange", "Mango", "Mix fruit", "Black currant"]),
    s("appetizers", "Appetizers", 3, ["Garlic bread salsa", "Cold meat platter with pickled vegetables", "Chicken wings with satay sauce", "Seafood mayonnaise", "Roasted pork with pineapple sauce", "Marinated mushrooms, spinach, egg plant & tomatoes"]),
    s("salads", "Salads", 4, ["Assorted pasta & seafood in mayonnaise dressing", "Tomato, cucumber, onion & green chili salad", "Apple coleslaw salad", "Cold meat pasta with bell pepper", "Caesar salad / Greek salad", "Thai seafood salad", "New potato with sun-dried tomato", "Seafood marine rose with Cajun spices", "Roasted potato salad", "Fresh tomato with sweet chili & basil"]),
    s("dressing", "Sauce & dressing", 0, ["Vinaigrette, French, cocktail & Thousand Island dressing"]),
    s("soup", "Soup", 1, ["Cream of vegetable soup", "Sweet corn soup / cream corn soup", "Cream of chicken soup", "Tom yum soup", "Mulligatawny soup"]),
    s("bread", "With the soup", 0, ["Assorted bread & butter"]),
    s("prawns", "Prawns", 1, ["Batter fried prawns with hot garlic", "Sweet & sour prawns", "Batter fried prawns – mayonnaise / soya / sweet & sour sauce", "Devilled chili garlic prawns", "Stir fried prawns with bell pepper", "Prawns badum", "Kankun fried prawns", "Szechuan chili prawns"]),
    s("seafood", "Seafood", 1, ["Baked fish with orange sauce", "Fish stew with turmeric & mustard", "Thai fish green curry", "Fried cuttlefish rings with tartar sauce", "Fried cuttlefish in hot garlic", "Five spiced seafood with spring onions", "Szechuan chili cuttlefish", "Fish tikka masala / fish tikka", "Szechuan mixed seafood"]),
    s("chicken", "Chicken", 1, ["Chicken & mushroom lasagna", "Chicken korma, Indian style", "Asian spicy roasted chicken", "Chicken tikka masala", "Tandoori roasted chicken", "Thai green chicken curry", "Crumbed fried chicken with tartar sauce", "Butter chicken masala"]),
    s("pork", "Pork", 1, ["Pork badum \"Paradise\"", "Pork black pepper", "Pork stew", "Red pork curry", "Szechuan chili pork", "Pork chili garlic", "Thai style sesame pork with red chili"]),
    s("vegetables", "Vegetables", 4, ["Cashew with green peas", "Paneer tikka masala", "Vegetable kebab", "Stir fried vegetables", "Brinjal moju / brinjal phai", "Garlic butter beans", "Thai green or red mixed vegetable curry", "Tempered mushroom", "Traditional Sri Lankan mixed vegetable curry", "Vegetable lasagna", "Hot butter mushroom", "Vegetable pakora"]),
    s("rice", "Rice & noodles (+ steamed rice)", 3, ["Indonesian nasi goreng", "Thai fried rice", "Traditional ghee rice", "Spicy fried rice with prawns & cuttlefish", "Yong chow fried rice", "Spicy Szechuan noodles", "Vegetable tossed egg noodles", "Vegetable fried egg noodles"]),
    s("condiments", "Condiments", 0, ["Village achcharu / home-made fruit chutney"]),
    s("desserts", "Desserts", 5, ["Fresh fruit in season", "Cinnamon cream caramel", "Watalappan", "Fruit trifle", "Chocolate mousse", "White chocolate mousse pudding", "Queen of puddings", "Caramel sago pudding", "Marshmallow pudding", "Mango vanilla slice", "Lemon cheesecake", "Selection of ice cream (vanilla, chocolate, strawberry)"]),
  ],
};

export function emptyMenu(): MenuPlan {
  return { venue: "", menuName: "", pricePerHead: 0, listedPrice: null, sections: [], chosen: {}, notes: "", finalizedAt: null };
}

export function menuFromTemplate(t: typeof CRYSTAL_GLOW_2027): MenuPlan {
  return { ...structuredClone(t), chosen: {}, notes: "", finalizedAt: null };
}

export interface MenuProgress {
  /** Sections where the couple still has to choose. */
  open: MenuSection[];
  done: number;
  total: number;
}

export function menuProgress(menu: MenuPlan): MenuProgress {
  const choosable = menu.sections.filter((x) => x.pick > 0);
  const open = choosable.filter((x) => (menu.chosen[x.id] ?? []).length < x.pick);
  return { open, done: choosable.length - open.length, total: choosable.length };
}

/** Toggle a dish, respecting the section limit. Returns null when the section is already full. */
export function toggleDish(menu: MenuPlan, sectionId: string, dish: string): MenuPlan | null {
  const section = menu.sections.find((x) => x.id === sectionId);
  if (!section || section.pick === 0) return menu;
  const current = menu.chosen[sectionId] ?? [];
  if (current.includes(dish)) return { ...menu, chosen: { ...menu.chosen, [sectionId]: current.filter((d) => d !== dish) }, finalizedAt: null };
  if (section.pick === 1) return { ...menu, chosen: { ...menu.chosen, [sectionId]: [dish] }, finalizedAt: null };
  if (current.length >= section.pick) return null;
  return { ...menu, chosen: { ...menu.chosen, [sectionId]: [...current, dish] }, finalizedAt: null };
}

/** Plain-text menu for WhatsApp or the caterer. */
export function menuText(menu: MenuPlan, title: string): string {
  const lines = [`${title} — ${menu.menuName || "Menu"}${menu.venue ? ` · ${menu.venue}` : ""}`, ""];
  for (const sec of menu.sections) {
    const dishes = sec.pick === 0 ? sec.items : menu.chosen[sec.id] ?? [];
    if (dishes.length === 0) continue;
    lines.push(sec.title.toUpperCase());
    for (const d of dishes) lines.push(`• ${d}`);
    lines.push("");
  }
  if (menu.notes.trim()) lines.push(`Notes: ${menu.notes.trim()}`);
  return lines.join("\n").trim();
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export type FixtureKind = "poruwa" | "head" | "dance" | "buffet" | "bar" | "band" | "cake" | "entrance" | "photo";

export interface Fixture {
  id: ID;
  kind: FixtureKind;
  label: string;
  /** Centre position and size in metres. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SeatTable {
  id: ID;
  label: string;
  x: number;
  y: number;
  seats: number;
  shape: "round" | "long";
  /** Guest parties seated here. */
  guestIds: ID[];
}

export interface SeatingPlan {
  hallName: string;
  /** Hall size in metres. */
  width: number;
  depth: number;
  tables: SeatTable[];
  fixtures: Fixture[];
}

export const FIXTURE_LABEL: Record<FixtureKind, string> = {
  poruwa: "Poruwa",
  head: "Head table",
  dance: "Dance floor",
  buffet: "Buffet",
  bar: "Bar",
  band: "Band / DJ",
  cake: "Cake table",
  entrance: "Entrance",
  photo: "Photo corner",
};

export function emptySeating(): SeatingPlan {
  return { hallName: "", width: 32, depth: 22, tables: [], fixtures: [] };
}

/** A starting layout: Poruwa and head table at the front, dance floor, buffet, round tables of ten. */
export function defaultSeating(hallName: string, tableCount: number, newId: () => string): SeatingPlan {
  const width = 32;
  const want = Math.max(1, tableCount);
  // Fill the room around the dance floor, front to back, adding rows (a deeper hall) until everyone fits.
  const spots: [number, number][] = [];
  let y = 5;
  while (spots.length < want) {
    for (let x = 6.5; x <= 26; x += 3.6) {
      const nearDance = Math.abs(x - 16) < 5.6 && y > 6.5 && y < 13.4;
      const nearHead = Math.abs(x - 16) < 5.4 && y < 7.6;
      if (!nearDance && !nearHead) spots.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    y = Math.round((y + 3.4) * 10) / 10;
  }
  const depth = Math.max(22, Math.ceil(spots[want - 1][1] + 3));
  const f = (kind: FixtureKind, x: number, fy: number, w: number, h: number): Fixture => ({ id: newId(), kind, label: FIXTURE_LABEL[kind], x, y: fy, w, h });
  const fixtures = [
    f("poruwa", 16, 2.6, 4, 3.2),
    f("head", 16, 6.2, 7, 1.4),
    f("dance", 16, 10.2, 7, 5),
    f("band", 4, 2.6, 4, 2.6),
    f("cake", 26.5, 2.6, 2.2, 2.2),
    f("buffet", 29.5, 13, 2, 9),
    f("bar", 2.5, 13, 2, 5),
    f("photo", 2.5, depth - 2, 3.4, 2),
    f("entrance", 16, depth - 0.6, 4, 1),
  ];
  const tables = spots.slice(0, want).map(([x, ty], i) => ({ id: newId(), label: `Table ${i + 1}`, x, y: ty, seats: 10, shape: "round" as const, guestIds: [] }));
  return { hallName, width, depth, tables, fixtures };
}

/** Seats taken at a table, given each party's head count. */
export function seatsUsed(table: SeatTable, partySize: (guestId: string) => number): number {
  return table.guestIds.reduce((n, id) => n + partySize(id), 0);
}

/* ------------------------------------------------------------------ */
/* Cards and boxes                                                     */
/* ------------------------------------------------------------------ */

export type CardTemplate = "kandyan" | "floral" | "modern" | "lotus";

export interface InvitationText {
  /** Opening line, e.g. a blessing. */
  blessing: string;
  hosts: string;
  inviteLine: string;
  brideFull: string;
  groomFull: string;
  dateLine: string;
  timeLine: string;
  venueLine: string;
  rsvpLine: string;
  /** Short line on the envelope / cover. */
  coverLine: string;
  /** Sinhala heading on the card (optional). */
  sinhalaLine: string;
}

export interface StationeryPlan {
  template: CardTemplate;
  /** Use the wedding colours; otherwise the template's own. */
  useTheme: boolean;
  text: InvitationText;
  /** Text on the cake boxes. */
  boxLine: string;
  thankYouLine: string;
}

export function defaultStationery(): StationeryPlan {
  return {
    template: "kandyan",
    useTheme: true,
    text: {
      blessing: "With the blessings of the Noble Triple Gem",
      hosts: "Mr. & Mrs. ________ and Mr. & Mrs. ________",
      inviteLine: "request the pleasure of your company at the wedding of their beloved children",
      brideFull: "",
      groomFull: "",
      dateLine: "",
      timeLine: "Poruwa ceremony at 5.30 p.m. · Reception to follow",
      venueLine: "",
      rsvpLine: "Kindly reply by ________",
      coverLine: "Together with our families",
      sinhalaLine: "ශුභ විවාහ මංගල්‍යය",
    },
    boxLine: "Thank you for sharing our special day",
    thankYouLine: "Your love and blessings made our day complete. Thank you!",
  };
}

/* ------------------------------------------------------------------ */
/* Vision board                                                        */
/* ------------------------------------------------------------------ */

export type VisionTag = "venue" | "couple" | "bride" | "groom" | "decor" | "outfit" | "flowers" | "cake" | "card" | "other";

export interface VisionItem {
  documentId: ID;
  tag: VisionTag;
  caption: string;
  /** Liked by name (both of you can heart a photo). */
  likes: string[];
}

export interface PreviewLayer {
  documentId: ID;
  /** Centre position as a fraction of the background (0–1) and width as a fraction. */
  x: number;
  y: number;
  width: number;
}

export interface OutfitPlan {
  id: ID;
  who: "bride" | "groom";
  moment: string;
  description: string;
  color: string;
  documentId: ID | null;
  done: boolean;
}

export interface VisionPlan {
  items: VisionItem[];
  /** Real-photo preview: a background (venue) with cut-out photos placed on it. */
  preview: { backgroundId: ID | null; layers: PreviewLayer[] };
  outfits: OutfitPlan[];
}

export function defaultVision(newId: () => string): VisionPlan {
  return {
    items: [],
    preview: { backgroundId: null, layers: [] },
    outfits: [
      { id: newId(), who: "bride", moment: "Poruwa ceremony", description: "Kandyan Osariya with traditional jewellery", color: "#f8f1e2", documentId: null, done: false },
      { id: newId(), who: "bride", moment: "Going-away", description: "Going-away saree or dress", color: "#c9a24a", documentId: null, done: false },
      { id: newId(), who: "groom", moment: "Poruwa & reception", description: "Suit", color: "#1f2a44", documentId: null, done: false },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Aggregate                                                           */
/* ------------------------------------------------------------------ */

export interface PlannerData {
  theme: ThemePlan;
  menu: MenuPlan;
  seating: SeatingPlan;
  stationery: StationeryPlan;
  vision: VisionPlan;
}

export type PlannerKey = keyof PlannerData;

export const PLANNER_LABEL: Record<PlannerKey, string> = {
  theme: "the wedding colours",
  menu: "the menu",
  seating: "the table plan",
  stationery: "the wedding cards",
  vision: "the vision board",
};

export function defaultPlanner(newId: () => string): PlannerData {
  return { theme: DEFAULT_THEME, menu: emptyMenu(), seating: emptySeating(), stationery: defaultStationery(), vision: defaultVision(newId) };
}

/** Fill anything missing (older saves) with defaults. */
export function normalizePlanner(raw: Partial<PlannerData> | null | undefined, newId: () => string): PlannerData {
  const d = defaultPlanner(newId);
  const p = raw ?? {};
  const st = (p.stationery ?? {}) as Partial<StationeryPlan>;
  return {
    theme: { ...d.theme, ...(p.theme ?? {}) },
    menu: { ...d.menu, ...(p.menu ?? {}) },
    seating: { ...d.seating, ...(p.seating ?? {}) },
    stationery: { ...d.stationery, ...st, text: { ...d.stationery.text, ...(st.text ?? {}) } },
    vision: { ...d.vision, ...(p.vision ?? {}), preview: { ...d.vision.preview, ...(p.vision?.preview ?? {}) } },
  };
}

/* ------------------------------------------------------------------ */
/* Evening wedding (Poruwa at dusk, reception until midnight)          */
/* ------------------------------------------------------------------ */


export const EVENING_DAY: { time: string; durationMinutes: number; title: string; location: string; scene: SimulatorScene; description: string }[] = [
  { time: "13:00", durationMinutes: 180, title: "Bride preparation (Kandyan)", location: "Bridal suite", scene: "preparation", description: "Hair, makeup and Osariya dressing." },
  { time: "15:30", durationMinutes: 60, title: "Groom preparation", location: "Groom's suite", scene: "groom", description: "Suit, buttonhole and family photos." },
  { time: "16:30", durationMinutes: 45, title: "Getting-ready photos", location: "Suites", scene: "photos", description: "Details, jewellery and family moments." },
  { time: "17:00", durationMinutes: 30, title: "Guests arrive", location: "Crystal Atrium entrance", scene: "arrival", description: "Welcome drinks and seating." },
  { time: "17:20", durationMinutes: 10, title: "Couple's arrival with drummers", location: "Entrance", scene: "groom", description: "Kandyan drummers lead the couple in." },
  { time: "17:30", durationMinutes: 45, title: "Poruwa ceremony", location: "Poruwa", scene: "poruwa", description: "At the auspicious time, with Jayamangala Gatha. (Registration is done before the wedding day.)" },
  { time: "18:15", durationMinutes: 45, title: "Family photos", location: "Atrium / lakeside", scene: "photos", description: "Follow the family photo list while it's still light." },
  { time: "19:00", durationMinutes: 40, title: "Change into going-away", location: "Bridal suite", scene: "going_away", description: "Bride changes into the going-away outfit." },
  { time: "19:45", durationMinutes: 20, title: "Reception entrance & toast", location: "Crystal Atrium", scene: "reception", description: "Couple's entrance, welcome speech and toast." },
  { time: "20:05", durationMinutes: 25, title: "First dance & cake", location: "Dance floor", scene: "cake", description: "First dance, then cake cutting." },
  { time: "20:30", durationMinutes: 90, title: "Dinner buffet", location: "Crystal Atrium", scene: "dinner", description: "Crystal Glow menu." },
  { time: "22:00", durationMinutes: 75, title: "Dancing", location: "Dance floor", scene: "entertainment", description: "Band / DJ." },
  { time: "23:15", durationMinutes: 30, title: "Going-away", location: "Main entrance", scene: "going_away", description: "Send-off with family and friends." },
  { time: "23:45", durationMinutes: 15, title: "Function ends", location: "Crystal Atrium", scene: "other", description: "Hall closes at midnight." },
];

export function eveningTimeline(now: string, newId: () => string): TimelineEvent[] {
  return EVENING_DAY.map((e) => ({ id: newId(), ...e, vendorIds: [], ownerId: null, createdAt: now, updatedAt: now }));
}

/**
 * Budget lines for a venue package: catering from the menu, plus the
 * venue's extras. Existing lines are updated rather than duplicated.
 */
export function venueBudgetLines(
  items: BudgetItem[],
  opts: { menuName: string; pricePerHead: LKR; heads: number; lighting: LKR | null; decorMin: LKR | null; decorMax: LKR | null },
  now: string,
  newId: () => string,
): BudgetItem[] {
  const out: BudgetItem[] = [];
  const make = (categoryId: BudgetItem["categoryId"], name: string, planned: LKR, quoted: LKR | null, notes: string): BudgetItem => ({ id: newId(), categoryId, name, planned, quoted, final: null, vendorId: null, status: quoted ? "quoted" : "planned", notes, createdAt: now, updatedAt: now });
  const catering = items.find((i) => i.categoryId === "catering" && i.status !== "cancelled");
  const cost = opts.pricePerHead * opts.heads;
  const note = `${opts.menuName} menu · LKR ${opts.pricePerHead.toLocaleString("en-LK")} × ${opts.heads} guests`;
  if (catering) out.push({ ...catering, quoted: cost, notes: note, status: catering.status === "planned" ? "quoted" : catering.status, updatedAt: now });
  else out.push(make("catering", `Catering — ${opts.menuName}`, cost, cost, note));
  if (opts.lighting) {
    const light = items.find((i) => i.categoryId === "lighting" && /light/i.test(i.name));
    if (light) out.push({ ...light, quoted: opts.lighting, status: light.status === "planned" ? "quoted" : light.status, updatedAt: now });
    else out.push(make("lighting", "Light operation (venue)", opts.lighting, opts.lighting, "Venue light operation charge"));
  }
  if (opts.decorMin) {
    const range = `Decor packages from LKR ${opts.decorMin.toLocaleString("en-LK")}${opts.decorMax ? ` to ${opts.decorMax.toLocaleString("en-LK")}` : ""} — not finalised yet`;
    const decor = items.find((i) => i.categoryId === "decoration" && i.status !== "cancelled");
    if (decor) out.push({ ...decor, notes: decor.notes.includes("Decor packages") ? decor.notes : [decor.notes, range].filter(Boolean).join("\n"), updatedAt: now });
    else out.push(make("decoration", "Decoration (venue packages)", opts.decorMin, null, range));
  }
  return out;
}
