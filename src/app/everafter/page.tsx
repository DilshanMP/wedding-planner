import type { Metadata } from "next";
import { EverAfterLanding } from "./landing";

export const metadata: Metadata = {
  title: { absolute: "EverAfter Studio — Luxury Animated Wedding Invitations" },
  description: "Design a personalised wedding invitation that guests open like a real envelope — wax seal, 3D flap, music and RSVP. Sinhala and English.",
};

export default function EverAfterPage() {
  return <EverAfterLanding />;
}
