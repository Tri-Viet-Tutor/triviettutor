// Lớp học viên đã bấm "Thêm vào giỏ" cho từng môn. Giỏ hàng của backend chỉ lưu môn, nên lớp ưa thích
// được nhớ trong trình duyệt để trang giỏ chọn sẵn đúng lớp đó. Không đọc được bộ nhớ thì bỏ qua.
const KEY = (userId: number | undefined) => `viettri-cart-class:${userId ?? "guest"}`;

// Đọc lớp đã chọn trong giỏ theo môn (lưu trên trình duyệt)
function read(userId: number | undefined): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

// Lớp đã chọn trước cho môn (mã môn → id lớp)
export function preferredCartClass(userId: number | undefined, subject: string): number | undefined {
  return read(userId)[subject];
}

// Ghi nhớ lớp đã chọn của một môn trong giỏ
export function rememberCartClass(userId: number | undefined, subject: string, classId: number) {
  try {
    window.localStorage.setItem(KEY(userId), JSON.stringify({ ...read(userId), [subject]: classId }));
  } catch {
    // Trình duyệt chặn bộ nhớ: giỏ vẫn hoạt động, chỉ không chọn sẵn lớp
  }
}

// Khóa học viên đã thêm vào giỏ cho từng môn. Giỏ của backend giữ theo môn, nên nhiều khóa cùng môn
// (Toán 10, Toán 11…) dùng chung một dòng giỏ; nhớ khóa đã chọn để chỉ khóa đó hiện "Đã trong giỏ".
const COURSE_KEY = (userId: number | undefined) => `viettri-cart-course:${userId ?? "guest"}`;

// Khóa nhận diện một khóa học từ tên, môn và khối (lớp trong danh mục không trả courseId)
export const cartCourseKey = (name: string, subject: string, grade: string) => `${subject}|${grade}|${name}`;

// Đọc khóa đã chọn trong giỏ theo môn (lưu trên trình duyệt)
function readCourses(userId: number | undefined): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(COURSE_KEY(userId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// Khóa đã chọn cho môn trong giỏ (mã môn → khóa nhận diện)
export function preferredCartCourse(userId: number | undefined, subject: string): string | undefined {
  return readCourses(userId)[subject];
}

// Nhớ khóa của môn; `classId` có thì nhớ luôn lớp, không có thì bỏ lớp đã nhớ trước đó (lớp có thể thuộc khóa khác)
export function rememberCartCourse(userId: number | undefined, subject: string, courseKey: string, classId?: number) {
  try {
    window.localStorage.setItem(COURSE_KEY(userId), JSON.stringify({ ...readCourses(userId), [subject]: courseKey }));
    const classes = read(userId);
    if (classId !== undefined) classes[subject] = classId;
    else delete classes[subject];
    window.localStorage.setItem(KEY(userId), JSON.stringify(classes));
  } catch {
    // Trình duyệt chặn bộ nhớ: giỏ vẫn hoạt động, chỉ không nhớ khóa đã chọn
  }
}
