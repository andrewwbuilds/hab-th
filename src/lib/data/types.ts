import type { Tables } from "@/lib/database.types";
import type { Answers, Completion } from "@/lib/forms/schema";
import type { PetSpec, Status, Track } from "@/lib/types";

export type Profile = Tables<"profiles">;
export type ApplicationRow = Tables<"applications">;
export type ReviewRow = Tables<"reviews">;
export type PetRow = Tables<"pets">;

export type Application = Omit<ApplicationRow, "answers"> & { answers: Answers };

export interface MyApplication extends Application {
  completion: Completion;
}

export interface ApplicantSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface ApplicationListItem extends Application {
  applicant: ApplicantSummary;
  review_count: number;
  avg_overall: number | null;
}

export type Review = Omit<ReviewRow, "scores"> & {
  scores: Record<string, number>;
  reviewer: ApplicantSummary;
};

export interface ApplicationDetail extends Application {
  applicant: Profile;
  pet: PetSpec | null;
  reviews: Review[];
  summary: { review_count: number; avg_overall: number | null };
  myReview: Review | null;
}

export type ApplicationSort = "newest" | "oldest" | "name" | "score" | "status";

export interface ApplicationFilters {
  track?: Track;
  status?: Status;
  q?: string;
  sort?: ApplicationSort;
}

export interface AdjacentIds {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

export interface ReviewInput {
  scores: Record<string, number>;
  overall: number;
  notes: string;
}

export interface ReviewerStat {
  reviewerId: string;
  name: string;
  count: number;
  avgOverall: number | null;
}

export interface OrganizerStats {
  total: number;
  byTrack: Record<Track, Record<Status, number>>;
  byStatus: Record<Status, number>;
  avgOverall: number | null;
  reviewCount: number;
  submissionsPerDay: { date: string; count: number }[];
  reviewsPerReviewer: ReviewerStat[];
}
