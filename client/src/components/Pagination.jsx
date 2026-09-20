import { Button } from "./ui.jsx";

export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
      <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-slate-600">
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
        Next
      </Button>
    </nav>
  );
}
