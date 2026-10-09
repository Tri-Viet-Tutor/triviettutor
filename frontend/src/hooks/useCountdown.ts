import { useCallback, useEffect, useState } from "react";

/**
 * Đếm ngược theo giây. Trả về số giây còn lại và hàm bắt đầu đếm lại.
 * Tính theo mốc thời gian thật nên không lệch khi tab bị trình duyệt cho ngủ.
 *
 * @param initialSeconds số giây lúc đầu; 0 nghĩa là chưa đếm
 */
export function useCountdown(initialSeconds: number): [number, (seconds: number) => void] {
  const [deadline, setDeadline] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0));
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const restart = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
    setDeadline(Date.now() + seconds * 1000);
  }, []);

  return [secondsLeft, restart];
}

/** 125 → "02:05" */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
