export type MemberRole = "owner" | "editor" | "viewer" | "emergency_only";
export type AccountType = "standard" | "tester" | "admin";
export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "missed";
export type DocumentType =
  | "discharge_summary"
  | "prescription"
  | "test_result"
  | "appointment_letter"
  | "benefit_letter"
  | "poa_document"
  | "care_plan"
  | "insurance"
  | "other";

// ---- Row types (kept for explicit use in components) -----------------

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: string;
  last_digest_sent_at: string | null;
}

export interface Person {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nhs_number: string | null;
  gp_surgery: string | null;
  gp_name: string | null;
  hospital_numbers: string[];
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  poa_status: string | null;
  poa_document_location: string | null;
  dnacpr_status: boolean;
  notes: string | null;
  avatar_url: string | null;
  care_needs_assessment: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type EntitlementEligibilityStatus = "likely_eligible" | "possibly_eligible" | "already_claiming" | "not_eligible" | "unknown";
export type EntitlementConfidence = "high" | "medium" | "low";
export type EntitlementCategory = "disability_benefit" | "carer_benefit" | "financial_support" | "practical_support" | "health_exemption" | "housing" | "tax_relief";
export type EntitlementCurrentStatus = "not_started" | "application_in_progress" | "submitted" | "awarded" | "rejected" | "under_review";

export interface Entitlement {
  id: string;
  person_id: string;
  household_id: string;
  benefit_name: string;
  benefit_category: EntitlementCategory;
  eligibility_status: EntitlementEligibilityStatus;
  confidence: EntitlementConfidence;
  estimated_annual_value: string | null;
  reasoning: string;
  what_it_is: string;
  how_to_apply: string | null;
  key_criteria: string[] | null;
  missing_info: string[] | null;
  current_status: EntitlementCurrentStatus;
  application_reference: string | null;
  review_date: string | null;
  award_amount: string | null;
  is_dismissed: boolean;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
}

export type WaitStatus = "within_range" | "approaching_limit" | "overdue" | "significantly_overdue";

export interface DigestLog {
  id: string;
  user_id: string;
  subject: string;
  content_text: string;
  created_at: string;
}

export interface AppointmentPrep {
  id: string;
  appointment_id: string;
  person_id: string;
  household_id: string;
  content: string;
  generated_at: string;
}

export interface AppointmentDebrief {
  id: string;
  appointment_id: string;
  person_id: string;
  household_id: string;
  summary: string | null;
  medication_changes: boolean;
  medication_change_details: string | null;
  new_referrals: boolean;
  new_referral_details: string | null;
  tests_ordered: boolean;
  test_details: string | null;
  next_appointment: string | null;
  concerns: string | null;
  suggested_updates: Record<string, unknown>[];
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

export interface WaitingList {
  id: string;
  person_id: string;
  household_id: string;
  department: string;
  trust_name: string | null;
  referred_by: string | null;
  referral_date: string;
  expected_wait: string | null;
  status: "waiting" | "appointment_received" | "seen" | "cancelled";
  notes: string | null;
  estimated_weeks: number | null;
  wait_status: WaitStatus | null;
  estimate_details: string | null;
  action_suggestion: string | null;
  chase_recommended: boolean;
  last_estimated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Condition {
  id: string;
  person_id: string;
  household_id: string;
  name: string;
  date_diagnosed: string | null;
  diagnosed_by: string | null;
  diagnosed_at_location: string | null;
  current_status: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  person_id: string;
  household_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  purpose: string | null;
  prescribed_by: string | null;
  pharmacy: string | null;
  repeat_prescription_date: string | null;
  start_date: string | null;
  end_date: string | null;
  condition_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationChange {
  id: string;
  medication_id: string;
  person_id: string;
  household_id: string;
  change_date: string;
  change_description: string;
  changed_by_professional: string | null;
  reason: string | null;
  created_at: string;
}

export interface Allergy {
  id: string;
  person_id: string;
  household_id: string;
  name: string;
  reaction: string | null;
  severity: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  person_id: string;
  household_id: string;
  title: string;
  appointment_date: string;
  location: string | null;
  professional_name: string | null;
  department: string | null;
  trust_or_service: string | null;
  status: AppointmentStatus;
  notes_before: string | null;
  notes_after: string | null;
  what_was_discussed: string | null;
  what_was_agreed: string | null;
  follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  person_id: string;
  household_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: DocumentType;
  description: string | null;
  document_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TestResult {
  id: string;
  person_id: string;
  household_id: string;
  test_name: string;
  result_value: string | null;
  result_date: string | null;
  normal_range: string | null;
  is_abnormal: boolean | null;
  ordered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InsightType = "nice_guideline" | "test_trend" | "medication_review" | "care_gap" | "general";
export type InsightCategory = "missing_check" | "overdue_review" | "test_trend" | "interaction_risk" | "care_suggestion" | "benefit_hint";
export type InsightPriority = "urgent" | "important" | "info";
export type InsightStatus = "active" | "dismissed" | "resolved";
export type InteractionSeverity = "severe" | "moderate" | "mild";
export type InteractionStatus = "active" | "acknowledged" | "resolved";
export type ContactType = "gp" | "hospital" | "consultant" | "pharmacy" | "social_worker" | "care_agency" | "therapist" | "school" | "benefits" | "solicitor" | "other";

export interface HealthInsight {
  id: string;
  person_id: string;
  household_id: string;
  insight_type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  priority: InsightPriority;
  status: InsightStatus;
  source_data: Record<string, unknown>;
  created_at: string;
  dismissed_at: string | null;
  resolved_at: string | null;
  last_checked_at: string;
}

export interface InsightCheck {
  id: string;
  person_id: string;
  checked_at: string;
  insights_found: number;
  new_insights: number;
}

export interface DrugInteraction {
  id: string;
  person_id: string;
  household_id: string;
  medication_a: string;
  medication_b: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
  mechanism: string | null;
  status: InteractionStatus;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

export interface Contact {
  id: string;
  person_id: string;
  household_id: string;
  contact_type: ContactType;
  name: string;
  role: string | null;
  organisation: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedLetter {
  id: string;
  person_id: string;
  household_id: string;
  title: string;
  content: string;
  template_id: string | null;
  custom_prompt: string | null;
  entitlement_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyShare {
  id: string;
  person_id: string;
  household_id: string;
  share_token: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

export interface Invitation {
  id: string;
  household_id: string;
  invited_email: string;
  role: MemberRole;
  invited_by: string;
  invite_token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

// ---- Supabase Database type ------------------------------------------
// Uses Record<string, unknown> row types for compatibility with
// @supabase/supabase-js v2 GenericTable requirement under TS 5.x strict mode.

type Row = Record<string, unknown>;

// Makes all properties that accept null also accept undefined (i.e., optional).
// This reflects the database reality: nullable columns have NULL as default.
type OptionalNullables<T> = {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as null extends T[K] ? K : never]?: T[K];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Row & Profile;
        Insert: Row & OptionalNullables<Omit<Profile, "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      households: {
        Row: Row & Household;
        Insert: Row & OptionalNullables<Omit<Household, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Household, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      household_members: {
        Row: Row & HouseholdMember;
        Insert: Row & OptionalNullables<Omit<HouseholdMember, "id" | "created_at" | "weekly_digest_enabled" | "weekly_digest_day">> & { weekly_digest_enabled?: boolean; weekly_digest_day?: string };
        Update: Row & Partial<Omit<HouseholdMember, "id" | "created_at">>;
        Relationships: never[];
      };
      people: {
        Row: Row & Person;
        Insert: Row & OptionalNullables<Omit<Person, "id" | "created_at" | "updated_at" | "care_needs_assessment">> & { care_needs_assessment?: Record<string, unknown> };
        Update: Row & Partial<Omit<Person, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      conditions: {
        Row: Row & Condition;
        Insert: Row & OptionalNullables<Omit<Condition, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Condition, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      medications: {
        Row: Row & Medication;
        Insert: Row & OptionalNullables<Omit<Medication, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Medication, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      medication_changes: {
        Row: Row & MedicationChange;
        Insert: Row & OptionalNullables<Omit<MedicationChange, "id" | "created_at">>;
        Update: Row & Partial<Omit<MedicationChange, "id" | "created_at">>;
        Relationships: never[];
      };
      allergies: {
        Row: Row & Allergy;
        Insert: Row & OptionalNullables<Omit<Allergy, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Allergy, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      appointments: {
        Row: Row & Appointment;
        Insert: Row & OptionalNullables<Omit<Appointment, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      documents: {
        Row: Row & Document;
        Insert: Row & OptionalNullables<Omit<Document, "id" | "created_at">>;
        Update: Row & Partial<Omit<Document, "id" | "created_at">>;
        Relationships: never[];
      };
      emergency_shares: {
        Row: Row & EmergencyShare;
        Insert: Row & OptionalNullables<Omit<EmergencyShare, "id" | "created_at">>;
        Update: Row & Partial<Omit<EmergencyShare, "id" | "created_at">>;
        Relationships: never[];
      };
      invitations: {
        Row: Row & Invitation;
        Insert: Row & OptionalNullables<Omit<Invitation, "id" | "created_at">>;
        Update: Row & Partial<Omit<Invitation, "id" | "created_at">>;
        Relationships: never[];
      };
      test_results: {
        Row: Row & TestResult;
        Insert: Row & OptionalNullables<Omit<TestResult, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<TestResult, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      admin_activity_log: {
        Row: Row & AdminActivityLog;
        Insert: Row & OptionalNullables<Omit<AdminActivityLog, "id" | "created_at">>;
        Update: Row & Partial<Omit<AdminActivityLog, "id" | "created_at">>;
        Relationships: never[];
      };
      health_insights: {
        Row: Row & HealthInsight;
        Insert: Row & OptionalNullables<Omit<HealthInsight, "id" | "created_at">> & { last_checked_at?: string };
        Update: Row & Partial<Omit<HealthInsight, "id" | "created_at">>;
        Relationships: never[];
      };
      insight_checks: {
        Row: Row & InsightCheck;
        Insert: Row & OptionalNullables<Omit<InsightCheck, "id">>;
        Update: Row & Partial<Omit<InsightCheck, "id">>;
        Relationships: never[];
      };
      drug_interactions: {
        Row: Row & DrugInteraction;
        Insert: Row & OptionalNullables<Omit<DrugInteraction, "id" | "created_at">>;
        Update: Row & Partial<Omit<DrugInteraction, "id" | "created_at">>;
        Relationships: never[];
      };
      entitlements: {
        Row: Row & Entitlement;
        Insert: Row & OptionalNullables<Omit<Entitlement, "id" | "created_at" | "updated_at">> & { last_checked_at?: string };
        Update: Row & Partial<Omit<Entitlement, "id" | "created_at">>;
        Relationships: never[];
      };
      contacts: {
        Row: Row & Contact;
        Insert: Row & OptionalNullables<Omit<Contact, "id" | "created_at" | "updated_at">> & { display_order?: number };
        Update: Row & Partial<Omit<Contact, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      generated_letters: {
        Row: Row & GeneratedLetter;
        Insert: Row & OptionalNullables<Omit<GeneratedLetter, "id" | "created_at" | "updated_at">>;
        Update: Row & Partial<Omit<GeneratedLetter, "id" | "created_at" | "updated_at">>;
        Relationships: never[];
      };
      appointment_preps: {
        Row: Row & AppointmentPrep;
        Insert: Row & OptionalNullables<Omit<AppointmentPrep, "id" | "generated_at">>;
        Update: Row & Partial<Omit<AppointmentPrep, "id">>;
        Relationships: never[];
      };
      appointment_debriefs: {
        Row: Row & AppointmentDebrief;
        Insert: Row & OptionalNullables<Omit<AppointmentDebrief, "id" | "created_at" | "updated_at" | "status" | "suggested_updates">> & { status?: "draft" | "complete"; suggested_updates?: Record<string, unknown>[] };
        Update: Row & Partial<Omit<AppointmentDebrief, "id" | "created_at">>;
        Relationships: never[];
      };
      digest_logs: {
        Row: Row & DigestLog;
        Insert: Row & Omit<DigestLog, "id" | "created_at">;
        Update: Row & Partial<Omit<DigestLog, "id" | "created_at">>;
        Relationships: never[];
      };
      waiting_lists: {
        Row: Row & WaitingList;
        Insert: Row & OptionalNullables<Omit<WaitingList, "id" | "created_at" | "updated_at" | "chase_recommended">> & { chase_recommended?: boolean };
        Update: Row & Partial<Omit<WaitingList, "id" | "created_at">>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_household_with_owner: {
        Args: Record<string, unknown> & { household_name: string };
        Returns: string;
      };
      log_user_activity: {
        Args: Record<string, unknown> & {
          p_action: string;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
