import type { Metadata } from "next";
import { GuestReportView } from "./guest-report-view";

export const metadata: Metadata = { title: "Guest list report" };

export default function GuestReportPage() {
  return <GuestReportView />;
}
