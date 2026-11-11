import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { SessionRosterStudent } from "@/interfaces/classRoster.contract";

interface ClassroomParticipantsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isTutor: boolean;
  isAdmin: boolean;
  students: SessionRosterStudent[];
  onlineParticipantIds: Set<number>;
  tutorInfo?: { tutorId: number; fullName: string } | null;
  tutorOnline: boolean;
  handRaisedIds: Set<number>;
  mutedStudentIds: Set<number>;
  onToggleMuteStudent?: (studentId: number) => void;
}

export function ClassroomParticipantsSidebar({
  isOpen,
  onClose,
  isTutor,
  isAdmin,
  students,
  onlineParticipantIds,
  tutorInfo,
  tutorOnline,
  handRaisedIds,
  mutedStudentIds,
  onToggleMuteStudent,
}: ClassroomParticipantsSidebarProps) {
  if (!isOpen) return null;

  const presentStudents = students.filter((st) => onlineParticipantIds.has(st.studentId));
  const absentStudents = students.filter((st) => !onlineParticipantIds.has(st.studentId));

  const totalInRoom = presentStudents.length + (tutorOnline ? 1 : 0);

  return (
    <aside
      aria-label="Danh sách người tham gia"
      className="flex w-80 flex-col border-l border-slate-800 bg-slate-900 text-slate-100 shadow-xl z-20"
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <Icon name="groups" className="text-[20px] text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Người tham gia ({totalInRoom})
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng danh sách"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Gia sư phụ trách */}
        {tutorInfo && (
          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Gia sư phụ trách
            </h3>
            <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-slate-750">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {tutorInfo.fullName.slice(0, 2).toUpperCase()}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                      tutorOnline ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-100">{tutorInfo.fullName}</p>
                  <p className="text-[11px] text-indigo-300 font-semibold">Giảng viên / Host</p>
                </div>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                  tutorOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                }`}
              >
                {tutorOnline ? "Có mặt" : "Chưa vào"}
              </span>
            </div>
          </section>
        )}

        {/* Học viên đang có mặt */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang có mặt ({presentStudents.length})
            </h3>
          </div>

          {presentStudents.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center text-xs text-slate-500 italic">
              Chưa có học viên nào tham gia phòng học.
            </p>
          ) : (
            <ul className="space-y-2">
              {presentStudents.map((st) => {
                const isHandRaised = handRaisedIds.has(st.studentId);
                const isMuted = mutedStudentIds.has(st.studentId);
                return (
                  <li
                    key={st.studentId}
                    className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 border border-slate-750 transition hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
                        {st.fullName.slice(0, 2).toUpperCase()}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-200">{st.fullName}</p>
                        <div className="flex items-center gap-1 text-[10.5px]">
                          {isHandRaised && (
                            <span className="rounded bg-amber-500/20 px-1 text-amber-300 font-bold animate-pulse">
                              Giơ tay
                            </span>
                          )}
                          <span className="text-slate-400">Học sinh</span>
                        </div>
                      </div>
                    </div>

                    {/* Điều khiển dành cho Gia sư / Admin */}
                    {(isTutor || isAdmin) && onToggleMuteStudent && (
                      <button
                        type="button"
                        onClick={() => onToggleMuteStudent(st.studentId)}
                        title={isMuted ? "Yêu cầu bật mic" : "Tắt mic học sinh này"}
                        className={`rounded-lg p-1.5 transition-colors ${
                          isMuted
                            ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            : "bg-slate-750 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <Icon name={isMuted ? "mic_off" : "mic"} className="text-[16px]" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Học viên vắng mặt / Chưa vào phòng */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              Vắng mặt / Chưa vào ({absentStudents.length})
            </h3>
          </div>

          {absentStudents.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center text-xs text-slate-500 italic">
              Tất cả học viên trong danh sách đều đã có mặt.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {absentStudents.map((st) => (
                <li
                  key={st.studentId}
                  className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-slate-850 text-slate-400"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-medium text-slate-500">
                      {st.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate text-xs font-medium text-slate-400">{st.fullName}</span>
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500">
                    Chưa vào
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Footer ghi chú bảo mật */}
      <div className="border-t border-slate-800 p-3 bg-slate-950/40 text-[11px] text-slate-500 text-center">
        Thông tin liên lạc học viên được bảo mật bởi nền tảng.
      </div>
    </aside>
  );
}
