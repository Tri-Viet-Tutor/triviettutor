import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthField } from "@/components/auth/AuthField";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/constants/auth";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { createTutor, updateTutorProfile } from "@/services/admin";
import { portalErrorMessage } from "@/utils/errors";
import type {
  CompensationFieldsProps,
  CreateTutorFormProps,
  CreateTutorFormValues,
  TutorProfileFormProps,
  TutorProfileFormValues,
} from "@/interfaces/admin";

/** Ô tiền: số nguyên không âm (theo CreateTutorRequest / UpdateTutorProfileRequest của backend) */
const money = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Hãy nhập ${label}`)
    .regex(/^\d{1,15}$/, `${label[0].toUpperCase()}${label.slice(1)} là số nguyên không âm`);

/** Các trường hồ sơ dùng chung cho form tạo gia sư và form sửa hồ sơ */
const profileFields = {
  baseSalary: money("lương cơ bản"),
  sessionRate: money("thù lao mỗi buổi"),
  bio: z.string().trim().max(2000, "Phần giới thiệu tối đa 2000 ký tự"),
};

/** Kiểm tra form tạo gia sư (giới hạn giống backend) */
const createSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
  email: z.string().trim().email("Email chưa đúng"),
  password: z
    .string()
    .min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`)
    .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
  ...profileFields,
});

const profileSchema = z.object(profileFields);

/** Ba ô chung của hai form: lương cơ bản, thù lao mỗi buổi, giới thiệu. */
function CompensationFields({ idPrefix, register, errors }: CompensationFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AuthField
          id={`${idPrefix}-salary`}
          label="Lương cơ bản mỗi tháng (VNĐ)"
          inputMode="numeric"
          placeholder="5000000"
          error={errors.baseSalary?.message}
          {...register("baseSalary")}
        />
        <AuthField
          id={`${idPrefix}-rate`}
          label="Thù lao mỗi buổi (VNĐ)"
          inputMode="numeric"
          placeholder="250000"
          error={errors.sessionRate?.message}
          {...register("sessionRate")}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-bio`} className={`mb-1.5 ${AUTH_LABEL}`}>
          Giới thiệu (không bắt buộc)
        </label>
        <textarea id={`${idPrefix}-bio`} rows={3} className={`${AUTH_INPUT} h-auto resize-y py-2.5 leading-relaxed`} {...register("bio")} />
        {errors.bio && <p className={AUTH_ERROR}>{errors.bio.message}</p>}
      </div>
    </>
  );
}

/** Form tạo tài khoản gia sư (POST /admin/users/tutors): tài khoản dùng được ngay, không cần mã OTP. */
export function CreateTutorForm({ onClose }: CreateTutorFormProps) {
  const refresh = useRefreshAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTutorFormValues>({ resolver: zodResolver(createSchema), defaultValues: { bio: "" } });
  const create = useMutation({
    mutationFn: createTutor,
    onSuccess: () => {
      reset();
      void refresh();
    },
  });

  /** Đổi chuỗi tiền sang số; giới thiệu để trống thì không gửi */
  function onSubmit(values: CreateTutorFormValues) {
    create.mutate({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      baseSalary: Number(values.baseSalary),
      sessionRate: Number(values.sessionRate),
      ...(values.bio ? { bio: values.bio } : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={`space-y-4 p-5 sm:p-6 ${PORTAL_CARD}`}>
      <h2 className="text-[18px] font-bold text-brand-navy">Thêm gia sư</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AuthField id="tutor-name" label="Họ tên" autoComplete="off" error={errors.fullName?.message} {...register("fullName")} />
        <AuthField
          id="tutor-email"
          label="Email đăng nhập"
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>
      <AuthField
        id="tutor-password"
        label="Mật khẩu ban đầu"
        type="password"
        autoComplete="new-password"
        placeholder={`Ít nhất ${PASSWORD_MIN} ký tự`}
        error={errors.password?.message}
        {...register("password")}
      />
      {/* Ba ô chung dùng lại kiểu của form hồ sơ — hai form cùng tên trường nên ép kiểu an toàn */}
      <CompensationFields idPrefix="tutor-new" register={register as unknown as CompensationFieldsProps["register"]} errors={errors} />

      {create.isSuccess && <AuthNotice tone="success">Đã tạo tài khoản gia sư {create.data.fullName}.</AuthNotice>}
      {create.error && (
        <AuthNotice tone="error">{portalErrorMessage(create.error, "Chưa tạo được tài khoản. Vui lòng thử lại.")}</AuthNotice>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={create.isPending} className={PORTAL_BTN_PRIMARY}>
          {create.isPending ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
        <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
          Đóng
        </button>
      </div>
    </form>
  );
}

/**
 * Form sửa hồ sơ một gia sư (PUT /admin/users/{id}/tutor-profile).
 * Backend chưa có API đọc hồ sơ của người khác nên form không điền sẵn được số cũ: phải nhập lại cả hai số tiền.
 */
export function TutorProfileForm({ tutor, onClose }: TutorProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TutorProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { bio: "" } });
  const save = useMutation({
    mutationFn: (values: TutorProfileFormValues) =>
      updateTutorProfile(tutor.id, {
        baseSalary: Number(values.baseSalary),
        sessionRate: Number(values.sessionRate),
        ...(values.bio ? { bio: values.bio } : {}),
      }),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="space-y-4 border-t border-brand-sandLine bg-brand-sand/60/70 px-4 py-4 sm:px-5"
    >
      <p className="text-[14px] leading-relaxed text-brand-muted">
        Nhập lại lương cơ bản và thù lao mỗi buổi của {tutor.fullName}. Để trống phần giới thiệu thì giữ nguyên nội dung cũ.
      </p>
      <CompensationFields idPrefix={`tutor-${tutor.id}`} register={register} errors={errors} />
      {save.isSuccess && <AuthNotice tone="success">Đã lưu hồ sơ gia sư.</AuthNotice>}
      {save.error && <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được hồ sơ. Vui lòng thử lại.")}</AuthNotice>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
          {save.isPending ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
        <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
          Đóng
        </button>
      </div>
    </form>
  );
}
