import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Room, RoomEvent, Track, RemoteTrack, ConnectionState } from "livekit-client";
import { getSessionMeetingToken, getSessionMeetingLogs, uploadMeetingRecording } from "@/services/meetingService";
import { MeetingTokenResponse, MeetingSessionLogsResponse } from "@/interfaces/dto";
import { ClassroomParticipant, MeetingSignalPayload } from "../interfaces/meetingSignal.contract";
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

  const isTutor = meetingData?.role === "TUTOR";
  const isAdmin = meetingData?.role === "ADMIN";
  const isHost = isTutor || isAdmin;
  const roleLabel = isTutor ? "Gia sư" : isAdmin ? "Quản trị viên" : "Học sinh";
  const currentUserName = user?.fullName || (isHost ? (meetingData?.tutorName || "Gia sư") : "Học sinh");

  // Classroom media states
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<"participants" | "chat" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
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

  // WebRTC Media Streams & LiveKit SFU
  const roomRef = useRef<Room | null>(null);
  const [livekitState, setLivekitState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteTutorVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStudentVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteTutorTrack, setRemoteTutorTrack] = useState<RemoteTrack | null>(null);
  const [remoteScreenTrack, setRemoteScreenTrack] = useState<RemoteTrack | null>(null);
  const [remoteStudentTrack, setRemoteStudentTrack] = useState<RemoteTrack | null>(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi phòng / người dùng đổi, không theo từng lần bật tắt mic, camera
  }, [meetingData, user]);

  // Hàm phát tín hiệu đa kênh: LiveKit SFU Data Channel (Ưu tiên cross-browser) + BroadcastChannel (Fallback)
  const sendMeetingSignal = useCallback(
    (signal: MeetingSignalPayload) => {
      if (roomRef.current && roomRef.current.state === ConnectionState.Connected) {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(signal));
          roomRef.current.localParticipant.publishData(data, { reliable: true });
        } catch (err) {
          console.warn("Failed to publish data via LiveKit SFU:", err);
        }
      }
      try {
        broadcastChannelRef.current?.postMessage(signal);
      } catch (err) {
        console.warn("BroadcastChannel postMessage failed:", err);
      }
    },
    []
  );

  // Xử lý thống nhất tín hiệu thời gian thực từ LiveKit SFU và BroadcastChannel
  const handleIncomingSignal = useCallback(
    (signal: MeetingSignalPayload) => {
      if (!signal || !signal.action) return;
      const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
      const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

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

        const myPresence: ClassroomParticipant = {
          id: currentUserId,
          name: isHost ? `${user?.fullName || "Gia sư"} (Gia sư)` : user?.fullName || "Học sinh",
          role: meetingData?.role || "STUDENT",
          micEnabled: micEnabled,
          cameraEnabled: cameraEnabled,
          handRaised: handRaised,
          isSelf: false,
        };

        sendMeetingSignal({
          action: "PARTICIPANT_SYNC",
          senderId: currentUserId,
          senderRole: meetingData?.role || "STUDENT",
          participant: myPresence,
          timestamp: Date.now(),
        });
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
          if (roomRef.current?.localParticipant) {
            roomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => {});
          }
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
    },
    [cameraEnabled, handRaised, localStream, meetingData, micEnabled, sendMeetingSignal, user]
  );

  // Gắn luồng Remote Tutor Video vào thẻ video của Học sinh
  useEffect(() => {
    if (remoteTutorVideoRef.current && remoteTutorTrack) {
      remoteTutorTrack.attach(remoteTutorVideoRef.current);
    }
  }, [remoteTutorTrack]);

  // Gắn luồng Remote Screen Share vào thẻ video
  useEffect(() => {
    if (remoteScreenVideoRef.current && remoteScreenTrack) {
      remoteScreenTrack.attach(remoteScreenVideoRef.current);
    }
  }, [remoteScreenTrack]);

  // Gắn luồng Remote Student Video vào thẻ video của Gia sư
  useEffect(() => {
    if (remoteStudentVideoRef.current && remoteStudentTrack) {
      remoteStudentTrack.attach(remoteStudentVideoRef.current);
    }
  }, [remoteStudentTrack]);

  // Kết nối và đồng bộ LiveKit SFU Room thời gian thực
  useEffect(() => {
    if (!sessionId || !meetingData || !meetingData.serverUrl || !meetingData.token) return;

    let isMounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const isHost = meetingData.role === "TUTOR" || meetingData.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));
    const currentUserName = user?.fullName || (isHost ? (meetingData.tutorName || "Gia sư") : "Học sinh");

    const syncLiveKitParticipants = () => {
      if (!isMounted) return;
      const selfParticipant: ClassroomParticipant = {
        id: currentUserId,
        name: isHost ? `${currentUserName} (Host)` : `${currentUserName} (Tôi)`,
        role: meetingData.role,
        micEnabled: micEnabled,
        cameraEnabled: cameraEnabled,
        handRaised: handRaised,
        isSelf: true,
      };

      const remotes: ClassroomParticipant[] = [];
      let foundTutor = isHost;

      room.remoteParticipants.forEach((rp) => {
        let metaRole: string = "STUDENT";
        try {
          if (rp.metadata) {
            const parsed = JSON.parse(rp.metadata);
            if (parsed.role) metaRole = parsed.role;
          }
        } catch {
          // metadata không phải JSON thì bỏ qua, đoán vai trò theo tên
        }
        if (!metaRole) {
          metaRole = rp.name?.includes("Gia sư") ? "TUTOR" : "STUDENT";
        }
        if (metaRole === "TUTOR") {
          foundTutor = true;
        }

        remotes.push({
          id: rp.identity,
          name: rp.name || "Thành viên",
          role: metaRole as ClassroomParticipant["role"],
          micEnabled: rp.isMicrophoneEnabled,
          cameraEnabled: rp.isCameraEnabled,
          handRaised: false,
          isSelf: false,
        });

        const numId = Number(rp.identity);
        if (!isNaN(numId) && numId > 0 && metaRole === "STUDENT") {
          setOnlineParticipantIds((prev) => new Set(prev).add(numId));
        }
      });

      setTutorOnline(foundTutor);
      setParticipants([selfParticipant, ...remotes]);
    };

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (isMounted) setLivekitState(state);
    });

    room.on(RoomEvent.Connected, async () => {
      if (!isMounted) return;
      setLivekitState(ConnectionState.Connected);
      syncLiveKitParticipants();

      // Xuất bản camera/micro lên SFU nếu đang bật
      try {
        if (cameraEnabled) {
          await room.localParticipant.setCameraEnabled(true);
          const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPub?.videoTrack && localVideoRef.current) {
            camPub.videoTrack.attach(localVideoRef.current);
          }
        }
        if (micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } catch (pubErr) {
        console.warn("Could not publish initial local media to LiveKit:", pubErr);
      }

      // Thông báo chào phòng qua Data Channel
      const myPresence: ClassroomParticipant = {
        id: currentUserId,
        name: isHost ? `${currentUserName} (Gia sư)` : currentUserName,
        role: meetingData.role,
        micEnabled: micEnabled,
        cameraEnabled: cameraEnabled,
        handRaised: handRaised,
        isSelf: false,
      };

      sendMeetingSignal({
        action: "PARTICIPANT_JOIN",
        senderId: currentUserId,
        senderRole: meetingData.role,
        participant: myPresence,
        timestamp: Date.now(),
      });
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      syncLiveKitParticipants();
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      syncLiveKitParticipants();
      const numId = Number(participant.identity);
      if (!isNaN(numId)) {
        setOnlineParticipantIds((prev) => {
          const next = new Set(prev);
          next.delete(numId);
          return next;
        });
      }
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        if (publication.source === Track.Source.ScreenShare) {
          setRemoteScreenTrack(track);
        } else {
          let metaRole = "";
          try {
            if (participant.metadata) {
              const meta = JSON.parse(participant.metadata);
              metaRole = meta.role;
            }
          } catch {
          // metadata không phải JSON thì bỏ qua, đoán vai trò theo tên
        }
          if (metaRole === "TUTOR" || participant.name?.includes("Gia sư")) {
            setRemoteTutorTrack(track);
          } else {
            setRemoteStudentTrack(track);
          }
        }
      } else if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        audioEl.autoplay = true;
      }
      syncLiveKitParticipants();
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach();
      if (publication.source === Track.Source.ScreenShare) {
        setRemoteScreenTrack(null);
      } else {
        let metaRole = "";
        try {
          if (participant.metadata) {
            const meta = JSON.parse(participant.metadata);
            metaRole = meta.role;
          }
        } catch {
          // metadata không phải JSON thì bỏ qua, đoán vai trò theo tên
        }
        if (metaRole === "TUTOR" || participant.name?.includes("Gia sư")) {
          setRemoteTutorTrack(null);
        } else {
          setRemoteStudentTrack(null);
        }
      }
      syncLiveKitParticipants();
    });

    room.on(RoomEvent.TrackMuted, () => syncLiveKitParticipants());
    room.on(RoomEvent.TrackUnmuted, () => syncLiveKitParticipants());

    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(payload);
        const signal = JSON.parse(jsonStr) as MeetingSignalPayload;
        handleIncomingSignal(signal);
      } catch (err) {
        console.warn("Could not decode LiveKit data payload:", err);
      }
    });

    // Kết nối đến LiveKit SFU Server
    room.connect(meetingData.serverUrl, meetingData.token).catch((err) => {
      console.warn("LiveKit Room connection failed:", err);
    });

    // Fallback BroadcastChannel cho tab cùng trình duyệt
    const channelName = `classroom_meeting_session_${sessionId}`;
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
    broadcastChannelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent<MeetingSignalPayload>) => {
        handleIncomingSignal(event.data);
      };
    }

    const handleBeforeUnload = () => {
      sendMeetingSignal({
        action: "PARTICIPANT_LEAVE",
        senderId: currentUserId,
        senderRole: meetingData.role,
        timestamp: Date.now(),
      });
      room.disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendMeetingSignal({
        action: "PARTICIPANT_LEAVE",
        senderId: currentUserId,
        senderRole: meetingData.role,
        timestamp: Date.now(),
      });
      room.disconnect();
      roomRef.current = null;
      if (channel) {
        channel.close();
        broadcastChannelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi phòng / người dùng đổi, không theo từng lần bật tắt mic, camera
  }, [sessionId, meetingData, user, handleIncomingSignal, sendMeetingSignal]);

  const toggleMic = async () => {
    const nextState = !micEnabled;
    if (roomRef.current?.localParticipant) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
      } catch (err) {
        console.warn("LiveKit setMicrophoneEnabled error:", err);
      }
    }
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
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    sendMeetingSignal({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: nextState,
      cameraEnabled: cameraEnabled,
      handRaised: handRaised,
      timestamp: Date.now(),
    });

    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, micEnabled: nextState } : p))
    );
  };

  const handleHostMuteParticipant = (targetId: string) => {
    const currentUserId = String(user?.id || "tutor");
    sendMeetingSignal({
      action: "MUTE_MIC",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: targetId,
      timestamp: Date.now(),
      reason: "HOST_MUTED",
    });

    setParticipants((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, micEnabled: false } : p))
    );
  };

  const handleHostMuteAll = () => {
    const currentUserId = String(user?.id || "tutor");
    sendMeetingSignal({
      action: "MUTE_MIC",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: "ALL",
      timestamp: Date.now(),
      reason: "HOST_MUTED_ALL",
    });

    setParticipants((prev) =>
      prev.map((p) => (p.role === "STUDENT" ? { ...p, micEnabled: false } : p))
    );
  };

  const handleHostRequestUnmute = (targetId: string) => {
    const currentUserId = String(user?.id || "tutor");
    sendMeetingSignal({
      action: "REQUEST_UNMUTE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      targetUserId: targetId,
      timestamp: Date.now(),
    });
  };

  const toggleCamera = async () => {
    const nextCam = !cameraEnabled;
    if (roomRef.current?.localParticipant) {
      try {
        await roomRef.current.localParticipant.setCameraEnabled(nextCam);
        if (nextCam && localVideoRef.current) {
          const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPub?.videoTrack) {
            camPub.videoTrack.attach(localVideoRef.current);
          }
        }
      } catch (err) {
        console.warn("LiveKit setCameraEnabled error:", err);
      }
    }
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = nextCam;
      });
    }
    setCameraEnabled(nextCam);

    const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
    const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

    sendMeetingSignal({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: micEnabled,
      cameraEnabled: nextCam,
      handRaised: handRaised,
      timestamp: Date.now(),
    });

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

    sendMeetingSignal({
      action: "UPDATE_MEDIA_STATE",
      senderId: currentUserId,
      senderRole: meetingData?.role || "STUDENT",
      micEnabled: micEnabled,
      cameraEnabled: cameraEnabled,
      handRaised: nextHand,
      timestamp: Date.now(),
    });

    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, handRaised: nextHand } : p))
    );
  };

  const toggleScreenShare = async () => {
    const nextScreen = !screenSharing;
    if (roomRef.current?.localParticipant) {
      try {
        await roomRef.current.localParticipant.setScreenShareEnabled(nextScreen);
        setScreenSharing(nextScreen);
        return;
      } catch (err) {
        console.warn("LiveKit screen share error:", err);
      }
    }
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

    sendMeetingSignal({
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
    });

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

    sendMeetingSignal({
      action: "WHITEBOARD_CLEAR",
      senderId: currentUserId,
      senderRole: meetingData?.role || "TUTOR",
      timestamp: Date.now(),
    });
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

    sendMeetingSignal({
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

  const startVoiceRecording = async (isAuto = false) => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        return;
      }

      let streamToRecord: MediaStream | null = null;
      if (localStream && localStream.getAudioTracks().length > 0) {
        streamToRecord = new MediaStream(localStream.getAudioTracks());
      } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          streamToRecord = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (mediaErr) {
          if (!isAuto) {
            alert("Không tìm thấy micro khả dụng để ghi âm. Vui lòng cấp quyền truy cập micro cho trình duyệt.");
          } else {
            console.warn("Auto recording: could not access microphone:", mediaErr);
          }
          return;
        }
      }

      if (!streamToRecord) {
        if (!isAuto) {
          alert("Không tìm thấy micro khả dụng để ghi âm.");
        }
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
      if (isAuto) {
        setRecordingSaveNotice("Buổi học đã tự động bắt đầu ghi âm.");
      } else {
        setRecordingSaveNotice(null);
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Không thể khởi động ghi âm:", err);
      if (!isAuto) {
        alert("Không thể khởi động ghi âm. Vui lòng cấp quyền truy cập micro cho trình duyệt.");
      }
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

  // Tự động bắt đầu ghi âm khi buổi học bắt đầu kết nối (dành cho Gia sư hoặc Admin)
  const hasAutoStartedRecordingRef = useRef(false);
  useEffect(() => {
    if (
      livekitState === ConnectionState.Connected &&
      (isTutor || isAdmin) &&
      !isRecordingVoice &&
      !hasAutoStartedRecordingRef.current
    ) {
      hasAutoStartedRecordingRef.current = true;
      startVoiceRecording(true).catch((err) => {
        console.warn("Tự động ghi âm chưa khởi động được:", err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi phòng / người dùng đổi, không theo từng lần bật tắt mic, camera
  }, [livekitState, isTutor, isAdmin, isRecordingVoice]);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const handleLeave = () => setConfirmLeave(true);
  const leaveRoom = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsSavingRecording(true);
      await new Promise<void>((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          resolve();
          return;
        }
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (audioBlob.size > 0 && sessionId) {
            try {
              await uploadMeetingRecording(Number(sessionId), audioBlob);
            } catch (err) {
              console.error("Lỗi khi tự động lưu bản ghi âm khi kết thúc buổi học:", err);
            }
          }
          resolve();
        };
        recorder.stop();
      });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      setIsSavingRecording(false);
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


  const hasOnlineStudent = onlineParticipantIds.size > 0 || participants.some((p) => !p.isSelf && p.role !== "TUTOR");
  const studentParticipant = participants.find((p) => !p.isSelf && p.role !== "TUTOR");
  const studentName =
    sessionRoster?.students.find((s) => onlineParticipantIds.has(s.studentId))?.fullName ||
    studentParticipant?.name ||
    sessionRoster?.students[0]?.fullName ||
    "Học sinh";
  const studentMicOn = studentParticipant?.micEnabled ?? false;
  const studentHandRaised =
    studentParticipant?.handRaised ??
    (sessionRoster?.students[0] ? handRaisedIds.has(sessionRoster.students[0].studentId) : false);

  const handleCopyRoomCode = () => {
    if (meetingData?.roomName) {
      navigator.clipboard.writeText(meetingData.roomName);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b0c0e] text-slate-100 overflow-hidden select-none font-sans">
      {/* ── Top Bar (Minimalist Google Meet Style) ─────────────────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-[#12141a] px-4 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">Trực tiếp</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 leading-tight">
              {meetingData.courseTitle}
            </h1>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Buổi {meetingData.sessionNumber}
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Center: Clean Room Code */}
        <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-900/80 border border-white/10 px-3 py-1 text-xs">
          <span className="text-slate-400">Phòng:</span>
          <span className="font-mono text-indigo-300 font-semibold">{meetingData.roomName}</span>
          <button
            type="button"
            onClick={handleCopyRoomCode}
            className="ml-1 text-slate-400 hover:text-white transition flex items-center gap-1"
            title="Sao chép mã phòng"
          >
            <Icon name={copiedRoomCode ? "check" : "content_copy"} className="text-sm text-indigo-400" />
            {copiedRoomCode && <span className="text-[10px] text-emerald-400 font-medium">Đã chép!</span>}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isRecordingVoice && (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs text-rose-300 font-semibold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Ghi âm: {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 rounded-full bg-slate-900/80 border border-white/10 px-2.5 py-1 text-xs"
            title={livekitState === ConnectionState.Connected ? "Kết nối LiveKit SFU ổn định" : "Đang kết nối lại..."}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                livekitState === ConnectionState.Connected
                  ? "bg-emerald-400 animate-pulse"
                  : livekitState === ConnectionState.Connecting
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              {livekitState === ConnectionState.Connected ? "Mạng tốt" : "Đang kết nối"}
            </span>
          </div>

          {(isTutor || isAdmin) && (
            <button
              type="button"
              onClick={loadMeetingLogs}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Xem nhật ký tham gia MongoDB Atlas"
            >
              <Icon name="history_edu" className="text-sm text-indigo-400" />
              <span className="hidden sm:inline">Nhật ký</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowWhiteboard((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              showWhiteboard
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            <Icon name="draw" className="text-sm" />
            <span>{showWhiteboard ? "Ẩn bảng" : "Bảng vẽ"}</span>
          </button>
        </div>
      </header>

      {/* Voice Recording Save Notice Banner */}
      {recordingSaveNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="mic" className="text-sm text-emerald-400" />
            <span>{recordingSaveNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecordingSaveNotice(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 text-xs"
            aria-label="Đóng thông báo"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
      )}

      {/* Permission Denied Notice Banner */}
      {mediaPermissionDenied && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-300 flex items-center justify-between z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="warning" className="text-sm text-amber-400" />
            <span>Thiết bị webcam/micro chưa được cấp quyền truy cập. Bạn vẫn có thể xem bảng trắng và trò chuyện.</span>
          </div>
          <button
            type="button"
            onClick={() => setMediaPermissionDenied(false)}
            className="text-amber-400 hover:text-white text-xs font-bold"
            aria-label="Đóng cảnh báo"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
      )}

      {/* Host Muted Notice Banner */}
      {hostMutedNotice && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="info" className="text-sm text-rose-400" />
            <span className="font-semibold text-rose-300">[Thông báo]</span>
            <span>{hostMutedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setHostMutedNotice(null)}
            className="text-rose-400 hover:text-white font-bold ml-2 text-xs"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── Main Workspace: Adaptive Stage & Unified Drawer ──────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Whiteboard Canvas Stage */}
        {showWhiteboard && (
          <div className="flex flex-1 flex-col border-r border-slate-800 bg-[#121316]">
            {/* Whiteboard Toolbar */}
            <div className="flex h-11 items-center justify-between border-b border-slate-800 bg-[#181a20] px-3">
              {(isTutor || isAdmin) ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300 mr-1 flex items-center gap-1">
                      <Icon name="draw" className="text-xs text-indigo-400" />
                      Bảng vẽ:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEraser(false)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        !isEraser ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon name="edit" className="text-xs" />
                      Bút viết
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEraser(true)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        isEraser ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon name="auto_fix_normal" className="text-xs" />
                      Tẩy xóa
                    </button>

                    {!isEraser && (
                      <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2">
                        {["#2563eb", "#dc2626", "#16a34a", "#0f172a"].map((c) => (
                          <button
                            key={c}
                            type="button"
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
                      type="button"
                      onClick={clearCanvas}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-rose-900/40 hover:text-rose-300 transition"
                    >
                      Xóa toàn bộ
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                    <Icon name="visibility" className="text-sm" />
                    Bảng bài giảng của gia sư (Chế độ xem)
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
                className={`h-full w-full object-contain border border-slate-200 rounded-xl shadow-sm ${
                  isTutor || isAdmin ? "cursor-crosshair" : "cursor-default pointer-events-none"
                }`}
              />
            </div>
          </div>
        )}

        {/* Video Area */}
        <div className={`flex flex-col ${showWhiteboard ? "w-80 lg:w-96 border-l border-slate-800 bg-[#0e0f14]" : "flex-1 bg-[#0c0d11]"} overflow-hidden`}>
          {showWhiteboard ? (
            /* Whiteboard Side Video Column */
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* Tutor Tile */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-md flex items-center justify-center">
                {isTutor ? (
                  cameraEnabled ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Icon name="videocam_off" className="text-2xl mb-1" />
                      <span className="text-[11px]">Camera tắt</span>
                    </div>
                  )
                ) : remoteTutorTrack ? (
                  <video ref={remoteTutorVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
                      GS
                    </div>
                    <span className="text-xs font-semibold text-slate-200 mt-1">{meetingData.tutorName || "Gia sư"}</span>
                    <span className="text-[10px] text-slate-400">{tutorOnline ? "Camera tắt" : "Chưa vào phòng"}</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] text-white">
                  <span className="font-medium truncate max-w-[120px]">{isTutor ? currentUserName : (meetingData.tutorName || "Gia sư")}</span>
                  <span className="text-indigo-300 font-semibold">(Gia sư)</span>
                  <Icon name={isTutor ? (micEnabled ? "mic" : "mic_off") : "mic"} className="text-xs text-emerald-400" />
                </div>
              </div>

              {/* Student Tile */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-md flex items-center justify-center">
                {!isTutor ? (
                  cameraEnabled ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Icon name="videocam_off" className="text-2xl mb-1" />
                      <span className="text-[11px]">Camera tắt</span>
                    </div>
                  )
                ) : remoteStudentTrack ? (
                  <video ref={remoteStudentVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                ) : hasOnlineStudent ? (
                  <div className="flex flex-col items-center text-slate-400">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                      {studentName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 mt-1">{studentName}</span>
                    <span className="text-[10px] text-slate-400">Camera tắt</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500 p-2 text-center">
                    <Icon name="person" className="text-2xl text-slate-600 mb-1" />
                    <span className="text-xs text-slate-400">Chờ học sinh vào...</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] text-white">
                  <span className="font-medium truncate max-w-[120px]">{!isTutor ? currentUserName : studentName}</span>
                  <span className="text-slate-400">(Học sinh)</span>
                  <Icon
                    name={!isTutor ? (micEnabled ? "mic" : "mic_off") : (studentMicOn ? "mic" : "mic_off")}
                    className={`text-xs ${(!isTutor ? micEnabled : studentMicOn) ? "text-emerald-400" : "text-rose-400"}`}
                  />
                </div>
                {studentHandRaised && (
                  <div className="absolute top-2 right-2 rounded-full bg-amber-500 text-slate-950 font-bold px-2 py-0.5 text-[10px] flex items-center gap-1 shadow animate-pulse">
                    <Icon name="pan_tool" className="text-xs" />
                    <span>Giơ tay</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Central Presentation or Dynamic Video Classroom Grid */
            <div className="flex-1 h-full p-4 flex items-center justify-center overflow-hidden">
              {screenSharing || remoteScreenTrack ? (
                /* Screen Share Presentation Stage */
                <div className="relative w-full h-[76vh] max-h-[820px] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center">
                  {screenSharing && screenStream ? (
                    <video ref={screenVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
                  ) : remoteScreenTrack ? (
                    <video ref={remoteScreenVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
                  ) : null}

                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-white/10">
                    <Icon name="screen_share" className="text-sm text-indigo-400" />
                    <span className="font-semibold">{screenSharing ? "Màn hình của bạn" : "Màn hình đang chia sẻ"}</span>
                  </div>

                  {cameraEnabled && (
                    <div className="absolute bottom-4 right-4 z-20 h-28 w-44 overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 shadow-2xl">
                      <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                      <div className="absolute bottom-1.5 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        {currentUserName} (Bạn)
                      </div>
                    </div>
                  )}
                </div>
              ) : ((isTutor && !hasOnlineStudent) || (!isTutor && !tutorOnline)) ? (
                /* 1-Person Spotlight Waiting Card */
                <div className="relative w-full max-w-4xl h-[72vh] rounded-2xl overflow-hidden bg-[#14161c] border border-white/10 shadow-2xl flex items-center justify-center">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-1.5 text-xs text-slate-300 shadow-xl">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    <span>{isTutor ? "Đang chờ học sinh tham gia phòng học" : "Đang chờ gia sư vào phòng học"}</span>
                  </div>

                  {cameraEnabled ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                  ) : (
                    <div className="flex flex-col items-center text-center p-6">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-3xl border border-indigo-500/30 mb-3 shadow-inner">
                        {currentUserName.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-base font-bold text-slate-100">{currentUserName}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Icon name="videocam_off" className="text-sm" />
                        Camera của bạn đang tắt
                      </p>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs text-white">
                    <span className="font-semibold">{currentUserName}</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      {roleLabel}
                    </span>
                    <Icon name={micEnabled ? "mic" : "mic_off"} className={micEnabled ? "text-emerald-400 text-sm" : "text-rose-400 text-sm"} />
                  </div>
                </div>
              ) : (
                /* 1-on-1 Balanced Split View (50/50 Stage) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[72vh] w-full max-w-6xl mx-auto items-center">
                  {/* Tutor Card */}
                  <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[#14161c] border border-white/10 shadow-2xl flex items-center justify-center">
                    {isTutor ? (
                      cameraEnabled ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                      ) : (
                        <div className="flex flex-col items-center text-center p-6">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-2xl border border-indigo-500/30 mb-2">
                            GS
                          </div>
                          <p className="text-sm font-bold text-slate-200">{currentUserName}</p>
                          <p className="text-xs text-slate-400 mt-1">Camera đang tắt</p>
                        </div>
                      )
                    ) : remoteTutorTrack ? (
                      <video ref={remoteTutorVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-2xl border border-indigo-500/30 mb-2">
                          GS
                        </div>
                        <p className="text-sm font-bold text-slate-200">{meetingData.tutorName || "Gia sư phụ trách"}</p>
                        <p className="text-xs text-slate-400 mt-1">Camera đang tắt</p>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs text-white">
                      <span className="font-semibold">{isTutor ? currentUserName : (meetingData.tutorName || "Gia sư phụ trách")}</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                        Gia sư
                      </span>
                      <Icon
                        name={isTutor ? (micEnabled ? "mic" : "mic_off") : "mic"}
                        className={isTutor ? (micEnabled ? "text-emerald-400 text-sm" : "text-rose-400 text-sm") : "text-emerald-400 text-sm"}
                      />
                    </div>
                  </div>

                  {/* Student Card */}
                  <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[#14161c] border border-white/10 shadow-2xl flex items-center justify-center">
                    {!isTutor ? (
                      cameraEnabled ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
                      ) : (
                        <div className="flex flex-col items-center text-center p-6">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-2xl border border-slate-700 mb-2">
                            {currentUserName.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-slate-200">{currentUserName}</p>
                          <p className="text-xs text-slate-400 mt-1">Camera đang tắt</p>
                        </div>
                      )
                    ) : remoteStudentTrack ? (
                      <video ref={remoteStudentVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-2xl border border-slate-700 mb-2">
                          {studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-bold text-slate-200">{studentName}</p>
                        <p className="text-xs text-slate-400 mt-1">Camera đang tắt</p>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs text-white">
                      <span className="font-semibold">{!isTutor ? currentUserName : studentName}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                        Học sinh
                      </span>
                      <Icon
                        name={!isTutor ? (micEnabled ? "mic" : "mic_off") : (studentMicOn ? "mic" : "mic_off")}
                        className={(!isTutor ? micEnabled : studentMicOn) ? "text-emerald-400 text-sm" : "text-rose-400 text-sm"}
                      />
                    </div>

                    {studentHandRaised && (
                      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-amber-500 text-slate-950 font-bold px-3 py-1 text-xs shadow-lg animate-bounce">
                        <Icon name="pan_tool" className="text-sm" />
                        <span>Đang giơ tay</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Drawer: Unified Tabs for Participants & Chat ────────── */}
        {activeSidePanel && (
          <aside
            aria-label="Thanh tiện ích lớp học"
            className="flex w-84 sm:w-96 flex-col border-l border-slate-800 bg-[#12141a] text-slate-100 shadow-2xl z-20 flex-shrink-0"
          >
            {/* Tab Switcher Header */}
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4 bg-[#161820]">
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveSidePanel("participants")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeSidePanel === "participants"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon name="groups" className="text-sm" />
                  <span>
                    Thành viên (
                    {sessionRoster
                      ? onlineParticipantIds.size + (tutorOnline ? 1 : 0)
                      : participants.length}
                    )
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSidePanel("chat");
                    setUnreadChatCount(0);
                  }}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeSidePanel === "chat"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon name="chat" className="text-sm" />
                  <span>Trò chuyện</span>
                  {unreadChatCount > 0 && activeSidePanel !== "chat" && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveSidePanel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                aria-label="Đóng bảng bên"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>

            {/* Participants Tab Content */}
            {activeSidePanel === "participants" && (
              <ClassroomParticipantsSidebar
                embedded={true}
                isOpen={true}
                onClose={() => setActiveSidePanel(null)}
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
                  const isCurrentlyMuted = mutedStudentIds.has(stId);
                  if (isCurrentlyMuted) {
                    handleHostRequestUnmute(String(stId));
                  } else {
                    setMutedStudentIds((prev) => new Set(prev).add(stId));
                    handleHostMuteParticipant(String(stId));
                  }
                }}
                onMuteAll={handleHostMuteAll}
              />
            )}

            {/* Chat Tab Content */}
            {activeSidePanel === "chat" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 italic">
                      Chưa có tin nhắn nào trong buổi học.
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                          <span className="font-semibold text-slate-300">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.isMe
                              ? "bg-indigo-600 text-white rounded-tr-sm shadow-sm"
                              : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-3 flex gap-2 bg-[#161820]">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Nhắn tin cho cả lớp..."
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-750 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMsg.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 text-xs font-semibold text-white transition flex items-center justify-center"
                    aria-label="Gửi tin nhắn"
                  >
                    <Icon name="send" className="text-sm" />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Floating Pill Dock (Bottom Google Meet Style) ────────────────── */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2 shadow-2xl">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            micEnabled
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              : "bg-rose-600 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500"
          }`}
          title={micEnabled ? "Tắt micro" : "Bật micro"}
          aria-label={micEnabled ? "Tắt micro" : "Bật micro"}
        >
          <Icon name={micEnabled ? "mic" : "mic_off"} className="text-[20px]" />
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            cameraEnabled
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              : "bg-rose-600 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500"
          }`}
          title={cameraEnabled ? "Tắt camera" : "Bật camera"}
          aria-label={cameraEnabled ? "Tắt camera" : "Bật camera"}
        >
          <Icon name={cameraEnabled ? "videocam" : "videocam_off"} className="text-[20px]" />
        </button>

        {/* Screen Share Toggle */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            screenSharing
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-500"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title={screenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}
          aria-label={screenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}
        >
          <Icon name={screenSharing ? "stop_screen_share" : "screen_share"} className="text-[20px]" />
        </button>

        {/* Raise Hand Toggle */}
        <button
          type="button"
          onClick={toggleHandRaise}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            handRaised
              ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-900/40 hover:bg-amber-400"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title={handRaised ? "Hạ tay xuống" : "Giơ tay phát biểu"}
          aria-label={handRaised ? "Hạ tay xuống" : "Giơ tay phát biểu"}
        >
          <Icon name="pan_tool" className="text-[20px]" />
        </button>

        {/* Voice Recording (Tutor / Admin) */}
        {(isTutor || isAdmin) && (
          <button
            type="button"
            onClick={() => (isRecordingVoice ? stopVoiceRecording() : void startVoiceRecording())}
            disabled={isSavingRecording}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
              isRecordingVoice
                ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/50"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={
              isSavingRecording
                ? "Đang lưu ghi âm..."
                : isRecordingVoice
                ? "Dừng ghi âm buổi học"
                : "Bắt đầu ghi âm buổi học"
            }
            aria-label="Ghi âm buổi học"
          >
            <Icon name="fiber_manual_record" className="text-[20px]" />
          </button>
        )}

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Participants Button */}
        <button
          type="button"
          onClick={() => setActiveSidePanel((prev) => (prev === "participants" ? null : "participants"))}
          className={`h-11 w-11 rounded-full flex items-center justify-center relative transition-all ${
            activeSidePanel === "participants"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title="Danh sách người tham gia"
          aria-label="Danh sách người tham gia"
        >
          <Icon name="groups" className="text-[20px]" />
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
            {sessionRoster ? onlineParticipantIds.size + (tutorOnline ? 1 : 0) : participants.length}
          </span>
        </button>

        {/* Chat Button */}
        <button
          type="button"
          onClick={() => {
            setActiveSidePanel((prev) => (prev === "chat" ? null : "chat"));
            setUnreadChatCount(0);
          }}
          className={`h-11 w-11 rounded-full flex items-center justify-center relative transition-all ${
            activeSidePanel === "chat"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
          }`}
          title="Trò chuyện trong lớp"
          aria-label="Trò chuyện trong lớp"
        >
          <Icon name="chat" className="text-[20px]" />
          {unreadChatCount > 0 && activeSidePanel !== "chat" && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white animate-pulse">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Leave Classroom Button */}
        <button
          type="button"
          onClick={handleLeave}
          className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-rose-950/40 ml-1"
          title="Rời phòng học"
          aria-label="Rời phòng học"
        >
          <Icon name="call_end" className="text-[18px]" />
          <span className="hidden sm:inline">Rời phòng</span>
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
                <Icon name="close" className="text-base" />
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
                          <Icon name="mic" className="text-base text-indigo-400" />
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
                      <span>Chưa có bản ghi âm được lưu cho buổi học này.</span>
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
                  if (roomRef.current?.localParticipant) {
                    roomRef.current.localParticipant.setMicrophoneEnabled(true).catch(() => {});
                  }
                  if (localStream) {
                    localStream.getAudioTracks().forEach((t) => {
                      t.enabled = true;
                    });
                  }
                  setMicEnabled(true);
                  setUnmuteRequestModal(false);
                  setHostMutedNotice(null);

                  const isHost = meetingData?.role === "TUTOR" || meetingData?.role === "ADMIN";
                  const currentUserId = String(user?.id || (isHost ? "tutor" : "student"));

                  sendMeetingSignal({
                    action: "UPDATE_MEDIA_STATE",
                    senderId: currentUserId,
                    senderRole: meetingData?.role || "STUDENT",
                    micEnabled: true,
                    timestamp: Date.now(),
                  });

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
