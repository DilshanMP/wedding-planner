import type { Metadata } from "next";
import { RsvpsView } from "./rsvps-view";

export const metadata: Metadata = { title: "Invitation replies" };

export default function RsvpsPage() {
  return <RsvpsView />;
}
