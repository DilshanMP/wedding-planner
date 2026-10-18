import type { Metadata } from "next";
import { NewInvitationView } from "./new-view";

export const metadata: Metadata = { title: "New invitation" };

export default function NewInvitationPage() {
  return <NewInvitationView />;
}
