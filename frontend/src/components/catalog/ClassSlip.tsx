import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { CLASS_SIZE, SESSION_MINUTES } from "@/constants/classOptions";
import { ROUTES } from "@/constants/routes";
import { formatVnd } from "@/utils/currency";
import type { ClassSlipProps } from "@/interfaces/catalog";

/** Phiếu tóm tắt lớp vừa chọn: mép trên răng cưa như phiếu xé, cập nhật theo từng lựa chọn. */
export function ClassSlip({ course, grade, deliveryMode, schedulePattern, timeSlot }: ClassSlipProps) {
  // Các dòng của phiếu: nhãn bên trái, giá trị bên phải
  const rows = [
    { label: "Khóa học", value: `${course.name} · ${grade.label}` },
    { label: "Sĩ số", value: `${CLASS_SIZE.min} – ${CLASS_SIZE.max} học viên mỗi lớp` },
    { label: "Hình thức", value: deliveryMode.label },
    { label: "Lịch học", value: schedulePattern.label },
    { label: "Ca học", value: `${timeSlot.hint} · ${SESSION_MINUTES} phút mỗi buổi` },
    // Chỉ thêm dòng học phí khi khóa đã có mức phí
    ...(course.tuitionFee !== undefined ? [{ label: "Học phí", value: `${formatVnd(course.tuitionFee)} / khóa` }] : []),
  ];

  return (
    // Bóng đổ đặt ở lớp ngoài vì lớp trong bị cắt mép răng cưa
    <div className="rotate-[0.6deg] drop-shadow-[0_18px_22px_rgba(8,42,102,0.22)]">
      <div className="bg-[#FFFDF7] px-6 pb-7 pt-9 [mask-image:radial-gradient(circle_at_10px_0,transparent_6px,black_6.5px)] [mask-size:20px_100%] sm:px-8 sm:pt-10">
        <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-brand-navy/25 pb-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-muted">Tri Viet Tutor</p>
            <h2 className="mt-1 text-[22px] font-extrabold leading-snug text-brand-navy">Phiếu chọn lớp</h2>
          </div>
          {/* Con dấu */}
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 -rotate-12 items-center justify-center rounded-full border-2 border-dashed border-brand-orangeHover text-brand-orangeHover"
          >
            <Icon name="assignment_turned_in" className="text-[26px]" />
          </span>
        </div>

        <dl aria-live="polite" className="divide-y divide-dashed divide-brand-navy/15">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[88px,1fr] gap-3 py-3">
              <dt className="text-[13px] font-semibold text-brand-muted">{row.label}</dt>
              {/* key đổi theo giá trị để dòng vừa đổi nháy nhẹ một lần */}
              <dd key={row.value} className="diary-flip text-[15px] font-bold leading-snug text-brand-navy">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-2 border-t-2 border-dashed border-brand-navy/25 pt-4">
          <p className="text-[13px] font-semibold text-brand-muted">Gia sư đứng lớp môn {course.subjectLabel}</p>
          <ul key={course.id} className="diary-flip mt-2.5 space-y-2">
            {course.tutors.map((tutor) => (
              <li key={tutor.name} className="flex items-center gap-2.5 text-[14.5px] font-semibold text-brand-ink">
                <img src={tutor.image} alt="" className="h-9 w-9 rounded-full bg-brand-tint object-cover object-top ring-2 ring-white" />
                {tutor.name}
              </li>
            ))}
          </ul>
        </div>

        <Link
          to={ROUTES.contactForm}
          className={`group mt-6 flex h-12 w-full items-center justify-between rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
        >
          Đăng ký tư vấn lớp này
          <Icon
            name="arrow_forward"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[19px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        <p className="mt-3 text-[12.5px] leading-relaxed text-brand-muted">
          {course.tuitionFee === undefined ? "Học phí, ngày" : "Ngày"} khai giảng và số chỗ còn lại do trung tâm xác nhận khi tư vấn.
        </p>
      </div>
    </div>
  );
}
