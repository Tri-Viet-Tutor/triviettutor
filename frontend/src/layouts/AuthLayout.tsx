import { Outlet } from "react-router-dom";

/**
 * AuthLayout
 *
 * Centered card layout for /login and /register pages.
 * Unauthenticated users land here before accessing any protected route.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VietTriTutor</h1>
          <p className="text-gray-500 mt-1 text-sm">Centralized tutoring center management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
