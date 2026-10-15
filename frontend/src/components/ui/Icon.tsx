import type { IconProps } from "@/interfaces/ui";

/** Biểu tượng Material Symbols (phông biểu tượng nạp trong index.html). */
export function Icon({ name, className = "" }: IconProps) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}
