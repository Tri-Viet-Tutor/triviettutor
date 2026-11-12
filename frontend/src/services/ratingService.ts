import type { ApiResponse } from "@/interfaces/api";
import { api, unwrap } from "@/services/api";

/** dto.rating.TutorRatingResponse */
export interface TutorRating {
  id: number;
  studentId: number;
  tutorId: number;
  classGroupId: number | null;
  classCode: string | null;
  subjectName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** dto.rating.TutorRatingSummaryResponse */
export interface TutorRatingSummary {
  tutorId: number;
  tutorName: string | null;
  averageRating: number | null;
  totalRatings: number;
}

/** GET /tutors/{tutorId}/my-rating — đánh giá của tôi cho gia sư; chưa đánh giá (404) thì trả null */
export async function fetchMyRating(tutorId: number): Promise<TutorRating | null> {
  try {
    return unwrap(await api.get<ApiResponse<TutorRating>>(`/tutors/${tutorId}/my-rating`));
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) return null;
    throw error;
  }
}

/** GET /tutors/{tutorId}/ratings/summary */
export async function fetchRatingSummary(tutorId: number): Promise<TutorRatingSummary> {
  return unwrap(await api.get<ApiResponse<TutorRatingSummary>>(`/tutors/${tutorId}/ratings/summary`));
}

/** GET /tutors/{tutorId}/ratings — mọi đánh giá của một gia sư */
export async function fetchTutorRatings(tutorId: number): Promise<TutorRating[]> {
  return unwrap(await api.get<ApiResponse<TutorRating[]>>(`/tutors/${tutorId}/ratings`));
}

/** POST /tutors/{tutorId}/ratings — mỗi học viên đánh giá mỗi gia sư một lần */
export async function createRating(tutorId: number, input: { rating: number; comment?: string }): Promise<TutorRating> {
  return unwrap(await api.post<ApiResponse<TutorRating>>(`/tutors/${tutorId}/ratings`, input));
}

/** PUT /ratings/{ratingId} — sửa đánh giá của tôi */
export async function updateRating(ratingId: number, input: { rating: number; comment?: string }): Promise<TutorRating> {
  return unwrap(await api.put<ApiResponse<TutorRating>>(`/ratings/${ratingId}`, input));
}

/** DELETE /ratings/{ratingId} */
export async function deleteRating(ratingId: number): Promise<void> {
  await api.delete(`/ratings/${ratingId}`);
}
