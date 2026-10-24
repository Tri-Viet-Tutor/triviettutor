import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import type { ErrorScreenProps } from "@/interfaces/ui";

/** Khung chung của các trang lỗi: mã lỗi, câu giải thích và liên kết về trang chủ. */
export function ErrorScreen({ code, message }: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">{code}</h1>
        <p className="mt-4 text-xl text-gray-600">{message}</p>
        <Link to={ROUTES.home} className="mt-6 inline-block text-brand-navy hover:underline">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
