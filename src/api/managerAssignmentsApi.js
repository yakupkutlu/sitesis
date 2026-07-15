import { apiRequest } from "./client";

export async function getManagerAssignments() {
  return apiRequest("/manager-assignments");
}

export async function createManagerAssignment(payload) {
  return apiRequest("/manager-assignments", {
    method: "POST",
    body: payload,
  });
}

export async function deleteManagerAssignment(assignmentId) {
  return apiRequest(`/manager-assignments/${assignmentId}`, {
    method: "DELETE",
  });
}

export async function getMyManagerAssignments() {
  return apiRequest("/manager-assignments/me");
}

export async function selectMyManagerAssignment(assignmentId) {
  return apiRequest("/manager-assignments/me/active", {
    method: "PATCH",
    body: {
      assignmentId,
    },
  });
}
