import { describe, expect, it } from "vitest";
import { calendarFile, contentDefaults, contentFromLookup, countdown, googleCalendarUrl, invitePalette, monogram, startTime, weddingInstant } from "../digital-invite";
import { contrast } from "../../theme-colors";
import { inviteUrl, invitationMessage } from "../invitations";

const base = contentDefaults({ brideName: "Sachini", groomName: "Dilshan", weddingDate: "2027-05-27", venue: "Paradise Inn", location: "Bolgoda" });

describe("digital invitation", () => {
  it("starts at the first moment, else the time on the card", () => {
    expect(startTime({ ...base, moments: [{ time: "18:30", title: "Dinner", scene: "dinner", location: "" }, { time: "17:30", title: "Poruwa", scene: "poruwa", location: "" }] })).toBe("17:30");
    expect(startTime(base)).toBe("17:30"); // "Poruwa ceremony at 5.30 p.m."
    expect(startTime({ ...base, text: { ...base.text, timeLine: "" } })).toBe("17:00");
  });

  it("uses Sri Lanka time (UTC+05:30)", () => {
    expect(weddingInstant("2027-05-27", "17:30").toISOString()).toBe("2027-05-27T12:00:00.000Z");
  });

  it("counts down and stops at zero", () => {
    const target = new Date("2027-05-27T12:00:00Z");
    expect(countdown(target, new Date("2027-05-26T10:58:30Z"))).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 30, done: false });
    expect(countdown(target, new Date("2027-05-28T00:00:00Z")).done).toBe(true);
  });

  it("makes a calendar file and a Google Calendar link", () => {
    const ics = calendarFile(base, "abc");
    expect(ics).toContain("DTSTART:20270527T120000Z");
    expect(ics).toContain("LOCATION:Paradise Inn\\, Bolgoda");
    expect(googleCalendarUrl(base)).toContain("dates=20270527T120000Z%2F");
  });

  it("keeps text readable on every palette", () => {
    const p = invitePalette({ palette: "Ivory, champagne & dusty pink" }, []);
    expect(contrast(p.ink, p.paper)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.primary, p.paper)).toBeGreaterThanOrEqual(3);
    const theme = invitePalette({ palette: "theme" }, ["#123456", "#abcdef"]);
    expect(contrast(theme.ink, theme.paper)).toBeGreaterThanOrEqual(7);
  });

  it("reads a guest's lookup, including older saves without invite settings", () => {
    const c = contentFromLookup({
      guestName: "Nimal", adults: 2, children: 1, brideName: "S", groomName: "D", weddingDate: "2027-05-27", venue: "V", location: "L",
      theme: null, stationery: { text: { blessing: "Bless" } },
      moments: [{ time: "17:30:00", title: "Poruwa", scene: "poruwa", location: "" }, { time: "08:00", title: "Hair", scene: "preparation", location: "" }],
    });
    expect(c.partySize).toBe(3);
    expect(c.text.blessing).toBe("Bless");
    expect(c.settings.music).toBe("music-box");
    expect(c.moments).toEqual([{ time: "17:30", title: "Poruwa", scene: "poruwa", location: "" }]);
  });

  it("makes a monogram and a personal link", () => {
    expect(monogram("sachini", "Dilshan")).toEqual(["S", "D"]);
    const guest = { name: "Nimal", rsvpToken: "tok" } as Parameters<typeof inviteUrl>[1];
    expect(inviteUrl("https://x.app", guest)).toBe("https://x.app/invite/tok");
    expect(invitationMessage({ brideName: "S", groomName: "D", weddingDate: "2027-05-27", venue: "", location: "" } as Parameters<typeof invitationMessage>[0], guest, "https://x.app/invite/tok")).toContain("https://x.app/invite/tok");
  });
});
