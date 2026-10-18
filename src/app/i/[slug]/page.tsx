import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestInvitation } from "./guest-view";

export const metadata: Metadata = {
  title: "You're invited 💌",
  description: "Open our wedding invitation.",
  robots: { index: false, follow: false },
};

export default function PublishedInvitationPage() {
  return (
    <Suspense fallback={<main className="ea-loading" aria-busy="true"><span className="ea-loading-seal" /></main>}>
      <GuestInvitation />
    </Suspense>
  );
}
