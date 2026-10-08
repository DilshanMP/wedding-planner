import type { Metadata } from "next";
import { BudgetView } from "./budget-view";

export const metadata: Metadata = { title: "Wedding Investment" };

export default function BudgetPage() {
  return <BudgetView />;
}
