import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { buildXlsx, crc32 } from "../../xlsx";
import { readXlsx, unzip } from "../../xlsx-read";
import { exportWorkbook, planImport } from "../workbook";
import { createSampleWedding } from "../sample-data";
import { defaultSeating } from "../planner";

let n = 0;
const id = () => `new-${++n}`;
const now = "2026-10-17T00:00:00.000Z";

const toBuffer = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

/** Re-pack a stored ZIP with deflate, like Excel does. */
async function deflated(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const files = await unzip(buf);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = enc.encode(name);
    const comp = new Uint8Array(deflateRawSync(data));
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(8, 8, true); lv.setUint32(14, crc32(data), true);
    lv.setUint32(18, comp.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, 8, true); cv.setUint32(16, crc32(data), true);
    cv.setUint32(20, comp.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    parts.push(local, comp);
    central.push(cd);
    offset += local.length + comp.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  return toBuffer(new Uint8Array(await new Blob([...parts, ...central, end] as BlobPart[]).arrayBuffer()));
}

describe("full workbook", () => {
  const data = createSampleWedding("2026-10-17", now);
  data.planner.seating = defaultSeating("Hall", 3, id);
  data.planner.seating.tables[0].guestIds = [data.guests[0].id];

  it("round-trips with no changes (stored and Excel-compressed)", async () => {
    const sheets = exportWorkbook(data, "2026-10-17");
    for (const buf of [toBuffer(buildXlsx(sheets)), await deflated(toBuffer(buildXlsx(sheets)))]) {
      const read = await readXlsx(buf);
      expect(read.map((s) => s.name)).toContain("Guests");
      const plan = planImport(data, read, now, id);
      expect(plan.issues).toEqual([]);
      expect(plan.changes).toEqual([]);
      expect(plan.empty).toBe(true);
    }
  });

  it("updates, adds and deletes only what the sheet says", async () => {
    const sheets = exportWorkbook(data, "2026-10-17");
    const guests = sheets.find((s) => s.name === "Guests")!;
    const h = guests.rows[0] as string[];
    guests.rows[1][h.indexOf("Category")] = "Brand team";
    guests.rows[1][h.indexOf("Side")] = "Both";
    guests.rows[2][h.indexOf("Delete?")] = "Yes";
    const fresh = Array(h.length).fill("");
    fresh[h.indexOf("Name")] = "Photography crew";
    fresh[h.indexOf("Adults")] = 3;
    fresh[h.indexOf("Category")] = "Photography crew";
    guests.rows.splice(4, 1); // a removed row is NOT a delete
    guests.rows.push(fresh);
    const pay = sheets.find((s) => s.name === "Payments")!;
    const ph = pay.rows[0] as string[];
    pay.rows[1][ph.indexOf("Paid by")] = "Both of us";
    const bad = Array(ph.length).fill("");
    bad[ph.indexOf("Description")] = "Typo";
    bad[ph.indexOf("Amount (LKR)")] = 500;
    bad[ph.indexOf("Due date")] = "soon";
    pay.rows.push(bad);
    const wed = sheets.find((s) => s.name === "Wedding")!;
    wed.rows.find((r) => r[0] === "Venue")![1] = "Paradise Inn";

    const read = await readXlsx(await deflated(toBuffer(buildXlsx(sheets))));
    const plan = planImport(data, read, now, id);
    const g = plan.changes.find((c) => c.key === "guests")!;
    expect(g.updated).toBe(1);
    expect(g.added).toBe(1);
    expect(g.removes).toEqual([data.guests[1].id]);
    expect(g.upserts.find((x) => x.id === data.guests[0].id)).toMatchObject({ category: "Brand team", side: "both" });
    expect(g.upserts.find((x) => x.name === "Photography crew")).toMatchObject({ adults: 3, side: "bride", rsvp: "pending" });
    expect(plan.changes.find((c) => c.key === "payments")!.updated).toBe(1);
    expect(plan.issues).toEqual([expect.objectContaining({ sheet: "Payments", message: expect.stringContaining("Due date") })]);
    expect(plan.wedding).toEqual({ venue: "Paradise Inn" });
  });

  it("reads Excel day numbers as dates and moves guests between tables", async () => {
    const sheets = exportWorkbook(data, "2026-10-17");
    const tasks = sheets.find((s) => s.name === "Checklist")!;
    const th = tasks.rows[0] as string[];
    tasks.rows[1][th.indexOf("Due")] = 46534; // 2027-05-27
    const seating = sheets.find((s) => s.name === "Seating")!;
    seating.rows[1][0] = "Table 2";
    const plan = planImport(data, await readXlsx(toBuffer(buildXlsx(sheets))), now, id);
    expect(plan.changes.find((c) => c.key === "tasks")!.upserts[0].dueDate).toBe("2027-05-27");
    expect(plan.seating!.tables[1].guestIds).toEqual([data.guests[0].id]);
    expect(plan.seating!.tables[0].guestIds).toEqual([]);
  });
});
