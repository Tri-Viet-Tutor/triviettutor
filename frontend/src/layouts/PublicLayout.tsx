import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased">
      <PublicHeader />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
}
