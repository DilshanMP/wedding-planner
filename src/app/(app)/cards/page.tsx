import type { Metadata } from "next";
import { CardsView } from "./cards-view";

export const metadata: Metadata = { title: "Cards & boxes" };

export default function CardsPage() {
  return <CardsView />;
}
