import type { GuestLanguage } from "./invite-studio";

/**
 * Words guests see on an invitation, in English and Sinhala. The couple's own
 * wording (names, message, venue) comes from the invitation itself.
 */
const EN = {
  tapToOpen: "Tap to open our invitation",
  skip: "Skip animation",
  skipShort: "Skip",
  scroll: "Scroll",
  invitationFor: "An invitation for",
  dear: "Dear",
  gettingMarried: "We're getting married",
  messageForYou: "There is a message for you",
  openMessage: "Open the message",
  closeMessage: "Close the message",
  invitedTitle: "You are invited to our wedding",
  countdown: "Countdown",
  countdownSub: "The big day is getting closer",
  countingDown: "Counting down",
  days: "Days",
  day: "Day",
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
  today: "Today is the day!",
  thanksAfter: "Thank you for celebrating with us.",
  celebrateLine: "Let's celebrate the beginning of the loveliest chapter of our story.",
  ourCouple: "The two of us",
  ourStory: "Our Story",
  storySub: "A love story in a few short chapters",
  joinUsFor: "Join us for",
  weddingDay: "Our Wedding Day",
  joinToCelebrate: "Join us to celebrate",
  eventDetails: "Event Details",
  at: (what: string, time: string) => (time ? `${what} at ${time}` : what),
  openMaps: "Open in Google Maps",
  addCalendar: "Add to Google Calendar",
  appleOutlook: "Apple / Outlook",
  dressCode: "Dress Code",
  kindlyReply: "Kindly Reply",
  replyBy: "Please reply by",
  questions: "Questions?",
  contact: "Contact",
  watchAgain: "Watch the opening again",
  madeWith: "Made with EverAfter Studio",
  when: "When",
  from: "From",
  where: "Where",
  viewLocation: "View location",
  googleCalendar: "Google Calendar",
  theCelebration: "The celebration",
  rsvp: "RSVP",
  willYouCelebrate: "Will you celebrate with us?",
  // RSVP form
  yourName: "Your name",
  willYouJoin: "Will you join us?",
  accepts: "Joyfully accepts",
  notSure: "Not sure yet",
  declines: "Regretfully declines",
  howMany: "How many of you?",
  oneFewer: "One fewer",
  oneMore: "One more",
  wish: "A wish for the couple",
  optional: "(optional)",
  wishPlaceholder: "Wishing you a lifetime of happiness…",
  phone: "Phone",
  phoneHint: "(optional, only the couple sees it)",
  send: "Send my reply",
  sending: "Sending…",
  chooseComing: "Choose whether you can come.",
  thanksYes: "We can't wait to see you!",
  thanksOther: "Thank you for letting us know",
  haveReply: (couple: string) => `${couple} have your reply.`,
  maybeNote: "You can come back to this link and change your reply.",
  noNote: "You'll be in our hearts on the day.",
  changeReply: "Change my reply",
  // Bar
  barRsvp: "RSVP",
  barLocation: "Location",
  barCalendar: "Calendar",
  barShare: "Share",
  barCopied: "Copied",
  musicOn: "Turn music on",
  musicOff: "Turn music off",
  replay: "Replay the opening",
  language: "Language",
};

export type InviteWords = typeof EN;

