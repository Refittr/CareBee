export type ScanDocumentType =
  | "discharge_summary"
  | "prescription"
  | "appointment_letter"
  | "test_result"
  | "benefit_letter"
  | "referral_letter"
  | "other";

export type ScanConfidence = "high" | "medium" | "low";

export interface ScannedMedication {
  name: string;
  dosage: string | null;
  frequency: string | null;
  purpose: string | null;
  prescribed_by: string | null;
  start_date: string | null;
  action: "new" | "changed" | "stopped";
  change_reason: string | null;
  confidence: ScanConfidence;
}

export interface ScannedCondition {
  name: string;
  date_diagnosed: string | null;
  diagnosed_by: string | null;
  diagnosed_at_location: string | null;
  status: string | null;
  confidence: ScanConfidence;
}

export interface ScannedAllergy {
  name: string;
  reaction: string | null;
  confidence: ScanConfidence;
}

export interface ScannedAppointment {
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  professional_name: string | null;
  department: string | null;
  trust_or_service: string | null;
  type: "upcoming" | "past";
  confidence: ScanConfidence;
}

export interface ScannedReferral {
  referred_to: string;
  referred_by: string | null;
  referral_date: string | null;
  reason: string | null;
  expected_wait: string | null;
  confidence: ScanConfidence;
}

export interface ScannedContact {
  name: string;
  role: string | null;
  department: string | null;
  location: string | null;
}

export interface ScannedFollowUp {
  description: string;
  date: string | null;
}

export interface ScanResult {
  document_type: ScanDocumentType;
  document_date: string | null;
  summary: string;
  medications?: ScannedMedication[];
  conditions?: ScannedCondition[];
  allergies?: ScannedAllergy[];
  appointments?: ScannedAppointment[];
  referrals?: ScannedReferral[];
  professional_contacts?: ScannedContact[];
  follow_up_actions?: ScannedFollowUp[];
}
