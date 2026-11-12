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
  | "PARTICIPANT_SYNC"
  | "PARTICIPANT_LEAVE"
  | "UPDATE_MEDIA_STATE"
  | "CHAT_MESSAGE"
  | "WHITEBOARD_DRAW"
  | "WHITEBOARD_CLEAR"
  | "WHITEBOARD_TEXT";

export interface WhiteboardStrokePayload {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  size: number;
  isEraser: boolean;
}

export interface WhiteboardTextPayload {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface MeetingChatMessagePayload {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: MeetingParticipantRole;
  text: string;
  time: string;
}

export interface MeetingSignalPayload {
  action: MeetingSignalAction;
  senderId: string;
  senderName?: string;
  senderRole: MeetingParticipantRole;
  targetUserId?: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  handRaised?: boolean;
  timestamp: number;
  reason?: string;
  participant?: ClassroomParticipant;
  participantsList?: ClassroomParticipant[];
  chatMessage?: MeetingChatMessagePayload;
  drawStroke?: WhiteboardStrokePayload;
  drawText?: WhiteboardTextPayload;
}
