interface AuthSubmitButtonProps {
  id?: string;
  label: string;
  /** Chữ hiện trong lúc đang gửi */
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
}

/** Nút gửi của các form xác thực: thanh xanh mảnh, bo góc nhẹ. */
export function AuthSubmitButton({ id, label, pendingLabel, isPending, disabled = false }: AuthSubmitButtonProps) {
  return (
    <button
      id={id}
      type="submit"
      disabled={isPending || disabled}
      className="flex h-11 w-full items-center justify-center rounded-md bg-brand-navy text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-navy"
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
