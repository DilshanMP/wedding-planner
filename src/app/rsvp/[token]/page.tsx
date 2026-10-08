import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { RsvpView } from "./rsvp-view";

export const metadata: Metadata = { title: "Your invitation", robots: { index: false, follow: false } };

export default function RsvpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center px-4">
          <div className="wos-card wos-card--hero flex w-full max-w-[520px] flex-col gap-4"><Skeleton style={{ height: 48, width: "60%" }} /><Skeleton style={{ height: 160 }} /></div>
        </main>
      }
    >
      <RsvpView />
    </Suspense>
  );
}
