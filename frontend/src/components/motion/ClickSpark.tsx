import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/utils/motion";
import type { ClickSparkProps } from "@/interfaces/motion";

// Tia sáng toả ra tại điểm bấm chuột / chạm.
export function ClickSpark({ color = "#F5A00F" }: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || prefersReducedMotion()) return;

    const COUNT = 8; // số tia mỗi lần bấm
    const SIZE = 11; // độ dài tia lúc đầu (px)
    const RADIUS = 20; // quãng đường tia bay ra (px)
    const DURATION = 420; // thời gian một lần toả (ms)
    let sparks: { x: number; y: number; start: number }[] = [];
    let frame = 0;

    // Canvas phủ cả cửa sổ, nhân theo devicePixelRatio để nét vẽ không bị mờ
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Vẽ từng khung hình tia lửa, xóa tia đã hết thời gian
    const draw = (now: number) => {
      frame = 0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      sparks = sparks.filter((spark) => now - spark.start < DURATION);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (const spark of sparks) {
        const t = (now - spark.start) / DURATION;
        const eased = t * (2 - t); // ease-out: bay nhanh lúc đầu rồi chậm lại
        const distance = eased * RADIUS;
        const length = SIZE * (1 - eased);
        for (let i = 0; i < COUNT; i++) {
          const angle = (2 * Math.PI * i) / COUNT;
          ctx.beginPath();
          ctx.moveTo(spark.x + distance * Math.cos(angle), spark.y + distance * Math.sin(angle));
          ctx.lineTo(spark.x + (distance + length) * Math.cos(angle), spark.y + (distance + length) * Math.sin(angle));
          ctx.stroke();
        }
      }
      // Hết tia thì dừng vòng vẽ, đợi lần bấm tiếp theo
      if (sparks.length) frame = requestAnimationFrame(draw);
    };

    // Bấm chuột thì tạo tia lửa tại chỗ bấm
    const onPointerDown = (event: PointerEvent) => {
      sparks.push({ x: event.clientX, y: event.clientY, start: performance.now() });
      if (!frame) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [color]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />;
}
