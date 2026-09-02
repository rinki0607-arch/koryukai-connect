export type Role = "participant" | "admin";

export interface Profile {
  id: string;
  role: Role;
  name: string | null;
  email: string | null;
  company: string | null;
  industry: string | null;
  connect_with: string | null;
  connect_with_tags: string[] | null;
  bio: string | null;
  ticket_token: string;
}

export interface AttendanceRow {
  id: string;
  event_id: string;
  participant_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export type EventStatus = "upcoming" | "closed" | "past" | "canceled";

export interface EventRow {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  has_afterparty: boolean;
  status: EventStatus;
  capacity: number | null;
  created_at: string;
}

export interface RegistrationRow {
  id: string;
  event_id: string;
  participant_id: string;
  attending: boolean;
  afterparty: boolean;
  industry: string | null;
  connect_with: string | null;
  connect_with_tags: string[] | null;
  created_at: string;
}

export interface AttendeeCandidate {
  participant_id: string;
  name: string | null;
  company: string | null;
  industry: string | null;
  connect_with: string | null;
  already_liked: boolean;
}

export interface MatchRow {
  event_id: string;
  event_title: string;
  participant_id: string;
  name: string | null;
  company: string | null;
  industry: string | null;
  connect_with: string | null;
  email: string | null;
  matched_at: string;
}
