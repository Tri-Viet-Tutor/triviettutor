import { ROUTES } from "@/constants/routes";
import { LeaveCenter } from "@/features/portal/components/LeaveCenter";
import { teacherOf } from "@/features/portal/data/sessions";
import { useUserId } from "@/features/portal/hooks/usePortalData";

/** Trang Xin nghỉ của gia sư: chỉ xin nghỉ được những buổi mình là người dạy. */
export function TutorLeavePage() {
  const tutorId = useUserId();
  return <LeaveCenter role="tutor" scheduleTo={ROUTES.tutorSessions} isEligible={(session) => teacherOf(session) === tutorId} />;
}
