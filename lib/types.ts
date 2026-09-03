export type Role = "participant" | "admin";

export interface Profile {
  id: string;
  role: Role;
  name: string | null;
  email: string | null;
  company: string | null;
  job_type: string | null;
  job_title: string | null;
  phone: string | null;
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
  fee_note: string | null;
  has_afterparty: boolean;
  status: EventStatus;
  capacity: number | null;
  created_at: string;
  notified_at: string | null;
  notified_count: number | null;
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

export interface DirectoryEntry {
  participant_id: string;
  name: string | null;
  company: string | null;
  job_type: string | null;
  job_title: string | null;
  industry: string | null;
  connect_with: string | null;
  connect_with_tags: string[] | null;
  bio: string | null;
  events_attended: number;
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

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ConversationRow {
  partner_id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  matched_events: string[] | null;
  first_matched_at: string;
}

export interface ConversationPartner {
  participant_id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  connect_with: string | null;
}

export type SupportInquiryKind = "report" | "contact";
export type SupportInquiryStatus = "open" | "in_progress" | "resolved";

export interface SupportInquiryRow {
  id: string;
  kind: SupportInquiryKind;
  participant_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  summary: string;
  details: string | null;
  is_business_hours: boolean | null;
  status: SupportInquiryStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CapitalSummary {
  events_attended: number;
  connections_count: number;
  messages_count: number;
  first_attended_at: string | null;
  latest_partner_name: string | null;
  latest_matched_at: string | null;
}
