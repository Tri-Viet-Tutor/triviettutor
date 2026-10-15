import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { FIELD, FIELD_LABEL, FOCUS_RING } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS } from "@/constants/classOptions";
import { CONTACT_EMAIL } from "@/constants/contact";
import { COURSES } from "@/constants/courses";
import { buildConsultMailto } from "@/utils/contact";
import type { ConsultLetterFormValues } from "@/interfaces/contact";

/** Kiểm tra thư đăng ký: số điện thoại VN (0… hoặc +84…), email không bắt buộc */
const letterSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+84|0)(?:[\s.]?\d){9,10}$/, "Số điện thoại chưa đúng"),
  email: z.union([z.literal(""), z.string().trim().email("Email chưa đúng")]),
  gradeLevel: z.string(),
  subject: z.string(),
  deliveryMode: z.string(),
  note: z.string().trim().max(1000, "Ghi chú tối đa 1000 ký tự"),
});

/** Lớp Tailwind của dòng báo lỗi dưới ô nhập */
const ERROR_TEXT = "mt-1.5 text-[13px] font-semibold text-red-700";

/**
 * Thư đăng ký tư vấn, trình bày như một lá thư có viền sọc bưu điện và con tem.
 * Backend chưa có API nhận yêu cầu tư vấn nên bấm gửi sẽ mở ứng dụng thư của người dùng
 * với nội dung điền sẵn, gửi tới email của trung tâm.
 * Nhận sẵn môn từ đường dẫn: /lien-he?mon=MATH#form-lien-he.
 */
