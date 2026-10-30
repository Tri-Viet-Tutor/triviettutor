import { api } from "@/services/api";

/** dto.rating.TutorRatingResponse — backend trả thẳng, không bọc ApiResponse */
export interface TutorRating {
  id: number;
  studentId: number;
  tutorId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** dto.rating.TutorRatingSummaryResponse */
export interface TutorRatingSummary {
  tutorId: number;
  averageRating: number | null;
  totalRatings: number;
}

/** GET /tutors/{tutorId}/my-rating — đánh giá của tôi cho gia sư; chưa đánh giá (404) thì trả null */
export async function fetchMyRating(tutorId: number): Promise<TutorRating | null> {
  try {
    return (await api.get<TutorRating>(`/tutors/${tutorId}/my-rating`)).data;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) return null;
    throw error;
  }
}

/** GET /tutors/{tutorId}/ratings/summary */
export async function fetchRatingSummary(tutorId: number): Promise<TutorRatingSummary> {
  return (await api.get<TutorRatingSummary>(`/tutors/${tutorId}/ratings/summary`)).data;
}

/** GET /tutors/{tutorId}/ratings — mọi đánh giá của một gia sư */
export async function fetchTutorRatings(tutorId: number): Promise<TutorRating[]> {
  return (await api.get<TutorRating[]>(`/tutors/${tutorId}/ratings`)).data;
}

/** POST /tutors/{tutorId}/ratings — mỗi học viên đánh giá mỗi gia sư một lần */
export async function createRating(tutorId: number, input: { rating: number; comment?: string }): Promise<TutorRating> {
  return (await api.post<TutorRating>(`/tutors/${tutorId}/ratings`, input)).data;
}

/** PUT /ratings/{ratingId} — sửa đánh giá của tôi */
export async function updateRating(ratingId: number, input: { rating: number; comment?: string }): Promise<TutorRating> {
  return (await api.put<TutorRating>(`/ratings/${ratingId}`, input)).data;
}

/** DELETE /ratings/{ratingId} */
export async function deleteRating(ratingId: number): Promise<void> {
  await api.delete(`/ratings/${ratingId}`);
}
