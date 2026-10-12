import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { AUTH_INPUT, AUTH_LABEL, AuthField } from "@/features/auth/components/AuthField";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { type AuthLocationState } from "@/features/auth/data/pendingEmail";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS } from "@/features/catalog/data/classOptions";
import { type CustomerInfo } from "@/features/checkout/data/checkout";

const customerSchema = z.object({
  // Cùng giới hạn với RegisterRequest của backend, vì sau khi thanh toán sẽ dùng để tạo tài khoản
  fullName: z.string().trim().min(2, "Họ tên có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
  email: z.string().trim().email("Email chưa đúng"),
});

type CustomerValues = z.infer<typeof customerSchema>;

const TEXT_LINK =
  "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

interface CheckoutCustomerFormProps {
  /** Học viên đang đăng nhập: họ tên và email lấy từ tài khoản, không phải điền */
  account?: { fullName: string; email: string };
  /** Thông tin đã điền (khi quay lại sửa) */
  initial?: CustomerInfo | null;
  onSubmit: (customer: CustomerInfo) => void;
}

/**
 * Bước 1 của thanh toán: thông tin học viên (họ tên, email, khối lớp, hình thức học).
 * Chưa tạo tài khoản và chưa gọi máy chủ ở bước này — tài khoản chỉ được tạo sau khi thanh toán xong.
 * Thông tin không được lưu lại: rời trang thanh toán là phải điền lại.
 */
export function CheckoutCustomerForm({ account, initial, onSubmit }: CheckoutCustomerFormProps) {
  const [gradeLevel, setGradeLevel] = useState(initial?.gradeLevel ?? GRADE_OPTIONS[0].value);
  const [deliveryMode, setDeliveryMode] = useState(initial?.deliveryMode ?? DELIVERY_MODE_OPTIONS[0].value);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { fullName: account?.fullName ?? initial?.fullName ?? "", email: account?.email ?? initial?.email ?? "" },
  });

  function submit(values: CustomerValues) {
    onSubmit({ fullName: values.fullName.trim(), email: values.email.trim(), gradeLevel, deliveryMode });
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={
        account
          ? (event) => {
              event.preventDefault();
              submit(account);
            }
          : handleSubmit(submit)
      }
    >
      {account ? (
        <p className="flex items-center gap-2 rounded-md bg-brand-tint px-3 py-2.5 text-[14px] text-brand-navyDeep">
          <Icon name="account_circle" className="text-[19px] text-brand-navy" />
          <span className="min-w-0 break-all">
            Tài khoản học viên: <strong className="font-semibold">{account.email}</strong>
          </span>
        </p>
      ) : (
        <>
          <AuthField
            id="checkout-name"
            label="Họ tên học viên"
            autoComplete="name"
            placeholder="Nguyễn Văn An"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <AuthField
            id="checkout-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="checkout-grade" className={`mb-1.5 ${AUTH_LABEL}`}>
            Khối lớp
          </label>
          <select
            id="checkout-grade"
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value as typeof gradeLevel)}
            className={AUTH_INPUT}
          >
            {GRADE_OPTIONS.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="checkout-mode" className={`mb-1.5 ${AUTH_LABEL}`}>
            Hình thức học
          </label>
          <select
            id="checkout-mode"
            value={deliveryMode}
            onChange={(event) => setDeliveryMode(event.target.value as typeof deliveryMode)}
            className={AUTH_INPUT}
          >
            {DELIVERY_MODE_OPTIONS.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2">
        <AuthSubmitButton label="Tiếp tục thanh toán" pendingLabel="Tiếp tục thanh toán" isPending={false} />
      </div>

      {!account && (
        <p className="text-center text-[14px] text-brand-muted">
          Đã có tài khoản?{" "}
          <Link to={ROUTES.login} state={{ resumeCheckout: true } satisfies AuthLocationState} className={TEXT_LINK}>
            Đăng nhập
          </Link>
        </p>
      )}
    </form>
  );
}
