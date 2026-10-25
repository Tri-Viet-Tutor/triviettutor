import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionMeetingToken } from "../services/meeting";
import { MeetingTokenResponse } from "../interfaces/api";
import { useAuthStore } from "../stores/authStore";

export default function ClassroomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingData, setMeetingData] = useState<MeetingTokenResponse | null>(null);

  // Classroom media states
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // In-class chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isMe: boolean }>>([
    {
      sender: "Hệ thống",
      text: "Chào mừng bạn tham gia phòng học trực tuyến VietTriTutor. Vui lòng bật mic khi phát biểu.",
      time: "Vừa xong",
      isMe: false,
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#2563eb");
  const brushSize = 3;
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Không tìm thấy mã buổi học hợp lệ.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getSessionMeetingToken(Number(sessionId))
      .then((data) => {
        if (isMounted) {
          setMeetingData(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          // If in preview or mock mode without backend connection, fallback gracefully
          const isMock = localStorage.getItem("vtt_preview_mode") === "true";
          if (isMock) {
            setMeetingData({
              token: "preview_mock_token",
              serverUrl: "ws://localhost:7880",
              roomName: `classroom-session-${sessionId}`,
              role: user?.role === "ROLE_TUTOR" ? "TUTOR" : "STUDENT",
              sessionId: Number(sessionId),
              classGroupId: 1,
              courseTitle: "Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị",
              sessionNumber: 3,
              tutorName: "Thầy Trần Minh Hoàng",
            });
            setLoading(false);
          } else {
            setError(err?.message || "Không thể kết nối vào phòng học trực tuyến. Vui lòng kiểm tra quyền đăng ký của bạn.");
            setLoading(false);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, user]);

  // Setup whiteboard canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white background initially
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [showWhiteboard]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = isEraser ? 24 : brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = isEraser ? "#ffffff" : drawColor;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    setChatMessages((prev) => [
      ...prev,
      {
        sender: user?.fullName || "Tôi",
        text: inputMsg.trim(),
        time: timeStr,
        isMe: true,
      },
    ]);
    setInputMsg("");
  };

  const handleLeave = () => {
    if (window.confirm("Bạn có chắc chắn muốn rời khỏi phòng học trực tuyến?")) {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4" />
        <h2 className="text-xl font-semibold">Đang chuẩn bị phòng học trực tuyến...</h2>
        <p className="text-sm text-slate-400 mt-2">Đang xác thực quyền truy cập và chứng chỉ LiveKit SFU</p>
      </div>
    );
  }

  if (error || !meetingData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-white">
        <div className="max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-2xl border border-rose-900/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-rose-400">Không thể vào phòng học</h2>
          <p className="mt-3 text-sm text-slate-300">{error || "Bạn không có quyền tham gia buổi học này."}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
            >
              Quay lại lịch học
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTutor = meetingData.role === "TUTOR";
  const roleLabel = isTutor ? "Gia sư" : meetingData.role === "ADMIN" ? "Quản trị viên" : "Học sinh";

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Live</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">
              {meetingData.courseTitle} — Buổi #{meetingData.sessionNumber}
            </h1>
            <p className="text-xs text-slate-400">
              Phòng: <code className="text-indigo-400 font-mono">{meetingData.roomName}</code> • Vai trò:{" "}
              <span className="font-semibold text-amber-300">{roleLabel}</span>
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWhiteboard((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              showWhiteboard
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            ✏️ {showWhiteboard ? "Ẩn Bảng Trắng" : "Mở Bảng Trắng"}
          </button>

          <button
            onClick={() => setShowChat((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              showChat
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            💬 Chat {chatMessages.length > 1 && `(${chatMessages.length - 1})`}
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow"
          >
            🚪 Rời phòng
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Whiteboard & Video Conference ──────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Whiteboard Section */}
        {showWhiteboard && (
          <div className="flex flex-1 flex-col border-r border-slate-800 bg-slate-900">
            {/* Whiteboard Toolbar */}
            <div className="flex h-11 items-center justify-between border-b border-slate-800 bg-slate-850 px-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 mr-1">Bảng vẽ:</span>
                <button
                  onClick={() => setIsEraser(false)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    !isEraser ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Bút viết
                </button>
                <button
                  onClick={() => setIsEraser(true)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    isEraser ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Tẩy xóa
                </button>

                {/* Color pickers */}
                {!isEraser && (
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-750 pl-2">
                    {["#2563eb", "#dc2626", "#16a34a", "#0f172a"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-5 w-5 rounded-full border-2 transition ${
                          drawColor === c ? "border-white scale-110" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearCanvas}
                  className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-rose-900/40 hover:text-rose-300 transition"
                >
                  Xóa toàn bộ
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-white overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="h-full w-full object-contain cursor-crosshair border border-slate-200 rounded shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Video Conference Section */}
        <div className={`flex flex-col ${showWhiteboard ? "w-96 border-l border-slate-800" : "flex-1"} bg-slate-950`}>
          {/* Active Speaker / Tutor Stage */}
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="grid h-full grid-cols-1 gap-3">
              {/* Tutor Screen / Main Tile */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-600/80 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {isTutor ? "Màn hình của bạn" : `Gia sư: ${meetingData.tutorName || "Thầy phụ trách"}`}
                  </span>
                  {micEnabled && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Mic Bật
                    </span>
                  )}
                </div>

                {/* Simulated video placeholder / canvas */}
                <div className="flex flex-1 items-center justify-center py-8">
                  {cameraEnabled ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-3xl font-bold border-2 border-indigo-500/30">
                        {isTutor ? "T" : "G"}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-200">
                        {isTutor ? (user?.fullName || "Gia sư") : (meetingData.tutorName || "Gia sư")}
                      </p>
                      <p className="text-xs text-slate-400">Camera HD đang phát trực tuyến</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <span className="text-3xl">📷</span>
                      <p className="mt-2 text-xs">Camera đã tắt</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                  <span>Chất lượng: 1080p @ 30fps</span>
                  <span>SFU Server: Connected</span>
                </div>
              </div>

              {/* Participants Secondary Tile */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {isTutor ? "Học sinh tham gia" : `${user?.fullName || "Tôi"} (Học sinh)`}
                  </span>
                  {handRaised && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300 animate-pulse">
                      ✋ Đang giơ tay
                    </span>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    HS
                  </div>
                </div>
                <div className="text-center text-xs text-slate-400">
                  {isTutor ? "1 học sinh đã kết nối" : "Sẵn sàng nhận phát biểu"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: In-Class Chat Sidebar */}
        {showChat && (
          <div className="flex w-80 flex-col border-l border-slate-800 bg-slate-900">
            <div className="flex h-11 items-center justify-between border-b border-slate-800 px-4">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Trò chuyện trong lớp</span>
              <button
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-300">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs ${
                      msg.isMe
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-2 flex gap-1.5">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Nhắn tin cho cả lớp..."
                className="flex-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Bottom Control Bar ────────────────────────────────────────────── */}
      <footer className="flex h-16 items-center justify-center gap-3 border-t border-slate-800 bg-slate-900 px-4">
        {/* Mic Toggle */}
        <button
          onClick={() => setMicEnabled((prev) => !prev)}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            micEnabled
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              : "bg-rose-600/20 text-rose-400 border border-rose-500/30"
          }`}
          title={micEnabled ? "Tắt Micro" : "Bật Micro"}
        >
          <span>{micEnabled ? "🎙️ Mic Bật" : "🔇 Mic Tắt"}</span>
        </button>

        {/* Camera Toggle */}
        <button
          onClick={() => setCameraEnabled((prev) => !prev)}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            cameraEnabled
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              : "bg-rose-600/20 text-rose-400 border border-rose-500/30"
          }`}
          title={cameraEnabled ? "Tắt Camera" : "Bật Camera"}
        >
          <span>{cameraEnabled ? "📷 Cam Bật" : "🚫 Cam Tắt"}</span>
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={() => setScreenSharing((prev) => !prev)}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            screenSharing
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title="Chia sẻ màn hình"
        >
          <span>🖥️ {screenSharing ? "Dừng chia sẻ" : "Chia sẻ màn hình"}</span>
        </button>

        {/* Raise Hand Toggle */}
        <button
          onClick={() => setHandRaised((prev) => !prev)}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            handRaised
              ? "bg-amber-500 text-slate-950 font-bold"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title="Giơ tay phát biểu"
        >
          <span>✋ {handRaised ? "Hạ tay xuống" : "Giơ tay"}</span>
        </button>

        <div className="h-6 w-px bg-slate-800 mx-2" />

        {/* Leave Classroom */}
        <button
          onClick={handleLeave}
          className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-500 transition shadow"
        >
          <span>Rời phòng</span>
        </button>
      </footer>
    </div>
  );
}
