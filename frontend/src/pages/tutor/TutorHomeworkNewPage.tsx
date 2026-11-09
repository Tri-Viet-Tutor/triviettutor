import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { HomeworkEditor } from "@/components/homework/HomeworkEditor";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { homeworkKeys } from "@/hooks/useHomeworkData";
import { useUserId } from "@/hooks/usePortalData";

/** Tạo bài tập mới (bản nháp). Mở kèm ?buoi=<mã buổi> thì buổi đó được chọn sẵn. */
export function TutorHomeworkNewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const initialSessionId = Number(params.get("buoi")) || undefined;

  return (
    <>
      <PortalPageHeader
        icon="assignment_add"
        title="Tạo bài tập"
        description="Bài được lưu dưới dạng bản nháp. Kiểm tra lại rồi bấm Công bố để học viên của lớp thấy và vào làm."
      />
      <HomeworkEditor
        initialSessionId={initialSessionId}
        onCancel={() => navigate(ROUTES.tutorHomeworks)}
        onSaved={(homework) => {
          void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) });
          navigate(homeworkPath(homework.id, "tutor"));
        }}
      />
    </>
  );
}
