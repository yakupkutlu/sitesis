import { apiRequest } from "./client";

export async function getSuperAdminDashboardSummary() {
  return apiRequest("/dashboard-summary/super-admin");
}

export async function getManagerDashboardSummary() {
  return apiRequest("/dashboard-summary/manager");
}

export async function getResidentDashboardSummary() {
  return apiRequest("/dashboard-summary/resident");
}
