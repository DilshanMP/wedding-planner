import { describe, expect, it } from "vitest";
import { clock, longDate, shortDate, words } from "../invite-i18n";

describe("guest language", () => {
  it("writes dates in Sinhala without relying on the phone's locale data", () => {
    expect(longDate("2027-05-27", "si")).toBe("2027 මැයි 27, බ්‍රහස්පතින්දා");
    expect(shortDate("2027-06-12", "si")).toBe("2027 ජූනි 12");
    expect(longDate("2027-06-12", "en")).toBe("Saturday, 12 June 2027");
    expect(shortDate("2027-06-12")).toBe("12 JUNE 2027");
    expect(longDate("", "si")).toBe("");
  });

  it("writes times and words in either language", () => {
    expect(clock("10:30", "si")).toBe("පෙ.ව. 10:30");
    expect(clock("19:00", "en")).toBe("7:00 PM");
    expect(words("si").tapToOpen).toContain("ස්පර්ශ");
    expect(words(undefined).tapToOpen).toBe("Tap to open our invitation");
  });
});
