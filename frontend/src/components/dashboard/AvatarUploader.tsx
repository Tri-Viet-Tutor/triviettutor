import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FOCUS_RING } from "@/constants/classNames";
import { AVATAR_MAX_BYTES, deleteMyAvatar, uploadMyAvatar } from "@/services/avatarService";
import { useAvatarVersion } from "@/stores/avatarStore";
import { portalErrorMessage } from "@/utils/errors";

/** Ảnh đại diện trong trang Hồ sơ: bấm để chọn ảnh mới (PNG / JPEG ≤ 2 MB), hoặc xóa ảnh */
export function AvatarUploader({ userId, name }: { userId: number; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const bump = useAvatarVersion((state) => state.bump);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      bump();
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (failure) {
      setError(portalErrorMessage(failure, "Chưa cập nhật được ảnh. Chỉ nhận ảnh PNG hoặc JPEG, tối đa 2 MB."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setError("Chỉ nhận ảnh PNG hoặc JPEG.");
    if (file.size > AVATAR_MAX_BYTES) return setError("Ảnh tối đa 2 MB.");
    void run(() => uploadMyAvatar(file));
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label="Đổi ảnh đại diện"
        className={`group relative rounded-full ring-2 ring-white/80 ${FOCUS_RING}`}
      >
        <UserAvatar userId={userId} name={name} size={64} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-navyDeep/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icon name={busy ? "hourglass_top" : "photo_camera"} className="text-[22px]" />
        </span>
      </button>
      <div className="flex gap-2 text-[12px]">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="font-semibold text-white/90 hover:underline">
          Đổi ảnh
        </button>
        <button type="button" onClick={() => void run(deleteMyAvatar)} disabled={busy} className="text-white/70 hover:underline">
          Xóa
        </button>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => pick(event.target.files?.[0])} />
      {error && <p className="max-w-[160px] text-center text-[11.5px] font-semibold text-amber-200">{error}</p>}
    </div>
  );
}
