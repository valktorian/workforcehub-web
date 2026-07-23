export interface PagedResponse<TItem> {
  items: TItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
