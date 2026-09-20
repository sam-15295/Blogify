import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, ErrorMessage, FormField, inputClass } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { parseApiError } from "../utils/format.js";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setFieldErrors(fields);
      // Field-level messages are shown next to the inputs; only show the banner when there are none.
      if (Object.keys(fields).length === 0) setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 shadow-xl shadow-black/30">
      <h1 className="text-2xl font-bold text-fg">Create your account</h1>
      <p className="mt-1 text-sm text-muted">It takes less than a minute.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <FormField label="Full name" id="fullName" error={fieldErrors.fullName}>
          <input id="fullName" name="fullName" autoComplete="name" required className={inputClass} value={form.fullName} onChange={handleChange} />
        </FormField>
        <FormField label="Email" id="email" error={fieldErrors.email}>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} value={form.email} onChange={handleChange} />
        </FormField>
        <FormField label="Password" id="password" error={fieldErrors.password} hint="At least 8 characters.">
          <input id="password" name="password" type="password" autoComplete="new-password" required className={inputClass} value={form.password} onChange={handleChange} />
        </FormField>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-400 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
