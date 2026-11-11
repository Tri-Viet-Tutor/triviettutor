/**
 * Single Source of Truth: Class Roster & Classroom Presence Contracts
 * Chống rò rỉ thông tin cá nhân: Tuyệt đối không chứa phone, email, address, parentContact.
 */

export interface ClassStudentItem {
  studentId: number;
  fullName: string;
  avatarUrl?: string | null;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  enrolledAt: string;
  attendedSessions: number;
  totalSessions: number;
  feeCharged?: number; // Chỉ hiển thị cho Admin, Tutor không thấy
}

export interface ClassRosterResponse {
  classGroupId: number;
  classCode: string;
  courseName: string;
  totalStudents: number;
  students: ClassStudentItem[];
}

export interface SessionRosterStudent {
  studentId: number;
  fullName: string;
  avatarUrl?: string | null;
  isPresent: boolean; // Trạng thái tính toán realtime: có mặt trong phòng hay không
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  handRaised?: boolean;
}

export interface SessionRosterResponse {
  sessionId: number;
  classGroupId: number;
  courseTitle: string;
  sessionNumber: number;
  tutor: {
    tutorId: number;
    fullName: string;
  };
  students: SessionRosterStudent[];
}
