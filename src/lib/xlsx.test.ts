import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildReport, REPORT_IDS } from "@/lib/domain/reports";
import { createSampleWedding } from "@/lib/domain/sample-data";
import { buildXlsx, crc32 } from "./xlsx";

function hasOpenpyxl(): boolean {
  try {
    execFileSync("python3", ["-c", "import openpyxl"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("xlsx writer", () => {
  it("computes standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it.skipIf(!hasOpenpyxl())("writes a workbook Excel readers accept, with numbers kept as numbers", () => {
    const data = createSampleWedding("2026-10-08", "2026-10-08T00:00:00.000Z");
    const reports = REPORT_IDS.map((id) => buildReport(id, data, "2026-10-08"));
    const sheets = reports.flatMap((r) =>
      r.tables.map((t) => ({ name: `${r.id} ${t.title}`, rows: [t.columns.map((c) => c.label), ...t.rows], moneyColumns: t.columns.flatMap((c, i) => (c.money ? [i] : [])) })),
    );
    sheets.push({ name: "Odd <&> \"chars\" / with a very long name indeed", rows: [["Name"], ["Perera & Sons <Ltd>"]], moneyColumns: [] });
    const file = path.join(mkdtempSync(path.join(tmpdir(), "xlsx-")), "report.xlsx");
    writeFileSync(file, buildXlsx(sheets));
    const out = execFileSync("python3", ["-I", "-c", `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1])
s = wb[wb.sheetnames[0]]
odd = wb[wb.sheetnames[-1]]
print(json.dumps({"names": wb.sheetnames, "a1": s["A1"].value, "b2": s["B2"].value, "bold": s["A1"].font.b, "fmt": s["B2"].number_format, "odd": odd["A2"].value}))
`, file]).toString();
    const r = JSON.parse(out);
    expect(r.names).toHaveLength(sheets.length);
    expect(r.names[r.names.length - 1].length).toBeLessThanOrEqual(31);
    expect(r.a1).toBe("Category");
    expect(typeof r.b2).toBe("number");
    expect(r.bold).toBe(true);
    expect(r.fmt).toBe("#,##0");
    expect(r.odd).toBe("Perera & Sons <Ltd>");
  });
});
