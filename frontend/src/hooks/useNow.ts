import { useEffect, useState } from "react";

// Thời điểm hiện tại, tự cập nhật sau mỗi `intervalMs` (mặc định 1 phút) để các nhãn "còn bao lâu" không bị cũ.
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
