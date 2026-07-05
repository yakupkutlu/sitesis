import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
});

export function getPaginationParams(query: unknown) {
  const result = paginationQuerySchema.safeParse(query);

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { page, limit, search } = result.data;
  const skip = (page - 1) * limit;

  return {
    success: true as const,
    page,
    limit,
    skip,
    search,
  };
}

export function buildPaginationMeta(params: {
  page: number;
  limit: number;
  totalCount: number;
}) {
  const totalPages = Math.ceil(params.totalCount / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    totalCount: params.totalCount,
    totalPages,
  };
}