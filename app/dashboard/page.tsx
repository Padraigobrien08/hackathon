import { Suspense } from "react";
import { ManagerDashboard } from "@/components/reverse-alignment/manager-dashboard";
import { loadDashboard } from "@/lib/reverse-alignment/dashboard-data";

export const metadata = { title: "Prompting overview · Reverse Alignment" };

// Outside the (chat) group so the chat shell doesn't render behind it. ?data=live|sample picks the data set.
export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  const dashboard = await loadDashboard(
    data === "live" || data === "sample" ? data : undefined
  );
  return <ManagerDashboard data={dashboard} />;
}
