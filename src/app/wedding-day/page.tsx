import type { Metadata } from "next";
import { WeddingDayView } from "./wedding-day-view";

export const metadata: Metadata = { title: "Wedding Day Mode" };

export default function WeddingDayPage() {
  return <WeddingDayView />;
}
