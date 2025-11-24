function parsePagination(query = {}) {
  const pageNumber = Number.parseInt(query.page, 10);
  const pageSizeInput = Number.parseInt(query.pageSize, 10);
  const hasPage = Number.isFinite(pageNumber) && pageNumber > 0;
  const hasPageSize = Number.isFinite(pageSizeInput) && pageSizeInput > 0;

  const page = hasPage ? pageNumber : 1;
  const pageSize = hasPageSize ? Math.min(pageSizeInput, 100) : 20;
  const usePagination = hasPage || hasPageSize;

  return {
    usePagination,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

function buildPaginationMeta(totalCount, page, pageSize) {
  const safeTotal = Number.isFinite(totalCount) ? totalCount : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));

  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
