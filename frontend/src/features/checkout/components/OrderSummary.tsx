import { Icon } from "@/components/ui/Icon";
import { cartTotal, type PurchasableCourse } from "@/features/checkout/data/checkout";
import { courseSchedule } from "@/features/pricing/data/pricing";
import { formatVnd } from "@/utils/currency";

interface OrderSummaryProps {
  courses: PurchasableCourse[];
  /** Bỏ một khóa khỏi giỏ; không truyền thì đơn chỉ để xem */
  onRemove?: (subject: string) => void;
}

/** Tóm tắt đơn hàng: từng khóa kèm lịch học, học phí và dòng tổng cộng. */
export function OrderSummary({ courses, onRemove }: OrderSummaryProps) {
  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {courses.map((course) => {
          const schedule = courseSchedule(course);
          return (
            <li key={course.id} className="flex items-center gap-3 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint">
                <Icon name={course.icon} className="text-[21px] text-brand-navy" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight text-brand-ink">{course.name}</span>
                {schedule && (
                  <span className="mt-0.5 block text-[13px] text-brand-ink">
                    {schedule.days} · {schedule.time}
                  </span>
                )}
                <span className="mt-0.5 block text-[13px] text-brand-muted">{formatVnd(course.tuitionFee)} / khóa</span>
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(course.subject)}
                  aria-label={`Bỏ khóa ${course.name} khỏi giỏ`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <Icon name="delete" className="text-[19px]" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="flex items-baseline justify-between border-t border-slate-300 pt-4">
        <span className="text-[14.5px] font-medium text-brand-muted">Tổng cộng</span>
        <span className="text-[24px] font-bold tracking-tight text-brand-navy">{formatVnd(cartTotal(courses))}</span>
      </p>
    </div>
  );
}
