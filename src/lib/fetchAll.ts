// Supabase answers a query with at most 1000 rows and silently drops the rest,
// so reading "everything for a period" means walking the pages.
const PAGE_SIZE = 1000;

/**
 * Collects every row a query matches, one page at a time. `fetchPage` gets the
 * inclusive row range to pass to `.range(from, to)`; the query needs a unique
 * `.order(...)`, or pages can overlap or skip rows. A failed page throws
 * instead of returning a partial result.
 */
export async function fetchAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
