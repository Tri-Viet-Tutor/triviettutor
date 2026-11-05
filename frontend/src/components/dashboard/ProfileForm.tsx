import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthField } from "@/components/auth/AuthField";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL } from "@/constants/classNames";
import { portalKeys, useUserId } from "@/hooks/usePortalData";
import type { MeResponse, UpdateMeRequest } from "@/interfaces/api";
import { updateMe } from "@/services/portalService";
import { useAuthStore } from "@/stores/authStore";
import { portalErrorMessage } from "@/utils/errors";
import type { ProfileFormProps, ProfileFormValues } from "@/interfaces/portal";

/** Giới hạn theo UpdateMeRequest của backend: họ tên bắt buộc ≤ 100 ký tự, điện thoại ≤ 20 ký tự */
const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Hãy nhập họ tên").max(100, "Họ tên tối đa 100 ký tự"),
  phone: z
    .string()
    .trim()
    .max(20, "Số điện thoại tối đa 20 ký tự")
    .regex(/^[0-9+().\s-]*$/, "Số điện thoại chỉ gồm chữ số và các dấu + ( ) - ."),
  address: z.string().trim().max(255, "Địa chỉ tối đa 255 ký tự"),
  bio: z.string().trim().max(2000, "Phần giới thiệu tối đa 2000 ký tự"),
});

/** Đổi hồ sơ từ máy chủ sang giá trị form (null → chuỗi rỗng) */
function toValues(me: MeResponse): ProfileFormValues {
  return { fullName: me.fullName, phone: me.profile?.phone ?? "", address: me.profile?.address ?? "", bio: me.profile?.bio ?? "" };
}

/**
 * Form sửa hồ sơ của tôi (PUT /me). Email không đổi được.
 * Mỗi vai trò chỉ được sửa các trường của mình — gửi trường của vai trò khác backend sẽ từ chối:
 * học viên: điện thoại, địa chỉ - gia sư: giới thiệu bản thân - quản trị: chỉ họ tên.
 */
export function ProfileForm({ me }: ProfileFormProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const isStudent = me.role === "ROLE_STUDENT";
  const isTutor = me.role === "ROLE_TUTOR";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: toValues(me) });

  const save = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(portalKeys.me(userId), updated);
      reset(toValues(updated));
      // Tên trên thanh trên lấy từ phiên đăng nhập — cập nhật theo, giữ nguyên token
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.setState({ user: { ...current, fullName: updated.fullName } });
    },
  });

  /** Chỉ gửi những trường vai trò này được phép sửa */
  function onSubmit(values: ProfileFormValues) {
    const request: UpdateMeRequest = { fullName: values.fullName };
    if (isStudent) {
      request.phone = values.phone;
      request.address = values.address;
    }
    if (isTutor) request.bio = values.bio;
    save.mutate(request);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <AuthField id="profile-name" label="Họ tên" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <AuthField id="profile-email" label="Email đăng nhập" type="email" value={me.email} readOnly disabled />
      {isStudent && (
        <>
          <AuthField
            id="profile-phone"
            label="Số điện thoại"
            type="tel"
            autoComplete="tel"
            placeholder="Để trung tâm liên hệ khi cần"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <AuthField
            id="profile-address"
            label="Địa chỉ"
            autoComplete="street-address"
            error={errors.address?.message}
            {...register("address")}
          />
        </>
      )}
      {isTutor && (
        <div>
          <label htmlFor="profile-bio" className={`mb-1.5 ${AUTH_LABEL}`}>
            Giới thiệu bản thân
          </label>
          <textarea
            id="profile-bio"
            rows={5}
            placeholder="Kinh nghiệm giảng dạy, môn dạy, bằng cấp…"
            aria-invalid={Boolean(errors.bio)}
            className={`${AUTH_INPUT} h-auto resize-y py-2.5 leading-relaxed`}
            {...register("bio")}
          />
          {errors.bio && <p className={AUTH_ERROR}>{errors.bio.message}</p>}
        </div>
      )}

      {save.isSuccess && !isDirty && <AuthNotice tone="success">Đã lưu hồ sơ.</AuthNotice>}
      {save.error && <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được hồ sơ. Vui lòng thử lại.")}</AuthNotice>}

      <div className="pt-1 sm:max-w-[220px]">
        <AuthSubmitButton label="Lưu thay đổi" pendingLabel="Đang lưu…" isPending={save.isPending} disabled={!isDirty} />
      </div>
    </form>
  );
}
