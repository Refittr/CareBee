export interface CalendarPerson {
  id: string;
  first_name: string;
  last_name: string;
}

export interface CalendarAppointment {
  id: string;
  title: string;
  appointment_date: string; // ISO datetime string
  location: string | null;
  professional_name: string | null;
  department: string | null;
  status: string;
  person_id: string;
}

export interface CalendarMedSchedule {
  id: string;
  time: string; // 'HH:MM:SS' from Postgres
}

export interface CalendarMedication {
  id: string;
  name: string;
  dosage: string | null;
  purpose: string | null;
  schedule_type: "specific_times" | "times_per_day";
  times_per_day: number | null;
  start_date: string | null; // 'YYYY-MM-DD'
  end_date: string | null; // 'YYYY-MM-DD'
  person_id: string;
  schedules: CalendarMedSchedule[];
}

export interface CalendarTakenEntry {
  id?: string;
  medication_id: string;
  schedule_id: string | null;
  taken_date: string; // 'YYYY-MM-DD'
  taken: boolean;
}

export interface CalendarEntitlementReview {
  id: string;
  benefit_name: string;
  review_date: string; // 'YYYY-MM-DD'
  person_id: string;
}

export interface CalendarRepeatPrescription {
  id: string;
  name: string;
  repeat_prescription_date: string; // 'YYYY-MM-DD'
  person_id: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string; // 'YYYY-MM-DD'
  event_time: string | null; // 'HH:MM:SS' from Postgres, null = all-day
  notes: string | null;
  category: string;
  created_by: string;
}

export interface CalendarWaitingList {
  id: string;
  department: string;
  referral_date: string; // 'YYYY-MM-DD'
  estimated_weeks: number | null;
  status: string; // "waiting" | "appointment_received"
  person_id: string;
}

export interface CalendarData {
  people: CalendarPerson[];
  appointments: CalendarAppointment[];
  medications: CalendarMedication[];
  taken_log: CalendarTakenEntry[];
  entitlement_reviews: CalendarEntitlementReview[];
  repeat_prescriptions: CalendarRepeatPrescription[];
  calendar_events: CalendarEvent[];
  waiting_lists: CalendarWaitingList[];
}

// Derived per-day summary used by day cells
export interface DayContent {
  appointments: CalendarAppointment[];
  medications: CalendarMedication[];
  entitlementReviews: CalendarEntitlementReview[];
  repeatPrescriptions: CalendarRepeatPrescription[];
}

export type MedTakenStatus = "all" | "some" | "none";
