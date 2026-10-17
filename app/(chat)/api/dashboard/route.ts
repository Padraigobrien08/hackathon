import { auth } from "@/app/(auth)/auth";
import { loadDashboard } from "@/lib/reverse-alignment/dashboard-data";

// JSON version of the manager dashboard. ?data=live|sample overrides the automatic choice.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(null, { status: 401 });
  }
  const data = new URL(request.url).searchParams.get("data");
  return Response.json(
    await loadDashboard(data === "live" || data === "sample" ? data : undefined)
  );
}
