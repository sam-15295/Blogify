import { Link } from "react-router-dom";
import { assetUrl, formatDate } from "../utils/format.js";
import CoverImage from "./CoverImage.jsx";

export default function BlogCard({ blog }) {
  const cover = assetUrl(blog.coverImageURL);

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/10">
      <Link to={`/blogs/${blog._id}`} className="block">
        <CoverImage
          src={cover}
          className="h-44 w-full object-cover"
          placeholder={
            <div
              className="flex h-44 w-full items-center justify-center bg-linear-to-br from-brand-500/25 to-surface-2 text-6xl font-bold text-brand-300/25 select-none"
              aria-hidden="true"
            >
              {blog.title.charAt(0).toUpperCase()}
            </div>
          }
        />
        <div className="p-5">
          <h2 className="line-clamp-2 text-lg font-semibold text-fg">{blog.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm text-muted">{blog.excerpt}</p>
          <p className="mt-4 text-xs text-muted">
            {blog.createdBy?.fullName ?? "Unknown author"} · {formatDate(blog.createdAt)}
          </p>
        </div>
      </Link>
    </article>
  );
}