const SI: InviteWords = {
  tapToOpen: "ආරාධනාව විවෘත කිරීමට ස්පර්ශ කරන්න",
  skip: "සජීවිකරණය මඟහරින්න",
  skipShort: "මඟහරින්න",
  scroll: "පහළට",
  invitationFor: "සුබ විවාහ ආරාධනාවක්",
  dear: "ආදරණීය",
  gettingMarried: "අපි විවාහ වෙනවා",
  messageForYou: "ඔබට පණිවිඩයක් තිබේ",
  openMessage: "පණිවිඩය විවෘත කරන්න",
  closeMessage: "පණිවිඩය වසන්න",
  invitedTitle: "අපගේ විවාහ මංගල්‍යයට ඔබට ආරාධනා",
  countdown: "දින ගණන",
  countdownSub: "මංගල දිනය ළං වෙමින් පවතී",
  countingDown: "දින ගණන",
  days: "දින",
  day: "දිනය",
  hours: "පැය",
  minutes: "මිනිත්තු",
  seconds: "තත්පර",
  today: "අද අපගේ මංගල දිනයයි!",
  thanksAfter: "අප සමඟ සැමරීමට ස්තූතියි.",
  celebrateLine: "අපගේ ජීවිතයේ ලස්සනම පරිච්ඡේදයේ ආරම්භය එක්ව සමරමු.",
  ourCouple: "අපි දෙදෙනා",
  ourStory: "අපේ කතාව",
  storySub: "කෙටි පරිච්ඡේද කිහිපයකින් අපේ ආදර කතාව",
  joinUsFor: "අප හා එක්වන්න",
  weddingDay: "අපේ මංගල දිනය",
  joinToCelebrate: "අප හා එක්ව සමරන්න",
  eventDetails: "උත්සව විස්තර",
  at: (what: string, time: string) => (time ? `${what} · ${time}` : what),
  openMaps: "Google Maps හි බලන්න",
  addCalendar: "Google Calendar එකට එක් කරන්න",
  appleOutlook: "Apple / Outlook",
  dressCode: "ඇඳුම් විලාසය",
  kindlyReply: "කරුණාකර පිළිතුරු දෙන්න",
  replyBy: "පිළිතුරු දිය යුතු දිනය",
  questions: "ප්‍රශ්න තිබේද?",
  contact: "සම්බන්ධ කරගන්න",
  watchAgain: "නැවත බලන්න",
  madeWith: "EverAfter Studio මඟින් සාදන ලදී",
  when: "කවදාද",
  from: "සිට",
  where: "කොහේද",
  viewLocation: "ස්ථානය බලන්න",
  googleCalendar: "Google Calendar",
  theCelebration: "මංගල සැමරුම",
  rsvp: "පිළිතුර",
  willYouCelebrate: "අප සමඟ සමරන්න ඔබ එනවාද?",
  yourName: "ඔබේ නම",
  willYouJoin: "ඔබ එක්වන්නේද?",
  accepts: "සතුටින් එක්වෙමි",
  notSure: "තවම නිශ්චිත නැත",
  declines: "කණගාටුයි, එක්විය නොහැක",
  howMany: "කී දෙනෙක් එනවාද?",
  oneFewer: "එක් අයෙකු අඩු කරන්න",
  oneMore: "එක් අයෙකු වැඩි කරන්න",
  wish: "යුවළට සුබ පැතුමක්",
  optional: "(අවශ්‍ය නම්)",
  wishPlaceholder: "ඔබ දෙදෙනාට දිගු සතුටින් පිරි ජීවිතයක් ප්‍රාර්ථනා කරමි…",
  phone: "දුරකථන අංකය",
  phoneHint: "(අවශ්‍ය නම්, යුවළට පමණක් පෙනේ)",
  send: "පිළිතුර යවන්න",
  sending: "යවමින්…",
  chooseComing: "ඔබට පැමිණිය හැකිද යන්න තෝරන්න.",
  thanksYes: "ඔබව දකින්න අපි ආසාවෙන් බලා සිටිමු!",
  thanksOther: "දැනුම් දීමට ස්තූතියි",
  haveReply: (couple: string) => `${couple} වෙත ඔබේ පිළිතුර ලැබුණා.`,
  maybeNote: "මෙම සබැඳියට නැවත පැමිණ ඔබේ පිළිතුර වෙනස් කළ හැක.",
  noNote: "එදින ඔබ අපගේ සිත්වල රැඳී සිටිනු ඇත.",
  changeReply: "පිළිතුර වෙනස් කරන්න",
  barRsvp: "පිළිතුර",
  barLocation: "ස්ථානය",
  barCalendar: "දිනදර්ශනය",
  barShare: "බෙදාගන්න",
  barCopied: "පිටපත් විය",
  musicOn: "සංගීතය සක්‍රිය කරන්න",
  musicOff: "සංගීතය නවත්වන්න",
  replay: "නැවත බලන්න",
  language: "භාෂාව",
};

export const INVITE_WORDS: Record<GuestLanguage, InviteWords> = { en: EN, si: SI };
export const words = (lang: GuestLanguage | undefined): InviteWords => INVITE_WORDS[lang ?? "en"];

const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? new Date(Date.UTC(y, (m || 1) - 1, d || 1)) : null;
};

const SI_MONTHS = ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"];
const SI_DAYS = ["ඉරිදා", "සඳුදා", "අඟහරුවාදා", "බදාදා", "බ්‍රහස්පතින්දා", "සිකුරාදා", "සෙනසුරාදා"];

/** "Saturday, 12 June 2027" or "2027 ජූනි 12, සෙනසුරාදා". Sinhala names are built in, since many phones lack si-LK dates. */
export function longDate(iso: string, lang: GuestLanguage = "en"): string {
  const d = toDate(iso);
  if (!d) return "";
  if (lang === "si") return `${d.getUTCFullYear()} ${SI_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${SI_DAYS[d.getUTCDay()]}`;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "12 JUNE 2027" or "2027 ජූනි 12". */
export function shortDate(iso: string, lang: GuestLanguage = "en"): string {
  const d = toDate(iso);
  if (!d) return "";
  if (lang === "si") return `${d.getUTCFullYear()} ${SI_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

/** "10:30 AM" or "පෙ.ව. 10:30". */
export function clock(time: string, lang: GuestLanguage = "en"): string {
  if (!/^\d{1,2}:\d{2}/.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const h12 = ((h + 11) % 12) + 1;
  const mm = String(m).padStart(2, "0");
  return lang === "si" ? `${h < 12 ? "පෙ.ව." : "ප.ව."} ${h12}:${mm}` : `${h12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** The couple's wording in the guest's language (Sinhala where they wrote it, else English). */
export function localise<C extends { inviteMessage: string; ceremonyTitle: string; receptionTitle: string; dressCode: string; si?: { inviteMessage: string; ceremonyTitle: string; receptionTitle: string; dressCode: string; closing: string } }>(
  content: C, closingMessage: string, lang: GuestLanguage | undefined,
): { content: C; closing: string } {
  const si = content.si;
  if (lang !== "si" || !si) return { content, closing: closingMessage };
  return {
    content: {
      ...content,
      inviteMessage: si.inviteMessage.trim() || content.inviteMessage,
      ceremonyTitle: si.ceremonyTitle.trim() || content.ceremonyTitle,
      receptionTitle: si.receptionTitle.trim() || content.receptionTitle,
      dressCode: si.dressCode.trim() || content.dressCode,
    },
    closing: si.closing.trim() || closingMessage,
  };
}
