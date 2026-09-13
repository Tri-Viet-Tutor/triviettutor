import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * AdminLayout
 *
 * Shell layout for all /admin/* routes.
 * Renders the sidebar navigation and a top header.
 * The <Outlet /> is where individual admin pages render.
 */
export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navItems = [
    { to: "/admin/courses", label: "Courses & Classes" },
    { to: "/admin/assignments", label: "Tutor Assignment" },
    { to: "/admin/reschedules", label: "Reschedules" },
    { to: "/admin/payroll", label: "Payroll" },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 text-lg font-bold border-b border-gray-700">
          VietTriTutor <span className="text-xs font-normal text-gray-400">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 px-3 py-2 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white text-left"
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
