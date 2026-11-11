import { useEffect, useState } from "react";
import { avatarUrl } from "@/services/avatarService";
import { useAvatarVersion } from "@/stores/avatarStore";
import { nameInitial } from "@/utils/sessions";

// Ảnh đại diện tròn của một người dùng; chưa có ảnh (hoặc tải lỗi) thì hiện chữ cái đầu của tên trên nền cam.
// `size` là cạnh tính bằng px.
export function UserAvatar({
  userId,
  name,
  size = 32,
  className = "",
}: {
  userId?: number | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const version = useAvatarVersion((state) => state.version);
  const [failed, setFailed] = useState(false);
  // Đổi người hoặc đổi ảnh thì thử tải lại
  useEffect(() => setFailed(false), [userId, version]);

  const style = { width: size, height: size, fontSize: Math.round(size * 0.44) };
  if (userId && !failed) {
    return (
      <img
        src={avatarUrl(userId, version)}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        style={style}
        className={`shrink-0 rounded-full bg-brand-tint object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#F7C24A] font-extrabold text-brand-navyDeep ${className}`}
    >
      {nameInitial(name || "?")}
    </span>
  );
}
