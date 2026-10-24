import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/utils/motion";
import type { WhirlwindReveal } from "@/interfaces/home";

/** Cứ bấy nhiêu mili giây lốc xoáy bay vào xoáy một lần */
const SWIRL_INTERVAL_MS = 5000;

/** Chờ một nhịp sau khi danh sách vào màn hình rồi mới xoáy lần đầu */
const START_DELAY_MS = 300;

/** Thời gian lốc xoáy bay từ mép bảng tới mục (khớp với transition của .whirlwind) */
const TRAVEL_MS = 600;

/** Thời gian lốc xoáy đứng xoáy tại mục trước khi bay đi */
const DWELL_MS = 750;

/** Khoảng lùi ra ngoài mép bảng lúc bay vào và bay đi */
const OFFSTAGE_PX = 110;

/** Mục đã hiện bị cuốn vào lốc rồi xoáy hiện ra lại (những lượt sau lượt đầu) */
const RESPIN_KEYFRAMES: Keyframe[] = [
  { transform: "none", opacity: 1 },
  { transform: "rotate(200deg) scale(0.12)", opacity: 0, offset: 0.4 },
  { transform: "rotate(374deg) scale(1.07)", opacity: 1, offset: 0.78 },
  { transform: "rotate(360deg) scale(1)", opacity: 1 },
];

/** Thời gian xoáy lại một mục (ms) */
const RESPIN_MS = 1000;

/**
 * Cứ 5 giây lốc xoáy bay vào xoáy một lần, mỗi lần một mục theo thứ tự:
 * lượt đầu mục chưa có thì hiện lên, các lượt sau mục bị cuốn vào rồi xoáy hiện ra lại.
 * Chỉ chạy khi danh sách đang nằm trong màn hình.
 */
export function useWhirlwindReveal<T extends HTMLElement>(itemCount: number): WhirlwindReveal<T> {
  const listRef = useRef<T>(null);
  const whirlwindRef = useRef<HTMLDivElement>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showWhirlwind] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const list = listRef.current;
    const whirlwind = whirlwindRef.current;
    const items = list ? (Array.from(list.children) as HTMLElement[]) : [];
    if (!showWhirlwind || !list || !whirlwind || items.length === 0 || !("IntersectionObserver" in window)) {
      setRevealedCount(itemCount);
      return;
    }

    // Gom các setTimeout lại để dọn sạch khi gỡ component
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };
    /** Đặt lốc xoáy tại (x, y) trong khung chứa */
    const moveTo = (x: number, y: number) => {
      whirlwind.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    let turn = 0; // đã xoáy bao nhiêu lượt
    let swirling = false; // đang bay — bỏ qua nhịp mới

    /** Một lượt: bay vào, xoáy tại mục kế tiếp, rồi bay đi */
    const swirl = () => {
      if (swirling) return;
      swirling = true;
      const index = turn % items.length;
      const isFirstRound = turn < items.length;
      turn += 1;
      const item = items[index];
      const y = item.offsetTop + (item.offsetHeight - whirlwind.offsetHeight) / 2;

      // Đặt sẵn ngoài mép trái (không chuyển động), rồi cho hiện và bay tới mục
      whirlwind.style.transition = "none";
      moveTo(-whirlwind.offsetWidth - OFFSTAGE_PX, y);
      void whirlwind.offsetWidth; // ép trình duyệt tính lại layout để transition chạy từ vị trí mới
      whirlwind.style.transition = "";
      whirlwind.style.opacity = "1";
      moveTo(item.offsetLeft + (item.offsetWidth - whirlwind.offsetWidth) / 2, y);

      later(() => {
        if (isFirstRound) setRevealedCount(index + 1);
        else item.animate(RESPIN_KEYFRAMES, { duration: RESPIN_MS, easing: "cubic-bezier(0.3, 0.6, 0.2, 1)" });
      }, TRAVEL_MS - 80);
      // Xoáy xong: bay ra khỏi mép phải và tan dần
      later(() => {
        moveTo(list.offsetLeft + list.offsetWidth + OFFSTAGE_PX, y - 40);
        whirlwind.style.opacity = "0";
      }, TRAVEL_MS + DWELL_MS);
      later(
        () => {
          swirling = false;
        },
        TRAVEL_MS + DWELL_MS + TRAVEL_MS,
      );
    };

    // Chỉ xoáy khi danh sách đang hiện trên màn hình
    let interval = 0;
    const start = () => {
      if (interval) return;
      later(swirl, START_DELAY_MS);
      interval = window.setInterval(swirl, SWIRL_INTERVAL_MS);
    };
    const stop = () => {
      window.clearInterval(interval);
      interval = 0;
    };

    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
      threshold: 0.3,
    });
    observer.observe(list);

    return () => {
      observer.disconnect();
      stop();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [itemCount, showWhirlwind]);

  return { listRef, whirlwindRef, revealedCount, showWhirlwind };
}
