import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner } from "./ui.jsx";

// Guards a group of routes. UX only: the API enforces the real authorization on every request.
export default function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
