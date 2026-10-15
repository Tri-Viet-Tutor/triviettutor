import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { adminKeys, useRefreshAdmin } from "@/hooks/useAdminData";
import { assignTutor, fetchAvailableTutors, reassignTutor } from "@/services/admin";
import { formatDate, parseIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AssignmentPanelProps } from "@/interfaces/admin";

/**
 * Gia sư gợi ý cho một lớp (GET /admin/classes/{id}/available-tutors) và nút phân công:
 * lớp chưa có gia sư thì "Phân công" (POST …/assign), đã có thì "Đổi sang gia sư này" kèm lý do (PUT …/reassign).
 * Backend xếp người không trùng lịch lên trước; lịch rảnh gia sư tự khai chỉ để tham khảo.
 */
export function AssignmentPanel({ classId, currentTutorId }: AssignmentPanelProps) {
  const refresh = useRefreshAdmin();
  const query = useQuery({ queryKey: adminKeys.availableTutors(classId), queryFn: () => fetchAvailableTutors(classId), retry: false });
  // Mã gia sư đang mở form đổi (cần lý do)
  const [reassigning, setReassigning] = useState<number | null>(null);
  // Tên gia sư vừa phân công xong, để hiện thông báo thành công
  const [doneName, setDoneName] = useState("");

  /** Phân công xong: báo thành công, đóng form, tải lại dữ liệu */
  const finish = (name: string) => {
    setDoneName(name);
    setReassigning(null);
    void refresh();
  };
  const assign = useMutation({
    mutationFn: (tutorId: number) => assignTutor(classId, tutorId),
    onSuccess: (result) => finish(result.tutorName),
  });
  const reassign = useMutation({
    mutationFn: ({ tutorId, reason }: { tutorId: number; reason: string }) => reassignTutor(classId, tutorId, reason),
    onSuccess: (result) => finish(result.tutorName),
  });

  if (query.isPending) return <PortalLoading label="Đang tải gia sư gợi ý" />;
  if (query.isError) {
    return (
      <PortalError
        message={portalErrorMessage(query.error, "Không tải được gia sư gợi ý cho lớp này.")}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data.length === 0)
    return <PortalEmpty icon="person_search" title="Chưa có gia sư nào" description="Thêm tài khoản gia sư ở trang Người dùng trước." />;

  return (
    <div className="space-y-3">
      {doneName && (
        <AuthNotice tone="success">
          Đã phân công {doneName} dạy lớp #{classId}.
        </AuthNotice>
      )}
      {assign.error && <AuthNotice tone="error">{portalErrorMessage(assign.error, "Chưa phân công được. Vui lòng thử lại.")}</AuthNotice>}

      <ul className="space-y-2.5">
        {query.data.map((tutor) => {
          const isCurrent = tutor.tutorId === currentTutorId;
          return (
            <li key={tutor.tutorId} className={`p-4 ${PORTAL_CARD} ${isCurrent ? "border-brand-navy/50" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-brand-ink">
                    {tutor.tutorName} <span className="font-normal text-brand-muted">#{tutor.tutorId}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {isCurrent && <StatusChip tone="navy">Đang dạy lớp này</StatusChip>}
                    {tutor.available ? (
                      <StatusChip tone="green" icon="check_circle">
                        Không trùng lịch
                      </StatusChip>
                    ) : (
                      <StatusChip tone="red" icon="cancel">
                        Trùng {tutor.conflicts.length} buổi
                      </StatusChip>
                    )}
                    <StatusChip tone={tutor.declaredAvailabilityCovered ? "green" : "slate"}>
                      {tutor.declaredAvailabilityCovered ? "Lịch rảnh đã khai phủ đủ" : "Lịch rảnh đã khai chưa phủ đủ"}
                    </StatusChip>
                  </div>
                </div>
                {!isCurrent &&
                  reassigning !== tutor.tutorId &&
                  (currentTutorId === null ? (
                    <button
                      type="button"
                      disabled={assign.isPending}
                      onClick={() => assign.mutate(tutor.tutorId)}
                      className={PORTAL_BTN_PRIMARY}
                    >
                      Phân công
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        reassign.reset();
                        setReassigning(tutor.tutorId);
                      }}
                      className={PORTAL_BTN_SECONDARY}
                    >
                      Đổi sang gia sư này
                    </button>
                  ))}
              </div>

              {/* Liệt kê tối đa 3 buổi trùng lịch */}
              {tutor.conflicts.length > 0 && (
                <ul className="mt-3 space-y-1 text-[13.5px] text-brand-muted">
                  {tutor.conflicts.slice(0, 3).map((conflict) => (
                    <li key={`${conflict.requestedSessionId}-${conflict.conflictSessionId}`} className="flex items-center gap-1.5">
                      <Icon name="event_busy" className="text-[16px] text-red-500" />
                      Trùng ngày {formatDate(parseIsoDate(conflict.date))}, {conflict.startTime.slice(0, 5)} –{" "}
                      {conflict.endTime.slice(0, 5)} (lớp #{conflict.conflictClassGroupId})
                    </li>
                  ))}
                  {tutor.conflicts.length > 3 && <li>và {tutor.conflicts.length - 3} buổi khác</li>}
                </ul>
              )}

              {reassigning === tutor.tutorId && (
                <div className="mt-3">
                  <ReasonForm
                    id={`reassign-${classId}-${tutor.tutorId}`}
                    label="Lý do đổi gia sư"
                    submitLabel={`Đổi sang ${tutor.tutorName}`}
                    isPending={reassign.isPending}
                    error={reassign.error}
                    errorFallback="Chưa đổi được gia sư. Vui lòng thử lại."
                    onSubmit={(reason) => reassign.mutate({ tutorId: tutor.tutorId, reason })}
                    onCancel={() => setReassigning(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
