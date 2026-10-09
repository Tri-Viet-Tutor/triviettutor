import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CrawlingAnt } from "@/features/home/components/CrawlingAnt";
import { PaperPlane } from "@/features/home/components/PaperPlane";
import { CONTAINER, FIELD, FIELD_LABEL, FOCUS_RING } from "@/features/home/styles";

/** Đăng ký tư vấn: phiếu đăng ký (chưa nối API — nút gửi chưa gửi dữ liệu đi đâu). */
export function BookingFormSection() {
  return (
    <section id="booking-form" className="paper-grid bg-[#E8E2D5] py-16 lg:py-24">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12`}>
        <Reveal className="relative lg:col-span-6">
          <h2 className="text-[32px] lg:text-[46px] leading-tight font-extrabold tracking-tight text-brand-navy text-balance">
            Đăng Ký Tư Vấn
          </h2>
          <p className="mt-4 max-w-md text-[16px] lg:text-[18px] leading-relaxed text-brand-muted">
            Để lại thông tin, trung tâm sẽ liên hệ tư vấn khóa học và lớp phù hợp.
          </p>
          {/* Máy bay giấy lượn vòng bên cạnh phiếu */}
          <PaperPlane className="mt-6 max-w-[520px] lg:mt-10" />
        </Reveal>

        <Reveal delay={120} className="lg:col-span-6 xl:col-span-5 xl:col-start-8">
          {/* Bóng đổ đặt ở lớp ngoài vì lớp trong bị cắt mép răng cưa */}
          <div className="rotate-[0.6deg] drop-shadow-[0_18px_22px_rgba(8,42,102,0.22)]">
            <div className="bg-[#FFFDF7] px-6 pb-8 pt-9 [mask-image:radial-gradient(circle_at_10px_0,transparent_6px,black_6.5px)] [mask-size:20px_100%] sm:px-9 sm:pb-9 sm:pt-10">
              <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-brand-navy/25 pb-4">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-muted">Tri Viet Tutor</p>
                  <h3 className="mt-1 text-[22px] font-extrabold leading-snug text-brand-navy">Phiếu đăng ký tư vấn</h3>
                </div>
                {/* Con dấu */}
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 -rotate-12 items-center justify-center rounded-full border-2 border-dashed border-brand-orangeHover text-brand-orangeHover"
                >
                  <Icon name="school" className="text-[30px]" />
                </span>
              </div>

              <form className="mt-6 space-y-5" aria-label="Đăng ký tư vấn">
                <div>
                  <label htmlFor="booking-name" className={FIELD_LABEL}>
                    Họ tên phụ huynh *
                  </label>
                  <input id="booking-name" type="text" placeholder="Ví dụ: Anh Tuấn / Chị Mai" className={FIELD} />
                </div>
                <div>
                  <label htmlFor="booking-phone" className={FIELD_LABEL}>
                    Số điện thoại *
                  </label>
                  <input id="booking-phone" type="tel" placeholder="Ví dụ: 0988 123 456" className={FIELD} />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-grade" className={FIELD_LABEL}>
                      Lớp học của con
                    </label>
                    <select id="booking-grade" className={FIELD}>
                      <option>Lớp 10</option>
                      <option>Lớp 11</option>
                      <option>Lớp 12</option>
                      <option>Luyện thi ĐGNL &amp; ĐH</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="booking-mode" className={FIELD_LABEL}>
                      Hình thức học
                    </label>
                    <select id="booking-mode" className={FIELD}>
                      <option>Lớp tại trung tâm (dưới 12 học sinh)</option>
                      <option>Lớp trực tuyến (dưới 12 học sinh)</option>
                      <option>Combo nhiều môn (Ưu đãi sâu)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-subject" className={FIELD_LABEL}>
                      Môn học muốn đăng ký
                    </label>
                    <input id="booking-subject" type="text" placeholder="Toán, Văn, Anh..." className={FIELD} />
                  </div>
                  <div>
                    <label htmlFor="booking-area" className={FIELD_LABEL}>
                      Khu vực tại TP.HCM
                    </label>
                    <input id="booking-area" type="text" placeholder="Quận 1, Thủ Đức..." className={FIELD} />
                  </div>
                </div>
                {/* Nút gửi, có con kiến bò trên mép nút nhắc bấm đăng ký */}
                <div className="relative !mt-14">
                  <CrawlingAnt message="Nhấn nút đăng ký nào!" className="inset-x-[68px]" />
                  <button
                    type="button"
                    className={`group flex h-12 w-full items-center justify-between rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
                  >
                    Đăng ký tư vấn
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[19px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      arrow_forward
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
