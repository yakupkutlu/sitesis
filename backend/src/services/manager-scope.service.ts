import prisma from "../db/prisma.js";

export type ManagerScope = {
  siteIds: string[];
  blockIds: string[];
};

export async function getManagerScope(
  managerId: string
): Promise<ManagerScope> {
  const manager = await prisma.user.findUnique({
    where: {
      id: managerId,
    },
    select: {
      activeManagerAssignmentId: true,
      managerAssignments: {
        select: {
          id: true,
          scopeType: true,
          siteId: true,
          blockId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!manager || manager.managerAssignments.length === 0) {
    return {
      siteIds: [],
      blockIds: [],
    };
  }

  let activeAssignment = manager.managerAssignments.find(
    (assignment) =>
      assignment.id === manager.activeManagerAssignmentId
  );

  if (!activeAssignment && manager.managerAssignments.length === 1) {
    activeAssignment = manager.managerAssignments[0];
  }

  if (!activeAssignment) {
    return {
      siteIds: [],
      blockIds: [],
    };
  }

  return {
    siteIds:
      activeAssignment.scopeType === "SITE" && activeAssignment.siteId
        ? [activeAssignment.siteId]
        : [],
    blockIds:
      activeAssignment.scopeType === "BLOCK" && activeAssignment.blockId
        ? [activeAssignment.blockId]
        : [],
  };
}

export function hasManagerScope(scope: ManagerScope) {
  return scope.siteIds.length > 0 || scope.blockIds.length > 0;
}