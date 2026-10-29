import { useSearchParams } from "react-router-dom";
import { AssignmentPanel } from "@/components/admin/AssignmentPanel";
import { ClassPicker } from "@/components/admin/ClassPicker";
import { useUserDirectory } from "@/hooks/useAdminData";
import { useAssignableClasses } from "@/hooks/useAssignableClasses";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { startOfToday, toIsoDate } from "@/utils/date";

/**
 * Trang Phân công gia sư: chọn một lớp rồi phân công hoặc đổi gia sư chính (xem AssignmentPanel).
 * Danh sách gồm các lớp còn phân công được (GET /admin/classes) có buổi học từ hôm nay trở đi
 * (GET /admin/sessions); lớp khác thì nhập mã lớp. Lớp đang chọn nằm ở ?lop=<mã lớp>.
 */
export function AdminAssignmentsPage() {
  const [params, setParams] = useSearchParams();
  // Lớp đang chọn nằm ở ?lop=<mã lớp>
  const selectedId = Number(params.get("lop")) || null;
  const { nameOf } = useUserDirectory();
  const classesQuery = useAssignableClasses(toIsoDate(startOfToday()));
  const classes = classesQuery.classes;
  const selected = classes.find((item) => item.classId === selectedId);

  return (
    <>
      <PortalPageHeader icon="assignment_ind" title="Phân công gia sư" description="Chọn một lớp để xem gia sư phù hợp và phân công." />

      {classesQuery.isPending ? (
        <PortalLoading label="Đang tải các lớp" />
      ) : classesQuery.isError ? (
        <PortalError message="Không tải được các lớp." onRetry={classesQuery.refetch} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-7 lg:grid-cols-12">
          <section aria-labelledby="class-list-title" className="lg:col-span-5">
            <h2 id="class-list-title" className="mb-3 text-[18px] font-bold text-brand-navy">
              Lớp học
            </h2>
            <ClassPicker
              classes={classes}
              selectedId={selectedId}
              nameOf={nameOf}
              onSelect={(classId) => setParams({ lop: String(classId) })}
            />
          </section>

          <section aria-labelledby="tutor-list-title" className="lg:col-span-7">
            <h2 id="tutor-list-title" className="mb-3 text-[18px] font-bold text-brand-navy">
              {selectedId === null ? "Gia sư gợi ý" : `Gia sư gợi ý cho lớp #${selectedId}`}
            </h2>
            {selectedId === null ? (
              <PortalEmpty icon="assignment_ind" title="Chưa chọn lớp" description="Chọn một lớp trong danh sách, hoặc nhập mã lớp." />
            ) : (
              // key: đổi lớp thì bỏ trạng thái (thông báo, form lý do) của lớp trước
              <AssignmentPanel key={selectedId} classId={selectedId} currentTutorId={selected?.tutorId ?? null} />
            )}
          </section>
        </div>
      )}
    </>
  );
}
