import type { Metadata } from "next";
import { SimulatorView } from "./simulator-view";

export const metadata: Metadata = { title: "Experience Your Wedding" };

export default function SimulatorPage() {
  return <SimulatorView />;
}
