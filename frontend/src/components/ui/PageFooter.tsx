export default function PageFooter({
  total, page, pages, onPageChange,
}: { total: number; page: number; pages: number; onPageChange: (page: number) => void }) {
  if (total === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs text-gray-400">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary px-3 py-1.5" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span className="hidden sm:inline">Page {page} of {pages}</span>
        <button className="btn-secondary px-3 py-1.5" disabled={page === pages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
