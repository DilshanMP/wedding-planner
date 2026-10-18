import { formatLongDate } from "./dates";
import type { InviteContent } from "./invite-studio";

/**
 * Wording ideas for the invitation, written from a library of phrases for
 * Sri Lankan weddings — English, Sinhala or both; formal or modern;
 * traditional or contemporary; short or detailed. Runs in the browser with no
 * paid AI service, and everything it writes stays editable.
 */

export type Tone = "formal" | "modern";
export type Tradition = "traditional" | "contemporary";
export type Language = "en" | "si" | "both";
export type Length = "short" | "detailed";

export interface WordingOptions {
  tone: Tone;
  tradition: Tradition;
  language: Language;
  length: Length;
  /** Try another phrasing. */
  variant: number;
}

export interface Wording {
  blessing: string;
  sinhalaLine: string;
  inviteMessage: string;
  closingMessage: string;
}

type Vars = { bride: string; groom: string; brideFull: string; groomFull: string; date: string; venue: string; parents: string };

const pick = <T,>(list: T[], n: number) => list[((n % list.length) + list.length) % list.length];

const EN: Record<Tone, Record<Tradition, Record<Length, ((v: Vars) => string)[]>>> = {
  formal: {
    traditional: {
      short: [
        (v) => `Together with their families, ${v.brideFull} and ${v.groomFull} request the honour of your presence at their wedding.`,
        (v) => `${v.parents || "Our families"} request the pleasure of your company at the marriage of ${v.brideFull} and ${v.groomFull}.`,
      ],
      detailed: [
        (v) => `With the blessings of the Noble Triple Gem and the love of our families, ${v.brideFull} and ${v.groomFull} request the honour of your presence as they step onto the Poruwa on ${v.date}${v.venue ? ` at ${v.venue}` : ""}.`,
        (v) => `${v.parents || "Together with our families, we"} cordially invite you to share in the joy of the marriage of ${v.brideFull} and ${v.groomFull}, celebrated with the Poruwa ceremony on ${v.date}${v.venue ? ` at ${v.venue}` : ""}. Your presence will be our greatest blessing.`,
      ],
    },
    contemporary: {
      short: [
        (v) => `${v.brideFull} and ${v.groomFull} request the pleasure of your company as they celebrate their marriage.`,
        (v) => `The honour of your presence is requested at the wedding of ${v.brideFull} and ${v.groomFull}.`,
      ],
      detailed: [
        (v) => `${v.brideFull} and ${v.groomFull} request the pleasure of your company on ${v.date}${v.venue ? ` at ${v.venue}` : ""}, for an evening of vows, dinner and dancing in celebration of their marriage.`,
        (v) => `Kindly join ${v.brideFull} and ${v.groomFull} on ${v.date}${v.venue ? ` at ${v.venue}` : ""} as they begin their life together, surrounded by the people they love most.`,
      ],
    },
  },
  modern: {
    traditional: {
      short: [
        (v) => `Two families, one Poruwa, and all of you. Come celebrate ${v.bride} & ${v.groom}!`,
        () => `We're tying the knot the Sri Lankan way — and we'd love you there.`,
      ],
      detailed: [
        (v) => `Two hearts, one Poruwa and all the people we love. Join us on ${v.date}${v.venue ? ` at ${v.venue}` : ""} for the Poruwa ceremony, then dinner, music and dancing late into the night.`,
        (v) => `With our families' blessings, we're saying "yes" on the Poruwa on ${v.date}. Come for the ceremony, stay for the food and the dance floor — it won't be the same without you.`,
      ],
    },
    contemporary: {
      short: [
        () => `We're getting married! Come celebrate love, laughter and happily ever after with us.`,
        (v) => `${v.bride} + ${v.groom} = forever. Party with us!`,
      ],
      detailed: [
        (v) => `We found each other, and now we're making it official. Join us on ${v.date}${v.venue ? ` at ${v.venue}` : ""} for vows, a great dinner and a dance floor we'll never forget.`,
        (v) => `Save your best dance moves: ${v.bride} and ${v.groom} are getting married on ${v.date}${v.venue ? ` at ${v.venue}` : ""}, and the celebration needs you.`,
      ],
    },
  },
};

