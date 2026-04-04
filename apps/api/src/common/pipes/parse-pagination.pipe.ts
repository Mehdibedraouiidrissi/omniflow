import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

@Injectable()
export class ParsePaginationPipe implements PipeTransform<Record<string, string>, PaginationParams> {
  transform(value: Record<string, string>): PaginationParams {
    const page = Math.max(1, parseInt(value.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(value.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const sortBy = value.sortBy || 'createdAt';
    const sortOrder = value.sortOrder === 'asc' ? 'asc' : 'desc';
    const search = value.search?.trim() || undefined;

    const validSortFields = [
      'createdAt',
      'updatedAt',
      'name',
      'email',
      'firstName',
      'lastName',
      'status',
      'score',
    ];

    if (!validSortFields.includes(sortBy)) {
      throw new BadRequestException(`Invalid sort field: ${sortBy}`);
    }

    return { page, limit, skip, sortBy, sortOrder, search };
  }
}

export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = typeof query.search === 'string' ? query.search.trim() || undefined : undefined;

  return { page, limit, skip, sortBy, sortOrder, search };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
) {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrevious: params.page > 1,
    },
  };
}
