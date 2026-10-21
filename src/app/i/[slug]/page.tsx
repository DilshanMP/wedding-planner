import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestInvitation } from "./guest-view";

export const metadata: Metadata = {
  title: "You're invited 💌",
  description: "Open our wedding invitation.",
  robots: { index: false, follow: false },
  // The picture comes from opengraph-image.jpg beside this page.
  openGraph: { title: "You're invited 💌", description: "Open our wedding invitation.", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function PublishedInvitationPage() {
  return (
    <Suspense fallback={<main className="ea-loading" aria-busy="true"><span className="ea-loading-seal" /></main>}>
      <GuestInvitation />
    </Suspense>
  );
}
