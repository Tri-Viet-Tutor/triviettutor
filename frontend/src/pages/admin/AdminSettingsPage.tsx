import { AssistantSettingsCard } from "@/components/admin/AssistantSettingsCard";
import { AttendanceSettingsCard } from "@/components/admin/AttendanceSettingsCard";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";

/** Trang Cài đặt hệ thống của quản trị viên: các thiết lập đổi được khi đang chạy, không cần triển khai lại. */
export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon="settings"
        title="Cài đặt hệ thống"
        description="Các thiết lập có hiệu lực ngay, không cần khởi động lại máy chủ."
      />
      <AttendanceSettingsCard />
      <AssistantSettingsCard />
    </div>
  );
}
