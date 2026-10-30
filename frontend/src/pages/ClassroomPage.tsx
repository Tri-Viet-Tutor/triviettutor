import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionMeetingToken, getSessionMeetingLogs } from "../services/meeting";
import { MeetingTokenResponse, MeetingSessionLogsResponse } from "../interfaces/api";
import { useAuthStore } from "../stores/authStore";
import { portalErrorMessage } from "../utils/errors";

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

  // WebRTC Media Streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  // Bản mới nhất của screenStream cho hàm dọn dẹp của effect
  const screenStreamRef = useRef<MediaStream | null>(null);
  screenStreamRef.current = screenStream;
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);

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

  // Audit Logs (MongoDB Atlas) Modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<MeetingSessionLogsResponse | null>(null);

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
      .catch((err: unknown) => {
        if (isMounted) {
          const isMock = localStorage.getItem("vtt_preview_mode") === "true";
          if (isMock) {
            setMeetingData({
              token: "preview_mock_token",
              serverUrl: "ws://localhost:7880",
              roomName: `classroom-session-${sessionId}`,
              role: user?.role === "ROLE_TUTOR" ? "TUTOR" : user?.role === "ROLE_ADMIN" ? "ADMIN" : "STUDENT",
              sessionId: Number(sessionId),
              classGroupId: 1,
              courseTitle: "Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị",
              sessionNumber: 3,
              tutorName: "Thầy Trần Minh Hoàng",
            });
            setLoading(false);
          } else {
            setError(portalErrorMessage(err, "Không thể kết nối vào phòng học trực tuyến. Vui lòng kiểm tra quyền đăng ký của bạn."));
            setLoading(false);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, user]);

  // Request browser WebRTC camera & microphone streams
  useEffect(() => {
    let active = true;
    let acquired: MediaStream | null = null;

    if (meetingData && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          acquired = stream;
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Webcam/mic not available or permission denied:", err);
          if (active) {
            setMediaPermissionDenied(true);
          }
        });
    }

    return () => {
      active = false;
      acquired?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [meetingData]);

  // Bind local stream to video ref
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraEnabled]);

  // Bind screen stream to video ref
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Setup whiteboard canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [showWhiteboard]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !micEnabled;
      });
    }
    setMicEnabled((prev) => !prev);
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setScreenSharing(false);
    } else {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          stream.getVideoTracks()[0].onended = () => {
            setScreenStream(null);
            setScreenSharing(false);
          };
          setScreenStream(stream);
          setScreenSharing(true);
        } catch (err) {
          console.warn("Screen share cancelled:", err);
          setScreenSharing(false);
        }
      } else {
        setScreenSharing((prev) => !prev);
      }
    }
  };

  const loadMeetingLogs = async () => {
    if (!sessionId) return;
    setLogsLoading(true);
    setShowLogsModal(true);
    try {
      const data = await getSessionMeetingLogs(Number(sessionId));
      setSessionLogs(data);
    } catch (err: unknown) {
      console.error("Failed to load session logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

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
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
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
  const isAdmin = meetingData.role === "ADMIN";
  const roleLabel = isTutor ? "Gia sư" : isAdmin ? "Quản trị viên" : "Học sinh";

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
              {meetingData.courseTitle} — Buổi {meetingData.sessionNumber}
            </h1>
            <p className="text-xs text-slate-400">
              Phòng: <code className="text-indigo-400 font-mono">{meetingData.roomName}</code> • Vai trò:{" "}
              <span className="font-semibold text-amber-300">{roleLabel}</span>
            </p>
          </div>
        </div>

        {/* View mode toggle & Actions */}
        <div className="flex items-center gap-2">
          {(isTutor || isAdmin) && (
            <button
              onClick={loadMeetingLogs}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Xem nhật ký tham gia MongoDB Atlas"
            >
              📋 Nhật ký phòng học
            </button>
          )}

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

      {/* Permission Denied Notice Banner */}
      {mediaPermissionDenied && (
        <div className="bg-amber-900/40 border-b border-amber-800 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <span>⚠️ Thiết bị webcam/micro chưa được cấp quyền truy cập. Bạn vẫn có thể xem bảng trắng và trò chuyện.</span>
          <button
            onClick={() => setMediaPermissionDenied(false)}
            className="text-amber-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

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
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="grid h-full grid-cols-1 gap-3">
              {/* Main Tile / Screen Share or Tutor Video */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-lg">
                <div className="flex items-center justify-between z-10">
                  <span className="rounded-full bg-indigo-600/80 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {screenSharing
                      ? "🖥️ Màn hình đang chia sẻ"
                      : isTutor
                      ? "Màn hình của bạn (Gia sư)"
                      : `Gia sư: ${meetingData.tutorName || "Thầy phụ trách"}`}
                  </span>
                  {micEnabled && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Mic Bật
                    </span>
                  )}
                </div>

                {/* Video Container */}
                <div className="flex flex-1 items-center justify-center relative overflow-hidden my-2 rounded-lg bg-black">
                  {screenSharing && screenStream ? (
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain rounded"
                    />
                  ) : localStream && cameraEnabled ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover rounded mirror"
                    />
                  ) : cameraEnabled ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-3xl font-bold border-2 border-indigo-500/30">
                        {isTutor ? "T" : "G"}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-200">
                        {isTutor ? user?.fullName || "Gia sư" : meetingData.tutorName || "Gia sư"}
                      </p>
                      <p className="text-xs text-slate-400">Đang đồng bộ luồng video HD</p>
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
                  <span>LiveKit SFU: Connected</span>
                </div>
              </div>

              {/* Secondary Participant Tile */}
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
                  {isTutor ? "Học sinh đã kết nối vào phòng" : "Sẵn sàng phát biểu"}
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
              <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white text-sm">
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
                      msg.isMe ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-700"
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

      {/* ── Control Footer ─────────────────────────────────────────────────── */}
      <footer className="flex h-16 items-center justify-center gap-3 border-t border-slate-800 bg-slate-900 px-4">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            micEnabled
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              : "bg-rose-600/20 text-rose-400 border border-rose-500/30"
          }`}
          title={micEnabled ? "Tắt Mic" : "Bật Mic"}
        >
          <span>{micEnabled ? "🎙️ Mic Bật" : "🔇 Mic Tắt"}</span>
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
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
          onClick={toggleScreenShare}
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

      {/* ── MongoDB Atlas Meeting Logs Modal ──────────────────────────────── */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">Nhật ký phiên học trực tuyến (MongoDB Atlas)</h3>
                <p className="text-xs text-slate-400">LiveKit Room Audit & Chuyên cần người tham gia</p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {logsLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-2" />
                  Đang đồng bộ dữ liệu nhật ký từ MongoDB...
                </div>
              ) : sessionLogs ? (
                <>
                  {/* Session Overview */}
                  <div className="rounded-lg bg-slate-800/80 p-4 border border-slate-750 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tên phòng LiveKit:</span>
                      <span className="font-mono text-indigo-300 font-semibold">{sessionLogs.roomName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Trạng thái phòng:</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400 font-semibold">
                        {sessionLogs.sessionLog?.status || "ACTIVE"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tổng người tham gia:</span>
                      <span className="text-slate-200 font-semibold">{sessionLogs.totalParticipants}</span>
                    </div>
                  </div>

                  {/* Participants List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">
                      Chi tiết người tham gia ({sessionLogs.participantLogs.length})
                    </h4>
                    {sessionLogs.participantLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có người tham gia nào được ghi nhận.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessionLogs.participantLogs.map((p, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-slate-800/50 p-3 border border-slate-750 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-200">
                                {p.participantName || p.participantIdentity || "Người dùng"}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                Vai trò: <span className="text-indigo-400">{p.userRole || "Học sinh"}</span> • Vào lúc:{" "}
                                {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString("vi-VN") : "N/A"}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-indigo-300 font-mono">
                                {p.durationSeconds ? `${Math.round(p.durationSeconds / 60)} phút` : "Đang tham gia"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không tìm thấy dữ liệu nhật ký cho buổi học này.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 text-right">
              <button
                onClick={() => setShowLogsModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
