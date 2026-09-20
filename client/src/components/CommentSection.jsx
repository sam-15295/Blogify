import { useState } from "react";
import { Link } from "react-router-dom";
import { commentApi } from "../api/services.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { formatDate, parseApiError } from "../utils/format.js";
import Pagination from "./Pagination.jsx";
import { Button, ErrorMessage, Spinner, inputClass } from "./ui.jsx";

export default function CommentSection({ blogId }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, loading, error, reload } = useFetch(() => commentApi.list(blogId, { page, limit: 5 }), [blogId, page]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await commentApi.create(blogId, { content });
      setContent("");
      if (page === 1) reload();
      else setPage(1);
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await commentApi.remove(id);
      // Deleting the last item on a page would leave an empty page, so step back one.
      if (data.data.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setFormError(parseApiError(err).message);
    }
  };

  const canDelete = (comment) => user && (user.role === "ADMIN" || user._id === comment.createdBy?._id);

  return (
    <section aria-labelledby="comments-heading" className="mt-12">
      <h2 id="comments-heading" className="text-xl font-semibold text-fg">
        Comments {data && <span className="text-faint">({data.meta.total})</span>}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            className={inputClass}
            rows={3}
            maxLength={1000}
            placeholder="Share your thoughts…"
            aria-label="Write a comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <ErrorMessage message={formError} />
          <Button type="submit" disabled={submitting || !content.trim()}>
            {submitting ? "Posting…" : "Post comment"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">
          <Link to="/login" state={{ from: `/blogs/${blogId}` }} className="font-medium text-brand-400 underline">
            Log in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <div className="mt-6">
        {loading && !data ? <Spinner label="Loading comments…" /> : null}
        <ErrorMessage message={error} onRetry={reload} />
        {data?.data.length === 0 && <p className="text-sm text-muted">No comments yet. Be the first!</p>}

        <ul className="space-y-4">
          {data?.data.map((comment) => (
            <li key={comment._id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  <strong className="text-fg">{comment.createdBy?.fullName ?? "Deleted user"}</strong> ·{" "}
                  {formatDate(comment.createdAt)}
                </span>
                {canDelete(comment) && (
                  <button onClick={() => handleDelete(comment._id)} className="text-danger-fg hover:underline">
                    Delete
                  </button>
                )}
              </div>
              {/* Rendered as text: React escapes it, so user input cannot inject HTML/JS (XSS-safe). */}
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-fg">{comment.content}</p>
            </li>
          ))}
        </ul>

        <Pagination meta={data?.meta} onPageChange={setPage} />
      </div>
    </section>
  );
}
