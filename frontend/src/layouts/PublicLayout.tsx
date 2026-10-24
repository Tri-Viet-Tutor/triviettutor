import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

/** Khung của các trang công khai: menu trên cùng, nội dung trang, chân trang. */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased">
      <PublicHeader />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
