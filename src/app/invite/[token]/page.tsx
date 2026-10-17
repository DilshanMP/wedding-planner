import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteView } from "./invite-view";

export const metadata: Metadata = {
  title: "You're invited 💌",
  description: "Open your wedding invitation.",
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return (
    <Suspense fallback={<main className="dinv-loading" aria-busy="true"><span className="dinv-loading-seal" /></main>}>
      <InviteView />
    </Suspense>
  );
}
