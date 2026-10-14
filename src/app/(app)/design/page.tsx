import type { Metadata } from "next";
import { DesignView } from "./design-view";

export const metadata: Metadata = { title: "Our look" };

export default function DesignPage() {
  return <DesignView />;
}
