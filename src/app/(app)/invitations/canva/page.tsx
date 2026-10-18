import type { Metadata } from "next";
import { CanvaView } from "./canva-view";

export const metadata: Metadata = { title: "Canva" };

export default function CanvaPage() {
  return <CanvaView />;
}
