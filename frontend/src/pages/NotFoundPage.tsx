import { Link } from "react-router-dom";

/** 404 Not Found page */
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page not found</p>
        <Link to="/" className="mt-6 inline-block text-primary-600 hover:underline">
          Go back home
        </Link>
      </div>
    </div>
  );
}
