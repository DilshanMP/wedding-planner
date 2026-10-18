import type { Metadata } from "next";
import { PreviewView } from "./preview-view";

export const metadata: Metadata = { title: "Preview invitation" };

export default function PreviewPage() {
  return <PreviewView />;
}
