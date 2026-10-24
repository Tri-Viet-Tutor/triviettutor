import { useQuery } from "@tanstack/react-query";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { useUserId } from "@/hooks/usePortalData";
import { fetchAvailability } from "@/services/tutorService";
import { AvailabilityEditor } from "@/components/tutor/AvailabilityEditor";

/** Trang Lịch rảnh của gia sư: khai các khung giờ dạy được (GET / PUT /tutor/availability). */
export function TutorAvailabilityPage() {
  const userId = useUserId();
  // Khóa cache gắn với mã gia sư để đổi tài khoản không thấy lịch của người trước
  const queryKey = ["tutor", userId, "availability"] as const;
  const query = useQuery({ queryKey, queryFn: fetchAvailability });

  return (
    <>
      <PortalPageHeader icon="event_available" title="Lịch rảnh" description="Trung tâm dựa vào lịch này để gợi ý khi phân công lớp." />
      {query.isPending ? (
        <PortalLoading label="Đang tải lịch rảnh" />
      ) : query.isError ? (
        <PortalError message="Không tải được lịch rảnh." onRetry={() => void query.refetch()} />
      ) : (
        <AvailabilityEditor saved={query.data} queryKey={queryKey} />
      )}
    </>
  );
}
