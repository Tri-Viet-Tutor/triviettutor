import { ROUTES } from "@/constants/routes";
import { LeaveCenter } from "@/components/dashboard/LeaveCenter";

/** Trang Xin nghỉ của học viên. */
export function StudentLeavePage() {
  return <LeaveCenter role="student" scheduleTo={ROUTES.studentSchedule} />;
}
