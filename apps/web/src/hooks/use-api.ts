'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';

export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => apiGet<T>(url),
    ...options,
  });
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string | ((variables: TVariables) => string),
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();

  const mutationFn = async (variables: TVariables): Promise<TData> => {
    const resolvedUrl = typeof url === 'function' ? url(variables) : url;

    switch (method) {
      case 'post':
        return apiPost<TData>(resolvedUrl, variables);
      case 'put':
        return apiPut<TData>(resolvedUrl, variables);
      case 'patch':
        return apiPatch<TData>(resolvedUrl, variables);
      case 'delete':
        return apiDelete<TData>(resolvedUrl);
    }
  };

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (...args) => {
      options?.onSuccess?.(...args);
      if (options?.onSuccess === undefined) {
        queryClient.invalidateQueries();
      }
    },
  });
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function usePaginatedQuery<T>(
  key: string[],
  url: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options?: Omit<UseQueryOptions<PaginatedResult<T>, Error>, 'queryKey' | 'queryFn'>,
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      searchParams.set(k, String(v));
    }
  });

  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  return useQuery<PaginatedResult<T>, Error>({
    queryKey: [...key, params],
    queryFn: () => apiGet<PaginatedResult<T>>(fullUrl),
    ...options,
  });
}
