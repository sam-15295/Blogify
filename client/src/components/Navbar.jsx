import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "./ui.jsx";

export default function Navbar() {
  const { user, initializing, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold tracking-tight text-brand-700">
          Blogify
        </Link>

        <div className="flex items-center gap-3">
          {initializing ? null : user ? (
            <>
              <NavLink to="/blogs/new" className="text-sm font-medium text-slate-700 hover:text-brand-700">
                Write
              </NavLink>
              <span className="hidden text-sm text-slate-500 sm:inline">{user.fullName}</span>
              <Button variant="secondary" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-brand-700">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
