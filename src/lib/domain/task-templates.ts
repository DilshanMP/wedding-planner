import type { PersonRole, Priority } from "./types";

/**
 * The master A–Z checklist. `daysBefore` is measured back from the wedding
 * date (negative = after the wedding). Dates are always calculated from the
 * couple's actual wedding date.
 */
export interface TaskTemplate {
  key: string;
  title: string;
  categoryId: string;
  daysBefore: number;
  priority: Priority;
  description?: string;
  owner?: PersonRole | "both";
  /** Keys of templates that should be done first. */
  dependsOn?: string[];
}

const M = 30; // a month, in days, for readability

export const TASK_TEMPLATES: TaskTemplate[] = [
  // 12+ months — vision, budget, guest strategy, venue
  { key: "vision-blueprint", title: "Write your wedding blueprint", categoryId: "vision", daysBefore: 13 * M, priority: "high", owner: "both", description: "Agree on the feel of the day, your must-haves and where you don't want to overspend." },
  { key: "vision-style", title: "Choose a wedding style and colour palette", categoryId: "vision", daysBefore: 12 * M, priority: "medium", owner: "both", dependsOn: ["vision-blueprint"] },
  { key: "astrologer-date", title: "Confirm the auspicious date and Poruwa time (nekath)", categoryId: "poruwa", daysBefore: 13 * M, priority: "high", owner: "bride_family", description: "Ask the family astrologer for the nekath times for the Poruwa ceremony and going-away." },
  { key: "budget-set", title: "Set the total wedding budget", categoryId: "budget", daysBefore: 12 * M, priority: "high", owner: "both", description: "Agree on contributions from both families and set the original plan." },
  { key: "budget-allocate", title: "Allocate the budget across categories", categoryId: "budget", daysBefore: 12 * M, priority: "high", owner: "both", dependsOn: ["budget-set"] },
  { key: "budget-contingency", title: "Reserve a contingency (about 5%)", categoryId: "budget", daysBefore: 12 * M, priority: "medium", owner: "both", dependsOn: ["budget-set"] },
  { key: "guest-strategy", title: "Agree the guest strategy with both families", categoryId: "guests", daysBefore: 12 * M, priority: "high", owner: "both", description: "Decide the target headcount and the bride-side / groom-side split." },
  { key: "guest-draft", title: "Draft the first guest list", categoryId: "guests", daysBefore: 11 * M, priority: "high", owner: "both", dependsOn: ["guest-strategy"] },
  { key: "venue-research", title: "Research and visit venues", categoryId: "venue", daysBefore: 12 * M, priority: "high", owner: "both" },
  { key: "venue-book", title: "Book the venue and sign the contract", categoryId: "venue", daysBefore: 11 * M, priority: "high", owner: "both", dependsOn: ["venue-research", "astrologer-date"] },
  { key: "planner-decide", title: "Decide: self-plan, coordinator or full planner", categoryId: "planner", daysBefore: 11 * M, priority: "medium", owner: "both", description: "Compare planner quotations against your own estimates before committing." },
  { key: "insurance", title: "Look into event insurance", categoryId: "insurance", daysBefore: 10 * M, priority: "low", owner: "groom" },

  // ~9 months — key vendors
  { key: "photo-shortlist", title: "Shortlist three photographers", categoryId: "photographer", daysBefore: 10 * M, priority: "high", owner: "both" },
  { key: "photo-book", title: "Book the photographer", categoryId: "photographer", daysBefore: 9 * M, priority: "high", owner: "both", dependsOn: ["photo-shortlist"] },
  { key: "video-book", title: "Book the videographer", categoryId: "videographer", daysBefore: 9 * M, priority: "medium", owner: "both" },
  { key: "caterer-quotes", title: "Collect catering quotations", categoryId: "caterer", daysBefore: 10 * M, priority: "high", owner: "both" },
  { key: "caterer-book", title: "Book the caterer", categoryId: "caterer", daysBefore: 9 * M, priority: "high", owner: "both", dependsOn: ["caterer-quotes"] },
  { key: "decor-quotes", title: "Compare decorator quotations", categoryId: "decor", daysBefore: 9 * M, priority: "high", owner: "bride" },
  { key: "decor-book", title: "Book the decorator", categoryId: "decor", daysBefore: 8 * M, priority: "high", owner: "bride", dependsOn: ["decor-quotes"] },
  { key: "poruwa-book", title: "Book the Poruwa decorator and ceremony master", categoryId: "poruwa", daysBefore: 9 * M, priority: "high", owner: "bride_family" },
  { key: "coordinator", title: "Choose a day-of coordinator", categoryId: "coordinator", daysBefore: 8 * M, priority: "medium", owner: "both" },
  { key: "rings-shop", title: "Choose the wedding rings", categoryId: "jewelry", daysBefore: 8 * M, priority: "medium", owner: "groom" },
  { key: "bridal-jewelry", title: "Choose bridal jewellery (Kandyan set or modern)", categoryId: "jewelry", daysBefore: 7 * M, priority: "medium", owner: "bride" },
  { key: "accommodation-block", title: "Hold rooms for out-of-town family", categoryId: "accommodation", daysBefore: 8 * M, priority: "low", owner: "groom_family" },

  // ~6 months — attire, invitations, entertainment
  { key: "saree-choose", title: "Choose the bridal saree (Kandyan / Osariya)", categoryId: "attire", daysBefore: 7 * M, priority: "high", owner: "bride" },
  { key: "saree-order", title: "Order the saree and book fittings", categoryId: "attire", daysBefore: 6 * M, priority: "high", owner: "bride", dependsOn: ["saree-choose"] },
  { key: "national-suit", title: "Order the National Suit and groom accessories", categoryId: "groom_attire", daysBefore: 6 * M, priority: "high", owner: "groom" },
  { key: "going-away-attire", title: "Choose going-away outfits", categoryId: "attire", daysBefore: 5 * M, priority: "medium", owner: "both" },
  { key: "makeup-book", title: "Book hair and makeup (with trial)", categoryId: "makeup", daysBefore: 6 * M, priority: "high", owner: "bride" },
  { key: "invitation-design", title: "Design and order invitations", categoryId: "invitations", daysBefore: 6 * M, priority: "high", owner: "both", dependsOn: ["guest-draft"] },
  { key: "rsvp-setup", title: "Set up online RSVP or a family call list", categoryId: "rsvp", daysBefore: 6 * M, priority: "medium", owner: "both" },
  { key: "drummers-book", title: "Book Kandyan drummers and dancers", categoryId: "ceremony_music", daysBefore: 6 * M, priority: "medium", owner: "groom_family" },
  { key: "band-book", title: "Book the DJ or band for the reception", categoryId: "music", daysBefore: 6 * M, priority: "medium", owner: "groom" },
  { key: "entertainment-plan", title: "Plan reception entertainment", categoryId: "entertainment", daysBefore: 5 * M, priority: "low", owner: "both" },
  { key: "lighting-sound", title: "Confirm lighting and sound with the venue", categoryId: "lighting", daysBefore: 5 * M, priority: "medium", owner: "groom" },
  { key: "cake-order", title: "Choose and order the wedding cake", categoryId: "baker", daysBefore: 5 * M, priority: "medium", owner: "bride" },
  { key: "florist-book", title: "Book florist — jasmine, lotus, white and red roses", categoryId: "florist", daysBefore: 5 * M, priority: "medium", owner: "bride" },
  { key: "transport-book", title: "Book wedding cars and the going-away car", categoryId: "transport", daysBefore: 5 * M, priority: "medium", owner: "groom" },
  { key: "photo-booth", title: "Decide on a photo booth", categoryId: "photo_booth", daysBefore: 5 * M, priority: "low", owner: "both" },
  { key: "fireworks", title: "Decide on fireworks (and venue permission)", categoryId: "fireworks", daysBefore: 4 * M, priority: "low", owner: "groom" },
  { key: "rentals", title: "Arrange rentals (chairs, tent, linens) if not with venue", categoryId: "rentals", daysBefore: 5 * M, priority: "low", owner: "both" },
  { key: "bar", title: "Arrange bar service", categoryId: "bar", daysBefore: 4 * M, priority: "low", owner: "groom" },
  { key: "honeymoon-plan", title: "Plan and book the honeymoon", categoryId: "honeymoon", daysBefore: 5 * M, priority: "medium", owner: "both" },
  { key: "registry", title: "Decide on a gift registry or gift policy", categoryId: "registry", daysBefore: 5 * M, priority: "low", owner: "both" },

  // ~3 months — final guest list, menu, seating, ceremony details
  { key: "invitations-send", title: "Send invitations", categoryId: "invitations", daysBefore: 4 * M, priority: "high", owner: "both", dependsOn: ["invitation-design"] },
  { key: "guest-final", title: "Finalise the guest list", categoryId: "guests", daysBefore: 3 * M, priority: "high", owner: "both", dependsOn: ["invitations-send"] },
  { key: "rsvp-chase", title: "Follow up on pending RSVPs", categoryId: "rsvp", daysBefore: 2 * M, priority: "high", owner: "both" },
  { key: "menu-tasting", title: "Menu tasting and final menu", categoryId: "caterer", daysBefore: 3 * M, priority: "high", owner: "both" },
  { key: "seating-plan", title: "Draft the seating plan", categoryId: "seating", daysBefore: 2 * M, priority: "medium", owner: "both", dependsOn: ["guest-final"] },
  { key: "poruwa-items", title: "Prepare Poruwa ceremony items (betel, rice, coconut, white cloth, thread)", categoryId: "poruwa", daysBefore: 2 * M, priority: "high", owner: "bride_family" },
  { key: "poruwa-roles", title: "Assign family roles for the Poruwa ceremony", categoryId: "rituals", daysBefore: 2 * M, priority: "high", owner: "both", description: "Who ties the pirith thread, who pours water, who hands over the betel, the uncles who lead the couple." },
  { key: "jayamangala", title: "Arrange the Jayamangala Gatha singers", categoryId: "rituals", daysBefore: 3 * M, priority: "medium", owner: "bride_family" },
  { key: "registrar", title: "Book the registrar for the marriage registration", categoryId: "legal", daysBefore: 3 * M, priority: "high", owner: "groom_family" },
  { key: "legal-docs", title: "Gather documents: birth certificates and NICs", categoryId: "legal", daysBefore: 3 * M, priority: "high", owner: "both" },
  { key: "speeches", title: "Write the ceremony script and speeches", categoryId: "ceremony_script", daysBefore: 2 * M, priority: "medium", owner: "both" },
  { key: "reception-program", title: "Plan the reception programme", categoryId: "entertainment", daysBefore: 2 * M, priority: "medium", owner: "both" },
  { key: "favors", title: "Order favours and gifts (keep it intentional)", categoryId: "favors", daysBefore: 2 * M, priority: "low", owner: "bride" },
  { key: "attendant-gifts", title: "Choose gifts for the best man and bridesmaids", categoryId: "favors", daysBefore: 2 * M, priority: "low", owner: "both" },
  { key: "makeup-trial", title: "Hair and makeup trial", categoryId: "makeup", daysBefore: 2 * M, priority: "medium", owner: "bride", dependsOn: ["makeup-book"] },
  { key: "childcare", title: "Arrange a kids' corner or childcare", categoryId: "childcare", daysBefore: 2 * M, priority: "low", owner: "both" },
  { key: "parking", title: "Arrange parking, valet and security", categoryId: "parking", daysBefore: 2 * M, priority: "low", owner: "groom_family" },
  { key: "transport-guests", title: "Plan transport for guests who need it", categoryId: "transport", daysBefore: 2 * M, priority: "low", owner: "groom_family" },
  { key: "wellness", title: "Plan rest, health and wellness for the final months", categoryId: "wellness", daysBefore: 3 * M, priority: "low", owner: "both" },

  // ~1 month — confirmations, payments, timeline
  { key: "vendor-confirm", title: "Confirm every vendor: times, contacts, deliverables", categoryId: "coordinator", daysBefore: 30, priority: "high", owner: "both" },
  { key: "payments-final", title: "Settle final vendor payments due before the day", categoryId: "budget", daysBefore: 30, priority: "high", owner: "both" },
  { key: "day-timeline", title: "Finalise the wedding day timeline", categoryId: "day", daysBefore: 30, priority: "high", owner: "both" },
  { key: "final-fitting", title: "Final saree fitting and National Suit fitting", categoryId: "attire", daysBefore: 21, priority: "high", owner: "both" },
  { key: "headcount-caterer", title: "Give the final headcount to the caterer", categoryId: "caterer", daysBefore: 21, priority: "high", owner: "both" },
  { key: "seating-final", title: "Finalise seating and table cards", categoryId: "seating", daysBefore: 14, priority: "medium", owner: "both" },
  { key: "shot-list", title: "Share the family photo list with the photographer", categoryId: "photographer", daysBefore: 14, priority: "medium", owner: "bride" },
  { key: "going-away-plan", title: "Plan the going-away: car, route and nekath time", categoryId: "going_away", daysBefore: 21, priority: "medium", owner: "groom" },

  // 1 week — kit, documents, final confirmations
  { key: "emergency-kit", title: "Pack the day emergency kit", categoryId: "day_kit", daysBefore: 7, priority: "high", owner: "bride", description: "Safety pins, saree pins, sewing kit, painkillers, plasters, tissues, phone chargers, cash envelopes." },
  { key: "documents-pack", title: "Pack wedding documents and rings", categoryId: "legal", daysBefore: 5, priority: "high", owner: "groom" },
  { key: "final-confirm", title: "Final confirmations with vendors and family roles", categoryId: "coordinator", daysBefore: 5, priority: "high", owner: "both" },
  { key: "cash-envelopes", title: "Prepare cash envelopes for tips and final balances", categoryId: "budget", daysBefore: 3, priority: "medium", owner: "groom" },
  { key: "jasmine-order", title: "Confirm fresh jasmine and lotus delivery for the morning", categoryId: "florist", daysBefore: 3, priority: "medium", owner: "bride_family" },
  { key: "rest", title: "Rest well the night before", categoryId: "wellness", daysBefore: 1, priority: "medium", owner: "both" },

  // Wedding day
  { key: "day-brief", title: "Morning brief with the coordinator", categoryId: "day", daysBefore: 0, priority: "high", owner: "coordinator" },
  { key: "day-vendors", title: "Check every vendor has arrived", categoryId: "day", daysBefore: 0, priority: "high", owner: "coordinator" },
  { key: "day-balances", title: "Hand over final balances", categoryId: "day", daysBefore: 0, priority: "medium", owner: "groom_family" },
  { key: "day-going-away", title: "Going-away at the nekath time", categoryId: "going_away", daysBefore: 0, priority: "high", owner: "both" },

  // After
  { key: "thank-yous", title: "Send thank-you messages", categoryId: "post", daysBefore: -14, priority: "medium", owner: "both" },
  { key: "album-select", title: "Select photos for the album", categoryId: "album", daysBefore: -30, priority: "medium", owner: "both" },
  { key: "video-final", title: "Review the final wedding film", categoryId: "album", daysBefore: -60, priority: "low", owner: "both" },
  { key: "marriage-cert", title: "Collect the marriage certificate", categoryId: "legal", daysBefore: -30, priority: "medium", owner: "groom" },
  { key: "budget-close", title: "Close the budget and archive receipts", categoryId: "budget", daysBefore: -30, priority: "low", owner: "both" },
];
