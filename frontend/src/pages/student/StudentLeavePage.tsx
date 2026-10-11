import { ROUTES } from "@/constants/routes";
import { LeaveCenter } from "@/features/portal/components/LeaveCenter";

/** Trang Xin nghỉ của học viên. */
export function StudentLeavePage() {
  return <LeaveCenter role="student" scheduleTo={ROUTES.studentSchedule} />;
}
