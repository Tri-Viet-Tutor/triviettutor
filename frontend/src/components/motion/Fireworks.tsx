import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/utils/motion";

const COLORS = ["#F5A00F", "#FFD98A", "#0B3A8C", "#2F74E8", "#E5484D", "#12A594", "#8E4EC6"];
const GRAVITY = 0.06;

interface Rocket {
  x: number;
  y: number;
  /** Độ cao sẽ nổ */
  targetY: number;
  speed: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 → 0, mờ dần */
  life: number;
  decay: number;
  color: string;
}

interface FireworksProps {
  /** Bắn trong bao lâu (ms); sau đó các tia còn lại tắt dần rồi hiệu ứng tự gỡ */
  durationMs?: number;
}

/**
 * Pháo hoa phủ toàn màn hình: từng quả bay lên từ mép dưới rồi nổ thành chùm tia rơi chậm.
 * Không chặn thao tác chuột, tự gỡ khi bắn xong, và không chạy nếu người dùng bật "giảm chuyển động".
 */
export function Fireworks({ durationMs = 5200 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finished, setFinished] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let rockets: Rocket[] = [];
    let particles: Particle[] = [];
    const startedAt = performance.now();
    let lastLaunch = 0;
    let frame = 0;

    const launch = () => {
      rockets.push({
        x: width * (0.12 + Math.random() * 0.76),
        y: height + 10,
        targetY: height * (0.14 + Math.random() * 0.34),
        speed: 9 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    const explode = (rocket: Rocket) => {
      const count = 64 + Math.floor(Math.random() * 28);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.6 + Math.random() * 4.2;
        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.011 + Math.random() * 0.012,
          // Xen vài tia màu khác cho chùm pháo rực hơn
          color: Math.random() < 0.22 ? COLORS[Math.floor(Math.random() * COLORS.length)] : rocket.color,
        });
      }
    };

    const draw = (now: number) => {
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, width, height);

      if (elapsed < durationMs && now - lastLaunch > 330) {
        launch();
        if (Math.random() < 0.4) launch();
        lastLaunch = now;
      }

      // Quả pháo đang bay lên, kéo theo một vệt sáng
      rockets = rockets.filter((rocket) => {
        rocket.y -= rocket.speed;
        ctx.strokeStyle = rocket.color;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(rocket.x, rocket.y + 22);
        ctx.lineTo(rocket.x, rocket.y);
        ctx.stroke();
        if (rocket.y > rocket.targetY) return true;
        explode(rocket);
        return false;
      });

      // Các tia sau khi nổ: chậm dần, rơi xuống và mờ đi
      particles = particles.filter((particle) => {
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + GRAVITY;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        if (particle.life <= 0) return false;
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.2 + particle.life * 1.9, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;

      if (elapsed >= durationMs && rockets.length === 0 && particles.length === 0) {
        setFinished(true);
        return;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs]);

  if (finished) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />;
}
