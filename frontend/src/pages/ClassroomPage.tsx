import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionMeetingToken, getSessionMeetingLogs, uploadMeetingRecording } from "../services/meeting";
import { MeetingTokenResponse, MeetingSessionLogsResponse } from "../interfaces/api";
import { ClassroomParticipant, MeetingSignalPayload, WhiteboardStrokePayload } from "../interfaces/meetingSignal.contract";
import { getSessionRoster } from "../services/rosterService";
import type { SessionRosterResponse } from "../interfaces/classRoster.contract";
import { ClassroomParticipantsSidebar } from "../components/classroom/ClassroomParticipantsSidebar";
import { useAuthStore } from "../stores/authStore";
import { portalErrorMessage } from "../utils/errors";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

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
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // Danh sách người học trong phòng & hiện diện trực tiếp
  const [sessionRoster, setSessionRoster] = useState<SessionRosterResponse | null>(null);
  const [onlineParticipantIds, setOnlineParticipantIds] = useState<Set<number>>(new Set());
  const [tutorOnline, setTutorOnline] = useState<boolean>(false);
  const [mutedStudentIds, setMutedStudentIds] = useState<Set<number>>(new Set());
  const [handRaisedIds, setHandRaisedIds] = useState<Set<number>>(new Set());

  // Host Remote Controls & Participants State
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [hostMutedNotice, setHostMutedNotice] = useState<string | null>(null);
  const [unmuteRequestModal, setUnmuteRequestModal] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Voice Recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [recordingSaveNotice, setRecordingSaveNotice] = useState<string | null>(null);

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
  const lastDrawPosRef = useRef<{ x: number; y: number } | null>(null);
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

    // Tải danh sách người học trong phòng theo buổi học
    getSessionRoster(Number(sessionId))
      .then((roster) => {
        if (isMounted) {
          setSessionRoster(roster);
          if (user?.id && user?.role === "ROLE_STUDENT") {
            setOnlineParticipantIds((prev) => new Set(prev).add(user.id));
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Could not load session roster:", err);
          setSessionRoster(null);
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

  // Khởi tạo danh sách người tham gia ban đầu (CHỈ có người dùng hiện tại, không hardcode người khác)
  useEffect(() => {
    if (!meetingData) return;
    const isHost = meetingData.role === "TUTOR" || meetingData.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));
    const currentUserName = user?.fullName || (isHost ? (meetingData.tutorName || "Gia sư") : "Học sinh");

    const selfParticipant: ClassroomParticipant = {
      id: currentUserId,
      name: isHost ? `${currentUserName} (Host)` : `${currentUserName} (Tôi)`,
      role: meetingData.role,
      micEnabled: micEnabled,
      cameraEnabled: cameraEnabled,
      handRaised: false,
      isSelf: true,
    };

    setParticipants([selfParticipant]);

    if (isHost) {
      setTutorOnline(true);
    } else {
      setTutorOnline(false);
    }
  }, [meetingData, user]);

  // Thiết lập BroadcastChannel để truyền tín hiệu điều khiển, hiện diện, chat và bảng trắng giữa các bên
  useEffect(() => {
    if (!sessionId || !meetingData) return;
    const channelName = `classroom_meeting_session_${sessionId}`;
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
    broadcastChannelRef.current = channel;

    const isHost = meetingData.role === "TUTOR" || meetingData.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));
    const currentUserName = user?.fullName || (isHost ? (meetingData.tutorName || "Gia sư") : "Học sinh");

    const myPresence: ClassroomParticipant = {
      id: currentUserId,
      name: isHost ? `${currentUserName} (Gia sư)` : currentUserName,
      role: meetingData.role,
      micEnabled: micEnabled,
      cameraEnabled: cameraEnabled,
      handRaised: handRaised,
      isSelf: false,
    };

    if (channel) {
      channel.onmessage = (event: MessageEvent<MeetingSignalPayload>) => {
        const signal = event.data;
        if (!signal || !signal.action) return;

        // Bỏ qua tín hiệu do chính mình phát đi
        if (signal.senderId === currentUserId && signal.action !== "MUTE_MIC") return;

        if (signal.action === "PARTICIPANT_JOIN" && signal.participant) {
          if (signal.participant.id === currentUserId) return;
          const peer = { ...signal.participant, isSelf: false };
          setParticipants((prev) => {
            const exists = prev.some((p) => p.id === peer.id);
            return exists ? prev.map((p) => (p.id === peer.id ? peer : p)) : [...prev, peer];
          });

          const numId = Number(signal.participant.id);
          if (!isNaN(numId) && numId > 0 && signal.participant.role === "STUDENT") {
            setOnlineParticipantIds((prev) => new Set(prev).add(numId));
          }
          if (signal.participant.role === "TUTOR") {
            setTutorOnline(true);
          }

          // Phản hồi lại thông tin của mình để người mới vào phòng cập nhật
          channel.postMessage({
            action: "PARTICIPANT_SYNC",
            senderId: currentUserId,
            senderRole: meetingData.role,
            participant: myPresence,
            timestamp: Date.now(),
          } as MeetingSignalPayload);

        } else if (signal.action === "PARTICIPANT_SYNC" && signal.participant) {
          if (signal.participant.id === currentUserId) return;
          const peer = { ...signal.participant, isSelf: false };
          setParticipants((prev) => {
            const exists = prev.some((p) => p.id === peer.id);
            return exists ? prev.map((p) => (p.id === peer.id ? peer : p)) : [...prev, peer];
          });

          const numId = Number(signal.participant.id);
          if (!isNaN(numId) && numId > 0 && signal.participant.role === "STUDENT") {
            setOnlineParticipantIds((prev) => new Set(prev).add(numId));
          }
          if (signal.participant.role === "TUTOR") {
            setTutorOnline(true);
          }

        } else if (signal.action === "PARTICIPANT_LEAVE") {
          setParticipants((prev) => prev.filter((p) => p.id !== signal.senderId));
          const numId = Number(signal.senderId);
          if (!isNaN(numId)) {
            setOnlineParticipantIds((prev) => {
              const next = new Set(prev);
              next.delete(numId);
              return next;
            });
          }
          if (signal.senderRole === "TUTOR") {
            setTutorOnline(false);
          }

        } else if (signal.action === "CHAT_MESSAGE" && signal.chatMessage) {
          if (signal.chatMessage.senderId === currentUserId) return;
          const msg = signal.chatMessage;
          setChatMessages((prev) => [
            ...prev,
            {
              sender: msg.senderName,
              text: msg.text,
              time: msg.time,
              isMe: false,
            },
          ]);
          setUnreadChatCount((c) => c + 1);

        } else if (signal.action === "WHITEBOARD_DRAW" && signal.drawStroke) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const stroke = signal.drawStroke;
          ctx.save();
          ctx.lineWidth = stroke.isEraser ? 24 : stroke.size;
          ctx.lineCap = "round";
          ctx.strokeStyle = stroke.isEraser ? "#ffffff" : stroke.color;
          ctx.beginPath();
          ctx.moveTo(stroke.fromX, stroke.fromY);
          ctx.lineTo(stroke.toX, stroke.toY);
          ctx.stroke();
          ctx.restore();

        } else if (signal.action === "WHITEBOARD_CLEAR") {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (signal.action === "MUTE_MIC") {
          const isTarget = signal.targetUserId === currentUserId || signal.targetUserId === "ALL";
          if (isTarget && !isHost) {
            if (localStream) {
              localStream.getAudioTracks().forEach((track) => {
                track.enabled = false;
              });
            }
            setMicEnabled(false);
            setHostMutedNotice(
              signal.targetUserId === "ALL"
                ? "Gia sư đã tắt micro của toàn bộ phòng học. Bạn có thể tự bật lại khi phát biểu."
                : "Micro của bạn đã bị tắt bởi Gia sư. Bạn có thể tự bật lại khi cần phát biểu."
            );
          }

          setParticipants((prev) =>
            prev.map((p) => {
              if (signal.targetUserId === "ALL") {
                return p.role === "STUDENT" ? { ...p, micEnabled: false } : p;
              }
              return p.id === signal.targetUserId ? { ...p, micEnabled: false } : p;
            })
          );
        } else if (signal.action === "REQUEST_UNMUTE") {
          if (signal.targetUserId === currentUserId) {
            setUnmuteRequestModal(true);
          }
        } else if (signal.action === "UPDATE_MEDIA_STATE") {
          setParticipants((prev) =>
            prev.map((p) => {
              if (p.id === signal.senderId) {
                return {
                  ...p,
                  micEnabled: signal.micEnabled !== undefined ? signal.micEnabled : p.micEnabled,
                  cameraEnabled: signal.cameraEnabled !== undefined ? signal.cameraEnabled : p.cameraEnabled,
                  handRaised: signal.handRaised !== undefined ? signal.handRaised : p.handRaised,
                };
              }
              return p;
            })
          );
          const numId = Number(signal.senderId);
          if (!isNaN(numId) && numId > 0) {
            if (signal.handRaised) {
              setHandRaisedIds((prev) => new Set(prev).add(numId));
            } else {
              setHandRaisedIds((prev) => {
                const next = new Set(prev);
                next.delete(numId);
                return next;
              });
            }
            if (signal.micEnabled === false) {
              setMutedStudentIds((prev) => new Set(prev).add(numId));
            } else if (signal.micEnabled === true) {
              setMutedStudentIds((prev) => {
                const next = new Set(prev);
                next.delete(numId);
                return next;
              });
            }
          }
        }
      };

      // Phát thông báo tham gia phòng học
      channel.postMessage({
        action: "PARTICIPANT_JOIN",
        senderId: currentUserId,
        senderRole: meetingData.role,
        participant: myPresence,
        timestamp: Date.now(),
      } as MeetingSignalPayload);
    }

    const handleBeforeUnload = () => {
      channel?.postMessage({
        action: "PARTICIPANT_LEAVE",
        senderId: currentUserId,
        senderRole: meetingData.role,
        timestamp: Date.now(),
      } as MeetingSignalPayload);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (channel) {
        channel.postMessage({
          action: "PARTICIPANT_LEAVE",
          senderId: currentUserId,
          senderRole: meetingData.role,
          timestamp: Date.now(),
        } as MeetingSignalPayload);
        channel.close();
      }
    };
  }, [sessionId, user, meetingData, localStream, micEnabled, cameraEnabled, handRaised]);

  const toggleMic = () => {
    const nextState = !micEnabled;
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = nextState;
      });
    }
    setMicEnabled(nextState);
    if (hostMutedNotice) {
      setHostMutedNotice(null);
    }

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student-1"));

    broadcastChannelRef.current?.postMessage({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: nextState,
      timestamp: Date.now(),
    } as MeetingSignalPayload);

    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, micEnabled: nextState } : p))
    );
  };

  const handleHostMuteParticipant = (targetId: string) => {
    const currentUserId = String(user?.id || "tutor");
    broadcastChannelRef.current?.postMessage({
      action: "MUTE_MIC",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: targetId,
      timestamp: Date.now(),
      reason: "HOST_MUTED",
    } as MeetingSignalPayload);

    setParticipants((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, micEnabled: false } : p))
    );
  };

  const handleHostMuteAll = () => {
    const currentUserId = String(user?.id || "tutor");
    broadcastChannelRef.current?.postMessage({
      action: "MUTE_MIC",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: "ALL",
      timestamp: Date.now(),
      reason: "HOST_MUTED_ALL",
    } as MeetingSignalPayload);

    setParticipants((prev) =>
      prev.map((p) => (p.role === "STUDENT" ? { ...p, micEnabled: false } : p))
    );
  };

  const handleHostRequestUnmute = (targetId: string) => {
    const currentUserId = String(user?.id || "tutor");
    broadcastChannelRef.current?.postMessage({
      action: "REQUEST_UNMUTE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: targetId,
      timestamp: Date.now(),
    } as MeetingSignalPayload);
  };

  const toggleCamera = () => {
    const nextCam = !cameraEnabled;
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = nextCam;
      });
    }
    setCameraEnabled(nextCam);

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    broadcastChannelRef.current?.postMessage({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: micEnabled,
      cameraEnabled: nextCam,
      handRaised: handRaised,
      timestamp: Date.now(),
    } as MeetingSignalPayload);

    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, cameraEnabled: nextCam } : p))
    );
  };

  const toggleHandRaise = () => {
    const nextHand = !handRaised;
    setHandRaised(nextHand);
    if (user?.id) {
      setHandRaisedIds((ids) => {
        const copy = new Set(ids);
        if (nextHand) copy.add(user.id);
        else copy.delete(user.id);
        return copy;
      });
    }

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    broadcastChannelRef.current?.postMessage({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: micEnabled,
      cameraEnabled: cameraEnabled,
      handRaised: nextHand,
      timestamp: Date.now(),
    } as MeetingSignalPayload);

    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, handRaised: nextHand } : p))
    );
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    lastDrawPosRef.current = { x, y };
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const prevPos = lastDrawPosRef.current || { x, y };

    ctx.lineWidth = isEraser ? 24 : brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = isEraser ? "#ffffff" : drawColor;

    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    broadcastChannelRef.current?.postMessage({
      action: "WHITEBOARD_DRAW",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      timestamp: Date.now(),
      drawStroke: {
        fromX: prevPos.x,
        fromY: prevPos.y,
        toX: x,
        toY: y,
        color: drawColor,
        size: brushSize,
        isEraser: isEraser,
      },
    } as MeetingSignalPayload);

    lastDrawPosRef.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastDrawPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    broadcastChannelRef.current?.postMessage({
      action: "WHITEBOARD_CLEAR",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      timestamp: Date.now(),
    } as MeetingSignalPayload);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));
    const currentUserName = user?.fullName || (isHost ? (meetingData?.tutorName || "Gia sư") : "Học sinh");
    const messageText = inputMsg.trim();
    const myDisplayName = isHost ? `${currentUserName} (Host)` : `${currentUserName} (Tôi)`;
    const broadcastDisplayName = isHost ? `${currentUserName} (Gia sư)` : currentUserName;

    setChatMessages((prev) => [
      ...prev,
      {
        sender: myDisplayName,
        text: messageText,
        time: timeStr,
        isMe: true,
      },
    ]);
    setInputMsg("");

    broadcastChannelRef.current?.postMessage({
      action: "CHAT_MESSAGE",
      senderId: currentUserId,
      senderName: broadcastDisplayName,
      senderRole: meetingData?.role || "STUDENT",
      timestamp: Date.now(),
      chatMessage: {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: currentUserId,
        senderName: broadcastDisplayName,
        senderRole: meetingData?.role || "STUDENT",
        text: messageText,
        time: timeStr,
      },
    } as MeetingSignalPayload);
  };

  const startVoiceRecording = async () => {
    try {
      let streamToRecord: MediaStream | null = null;
      if (localStream && localStream.getAudioTracks().length > 0) {
        streamToRecord = new MediaStream(localStream.getAudioTracks());
      } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        streamToRecord = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      if (!streamToRecord) {
        alert("Không tìm thấy micro khả dụng để ghi âm.");
        return;
      }

      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(streamToRecord, options);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        if (audioBlob.size > 0 && sessionId) {
          setIsSavingRecording(true);
          try {
            await uploadMeetingRecording(Number(sessionId), audioBlob);
            setRecordingSaveNotice("Đã lưu bản ghi âm buổi học thành công vào hệ thống!");
          } catch (err) {
            console.error("Lỗi khi lưu bản ghi âm:", err);
            setRecordingSaveNotice("Không thể tải bản ghi âm lên máy chủ. Vui lòng kiểm tra kết nối.");
          } finally {
            setIsSavingRecording(false);
          }
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      setRecordingSaveNotice(null);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Không thể khởi động ghi âm:", err);
      alert("Không thể khởi động ghi âm. Vui lòng cấp quyền truy cập micro cho trình duyệt.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  const [confirmLeave, setConfirmLeave] = useState(false);
  const handleLeave = () => setConfirmLeave(true);
  const leaveRoom = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    navigate(-1);
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
          {isRecordingVoice && (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs text-rose-300 font-semibold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Ghi âm: {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
            </div>
          )}
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
              onClick={handleHostMuteAll}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-600/30 hover:text-white transition"
              title="Tắt micro toàn bộ học sinh trong phòng"
            >
              Tắt tất cả mic
            </button>
          )}

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
            onClick={() => setShowParticipants((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              showParticipants
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
            title="Mở danh sách người tham gia trực tiếp"
          >
            👥 Người tham gia {sessionRoster ? `(${onlineParticipantIds.size + (tutorOnline ? 1 : 0)}/${sessionRoster.students.length + 1})` : `(${participants.length})`}
          </button>

          <button
            onClick={() => {
              setShowChat((prev) => {
                const next = !prev;
                if (next) setUnreadChatCount(0);
                return next;
              });
            }}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              showChat
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            💬 Chat
            {unreadChatCount > 0 && !showChat && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow"
          >
            🚪 Rời phòng
          </button>
        </div>
      </header>

      {/* Voice Recording Save Notice Banner */}
      {recordingSaveNotice && (
        <div className="bg-emerald-950/90 border-b border-emerald-800 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span>🎙️</span>
            <span>{recordingSaveNotice}</span>
          </div>
          <button
            onClick={() => setRecordingSaveNotice(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* Host Muted Notice Banner */}
      {hostMutedNotice && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-rose-300">[Thông báo]</span>
            <span>{hostMutedNotice}</span>
          </div>
          <button
            onClick={() => setHostMutedNotice(null)}
            className="text-rose-400 hover:text-white font-bold ml-2 text-xs"
          >
            Đóng
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
              {(isTutor || isAdmin) ? (
                <>
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
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="rounded bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                    <span>👁️</span> Bảng bài giảng của gia sư (Chế độ xem)
                  </span>
                  <span className="text-xs text-slate-400">Chỉ gia sư có quyền viết và xóa</span>
                </div>
              )}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-white overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onMouseDown={isTutor || isAdmin ? startDrawing : undefined}
                onMouseMove={isTutor || isAdmin ? draw : undefined}
                onMouseUp={isTutor || isAdmin ? stopDrawing : undefined}
                onMouseLeave={isTutor || isAdmin ? stopDrawing : undefined}
                className={`h-full w-full object-contain border border-slate-200 rounded shadow-sm ${
                  isTutor || isAdmin ? "cursor-crosshair" : "cursor-default pointer-events-none"
                }`}
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

              {/* Secondary Participant Tiles */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
                  <span>Thành viên trong phòng ({participants.length})</span>
                  {(isTutor || isAdmin) && (
                    <button
                      onClick={handleHostMuteAll}
                      className="rounded bg-rose-600/20 border border-rose-500/40 px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-600/30 hover:text-white transition"
                    >
                      Tắt tất cả mic
                    </button>
                  )}
                </div>

                {participants.filter((p) => !p.isSelf).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-850 bg-slate-900/40 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-2">
                      <Icon name="person" className="text-[20px]" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      Chưa có thành viên nào khác vào phòng
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                      Khi có người tham gia, video và trạng thái sẽ tự động xuất hiện tại đây theo thời gian thực.
                    </p>
                  </div>
                ) : (
                  participants
                    .filter((p) => !p.isSelf)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                p.micEnabled
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {p.micEnabled ? "Mic Bật" : "Mic Tắt"}
                            </span>
                            {p.handRaised && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300 animate-pulse">
                                Đang giơ tay
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center py-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                            {p.role === "TUTOR" ? "GS" : "HS"}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                          <span className="text-slate-400">
                            {p.role === "TUTOR" ? "Gia sư phụ trách" : "Học sinh"}
                          </span>
                          {(isTutor || isAdmin) && p.role === "STUDENT" && (
                            <div className="flex items-center gap-1.5">
                              {p.micEnabled ? (
                                <button
                                  onClick={() => handleHostMuteParticipant(p.id)}
                                  className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 transition shadow"
                                >
                                  Tắt mic
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleHostRequestUnmute(p.id)}
                                  className="rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600 hover:text-white transition"
                                >
                                  Yêu cầu bật mic
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
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

        {/* Right: Participants Sidebar */}
        <ClassroomParticipantsSidebar
          isOpen={showParticipants}
          onClose={() => setShowParticipants(false)}
          isTutor={isTutor}
          isAdmin={isAdmin}
          students={sessionRoster?.students ?? []}
          onlineParticipantIds={onlineParticipantIds}
          tutorInfo={
            sessionRoster?.tutor
              ? { tutorId: sessionRoster.tutor.tutorId, fullName: sessionRoster.tutor.fullName }
              : meetingData.tutorName
              ? { tutorId: 1, fullName: meetingData.tutorName }
              : null
          }
          tutorOnline={tutorOnline}
          handRaisedIds={handRaisedIds}
          mutedStudentIds={mutedStudentIds}
          onToggleMuteStudent={(stId) => {
            setMutedStudentIds((prev) => {
              const next = new Set(prev);
              if (next.has(stId)) next.delete(stId);
              else next.add(stId);
              return next;
            });
            handleHostMuteParticipant(String(stId));
          }}
        />
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
          onClick={toggleHandRaise}
          className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
            handRaised
              ? "bg-amber-500 text-slate-950 font-bold"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title="Giơ tay phát biểu"
        >
          <span>✋ {handRaised ? "Hạ tay xuống" : "Giơ tay"}</span>
        </button>

        {/* Voice Record Toggle (Tutor & Admin) */}
        {(isTutor || isAdmin) && (
          <button
            onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
            disabled={isSavingRecording}
            className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
              isRecordingVoice
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isRecordingVoice ? "Dừng ghi âm buổi học" : "Bắt đầu ghi âm buổi học"}
          >
            <span>
              {isSavingRecording
                ? "⏳ Đang lưu ghi âm..."
                : isRecordingVoice
                ? "⏹️ Dừng ghi âm"
                : "🎙️ Ghi âm buổi học"}
            </span>
          </button>
        )}

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

                  {/* Voice Recording Audio Player */}
                  {sessionLogs.sessionLog?.recordingUrl ? (
                    <div className="rounded-lg bg-indigo-950/40 border border-indigo-800/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎙️</span>
                          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                            Bản ghi âm buổi học (Voice Record)
                          </span>
                        </div>
                        <a
                          href={sessionLogs.sessionLog.recordingUrl}
                          download={`session_${sessionId}_audio.webm`}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-200 underline"
                        >
                          Tải file ghi âm
                        </a>
                      </div>
                      <audio
                        controls
                        className="w-full h-8 mt-2"
                        src={sessionLogs.sessionLog.recordingUrl}
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg bg-slate-800/40 border border-slate-750 p-3 text-xs text-slate-400 flex items-center justify-between">
                      <span>🎙️ Chưa có bản ghi âm được lưu cho buổi học này.</span>
                      {(isTutor || isAdmin) && (
                        <span className="text-[11px] text-amber-400">Bấm nút Ghi âm ở thanh công cụ trong khi dạy để tự động ghi.</span>
                      )}
                    </div>
                  )}

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
      {/* Modal yêu cầu học viên bật mic từ Gia sư (Tuân thủ quyền riêng tư WebRTC/Google Meet) */}
      {unmuteRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col">
            <h3 className="text-base font-bold text-slate-100">Yêu cầu phát biểu từ Gia sư</h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Gia sư mời bạn bật micro để trao đổi và phát biểu trong buổi học. Bạn có đồng ý bật micro không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setUnmuteRequestModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Để sau
              </button>
              <button
                onClick={() => {
                  if (localStream) {
                    localStream.getAudioTracks().forEach((t) => {
                      t.enabled = true;
                    });
                  }
                  setMicEnabled(true);
                  setUnmuteRequestModal(false);
                  setHostMutedNotice(null);

                  const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
                  const currentUserId = String(user?.id || (isHost ? "tutor" : "student-1"));

                  broadcastChannelRef.current?.postMessage({
                    action: "UPDATE_MEDIA_STATE",
                    senderId: currentUserId,
                    senderRole: meetingData?.role || "STUDENT",
                    micEnabled: true,
                    timestamp: Date.now(),
                  } as MeetingSignalPayload);

                  setParticipants((prev) =>
                    prev.map((p) => (p.isSelf ? { ...p, micEnabled: true } : p))
                  );
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow"
              >
                Bật micro
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        tone="warning"
        icon="logout"
        title="Rời phòng học?"
        message="Camera và micro sẽ tắt. Bạn có thể vào lại phòng học trong thời gian buổi học diễn ra."
        confirmLabel="Rời phòng"
        cancelLabel="Ở lại"
        onClose={() => setConfirmLeave(false)}
        onConfirm={leaveRoom}
      />
    </div>
  );
}
