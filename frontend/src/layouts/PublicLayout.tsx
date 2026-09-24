import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <div className="flex-1 pt-24">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
