import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <EmptyState title="Page not found">
      <Link to="/" className="font-medium text-brand-400 underline">
        Go back home
      </Link>
    </EmptyState>
  );
}
