import { Link } from "react-router-dom";

/** 403 Forbidden page — shown when a user accesses a route for the wrong role */
export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">403</h1>
        <p className="mt-4 text-xl text-gray-600">You don&apos;t have permission to view this page</p>
        <Link to="/" className="mt-6 inline-block text-primary-600 hover:underline">
          Go back home
        </Link>
      </div>
    </div>
  );
}
