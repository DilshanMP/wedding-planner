import type { Metadata } from "next";
import { GuestsView } from "./guests-view";

export const metadata: Metadata = { title: "Guests" };

export default function GuestsPage() {
  return <GuestsView />;
}
