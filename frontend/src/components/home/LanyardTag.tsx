import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { ROUTES } from "@/constants/routes";
import { prefersReducedMotion } from "@/utils/motion";
import type { LanyardPoint, LanyardSimulation, LanyardTagProps } from "@/interfaces/home";

// ─────────────────────────────────────────────────────────────────────────────
// Thẻ đeo "Tìm kiếm gia sư" treo bằng dây.
// • Khi tải trang: dây thả từ trên xuống rồi đung đưa cho tới khi đứng yên
// • Kéo thả được bằng chuột / ngón tay; cuộn trang làm thẻ lắc nhẹ
// • Bấm (không kéo) hoặc nhấn Enter: mở trang tìm gia sư
// Mô phỏng dây bằng các điểm nối nhau (Verlet), không dùng thư viện ngoài.
// ─────────────────────────────────────────────────────────────────────────────

const WIDTH = 320; // bề ngang vùng treo, điểm treo nằm chính giữa

const SEGMENTS = 10; // số đoạn dây

const ROPE = 128; // chiều dài dây (px)

const SEGMENT = ROPE / SEGMENTS;

const CARD_W = 158; // bề ngang thẻ (px)

const CARD_H = 222; // chiều cao thẻ (px)

const HOOK = 30; // kẹp + móc kim loại: từ đầu dây tới mép trên thẻ

const SCALE = 0.84; // thu phóng cả thẻ (1 = cỡ gốc 158 × 222)

const HALF = (HOOK + CARD_H / 2) * SCALE; // từ đầu dây tới tâm thẻ

const GRAVITY = 0.55; // trọng lực mỗi bước (px)

const DAMPING = 0.984; // hệ số giảm vận tốc mỗi bước (gần 1 = đung đưa lâu)

const ITERATIONS = 14; // số lần nắn lại độ dài các đoạn dây mỗi bước

const STEP_MS = 1000 / 60; // mô phỏng cố định 60 bước mỗi giây

const ANCHOR_X = WIDTH / 2; // điểm treo

const CARD_INDEX = SEGMENTS + 1; // điểm cuối cùng là tâm thẻ

// Các điểm của dây khi buông thẳng đứng, đứng yên
function restingPoints(): LanyardPoint[] {
  return Array.from({ length: SEGMENTS + 2 }, (_, i) => {
    const y = i <= SEGMENTS ? i * SEGMENT : ROPE + HALF;
    return { x: ANCHOR_X, y, px: ANCHOR_X, py: y };
  });
}

