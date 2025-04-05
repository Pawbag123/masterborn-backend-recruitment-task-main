export type RecruitmentStatus = 'new' | 'in_progress' | 'accepted' | 'rejected';

export interface Candidate {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  notes: string;
  years_of_experience: number;
  recruitment_status: RecruitmentStatus;
  consent_at: string;
  job_offers: number[];
}
