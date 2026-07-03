import prisma from "../db/prisma.js";

export type ManagerScope = {
  siteIds: string[];
  blockIds: string[];
};

export async function getManagerScope(managerId: string): Promise<ManagerScope> {
  const assignments = await prisma.managerAssignment.findMany({
    where: {
      managerId,
    },
    select: {
      scopeType: true,
      siteId: true,
      blockId: true,
    },
  });

  const siteIds = assignments
    .filter((assignment) => assignment.scopeType === "SITE" && assignment.siteId)
    .map((assignment) => assignment.siteId as string);

  const blockIds = assignments
    .filter((assignment) => assignment.scopeType === "BLOCK" && assignment.blockId)
    .map((assignment) => assignment.blockId as string);

  return {
    siteIds,
    blockIds,
  };
}

export function hasManagerScope(scope: ManagerScope) {
  return scope.siteIds.length > 0 || scope.blockIds.length > 0;
}