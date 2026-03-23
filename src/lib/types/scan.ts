export type ScanDocumentType =
  | "clinical_letter"
  | "prescription"
  | "test_result"
  | "imaging_report"
  | "benefit_letter"
  | "care_document"
  | "send_document"
  | "legal_document"
  | "appointment_letter"
  | "discharge_summary"
  | "referral_letter"
  | "other"
  | "unrecognised";

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

export interface ScannedTestResult {
  test_name: string;
  result_value: string | null;
  result_date: string | null;
  normal_range: string | null;
  is_abnormal: boolean | null;
  flag: "normal" | "high" | "low" | "critical" | null;
  ordered_by: string | null;
  notes: string | null;
  confidence: ScanConfidence;
}

export interface ScannedBenefit {
  benefit_type: string;
  decision: string | null;
  rate: string | null;
  weekly_amount: string | null;
  start_date: string | null;
  review_date: string | null;
  reference_number: string | null;
  confidence: ScanConfidence;
}

export interface ScannedImagingReport {
  scan_type: string;
  body_area: string | null;
  findings: string | null;
  conclusion: string | null;
  confidence: ScanConfidence;
}

export interface ScanResult {
  document_type: ScanDocumentType;
  document_subtype: string | null;
  document_date: string | null;
  summary: string;
  confidence: ScanConfidence;
  source: string | null;
  author: string | null;
  medications?: ScannedMedication[];
  conditions?: ScannedCondition[];
  allergies?: ScannedAllergy[];
  appointments?: ScannedAppointment[];
  test_results?: ScannedTestResult[];
  referrals?: ScannedReferral[];
  professional_contacts?: ScannedContact[];
  follow_up_actions?: ScannedFollowUp[];
  benefit?: ScannedBenefit;
  imaging_report?: ScannedImagingReport;
  raw_text?: string;
}
