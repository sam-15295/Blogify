import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { blogApi } from "../api/services.js";
import CommentSection from "../components/CommentSection.jsx";
import CoverImage from "../components/CoverImage.jsx";
import { Button, ErrorMessage, Spinner } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { assetUrl, formatDate, parseApiError } from "../utils/format.js";

export default function BlogDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState(null);

  const { data, loading, error, reload } = useFetch(() => blogApi.get(id), [id]);
  const blog = data?.data;

  if (loading && !blog) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!blog) return null;

  const canModify = user && (user.role === "ADMIN" || user._id === blog.createdBy?._id);
  const cover = assetUrl(blog.coverImageURL);

  const handleDelete = async () => {
    if (!window.confirm("Delete this post and all its comments? This cannot be undone.")) return;
    try {
      await blogApi.remove(blog._id);
      navigate("/", { replace: true });
    } catch (err) {
      setActionError(parseApiError(err).message);
    }
  };

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-muted hover:text-brand-300">
        ← All posts
      </Link>

      <h1 className="mt-4 text-4xl font-bold tracking-tight text-fg">{blog.title}</h1>
      <p className="mt-3 text-sm text-muted">
        By <strong className="text-fg">{blog.createdBy?.fullName ?? "Unknown author"}</strong> ·{" "}
        {formatDate(blog.createdAt)}
        {blog.updatedAt !== blog.createdAt && " · edited"}
      </p>

      {canModify && (
        <div className="mt-4 flex gap-3">
          <Link
            to={`/blogs/${blog._id}/edit`}
            className="inline-flex items-center rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2"
          >
            Edit
          </Link>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      )}
      <div className="mt-3">
        <ErrorMessage message={actionError} />
      </div>

      <CoverImage src={cover} className="mt-8 max-h-96 w-full rounded-xl object-cover" />

      {/* Plain text (escaped by React) with line breaks preserved. No HTML/markdown is ever injected. */}
      <div className="mt-8 whitespace-pre-wrap wrap-break-word text-lg leading-8 text-fg/90">{blog.body}</div>

      <CommentSection blogId={blog._id} />
    </article>
  );
}
