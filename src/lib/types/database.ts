export type MemberRole = "owner" | "editor" | "viewer" | "emergency_only";
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
  created_at: string;
  updated_at: string;
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
        Insert: Row & OptionalNullables<Omit<HouseholdMember, "id" | "created_at">>;
        Update: Row & Partial<Omit<HouseholdMember, "id" | "created_at">>;
        Relationships: never[];
      };
      people: {
        Row: Row & Person;
        Insert: Row & OptionalNullables<Omit<Person, "id" | "created_at" | "updated_at">>;
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
    };
    Views: Record<string, never>;
    Functions: {
      create_household_with_owner: {
        Args: Record<string, unknown> & { household_name: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
