import { connection } from "next/server";
import { Suspense } from "react";
import { ManagerDashboard } from "@/components/reverse-alignment/manager-dashboard";
import { loadDashboard } from "@/lib/reverse-alignment/dashboard-data";

export const metadata = { title: "Prompting overview · PromptFlip" };

// Outside the (chat) group so the chat shell doesn't render behind it.
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // Render per request: the demo data is dated relative to today.
  await connection();
  return <ManagerDashboard data={loadDashboard()} />;
}
