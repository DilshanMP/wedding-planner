import type { Metadata } from "next";
import { ChecklistView } from "./checklist-view";

export const metadata: Metadata = { title: "Our checklist" };

export default function ChecklistPage() {
  return <ChecklistView />;
}
