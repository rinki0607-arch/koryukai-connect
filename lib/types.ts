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
  avatar_url: string | null;
  onboarding_completed: boolean;
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
  fee_amount: number | null;
  has_afterparty: boolean;
  status: EventStatus;
  capacity: number | null;
  created_at: string;
  notified_at: string | null;
  notified_count: number | null;
}

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

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
  wants_receipt: boolean;
  receipt_name: string | null;
  payment_status: PaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_amount: number | null;
  paid_at: string | null;
  receipt_url: string | null;
}

export interface AdminRevenueSummary {
  event_id: string;
  title: string;
  event_date: string;
  fee_amount: number | null;
  attending_count: number;
  paid_count: number;
  unpaid_count: number;
  pending_count: number;
  refunded_count: number;
  total_revenue: number;
}

export interface EventPaymentDetail {
  registration_id: string;
  participant_id: string;
  name: string | null;
  company: string | null;
  attending: boolean;
  payment_status: PaymentStatus;
  paid_amount: number | null;
  paid_at: string | null;
  wants_receipt: boolean;
  receipt_name: string | null;
  receipt_url: string | null;
}

export interface AttendeeCandidate {
  participant_id: string;
  name: string | null;
  company: string | null;
  industry: string | null;
  connect_with: string | null;
  already_liked: boolean;
  match_score: number;
  shared_tags: string[];
  avatar_url: string | null;
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
  avatar_url: string | null;
  is_saved: boolean;
  already_liked: boolean;
  is_matched: boolean;
}

export interface MatchRow {
  event_id: string | null;
  event_title: string | null;
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
  avatar_url: string | null;
}

export interface ConversationPartner {
  participant_id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  connect_with: string | null;
  matched_at: string | null;
  avatar_url: string | null;
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

export type RecommendAnswer = "yes" | "neutral" | "no";

export interface PendingFeedbackEvent {
  event_id: string;
  title: string;
  event_date: string;
}

export interface EventFeedbackSummary {
  event_id: string;
  title: string;
  event_date: string;
  response_count: number;
  avg_rating: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  nps: number;
}

export interface AdminNote {
  id: string;
  participant_id: string;
  author_id: string | null;
  note: string;
  created_at: string;
  author_name?: string | null;
}

export interface ParticipantAdminSummary {
  events_attended: number;
  last_attended_at: string | null;
  matches_count: number;
  messages_count: number;
}

export interface ParticipantActivity {
  participant_id: string;
  last_attended_at: string | null;
  events_attended: number;
}

export interface FeedPost {
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_company: string | null;
  like_count: number;
  liked_by_me: boolean;
  author_avatar_url: string | null;
}

export interface BusinessCard {
  id: string;
  owner_id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
}
