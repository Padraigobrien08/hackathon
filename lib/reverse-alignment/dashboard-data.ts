import "server-only";

import { aggregate, type DashboardData } from "./dashboard";
import { sampleMetricRows } from "./dashboard-fixtures";

// The demo dashboard always shows the generated dataset (see dashboard-fixtures.ts).
export function loadDashboard(): DashboardData {
  return aggregate(sampleMetricRows());
}
