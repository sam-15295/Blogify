import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { blogApi } from "../api/services.js";
import { Button, ErrorMessage, FormField, Spinner, inputClass } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { assetUrl, parseApiError } from "../utils/format.js";

const MAX_IMAGE_MB = 2;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Client-side checks give instant feedback; the server repeats them because clients can't be trusted.
function validate({ title, body }, image) {
  const errors = {};
  if (title.trim().length < 3) errors.title = "Title must be at least 3 characters";
  if (title.length > 150) errors.title = "Title must be at most 150 characters";
  if (body.trim().length < 10) errors.body = "Body must be at least 10 characters";
  if (image) {
    if (!IMAGE_TYPES.includes(image.type)) errors.coverImage = "Only JPEG, PNG or WebP images are allowed";
    else if (image.size > MAX_IMAGE_MB * 1024 * 1024) errors.coverImage = `Image must be under ${MAX_IMAGE_MB} MB`;
  }
  return errors;
}

// Used for both "new post" (/blogs/new) and "edit post" (/blogs/:id/edit).
export default function BlogEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: "", body: "" });
  const [image, setImage] = useState(null);
  const [existingCover, setExistingCover] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let ignore = false;
    blogApi
      .get(id)
      .then(({ data: blog }) => {
        if (ignore) return;
        if (user.role !== "ADMIN" && user._id !== blog.createdBy?._id) {
          navigate(`/blogs/${id}`, { replace: true });
          return;
        }
        setForm({ title: blog.title, body: blog.body });
        setExistingCover(blog.coverImageURL);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setError(parseApiError(err).message);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id, isEdit, user, navigate]);

  // Object URLs hold memory until revoked, so free the previous one whenever the selection changes or we leave.
  const previewRef = useRef(null);
  useEffect(() => () => previewRef.current && URL.revokeObjectURL(previewRef.current), []);

  const handleImageChange = (e) => {
    const file = e.target.files[0] ?? null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setImage(file);
    setPreview(previewRef.current);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, image);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("body", form.body.trim());
    if (image) data.append("coverImage", image);

    setSubmitting(true);
    try {
      const { data: saved } = isEdit ? await blogApi.update(id, data) : await blogApi.create(data);
      navigate(`/blogs/${saved._id}`);
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  const shownImage = preview ?? assetUrl(existingCover);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{isEdit ? "Edit post" : "Write a new post"}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" noValidate>
        <FormField label="Title" id="title" error={errors.title}>
          <input id="title" name="title" maxLength={150} className={inputClass} value={form.title} onChange={handleChange} />
        </FormField>

        <FormField label="Cover image (optional)" id="coverImage" error={errors.coverImage} hint={`JPEG, PNG or WebP, up to ${MAX_IMAGE_MB} MB.`}>
          <input
            id="coverImage"
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            onChange={handleImageChange}
          />
          {shownImage && <img src={shownImage} alt="Cover preview" className="mt-3 max-h-56 rounded-lg object-cover" />}
        </FormField>

        <FormField label="Body" id="body" error={errors.body}>
          <textarea id="body" name="body" rows={14} className={inputClass} value={form.body} onChange={handleChange} />
        </FormField>

        <ErrorMessage message={error} />

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Publish"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
