import { type Tutor } from "@/features/home/data/tutors";

interface TutorCardProps {
  tutor: Tutor;
  index: number;
}

/* Mỗi ảnh nghiêng một chút như ảnh dán trên tờ quảng cáo */
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-1", "rotate-1"];

/** Ảnh gia sư viền trắng dán trên tấm quảng cáo, tên và môn nằm ở chân ảnh */
export function TutorCard({ tutor, index }: TutorCardProps) {
  return (
    <li className={`group ${index % 3 === 1 ? "sm:translate-y-6" : ""}`}>
      <figure
        className={`relative overflow-hidden rounded-[20px] border-[5px] border-white bg-white shadow-[0_14px_24px_-12px_rgba(8,42,102,0.6)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-0 motion-reduce:transition-none ${TILTS[index % TILTS.length]}`}
      >
        <img
          src={tutor.image}
          alt={tutor.alt}
          loading="lazy"
          className="aspect-[4/5] w-full bg-brand-tint object-cover object-top"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navyDeep via-brand-navyDeep/85 to-transparent px-3 pb-2.5 pt-10 text-white">
          <span className="block text-[13px] font-bold leading-snug xl:text-[14px]">{tutor.name}</span>
          <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-brand-orange xl:text-[12px]">{tutor.role}</span>
        </figcaption>
      </figure>
    </li>
  );
}
