
type GoogleAccountSectionProps = {
    googleLinked: boolean;
    googleEmail?: string | null;
    onLink: () => void;
    onUnlink: () => void;
    isLinking?: boolean;
    isUnlinking?: boolean;
};

export function GoogleAccountSection({
                                         googleLinked,
                                         googleEmail,
                                         onLink,
                                         onUnlink,
                                         isLinking = false,
                                         isUnlinking = false,
                                     }: GoogleAccountSectionProps) {
    return (
        <section className="mt-6 rounded-xl border border-brand-sandLine p-4">
            <h3 className="font-semibold text-brand-navy">
                Tài khoản liên kết
            </h3>

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <img
                            src="https://www.gstatic.com/images/branding/product/1x/googleg_32dp.png"
                            alt="Google"
                            className="h-5 w-5 object-contain"
                        />
                        <p className="font-medium text-brand-text">
                            Google Account
                        </p>
                    </div>

                    <p className="mt-1 truncate text-sm text-brand-muted">
                        {googleLinked
                            ? googleEmail || "Đã liên kết tài khoản Google"
                            : "Chưa liên kết tài khoản Google"}
                    </p>
                </div>

                <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        googleLinked
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                    }`}
                >
                    {googleLinked ? "Đã liên kết" : "Chưa liên kết"}
                </span>
            </div>

            {!googleLinked ? (
                <button
                    type="button"
                    onClick={onLink}
                    disabled={isLinking}
                    className="mt-4 rounded-lg border border-brand-navy px-4 py-2
                        text-sm font-semibold text-brand-navy
                        transition hover:bg-brand-navy hover:text-white
                        disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLinking ? "Đang chuyển hướng..." : "Liên kết Google"}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onUnlink}
                    disabled={isUnlinking}
                    className="mt-4 rounded-lg border border-red-300 px-4 py-2
                        text-sm font-semibold text-red-600
                        transition hover:bg-red-50
                        disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUnlinking ? "Đang hủy liên kết..." : "Hủy liên kết"}
                </button>
            )}
        </section>
    );
}
