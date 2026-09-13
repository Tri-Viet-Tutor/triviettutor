import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * StudentLayout
 *
 * Shell layout for all /student/* routes.
 * Students/parents see the class catalog, their enrollments, and their schedule.
 */
export function StudentLayout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navItems = [
    { to: "/student/catalog", label: "Browse Classes" },
    { to: "/student/enrollments", label: "My Enrollments" },
    { to: "/student/schedule", label: "My Schedule" },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-teal-900 text-white flex flex-col">
        <div className="px-6 py-5 text-lg font-bold border-b border-teal-700">
          VietTriTutor <span className="text-xs font-normal text-teal-300">Student</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white"
                    : "text-teal-200 hover:bg-teal-700 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 px-3 py-2 rounded text-sm text-teal-300 hover:bg-teal-700 hover:text-white text-left"
        >
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
