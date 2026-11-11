import type { RefObject } from "react";
import type { Tutor } from "@/interfaces/tutor";

// ── components/home ──
// Props của CrawlingAnt
export interface CrawlingAntProps {
  // Câu hiện trên đầu con kiến; bỏ trống thì kiến chỉ bò, không nói
  message?: string;
  className?: string;
  // Màu thân kiến (mặc định nâu đậm như trang chủ)
  color?: string;
}

// Props của GraduationCap
export interface GraduationCapProps {
  className?: string;
}

// Một điểm của dây: vị trí hiện tại (x, y) và vị trí ở bước trước (px, py) — kiểu Verlet
export type LanyardPoint = { x: number; y: number; px: number; py: number };

// Trạng thái mô phỏng, dùng chung giữa vòng vẽ và các sự kiện kéo thả
export type LanyardSimulation = {
  points: LanyardPoint[];
  // Đang kéo thẻ
  dragging: boolean;
  // Vị trí tâm thẻ mà con trỏ đang kéo tới
  target: { x: number; y: number };
  // Độ lệch giữa con trỏ và tâm thẻ lúc bắt đầu kéo
  grab: { x: number; y: number };
  // Quãng đường con trỏ đã đi — dưới 6px thì coi là bấm, không phải kéo
  moved: number;
  // Vị trí con trỏ lần trước
  last: { x: number; y: number };
  // Đánh thức vòng vẽ khi đang đứng yên
  wake: () => void;
};

// Props của LanyardTag
export interface LanyardTagProps {
  // Trang mở khi bấm thẻ
  to?: string;
  className?: string;
}

// Props của PaperPlane
export interface PaperPlaneProps {
  className?: string;
}

// Props của TutorCard
export interface TutorCardProps {
  tutor: Tutor;
  // Vị trí trong lưới — quyết định độ nghiêng và cột so le
  index: number;
}

// ── constants/home.ts ──
// Một ảnh trong khung trình chiếu
export interface HeroSlide {
  src: string;
  // Mô tả ảnh cho trình đọc màn hình
  alt: string;
}

// Một ý trên bảng phấn
export interface ClassPractice {
  // Tên biểu tượng Material Symbols
  icon: string;
  title: string;
  description: string;
}

// ── hooks/useWhirlwindReveal.ts ──
// Kết quả trả về của useWhirlwindReveal
export interface WhirlwindReveal<T extends HTMLElement> {
  // Gắn vào phần tử cha chứa các mục (mỗi phần tử con là một mục)
  listRef: RefObject<T>;
  // Gắn vào lốc xoáy — phải nằm cùng khung định vị (relative) với danh sách
  whirlwindRef: RefObject<HTMLDivElement>;
  // Số mục đã hiện, tính từ đầu danh sách
  revealedCount: number;
  // false khi thiết bị bật "giảm chuyển động": không vẽ lốc xoáy, các mục hiện sẵn
  showWhirlwind: boolean;
}
