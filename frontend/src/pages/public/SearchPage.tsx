import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ConsultCtaSection } from "@/components/ui/ConsultCtaSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { COURSES } from "@/constants/courses";
import { TutorFinderSection } from "@/components/tutors/TutorFinderSection";
import { TutorSearchHero } from "@/components/tutors/TutorSearchHero";
import { filterTutors } from "@/utils/tutors";
import { TUTOR_FAQS, TUTOR_PROFILES } from "@/constants/tutors";
import { scrollToId } from "@/utils/motion";

// Ba gia sư trên xấp ảnh mở đầu: người đầu tiên của ba khóa đầu, mỗi người một môn
const FEATURED_TUTORS = COURSES.slice(0, 3).flatMap((course) =>
  TUTOR_PROFILES.filter((tutor) => tutor.course.id === course.id).slice(0, 1),
);

// Cuộn xuống phần kết quả tìm gia sư
function scrollToFinder() {
  scrollToId("tutor-finder");
}

// Trang "Tìm gia sư": tìm theo tên hoặc lọc theo môn, xem hồ sơ gia sư và khóa đang dạy.
// Nhận sẵn bộ lọc từ đường dẫn: /tim-gia-su?mon=MATH&q=thuan.
export function SearchPage() {
  const [searchParams] = useSearchParams();
  // Ô tìm và môn lọc nhận giá trị ban đầu từ ?q= và ?mon= (mã môn lạ thì bỏ qua)
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [subject, setSubject] = useState(() => {
    const fromUrl = searchParams.get("mon") ?? "";
    return COURSES.some((course) => course.subject === fromUrl) ? fromUrl : "";
  });
  // Gia sư đang xem hồ sơ
  const [selectedId, setSelectedId] = useState(TUTOR_PROFILES[0]?.id ?? "");

  const tutors = useMemo(() => filterTutors(subject, query), [subject, query]);

  // Mở trang thì về đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Bấm ảnh ở phần mở đầu: bỏ bộ lọc để chắc chắn gia sư đó có trong danh sách, rồi cuộn xuống hồ sơ
  function pickTutorFromHero(tutorId: string) {
    setQuery("");
    setSubject("");
    setSelectedId(tutorId);
    scrollToFinder();
  }

  // Xóa ô tìm và bộ lọc môn
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
      <FaqSection title="Câu Hỏi Thường Gặp" description="Về gia sư và lớp học." faqs={TUTOR_FAQS} />
      <ConsultCtaSection
        title="Chưa biết chọn"
        highlight="gia sư nào?"
        description="Để lại thông tin, trung tâm tư vấn khóa học và lớp phù hợp."
      />
    </main>
  );
}
