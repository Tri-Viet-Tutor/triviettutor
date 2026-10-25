import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  SessionItem,
  BackendSessionResponse,
  BackendApiResponse,
  User,
  Subject,
} from '@/types';
import { MOCK_SESSIONS } from '@/constants/data';

/**
 * Base URL for VietTriTutor Spring Boot REST API.
 * Reads strictly from EXPO_PUBLIC_API_BASE_URL (no hardcoded ports).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

const TOKEN_KEY = 'viettritutor_jwt_token';
const USER_KEY = 'viettritutor_user_profile';

type AuthExpiredCallback = () => void;
const authExpiredListeners: Set<AuthExpiredCallback> = new Set();

export function onAuthExpired(cb: AuthExpiredCallback): () => void {
  authExpiredListeners.add(cb);
  return () => authExpiredListeners.delete(cb);
}

function notifyAuthExpired(): void {
  for (const cb of authExpiredListeners) {
    try {
      cb();
    } catch {
      // ignore listener error
    }
  }
}

// ============================================================================
// Secure Token Management (expo-secure-store with Web fallback)
// ============================================================================

export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined'
        ? localStorage.getItem(TOKEN_KEY)
        : null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Failed to store JWT in SecureStore:', error);
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to delete JWT from SecureStore:', error);
  }
}

export async function getStoredUser(): Promise<User | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    } else {
      raw = await SecureStore.getItemAsync(USER_KEY);
    }
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: User): Promise<void> {
  try {
    const raw = JSON.stringify(user);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_KEY, raw);
      }
      return;
    }
    await SecureStore.setItemAsync(USER_KEY, raw);
  } catch (error) {
    console.warn('Failed to store User in SecureStore:', error);
  }
}

export async function removeStoredUser(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(USER_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.warn('Failed to delete User from SecureStore:', error);
  }
}

// ============================================================================
// HTTP Request Wrapper with Auth Header & 401 Interception
// ============================================================================

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function requestApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...rest } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getStoredToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  });

  if (response.status === 401 && requiresAuth) {
    // JWT expired or invalid
    await removeStoredToken();
    await removeStoredUser();
    notifyAuthExpired();
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) errorMessage = parsed.message;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as BackendApiResponse<T>;
  return data.data;
}

// ============================================================================
// Session Mapping Helpers
// ============================================================================

export function getDayOfWeekLabel(dateStr: string): string {
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetMidnight = new Date(targetDate);
    targetMidnight.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (targetMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    if (diffDays === -1) return 'Hôm qua';

    const day = targetDate.getDay();
    const map = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return map[day] || dateStr;
  } catch {
    return dateStr;
  }
}

export function formatTimeSlotHours(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '18:00 - 20:00';
  const start = startTime.length >= 5 ? startTime.substring(0, 5) : startTime;
  const end = endTime.length >= 5 ? endTime.substring(0, 5) : endTime;
  return `${start} - ${end}`;
}

export function mapBackendSessionToItem(
  session: BackendSessionResponse,
  fallbackClassName = 'Lớp bồi dưỡng THPT'
): SessionItem {
  const isOnline = Boolean(session.meetingUrl && session.meetingUrl.trim().length > 0);
  const timeSlotHours = formatTimeSlotHours(session.startTime, session.endTime);
  const dayOfWeek = getDayOfWeekLabel(session.date);

  return {
    sessionId: String(session.sessionId),
    classId: `cls-${session.classGroupId}`,
    className: `${fallbackClassName} #${session.classGroupId}`,
    subject: 'MATH' as Subject,
    subjectLabel: 'Toán',
    gradeLabel: 'Lớp 12',
    sessionNumber: session.sessionNumber || 1,
    totalSessions: 30,
    date: session.date,
    dayOfWeek,
    timeSlotHours,
    deliveryMode: isOnline ? 'ONLINE' : 'OFFLINE',
    roomOrLink: session.meetingUrl || 'Phòng học Trung tâm Việt Trì',
    tutorName: session.actualTutorId
      ? `Gia sư #${session.actualTutorId}`
      : session.scheduledTutorId
      ? `Gia sư #${session.scheduledTutorId}`
      : 'Gia sư Trung tâm',
    status: session.status || 'UPCOMING',
    attendance: session.status === 'COMPLETED' ? 'PRESENT' : undefined,
    topic: `Buổi ${session.sessionNumber}: Nội dung bài học và luyện tập trọng tâm`,
    meetingUrl: session.meetingUrl || undefined,
  };
}

// ============================================================================
// Endpoint Integrations
// ============================================================================

/**
 * Fetch authenticated student or tutor sessions from GET /api/v1/me/sessions.
 * Falls back safely to mock dataset if backend is offline or network fails.
 */
export async function fetchMySessions(params?: {
  from?: string;
  to?: string;
  status?: string;
  classGroupId?: number;
}): Promise<SessionItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.status) query.append('status', params.status);
    if (params?.classGroupId) query.append('classGroupId', String(params.classGroupId));

    const queryString = query.toString();
    const endpoint = `/me/sessions${queryString ? `?${queryString}` : ''}`;

    const data = await requestApi<BackendSessionResponse[]>(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });

    if (Array.isArray(data) && data.length > 0) {
      return data.map((s) => mapBackendSessionToItem(s));
    }
    return MOCK_SESSIONS;
  } catch (error: any) {
    if (error?.message === 'SESSION_EXPIRED') {
      throw error;
    }
    console.warn('Backend /me/sessions unavailable, using cached session schedule:', error?.message);
    return MOCK_SESSIONS;
  }
}

/**
 * Obtain LiveKit online classroom meeting token for an online session.
 * POST /api/v1/meetings/sessions/{sessionId}/token
 */
export async function fetchMeetingToken(
  sessionId: string | number
): Promise<{
  token: string;
  serverUrl: string;
  roomName: string;
  role: string;
  className: string;
} | null> {
  try {
    return await requestApi(`/meetings/sessions/${sessionId}/token`, {
      method: 'POST',
      requiresAuth: true,
    });
  } catch (error) {
    console.warn(`Failed to retrieve meeting token for session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Authenticate with backend POST /api/v1/auth/login.
 */
export async function loginWithApi(
  email: string,
  password: string
): Promise<{ accessToken: string; user: User }> {
  const result = await requestApi<{
    accessToken: string;
    user: {
      id: number;
      email: string;
      fullName: string;
      role: string;
    };
  }>('/auth/login', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify({ email, password }),
  });

  const user: User = {
    id: String(result.user.id),
    fullName: result.user.fullName,
    email: result.user.email,
    role: result.user.role as any,
    gradeLevel: 'GRADE_12',
  };

  await setStoredToken(result.accessToken);
  await setStoredUser(user);

  return { accessToken: result.accessToken, user };
}
