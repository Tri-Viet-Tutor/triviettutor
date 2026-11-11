export type MeetingParticipantRole = "TUTOR" | "STUDENT" | "ADMIN";

export interface ClassroomParticipant {
  id: string;
  name: string;
  role: MeetingParticipantRole;
  micEnabled: boolean;
  cameraEnabled: boolean;
  handRaised: boolean;
  isSelf: boolean;
}

export type MeetingSignalAction =
  | "MUTE_MIC"
  | "REQUEST_UNMUTE"
  | "PARTICIPANT_JOIN"
  | "PARTICIPANT_LEAVE"
  | "UPDATE_MEDIA_STATE";

export interface MeetingSignalPayload {
  action: MeetingSignalAction;
  senderId: string;
  senderRole: MeetingParticipantRole;
  targetUserId?: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  handRaised?: boolean;
  timestamp: number;
  reason?: string;
}
