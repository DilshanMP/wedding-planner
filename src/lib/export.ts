/** Build a CSV (RFC 4180) and hand it to the browser as a download. */
export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === null || v === undefined ? "" : String(v);
          // Neutralise spreadsheet formula injection.
          const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
          return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(","),
    )
    .join("\r\n");
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(["﻿" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
