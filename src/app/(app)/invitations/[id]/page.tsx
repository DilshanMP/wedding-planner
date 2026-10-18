import type { Metadata } from "next";
import { EditorView } from "./editor-view";

export const metadata: Metadata = { title: "Edit invitation" };

export default function EditInvitationPage() {
  return <EditorView />;
}