const SI: Record<Tone, Record<Length, ((v: Vars) => string)[]>> = {
  formal: {
    short: [
      () => "අපගේ විවාහ මංගල්‍යයට ඔබට ගෞරවයෙන් ආරාධනා කරමු.",
      () => "අපගේ විවාහ මංගල්‍ය උත්සවයට ඔබගේ පැමිණීම ගෞරවයෙන් අපේක්ෂා කරමු.",
    ],
    detailed: [
      (v) => `${v.date} දින${v.venue ? ` ${v.venue} හිදී` : ""} පැවැත්වෙන අපගේ විවාහ මංගල්‍ය උත්සවයට ඔබ ද පැමිණ අප සමඟ සතුට බෙදා ගන්නා මෙන් කාරුණිකව ආරාධනා කරමු.`,
      (v) => `තෙරුවන් සරණ ලබා, දෙපාර්ශ්වයේ දෙමාපියන්ගේ ආශිර්වාදය ඇතිව ${v.date} දින පැවැත්වෙන අපගේ පෝරුවේ චාරිත්‍රයට සහ විවාහ උත්සවයට ඔබට ගෞරවයෙන් ආරාධනා කරමු.`,
    ],
  },
  modern: {
    short: [
      () => "අපේ ජීවිතයේ ලස්සනම දවසට ඔබත් අප සමඟ එකතු වෙන්න.",
      () => "අපි බඳිනවා! ඔබ නැතුව ඒ සතුට සම්පූර්ණ නෑ.",
    ],
    detailed: [
      (v) => `${v.date} දින අපි පෝරුවට නගිනවා. චාරිත්‍රයට, රස කෑමට සහ නර්තනයට ඔබත් අප සමඟ එකතු වෙන්න.`,
      (v) => `ආදරය, සිනහව සහ සදාකාලික සතුට — ${v.date} දින${v.venue ? ` ${v.venue} හිදී` : ""} ඒ සියල්ල ඔබ සමඟ බෙදා ගන්න අපි කැමතියි.`,
    ],
  },
};

const BLESSINGS: Record<Language, Record<Tradition, string[]>> = {
  en: { traditional: ["With the blessings of the Noble Triple Gem", "With the blessings of our parents and the Triple Gem"], contemporary: ["Together with our families", "With joy in our hearts"] },
  si: { traditional: ["තෙරුවන් සරණයි", "තෙරුවන් සරණ ලැබේවා"], contemporary: ["දෙපවුලේ ආශිර්වාදය ඇතිව", "සතුටින් පිරුණු හදවත් ඇතිව"] },
  both: { traditional: ["තෙරුවන් සරණයි · With the blessings of the Triple Gem"], contemporary: ["Together with our families · දෙපවුලේ ආශිර්වාදය ඇතිව"] },
};

const CLOSING: Record<Language, Record<Tone, ((v: Vars) => string)[]>> = {
  en: {
    formal: [() => "Your presence will be our greatest blessing.", (v) => `With love and gratitude, ${v.bride} & ${v.groom}`],
    modern: [() => "Can't wait to celebrate with you!", () => "Bring your dancing shoes — see you there!"],
  },
  si: {
    formal: [() => "ඔබගේ පැමිණීම අපට මහත් සතුටකි.", (v) => `ආදරයෙන්, ${v.bride} සහ ${v.groom}`],
    modern: [() => "ඔබව එදාට දකින්න අපි ආසාවෙන් ඉන්නවා!", () => "එන්නම ඕනේ හොඳේ! 💛"],
  },
  both: {
    formal: [() => "ඔබගේ පැමිණීම අපට මහත් සතුටකි · Your presence will be our greatest blessing."],
    modern: [() => "See you there! · එදාට හමුවෙමු!"],
  },
};

export function generateWording(content: Pick<InviteContent, "brideName" | "groomName" | "brideFull" | "groomFull" | "date" | "venueName" | "brideParents" | "groomParents">, o: WordingOptions): Wording {
  const parents = [content.brideParents, content.groomParents].filter(Boolean).join(" and ");
  const v: Vars = {
    bride: content.brideName || "Bride",
    groom: content.groomName || "Groom",
    brideFull: content.brideFull || content.brideName || "the bride",
    groomFull: content.groomFull || content.groomName || "the groom",
    date: content.date ? formatLongDate(content.date) : "our wedding day",
    venue: content.venueName,
    parents,
  };
  const en = pick(EN[o.tone][o.tradition][o.length], o.variant)(v);
  const si = pick(SI[o.tone][o.length], o.variant)(v);
  const inviteMessage = o.language === "en" ? en : o.language === "si" ? si : `${si}\n\n${en}`;
  return {
    blessing: pick(BLESSINGS[o.language][o.tradition], o.variant),
    sinhalaLine: o.language === "en" && o.tradition === "contemporary" ? "" : "ශුභ විවාහ මංගල්‍යය",
    inviteMessage,
    closingMessage: pick(CLOSING[o.language][o.tone], o.variant)(v),
  };
}
