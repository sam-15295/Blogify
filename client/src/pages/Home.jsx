import { useState } from "react";
import { blogApi } from "../api/services.js";
import BlogCard from "../components/BlogCard.jsx";
import Pagination from "../components/Pagination.jsx";
import { EmptyState, ErrorMessage, Spinner, inputClass } from "../components/ui.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useFetch } from "../hooks/useFetch.js";

export default function Home() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  const { data, loading, error, reload } = useFetch(
    () => blogApi.list({ page, limit: 9, ...(q && { q }) }),
    [page, q],
  );

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Latest posts</h1>
          <p className="mt-1 text-slate-600">Stories and ideas from the Blogify community.</p>
        </div>
        <input
          type="search"
          className={`${inputClass} sm:w-72`}
          placeholder="Search posts…"
          aria-label="Search posts"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <ErrorMessage message={error} onRetry={reload} />
      {loading && !data && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState title={q ? "No posts match your search" : "No posts yet"}>
          {q ? "Try different keywords." : "Be the first to write one!"}
        </EmptyState>
      )}

      {data && data.data.length > 0 && (
        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
          {data.data.map((blog) => (
            <BlogCard key={blog._id} blog={blog} />
          ))}
        </div>
      )}

      <Pagination meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}
