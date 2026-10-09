import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ConsultCtaSection } from "@/components/ui/ConsultCtaSection";
import { COURSES } from "@/features/catalog/data/courses";
import { TutorFinderSection } from "@/features/tutors/components/TutorFinderSection";
import { TutorSearchHero } from "@/features/tutors/components/TutorSearchHero";
import { filterTutors, TUTOR_PROFILES } from "@/features/tutors/data/tutorProfiles";
import { prefersReducedMotion } from "@/utils/motion";

/* Ba gia sư trên xấp ảnh mở đầu: người đầu tiên của ba khóa đầu, mỗi người một môn */
const FEATURED_TUTORS = COURSES.slice(0, 3).flatMap((course) =>
  TUTOR_PROFILES.filter((tutor) => tutor.course.id === course.id).slice(0, 1),
);

function scrollToFinder() {
  document
    .getElementById("tutor-finder")
    ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/**
 * Trang "Tìm gia sư": tìm theo tên hoặc lọc theo môn, xem hồ sơ gia sư và khóa đang dạy.
 * Nhận sẵn bộ lọc từ đường dẫn: /tim-gia-su?mon=MATH&q=thuan.
 */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [subject, setSubject] = useState(() => {
    const fromUrl = searchParams.get("mon") ?? "";
    return COURSES.some((course) => course.subject === fromUrl) ? fromUrl : "";
  });
  const [selectedId, setSelectedId] = useState(TUTOR_PROFILES[0]?.id ?? "");

  const tutors = useMemo(() => filterTutors(subject, query), [subject, query]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  /** Bấm ảnh ở phần mở đầu: bỏ bộ lọc để chắc chắn gia sư đó có trong danh sách, rồi cuộn xuống hồ sơ */
  function pickTutorFromHero(tutorId: string) {
    setQuery("");
    setSubject("");
    setSelectedId(tutorId);
    scrollToFinder();
  }

  function resetFilters() {
    setQuery("");
    setSubject("");
  }

  return (
    <main className="w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink">
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />
      <TutorSearchHero
        query={query}
        subject={subject}
        onQueryChange={setQuery}
        onSubjectChange={setSubject}
        onSubmit={scrollToFinder}
        featuredTutors={FEATURED_TUTORS}
        onPickTutor={pickTutorFromHero}
      />
      <TutorFinderSection
        tutors={tutors}
        selectedId={selectedId}
        onSelect={setSelectedId}
        subjectLabel={COURSES.find((course) => course.subject === subject)?.subjectLabel ?? ""}
        onReset={resetFilters}
      />
      <ConsultCtaSection
        title="Chưa biết chọn"
        highlight="gia sư nào?"
        description="Để lại thông tin, trung tâm tư vấn khóa học và lớp phù hợp."
      />
    </main>
  );
}
