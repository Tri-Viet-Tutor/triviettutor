import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { authErrorMessage } from "@/utils/errors";
import { fetchMeWithToken, getRoleHome } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

/** Đọc token trong phần #token=… của địa chỉ (phần # không bao giờ được gửi lên máy chủ) */
function readFragmentToken(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("token");
  return token && token.trim() ? token.trim() : null;
}

/**
 * Trang hoàn tất đăng nhập Google: backend chuyển về /oauth2/success#token=<jwt>.
 * Trang lấy token, xóa nó khỏi thanh địa chỉ, gọi GET /me để biết người dùng,
 * lưu phiên giống đăng nhập thường rồi chuyển tới trang của vai trò.
 */
export function OAuth2SuccessPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  // StrictMode chạy effect hai lần ở dev; chỉ xử lý token một lần
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = readFragmentToken();
    // Không để token nằm lại trong lịch sử trình duyệt
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setError("Không nhận được phiên đăng nhập từ Google. Vui lòng thử lại.");
      return;
    }

    // Bỏ phiên cũ (nếu có) để interceptor không gắn nhầm token của người trước
    useAuthStore.getState().logout();
    fetchMeWithToken(token)
      .then((me) => {
        setAuth(token, { id: me.id, email: me.email, fullName: me.fullName, role: me.role });
        navigate(getRoleHome(me.role), { replace: true });
      })
      .catch((err: unknown) => setError(authErrorMessage(err, "Đăng nhập bằng Google chưa thành công. Vui lòng thử lại.")));
  }, [navigate, setAuth]);

  return (
    <div>
      <AuthHeading title="Đăng nhập bằng Google" />
      {error ? (
        <AuthNotice tone="error">
          {error}
          <Link to={ROUTES.login} replace className={`mt-1.5 block ${AUTH_TEXT_LINK}`}>
            Quay lại trang đăng nhập
          </Link>
        </AuthNotice>
      ) : (
        <AuthNotice tone="info">Đang hoàn tất đăng nhập…</AuthNotice>
      )}
    </div>
  );
}
