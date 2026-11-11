import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { Icon } from "@/components/ui/Icon";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Lớp cho khung bọc ngoài (chỉ dùng khi cha cần set width/flex riêng cho khung) */
  wrapperClassName?: string;
}

/**
 * Bọc thẻ <select> gốc: ẩn mũi tên mặc định của trình duyệt (vốn hiển thị khác nhau giữa
 * Chrome/Firefox/Safari và không khớp phong cách icon phẳng của web) rồi thay bằng chung
 * một icon mũi tên — để mọi ô sổ xuống trên toàn trang trông đồng nhất.
 *
 * className truyền vào vẫn quyết định màu/viền/bo góc/chiều cao như dùng cho input bình
 * thường (PORTAL_INPUT / FIELD / AUTH_INPUT…) — component chỉ thêm appearance-none và
 * chừa khoảng trống bên phải cho icon. Forward ref để dùng được với react-hook-form (register()).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", wrapperClassName = "", children, ...rest },
  ref,
) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select ref={ref} {...rest} className={`${className} appearance-none pr-9`}>
        {children}
      </select>
      <Icon
        name="expand_more"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[19px] text-brand-muted"
      />
    </div>
  );
});
