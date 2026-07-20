import type { PaginatedResponse } from "@/lib/types";

const MAX_API_PAGE_SIZE = 500;

type PageLoader<T> = (
  skip: number,
  limit: number,
) => Promise<PaginatedResponse<T>>;

/**
 * Load a complete dataset through the API's bounded pagination contract.
 * Use this only for screens whose calculations genuinely require every row;
 * normal tables should keep server-side pagination.
 */
export async function loadAllPages<T>(loadPage: PageLoader<T>): Promise<T[]> {
  const items: T[] = [];

  while (true) {
    const page = await loadPage(items.length, MAX_API_PAGE_SIZE);
    items.push(...page.items);

    if (items.length >= page.total || page.items.length === 0) {
      return items;
    }
  }
}
