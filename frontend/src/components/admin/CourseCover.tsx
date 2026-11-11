import { Icon } from "@/components/ui/Icon";
import { subjectCover, subjectIcon } from "@/constants/management";
import type { GradeLevel } from "@/interfaces/dto";

// Kích thước ảnh bìa (vuông 1:1)
const SIZE = {
  sm: { box: "h-10 w-10 rounded-lg", grade: "text-[13px]", icon: "text-[30px] -bottom-1.5 -right-1.5" },
  md: { box: "h-16 w-16 rounded-xl", grade: "text-[19px]", icon: "text-[46px] -bottom-2 -right-2" },
  lg: { box: "h-[72px] w-[72px] rounded-2xl", grade: "text-[22px]", icon: "text-[52px] -bottom-2.5 -right-2.5" },
} as const;

// Ảnh bìa thu nhỏ của khóa học (chưa có ảnh tải lên từ backend):
// nền pastel theo môn, số khối lớp to ở góc trên trái, biểu tượng môn cắt góc dưới phải.
export function CourseCover({
  subject,
  gradeLevel,
  size = "md",
  muted = false,
}: {
  subject: string;
  gradeLevel: GradeLevel;
  size?: keyof typeof SIZE;
  // Khóa ngừng bán: ảnh bìa nhạt màu
  muted?: boolean;
}) {
  const cover = subjectCover(subject);
  const s = SIZE[size];
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: cover.bg, color: cover.fg }}
      className={`relative block shrink-0 overflow-hidden ${s.box} ${muted ? "opacity-55 grayscale-[60%]" : ""}`}
    >
      <span className={`absolute left-2 top-1.5 font-extrabold leading-none tracking-tight tabular-nums ${s.grade}`}>
        {gradeLevel.replace("GRADE_", "")}
      </span>
      <Icon name={subjectIcon(subject)} className={`absolute opacity-30 ${s.icon}`} />
    </span>
  );
}
