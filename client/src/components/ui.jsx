export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-3 font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {children && <p className="mt-1 text-slate-500">{children}</p>}
    </div>
  );
}

const buttonStyles = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-500/50",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function FormField({ label, id, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
