import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, ErrorMessage, FormField, inputClass } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { parseApiError } from "../utils/format.js";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from ?? "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Log in to write posts and join the discussion.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="Email" id="email">
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} value={form.email} onChange={handleChange} />
        </FormField>
        <FormField label="Password" id="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} value={form.password} onChange={handleChange} />
        </FormField>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link to="/register" className="font-medium text-brand-700 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
