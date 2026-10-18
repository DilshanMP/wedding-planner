import type { Metadata } from "next";
import { SendView } from "./send-view";

export const metadata: Metadata = { title: "Send invitations" };

export default function SendPage() {
  return <SendView />;
}
