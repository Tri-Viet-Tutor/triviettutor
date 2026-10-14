import { Icon } from "@/components/ui/Icon";
import { type TutorProfile } from "@/features/tutors/data/tutorProfiles";

interface TutorResultListProps {
  tutors: TutorProfile[];
  selectedId: string;
  onSelect: (tutorId: string) => void;
}

/** Danh sách gia sư tìm được: hàng ngang vuốt được trên điện thoại, cột dọc trên màn hình lớn. */
export function TutorResultList({ tutors, selectedId, onSelect }: TutorResultListProps) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0 lg:pb-0">
      {tutors.map((tutor) => {
        const isActive = tutor.id === selectedId;
        return (
          <li key={tutor.id} className="w-[272px] shrink-0 snap-start lg:w-auto">
            <button
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(tutor.id)}
              className={`flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy ${
                isActive ? "bg-white shadow-soft" : "hover:bg-white/60"
              }`}
            >
              <img
                src={tutor.image}
                alt=""
                loading="lazy"
                className={`h-14 w-14 shrink-0 rounded-full border-[3px] bg-brand-tint object-cover object-top ${
                  isActive ? "border-brand-orange" : "border-white"
                }`}
              />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[15.5px] font-bold leading-snug text-brand-navy">{tutor.name}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-brand-muted">
                  <Icon name={tutor.course.icon} className="text-[16px] text-brand-orangeHover" />
                  {tutor.course.subjectLabel}
                </span>
              </span>
              <Icon
                name="chevron_right"
                className={`hidden text-[22px] text-brand-navy transition-opacity lg:block ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
