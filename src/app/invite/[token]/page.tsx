import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteView } from "./invite-view";

export const metadata: Metadata = {
  title: "You're invited 💌",
  description: "Open your wedding invitation.",
  robots: { index: false, follow: false },
  // The picture comes from opengraph-image.jpg beside this page.
  openGraph: { title: "You're invited 💌", description: "Open your wedding invitation.", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function InvitePage() {
  return (
    <Suspense fallback={<main className="ea-loading" aria-busy="true"><span className="ea-loading-seal" /></main>}>
      <InviteView />
    </Suspense>
  );
}
