import { Suspense } from "react";
import { AppFrame } from "@/components/shell/app-frame";
import { PageSkeleton } from "@/components/shell/wedding-gate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppFrame>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppFrame>
  );
}