export function ConsultLetterForm() {
  const [searchParams] = useSearchParams();
  // Đã mở ứng dụng thư — đổi dòng ghi chú dưới nút gửi
  const [opened, setOpened] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConsultLetterFormValues>({
    resolver: zodResolver(letterSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      gradeLevel: GRADE_OPTIONS[0].value,
      // Chọn sẵn môn theo tham số ?mon= trên đường dẫn (nếu hợp lệ)
      subject: COURSES.find((course) => course.subject === searchParams.get("mon"))?.subject ?? COURSES[0].subject,
      deliveryMode: DELIVERY_MODE_OPTIONS[0].value,
      note: "",
    },
  });

  /** Đổi giá trị ô chọn sang chữ hiển thị rồi mở ứng dụng thư với nội dung điền sẵn */
  function openMail(values: ConsultLetterFormValues) {
    window.location.href = buildConsultMailto({
      fullName: values.fullName,
      phone: values.phone,
      email: values.email,
      grade: GRADE_OPTIONS.find((grade) => grade.value === values.gradeLevel)?.label ?? "",
      subject: COURSES.find((course) => course.subject === values.subject)?.subjectLabel ?? "",
      deliveryMode: DELIVERY_MODE_OPTIONS.find((mode) => mode.value === values.deliveryMode)?.label ?? "",
      note: values.note,
    });
    setOpened(true);
  }

  return (
    // Viền sọc chéo xanh – trắng – cam như phong bì thư máy bay
    <div
      id="form-lien-he"
      className="scroll-mt-[150px] rounded-[24px] bg-[repeating-linear-gradient(135deg,#0B3A8C_0_14px,#FFFDF7_14px_28px,#F5A00F_28px_42px,#FFFDF7_42px_56px)] p-[10px] shadow-[0_30px_50px_-28px_rgba(8,42,102,0.6)]"
    >
      <div className="rounded-[15px] bg-[#FFFDF7] px-6 pb-8 pt-7 sm:px-9 sm:pb-9 sm:pt-8">
        <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-brand-navy/25 pb-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-muted">Thư gửi Tri Viet Tutor</p>
            <h2 className="mt-1 text-[24px] font-extrabold leading-snug text-brand-navy">Đăng ký tư vấn</h2>
          </div>
          {/* Con tem và dấu bưu điện */}
          <div aria-hidden="true" className="relative shrink-0">
            <svg
              viewBox="0 0 84 60"
              fill="none"
              className="absolute -left-12 top-2 hidden w-[84px] -rotate-12 stroke-brand-navy/35 sm:block"
              strokeWidth="1.6"
            >
              <circle cx="30" cy="30" r="24" />
              <circle cx="30" cy="30" r="18" />
              <path d="M52 20c5-3 9 3 14 0s9-3 14 0M54 30c5-3 9 3 14 0s9-3 14 0M52 40c5-3 9 3 14 0s9-3 14 0" strokeLinecap="round" />
            </svg>
            <span className="relative block rotate-3 border-2 border-dashed border-brand-navy/40 bg-brand-tint p-1.5">
              <img src={ASSETS.common.logo} alt="" className="h-14 w-14 rounded-sm bg-white object-contain" />
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(openMail)} noValidate className="mt-6 space-y-5" aria-label="Đăng ký tư vấn">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="letter-name" className={FIELD_LABEL}>
                Họ tên *
              </label>
              <input
                id="letter-name"
                type="text"
                autoComplete="name"
                placeholder="Ví dụ: Chị Mai"
                aria-invalid={Boolean(errors.fullName)}
                className={FIELD}
                {...register("fullName")}
              />
              {errors.fullName && <p className={ERROR_TEXT}>{errors.fullName.message}</p>}
            </div>
            <div>
              <label htmlFor="letter-phone" className={FIELD_LABEL}>
                Số điện thoại *
              </label>
              <input
                id="letter-phone"
                type="tel"
                autoComplete="tel"
                placeholder="Ví dụ: 0988 123 456"
                aria-invalid={Boolean(errors.phone)}
                className={FIELD}
                {...register("phone")}
              />
              {errors.phone && <p className={ERROR_TEXT}>{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="letter-email" className={FIELD_LABEL}>
              Email
            </label>
            <input
              id="letter-email"
              type="email"
              autoComplete="email"
              placeholder="Không bắt buộc"
              aria-invalid={Boolean(errors.email)}
              className={FIELD}
              {...register("email")}
            />
            {errors.email && <p className={ERROR_TEXT}>{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="letter-subject" className={FIELD_LABEL}>
                Môn học
              </label>
              <select id="letter-subject" className={FIELD} {...register("subject")}>
                {COURSES.map((course) => (
                  <option key={course.id} value={course.subject}>
                    {course.subjectLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="letter-grade" className={FIELD_LABEL}>
                Khối lớp
              </label>
              <select id="letter-grade" className={FIELD} {...register("gradeLevel")}>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="letter-mode" className={FIELD_LABEL}>
                Hình thức học
              </label>
              <select id="letter-mode" className={FIELD} {...register("deliveryMode")}>
                {DELIVERY_MODE_OPTIONS.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="letter-note" className={FIELD_LABEL}>
              Ghi chú
            </label>
            <textarea
              id="letter-note"
              rows={3}
              placeholder="Mục tiêu, lịch rảnh trong tuần…"
              aria-invalid={Boolean(errors.note)}
              className={`${FIELD} h-auto resize-y py-2 leading-relaxed`}
              {...register("note")}
            />
            {errors.note && <p className={ERROR_TEXT}>{errors.note.message}</p>}
          </div>

          <button
            type="submit"
            className={`group !mt-7 flex h-12 w-full items-center justify-between rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
          >
            Gửi thư đăng ký
            <Icon
              name="send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[18px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>

          <p aria-live="polite" className="text-[13px] leading-relaxed text-brand-muted">
            {opened ? (
              <span className="font-semibold text-brand-navy">
                Đã mở ứng dụng thư với nội dung điền sẵn — bấm Gửi trong đó để hoàn tất. Nếu chưa thấy, gửi thẳng tới {CONTACT_EMAIL}.
              </span>
            ) : (
              "Trung tâm sẽ liên hệ lại qua số điện thoại bạn để lại."
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
