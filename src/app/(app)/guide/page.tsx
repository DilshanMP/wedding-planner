import type { Metadata } from "next";
import { GuideView } from "./guide-view";

export const metadata: Metadata = { title: "User guide" };

export default function GuidePage() {
  return <GuideView />;
}
