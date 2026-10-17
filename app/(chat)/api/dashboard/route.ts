import { auth } from "@/app/(auth)/auth";
import { loadDashboard } from "@/lib/reverse-alignment/dashboard-data";

// JSON version of the manager dashboard.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response(null, { status: 401 });
  }
  return Response.json(loadDashboard());
}
