import type { Metadata } from "next";
import { TasksView } from "./tasks-view";

export const metadata: Metadata = { title: "Checklist" };

export default function TasksPage() {
  return <TasksView />;
}
