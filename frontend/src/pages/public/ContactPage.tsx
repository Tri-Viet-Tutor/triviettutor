import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ContactSection } from "@/components/contact/ContactSection";
import { prefersReducedMotion } from "@/utils/motion";

/**
 * Trang "Liên hệ": các cách liên hệ trung tâm và lá thư đăng ký tư vấn.
 * Đường dẫn /lien-he#form-lien-he (nút "Đăng ký tư vấn" ở các trang khác) cuộn thẳng tới lá thư.
 */
export function ContactPage() {
  const { hash, key } = useLocation();

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
    // `key` đổi mỗi lần điều hướng, nên bấm lại "Đăng ký tư vấn" khi đang ở trang này vẫn cuộn tới thư
  }, [hash, key]);

  return (
    <main className="w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink">
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />
      <ContactSection />
    </main>
  );
}
