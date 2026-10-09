import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { TutorProfilePanel } from "@/features/tutors/components/TutorProfilePanel";
import { TutorResultList } from "@/features/tutors/components/TutorResultList";
import { type TutorProfile } from "@/features/tutors/data/tutorProfiles";

interface TutorFinderSectionProps {
  /** Gia sư khớp với ô tìm và môn đang lọc */
  tutors: TutorProfile[];
  selectedId: string;
  onSelect: (tutorId: string) => void;
  /** Tên môn đang lọc để ghi vào dòng kết quả, rỗng = mọi môn */
  subjectLabel: string;
  onReset: () => void;
}

/** Kết quả tìm gia sư: danh sách bên trái, hồ sơ gia sư đang chọn bên phải. */
export function TutorFinderSection({ tutors, selectedId, onSelect, subjectLabel, onReset }: TutorFinderSectionProps) {
  const selected = tutors.find((tutor) => tutor.id === selectedId) ?? tutors[0];

  return (
    <section id="tutor-finder" className="scroll-mt-[120px] bg-[#F5F1E9] pb-14 pt-10 lg:pb-20 lg:pt-12">
      <div className={CONTAINER}>
        <p aria-live="polite" className="text-[15px] font-semibold text-brand-muted">
          <span className="text-[22px] font-extrabold text-brand-navy">{tutors.length}</span> gia sư
          {subjectLabel && ` môn ${subjectLabel}`}
        </p>

        {selected ? (
          <div className="mt-6 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:sticky lg:top-[156px] lg:col-span-4">
              <TutorResultList tutors={tutors} selectedId={selected.id} onSelect={onSelect} />
            </div>
            <div className="lg:col-span-8">
              <TutorProfilePanel tutor={selected} onSelect={onSelect} />
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center py-10 text-center">
            <Icon name="person_search" className="text-[52px] text-brand-navy/40" />
            <p className="mt-3 text-[18px] font-bold text-brand-navy">Chưa tìm thấy gia sư phù hợp</p>
            <button
              type="button"
              onClick={onReset}
              className={`mt-5 inline-flex h-11 items-center rounded-full bg-brand-navy px-6 text-[15px] font-bold text-white transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
            >
              Xem tất cả gia sư
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