// Thẻ đeo "Tìm kiếm gia sư" ở phần mở đầu trang chủ (chi tiết ở đầu file).
export function LanyardTag({ to = ROUTES.tutorSearch, className = "" }: LanyardTagProps) {
  const navigate = useNavigate();
  // id riêng cho đường dây (bỏ dấu ":" của useId để dùng được trong href="#…")
  const strapId = useId().replace(/:/g, "");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<SVGPathElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const simRef = useRef<LanyardSimulation | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const rope = ropeRef.current;
    const card = cardRef.current;
    if (!wrapper || !rope || !card) return;

    const reduced = prefersReducedMotion();

    const sim: LanyardSimulation = {
      points: restingPoints(),
      dragging: false,
      target: { x: ANCHOR_X, y: ROPE + HALF },
      grab: { x: 0, y: 0 },
      moved: 0,
      last: { x: 0, y: 0 },
      wake: () => {},
    };
    simRef.current = sim;

    // Vẽ dây (đường cong qua các điểm) và xoay thẻ theo hướng đoạn nối cuối
    const render = () => {
      const p = sim.points;
      let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
      for (let i = 1; i < SEGMENTS; i++) {
        const mx = (p[i].x + p[i + 1].x) / 2;
        const my = (p[i].y + p[i + 1].y) / 2;
        d += ` Q${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      d += ` L${p[SEGMENTS].x.toFixed(1)} ${p[SEGMENTS].y.toFixed(1)}`;
      rope.setAttribute("d", d);

      const clip = p[SEGMENTS];
      const center = p[CARD_INDEX];
      const angle = Math.atan2(-(center.x - clip.x), center.y - clip.y);
      card.style.transform = `translate(${(clip.x - CARD_W / 2).toFixed(1)}px, ${clip.y.toFixed(1)}px) rotate(${angle.toFixed(4)}rad) scale(${SCALE})`;
    };

    // Giảm chuyển động: vẽ thẻ đứng yên, không mô phỏng
    if (reduced) {
      render();
      wrapper.style.opacity = "1";
      return () => {
        simRef.current = null;
      };
    }

    // Vị trí xuất phát: cả dây và thẻ nằm chếch phía trên bên trái điểm treo, rồi rơi xuống
    sim.points = sim.points.map((point, i) => {
      if (i === 0) return point;
      const x = ANCHOR_X - point.y * 0.62;
      const y = -point.y * 0.78;
      return { x, y, px: x, py: y };
    });

    // Một bước mô phỏng; trả về tổng chuyển động để biết khi nào dây đã đứng yên
    const step = () => {
      const p = sim.points;
      let motion = 0;

      // 1) Cập nhật vị trí theo quán tính + trọng lực (tâm thẻ bám theo con trỏ khi đang kéo)

      for (let i = 1; i < p.length; i++) {
        const point = p[i];
        if (sim.dragging && i === CARD_INDEX) {
          point.px = point.x;
          point.py = point.y;
          point.x = sim.target.x;
          point.y = sim.target.y;
          continue;
        }
        const vx = (point.x - point.px) * DAMPING;
        const vy = (point.y - point.py) * DAMPING;
        point.px = point.x;
        point.py = point.y;
        point.x += vx;
        point.y += vy + GRAVITY;
        motion += Math.abs(vx) + Math.abs(vy);
      }

      // 2) Nắn lại để các đoạn dây không dài quá chiều dài cho phép
      for (let n = 0; n < ITERATIONS; n++) {
        for (let i = 0; i < p.length - 1; i++) {
          const a = p[i];
          const b = p[i + 1];
          const isCardLink = i + 1 === CARD_INDEX;
          const length = isCardLink ? HALF : SEGMENT;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 0.0001;
          // Dây chỉ chịu kéo (có thể chùng); đoạn nối vào thẻ thì cứng
          if (!isCardLink && distance <= length) continue;
          const weightA = i === 0 ? 0 : 1;
          const weightB = isCardLink ? (sim.dragging ? 0 : 0.22) : 1;
          const total = weightA + weightB;
          if (!total) continue;
          const offset = (distance - length) / distance;
          a.x += dx * offset * (weightA / total);
          a.y += dy * offset * (weightA / total);
          b.x -= dx * offset * (weightB / total);
          b.y -= dy * offset * (weightB / total);
        }
      }
      return motion;
    };

    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let quiet = 0;

    // Vòng vẽ: chạy mô phỏng theo bước cố định, tự dừng khi dây đứng yên đủ lâu
    const loop = (now: number) => {
      frame = 0;
      accumulator += Math.min(64, now - (previous || now));
      previous = now;
      while (accumulator >= STEP_MS) {
        const motion = step();
        accumulator -= STEP_MS;
        quiet = motion < 0.06 && !sim.dragging ? quiet + 1 : 0;
      }
      render();
      if (quiet < 45) frame = requestAnimationFrame(loop);
      else previous = 0;
    };

    sim.wake = () => {
      quiet = 0;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    // Cuộn trang làm thẻ lắc nhẹ
    let lastScroll = window.scrollY;
    // Cuộn trang thì thẻ đeo đung đưa theo
    const onScroll = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (sim.dragging || wrapper.getBoundingClientRect().bottom < 0) return;
      sim.points[CARD_INDEX].px -= Math.max(-2.5, Math.min(2.5, delta * 0.02));
      sim.wake();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    render();
    const start = window.setTimeout(() => {
      wrapper.style.opacity = "1";
      sim.wake();
    }, 500);

    return () => {
      window.clearTimeout(start);
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      simRef.current = null;
    };
  }, []);

  // Toạ độ con trỏ trong khung treo
  const localPoint = (event: ReactPointerEvent) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  // Bắt đầu kéo thẻ
  const onPointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const sim = simRef.current;
    if (!sim || event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointer = localPoint(event);
    const center = sim.points[CARD_INDEX];
    sim.grab = { x: pointer.x - center.x, y: pointer.y - center.y };
    sim.target = { x: center.x, y: center.y };
    sim.last = pointer;
    sim.moved = 0;
    sim.dragging = true;
    sim.wake();
  };

  // Đang kéo: cập nhật vị trí đích của tâm thẻ
  const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const sim = simRef.current;
    if (!sim?.dragging) return;
    const pointer = localPoint(event);
    sim.moved += Math.hypot(pointer.x - sim.last.x, pointer.y - sim.last.y);
    sim.last = pointer;
    // Không cho kéo xa hơn chiều dài dây
    let x = pointer.x - sim.grab.x;
    let y = pointer.y - sim.grab.y;
    const reach = ROPE + HALF - 1;
    const distance = Math.hypot(x - ANCHOR_X, y);
    if (distance > reach) {
      x = ANCHOR_X + ((x - ANCHOR_X) * reach) / distance;
      y = (y * reach) / distance;
    }
    sim.target = { x, y };
  };

  // Thả thẻ; nếu gần như không di chuyển thì coi là bấm và mở trang
  const onPointerUp = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const sim = simRef.current;
    if (!sim?.dragging) return;
    sim.dragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sim.wake();
    if (event.type === "pointerup" && sim.moved < 6) navigate(to);
  };

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-none select-none transition-opacity duration-300 ${className}`}
      style={{ width: WIDTH, height: ROPE + (HOOK + CARD_H) * SCALE + 40, opacity: 0 }}
    >
      {
        // Dây đeo: bản rộng, hai mép sẫm, in chữ thương hiệu chạy dọc theo dây
      }
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ filter: "drop-shadow(0 5px 5px rgba(8, 42, 102, 0.22))" }}
      >
        <defs>
          <path ref={ropeRef} id={strapId} />
        </defs>
        <use href={`#${strapId}`} fill="none" stroke="#061F4D" strokeWidth="13" strokeLinecap="butt" strokeLinejoin="round" />
        <use href={`#${strapId}`} fill="none" stroke="#0B3A8C" strokeWidth="10.5" strokeLinecap="butt" strokeLinejoin="round" />
        <use
          href={`#${strapId}`}
          fill="none"
          stroke="#F5A00F"
          strokeWidth="10.5"
          strokeLinecap="butt"
          strokeDasharray="3 125"
          strokeDashoffset="-8"
        />
        <text
          fill="#FFFFFF"
          fontSize="7"
          fontWeight="800"
          letterSpacing="1.4"
          dominantBaseline="central"
          style={{ textTransform: "uppercase" }}
        >
          <textPath href={`#${strapId}`} startOffset="20">
            Tri Viet Tutor
          </textPath>
        </text>
      </svg>

      {
        // Thẻ
      }
      <a
        ref={cardRef}
        href={to}
        draggable={false}
        aria-label="Tìm kiếm gia sư"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(event) => {
          // Chuột/chạm đã xử lý ở onPointerUp; ở đây chỉ còn trường hợp bàn phím (Enter)
          event.preventDefault();
          if (event.detail === 0) navigate(to);
        }}
        className="group pointer-events-auto absolute left-0 top-0 block cursor-grab touch-none outline-none active:cursor-grabbing"
        style={{ width: CARD_W, height: HOOK + CARD_H, transformOrigin: "50% 0", willChange: "transform" }}
      >
        {
          // Kẹp đầu dây
        }
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[-3px] h-[13px] w-[21px] -translate-x-1/2 rounded-[3px] bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)]"
        />
        {
          // Móc kim loại xuyên qua khe thẻ
        }
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[8px] z-10 h-[34px] w-[16px] -translate-x-1/2 rounded-full border-[3px] border-slate-300 shadow-[0_1px_1px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(100,116,139,0.55)]"
        />

        {
          // Thân thẻ
        }
        <span
          className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-[18px] bg-gradient-to-b from-brand-navy to-brand-navyDeep text-white shadow-[0_22px_34px_-16px_rgba(8,42,102,0.6),inset_0_0_0_1px_rgba(255,255,255,0.12)] group-focus-visible:ring-2 group-focus-visible:ring-brand-orange group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#E8E2D5]"
          style={{ top: HOOK, height: CARD_H }}
        >
          {
            // Vệt sáng chéo cho cảm giác thẻ nhựa bóng
          }
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_28%,transparent_46%)]"
          />
          {
            // Khe luồn móc
          }
          <span
            aria-hidden="true"
            className="mx-auto mt-[9px] h-[7px] w-[30px] shrink-0 rounded-full bg-[#04163C] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
          />

          {
            // Thương hiệu
          }
          <span className="relative mt-3 flex items-center gap-2 px-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
              <img src={ASSETS.common.logo} alt="" draggable={false} className="h-full w-full rounded-full object-contain" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.04em]">
                Tri Viet <span className="text-brand-orange">Tutor</span>
              </span>
              <span className="mt-1 text-[9.5px] font-medium text-white/65">Gia sư lớp 10 – 12</span>
            </span>
          </span>

          <span aria-hidden="true" className="relative mx-3.5 mt-3 h-px bg-white/15" />

          {
            // Nội dung chính
          }
          <span className="relative flex flex-1 flex-col justify-center px-3.5">
            <span className="text-[22px] font-extrabold leading-[1.12] tracking-tight">Tìm kiếm</span>
            <span className="text-[22px] font-extrabold leading-[1.12] tracking-tight text-brand-orange">gia sư</span>
          </span>

          {
            // Nút
          }
          <span className="relative mx-3 mb-3 flex h-9 items-center justify-between rounded-full bg-brand-orange pl-3.5 pr-1.5 text-[12px] font-bold text-brand-navyDeep transition-colors group-hover:bg-[#FFB534]">
            Bấm để tìm
            <span
              aria-hidden="true"
              className="material-symbols-outlined flex h-6 w-6 items-center justify-center rounded-full bg-brand-navyDeep text-[15px] text-white"
            >
              search
            </span>
          </span>
        </span>
      </a>
    </div>
  );
}
