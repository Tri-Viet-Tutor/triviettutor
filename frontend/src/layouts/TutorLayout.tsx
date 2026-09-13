import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * TutorLayout
 *
 * Shell layout for all /tutor/* routes.
 * Tutors see their assigned sessions, availability settings, and payroll.
 */
export function TutorLayout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navItems = [
    { to: "/tutor/sessions", label: "My Sessions" },
    { to: "/tutor/availability", label: "Availability" },
    { to: "/tutor/payroll", label: "My Payroll" },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-indigo-900 text-white flex flex-col">
        <div className="px-6 py-5 text-lg font-bold border-b border-indigo-700">
          VietTriTutor <span className="text-xs font-normal text-indigo-300">Tutor</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-indigo-200 hover:bg-indigo-700 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 px-3 py-2 rounded text-sm text-indigo-300 hover:bg-indigo-700 hover:text-white text-left"
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
