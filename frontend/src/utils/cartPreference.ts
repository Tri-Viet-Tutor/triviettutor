/**
 * Lớp học viên đã bấm "Thêm vào giỏ" cho từng môn. Giỏ hàng của backend chỉ lưu môn, nên lớp ưa thích
 * được nhớ trong trình duyệt để trang giỏ chọn sẵn đúng lớp đó. Không đọc được bộ nhớ thì bỏ qua.
 */
const KEY = (userId: number | undefined) => `viettri-cart-class:${userId ?? "guest"}`;

function read(userId: number | undefined): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Lớp đã chọn trước cho môn (mã môn → id lớp) */
export function preferredCartClass(userId: number | undefined, subject: string): number | undefined {
  return read(userId)[subject];
}

export function rememberCartClass(userId: number | undefined, subject: string, classId: number) {
  try {
    window.localStorage.setItem(KEY(userId), JSON.stringify({ ...read(userId), [subject]: classId }));
  } catch {
    /* Trình duyệt chặn bộ nhớ: giỏ vẫn hoạt động, chỉ không chọn sẵn lớp */
  }
}
