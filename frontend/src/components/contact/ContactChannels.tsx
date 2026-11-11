import { Icon } from "@/components/ui/Icon";
import { CONTACT_CHANNELS } from "@/constants/contact";

// Các cách liên hệ trung tâm: email, điện thoại, địa chỉ — mỗi cách một hàng, không đóng khung.
export function ContactChannels() {
  return (
    <ul className="divide-y divide-dashed divide-brand-navy/25">
      {CONTACT_CHANNELS.map((channel) => (
        <li key={channel.label} className="flex items-center gap-4 py-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy">
            <Icon name={channel.icon} className="text-[24px] text-brand-marker" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold uppercase tracking-[0.06em] text-brand-muted">{channel.label}</span>
            {channel.lines.map((line) =>
              line.href ? (
                <a
                  key={line.text}
                  href={line.href}
                  className="mt-0.5 block break-words text-[17px] font-bold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy lg:text-[18px]"
                >
                  {line.text}
                </a>
              ) : (
                <span key={line.text} className="mt-0.5 block text-[16px] font-semibold leading-snug text-brand-ink">
                  {line.text}
                </span>
              ),
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
