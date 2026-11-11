import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { useMySessions } from "@/hooks/usePortalData";
import { getClassRoster } from "@/services/rosterService";
import type { SessionResponse } from "@/interfaces/api";
import { displayCode } from "@/utils/classes";
import { formatDate, parseIsoDate } from "@/utils/date";

interface ClassGroupSummary {
  classGroupId: number;
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  sessions: SessionResponse[];
  firstDate: string;
  lastDate: string;
}

export function TutorClassesPage() {
  const { data: sessions = [], isPending, isError } = useMySessions();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "roster">("roster");

  // Gom các buổi dạy theo classGroupId
  const classGroups = useMemo(() => {
    const map = new Map<number, ClassGroupSummary>();
    for (const session of sessions) {
      const gId = session.classGroupId;
      if (!map.has(gId)) {
        map.set(gId, {
          classGroupId: gId,
          totalSessions: 0,
          upcomingSessions: 0,
          completedSessions: 0,
          sessions: [],
          firstDate: session.date,
          lastDate: session.date,
        });
      }
      const entry = map.get(gId)!;
      entry.totalSessions++;
      entry.sessions.push(session);
      if (session.status === "COMPLETED") entry.completedSessions++;
      else if (session.status === "SCHEDULED") entry.upcomingSessions++;

      if (session.date < entry.firstDate) entry.firstDate = session.date;
      if (session.date > entry.lastDate) entry.lastDate = session.date;
    }
    return Array.from(map.values()).sort((a, b) => b.classGroupId - a.classGroupId);
  }, [sessions]);

  // Tự chọn lớp đầu tiên nếu chưa chọn
  const effectiveSelectedId = selectedClassId ?? classGroups[0]?.classGroupId ?? null;
  const currentClass = classGroups.find((g) => g.classGroupId === effectiveSelectedId);

  // Lấy danh sách học viên theo lớp từ API (đã được lọc bỏ thông tin liên hệ nhạy cảm)
  const rosterQuery = useQuery({
    queryKey: ["tutor-class-roster", effectiveSelectedId],
    queryFn: () => getClassRoster(effectiveSelectedId!),
    enabled: effectiveSelectedId !== null,
  });

  if (isPending) return <PortalLoading />;
  if (isError) return <PortalError />;
  if (classGroups.length === 0) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          icon="school"
          title="Lớp học phụ trách"
          description="Quản lý thông tin và danh sách người học trong các lớp bạn phụ trách giảng dạy."
        />
        <PortalEmpty message="Bạn hiện chưa được phân công phụ trách lớp học nào." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon="school"
        title="Lớp học phụ trách"
        description="Quản lý thông tin và danh sách người học trong các lớp bạn phụ trách giảng dạy."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Danh sách lớp học của Gia sư */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-[14.5px] font-bold text-brand-navy uppercase tracking-wider">
            Lớp đang dạy ({classGroups.length})
          </h2>
          <div className="space-y-2.5">
            {classGroups.map((grp) => {
              const isSelected = grp.classGroupId === effectiveSelectedId;
              return (
                <button
                  key={grp.classGroupId}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(grp.classGroupId);
                    setActiveTab("roster");
                  }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${FOCUS_RING} ${
                    isSelected
                      ? "border-brand-navy bg-white shadow-md ring-2 ring-brand-navy/10"
                      : "border-brand-sandLine bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-bold text-brand-navy">
                      {displayCode("class", grp.classGroupId)}
                    </span>
                    <span className="rounded-full bg-brand-sand px-2 py-0.5 text-[11px] font-semibold text-brand-muted">
                      {grp.totalSessions} buổi
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-brand-muted">
                    Thời gian: {formatDate(parseIsoDate(grp.firstDate))} → {formatDate(parseIsoDate(grp.lastDate))}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[12px] font-medium text-slate-500">
                    <span className="text-emerald-700">Đã học: {grp.completedSessions}</span>
                    <span>•</span>
                    <span className="text-amber-700">Sắp tới: {grp.upcomingSessions}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cột phải: Chi tiết lớp học & Tab danh sách học viên */}
        <div className="lg:col-span-8">
          {currentClass ? (
            <div className="rounded-2xl border border-brand-sandLine bg-white shadow-sm overflow-hidden">
              {/* Header chi tiết lớp */}
              <div className="border-b border-brand-sandLine bg-slate-50/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-brand-muted uppercase">Chi tiết lớp học</span>
                    <h1 className="text-[20px] font-extrabold text-brand-navy">
                      {rosterQuery.data?.courseName || `Lớp ${displayCode("class", currentClass.classGroupId)}`}
                    </h1>
                    <p className="text-[13px] text-brand-muted">
                      Mã lớp: <code className="font-mono font-bold text-brand-navy">{displayCode("class", currentClass.classGroupId)}</code>
                    </p>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="mt-5 flex border-b border-brand-sandLine">
                  <button
                    type="button"
                    onClick={() => setActiveTab("roster")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-bold transition-colors ${
                      activeTab === "roster"
                        ? "border-brand-navy text-brand-navy"
                        : "border-transparent text-brand-muted hover:text-brand-ink"
                    }`}
                  >
                    <Icon name="group" className="text-[18px]" />
                    Danh sách học viên
                    {rosterQuery.data && (
                      <span className="rounded-full bg-brand-sand px-2 py-0.5 text-[11px] font-bold text-brand-navy">
                        {rosterQuery.data.totalStudents}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-bold transition-colors ${
                      activeTab === "overview"
                        ? "border-brand-navy text-brand-navy"
                        : "border-transparent text-brand-muted hover:text-brand-ink"
                    }`}
                  >
                    <Icon name="calendar_month" className="text-[18px]" />
                    Lịch các buổi dạy ({currentClass.sessions.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "roster" && (
                  <div className="space-y-4">
                    {/* Banner cảnh báo bảo mật thông tin */}
                    <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-[13px] text-sky-900">
                      <Icon name="shield" className="text-[20px] text-sky-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Chính sách bảo vệ thông tin học viên</p>
                        <p className="mt-0.5 text-sky-800 leading-relaxed">
                          Nền tảng ẩn toàn bộ số điện thoại, email và thông tin liên hệ cá nhân của học viên nhằm bảo mật và đảm bảo an toàn giao dịch. Mọi trao đổi học tập vui lòng thực hiện qua phòng học trực tuyến và hệ thống bài tập.
                        </p>
                      </div>
                    </div>

                    {rosterQuery.isPending ? (
                      <div className="py-12 text-center text-slate-400">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent mb-2" />
                        Đang tải danh sách học viên...
                      </div>
                    ) : rosterQuery.isError ? (
                      <div className="py-8 text-center text-rose-600">
                        Không thể tải danh sách học viên của lớp này.
                      </div>
                    ) : rosterQuery.data?.students.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                        Chưa có học viên nào đăng ký lớp học này.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-brand-sandLine">
                        <table className="w-full text-left text-[13.5px]">
                          <thead className="bg-slate-50 text-[12.5px] font-bold text-brand-muted border-b border-brand-sandLine">
                            <tr>
                              <th className="py-3 pl-4 pr-3">Học viên</th>
                              <th className="py-3 px-3">Trạng thái</th>
                              <th className="py-3 px-3 text-center">Chuyên cần</th>
                              <th className="py-3 pl-3 pr-4 text-right">Ngày tham gia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-sandLine">
                            {rosterQuery.data?.students.map((st) => (
                              <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 pl-4 pr-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-white text-[12px] font-bold">
                                      {st.fullName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-brand-ink">{st.fullName}</div>
                                      <div className="text-[11.5px] text-brand-muted">
                                        Mã HV: #{st.studentId}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <StatusChip tone={st.status === "ACTIVE" ? "emerald" : "slate"}>
                                    {st.status === "ACTIVE" ? "Đang theo học" : st.status}
                                  </StatusChip>
                                </td>
                                <td className="py-3 px-3 text-center font-semibold text-brand-ink">
                                  <span className="text-emerald-700">{st.attendedSessions}</span>
                                  <span className="text-slate-400">/{st.totalSessions} buổi</span>
                                </td>
                                <td className="py-3 pl-3 pr-4 text-right tabular-nums text-brand-muted text-[13px]">
                                  {formatDate(parseIsoDate(st.enrolledAt.slice(0, 10)))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "overview" && (
                  <div className="space-y-3">
                    <h3 className="text-[15px] font-bold text-brand-navy mb-2">Danh sách buổi học</h3>
                    <div className="divide-y divide-brand-sandLine rounded-xl border border-brand-sandLine overflow-hidden">
                      {currentClass.sessions.map((s) => (
                        <div key={s.sessionId} className="flex items-center justify-between p-3.5 hover:bg-slate-50 text-[13.5px]">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-brand-navy w-7">#{s.sessionNumber}</span>
                            <div>
                              <span className="font-medium text-brand-ink">
                                {formatDate(parseIsoDate(s.date))}
                              </span>
                              <span className="text-slate-400 ml-2">
                                ({s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)})
                              </span>
                            </div>
                          </div>
                          <StatusChip tone={s.status === "COMPLETED" ? "emerald" : s.status === "SCHEDULED" ? "sky" : "slate"}>
                            {s.status === "COMPLETED" ? "Đã dạy" : s.status === "SCHEDULED" ? "Sắp diễn ra" : s.status}
                          </StatusChip>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-sandLine bg-white p-12 text-center text-brand-muted">
              Vui lòng chọn một lớp học từ danh sách bên trái.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
