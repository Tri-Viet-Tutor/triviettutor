interface AuthHeadingProps {
  title: string;
  description?: string;
}

/** Tiêu đề của một trang xác thực, căn giữa dưới logo: tên trang và một dòng hướng dẫn. */
export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-brand-navy">{title}</h1>
      {description && <p className="mt-1.5 text-[14.5px] leading-relaxed text-brand-muted">{description}</p>}
    </div>
  );
}
