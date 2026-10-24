import { ROUTES } from "@/constants/routes";
import { LeaveCenter } from "@/components/dashboard/LeaveCenter";
import { teacherOf } from "@/utils/sessions";
import { useUserId } from "@/hooks/usePortalData";

/** Trang Xin nghỉ của gia sư: chỉ xin nghỉ được những buổi mình là người dạy. */
export function TutorLeavePage() {
  const tutorId = useUserId();
  return <LeaveCenter role="tutor" scheduleTo={ROUTES.tutorSessions} isEligible={(session) => teacherOf(session) === tutorId} />;
}
