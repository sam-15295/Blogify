import { Link } from "react-router-dom";
import { assetUrl, formatDate } from "../utils/format.js";

export default function BlogCard({ blog }) {
  const cover = assetUrl(blog.coverImageURL);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/blogs/${blog._id}`} className="block">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-44 w-full object-cover" />
        ) : (
          <div className="h-44 w-full bg-linear-to-br from-brand-100 to-brand-50" aria-hidden="true" />
        )}
        <div className="p-5">
          <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{blog.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{blog.excerpt}</p>
          <p className="mt-4 text-xs text-slate-500">
            {blog.createdBy?.fullName ?? "Unknown author"} · {formatDate(blog.createdAt)}
          </p>
        </div>
      </Link>
    </article>
  );
}
