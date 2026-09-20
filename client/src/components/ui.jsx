export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-brand-400" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
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
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-fg">{title}</h3>
      {children && <p className="mt-1 text-muted">{children}</p>}
    </div>
  );
}

const buttonStyles = {
  primary: "bg-brand-600 text-white hover:bg-brand-hover disabled:bg-brand-600/40 disabled:text-white/60",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-2 disabled:opacity-50",
  danger: "border border-danger/40 bg-transparent text-danger-fg hover:bg-danger/10 disabled:opacity-50",
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
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-danger-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-sm text-fg outline-none transition placeholder:text-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";
