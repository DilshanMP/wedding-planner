import type { Metadata } from "next";
import { InvitationsView } from "./invitations-view";

export const metadata: Metadata = { title: "Digital invitations" };

export default function InvitationsPage() {
  return <InvitationsView />;
}
