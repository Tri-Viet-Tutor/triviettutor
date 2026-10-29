import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AUTH_LABEL, PORTAL_INPUT } from "@/constants/classNames";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { portalKeys, useUserId } from "@/hooks/usePortalData";
import { changeActualTutor } from "@/services/admin";
import { teacherOf } from "@/utils/sessions";
import type { AdminActualTutorFormProps } from "@/interfaces/admin";

/**
 * Đổi gia sư thực dạy của buổi đã bắt đầu (vd. gia sư được phân công vắng, gia sư khác dạy thay).
 * Backend kiểm tra trùng lịch, bỏ xác nhận đã dạy cũ để gia sư thực dạy xác nhận lại, và ghi nhật ký.
 */
export function AdminActualTutorForm({ session, tutors, onDone }: AdminActualTutorFormProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const refresh = useRefreshAdmin();
  const [tutorId, setTutorId] = useState("");
  const current = teacherOf(session);
  const options = tutors.filter((tutor) => tutor.id !== current);

  const change = useMutation({
    mutationFn: (reason: string) => changeActualTutor(session.sessionId, { tutorId: Number(tutorId), reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalKeys.attendance(userId, session.sessionId) });
      void refresh();
      onDone();
    },
  });

  return (
    <ReasonForm
      id={`actual-tutor-reason-${session.sessionId}`}
      label="Lý do đổi gia sư thực dạy"
      submitLabel="Đổi gia sư thực dạy"
      isPending={change.isPending}
      error={change.error}
      errorFallback="Chưa đổi được gia sư thực dạy. Vui lòng thử lại."
      canSubmit={tutorId !== ""}
      onSubmit={(reason) => change.mutate(reason)}
      onCancel={onDone}
    >
      <div>
        <label htmlFor={`actual-tutor-${session.sessionId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
          Gia sư thực dạy
        </label>
        <select
          id={`actual-tutor-${session.sessionId}`}
          required
          value={tutorId}
          onChange={(event) => setTutorId(event.target.value)}
          className={PORTAL_INPUT}
        >
          <option value="">Chọn gia sư</option>
          {options.map((tutor) => (
            <option key={tutor.id} value={tutor.id}>
              {tutor.fullName} (#{tutor.id})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[13px] text-brand-muted">
          Xác nhận đã dạy của gia sư cũ sẽ bị bỏ; gia sư thực dạy cần xác nhận lại trong 24 giờ sau buổi học (quá hạn thì quản trị mở khóa
          và xác nhận thay).
        </p>
      </div>
    </ReasonForm>
  );
}
