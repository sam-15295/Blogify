import { Route, Routes, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import BlogDetail from "./pages/BlogDetail.jsx";
import BlogEditor from "./pages/BlogEditor.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* key={pathname}: moving to another page gives the boundary a fresh start */}
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blogs/:id" element={<BlogDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/blogs/new" element={<BlogEditor />} />
              <Route path="/blogs/:id/edit" element={<BlogEditor />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </>
  );
}
