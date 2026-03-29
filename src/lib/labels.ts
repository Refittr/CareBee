import type { UserType } from "@/lib/types/database";

export interface AppLabels {
  // Navigation
  dashboardNavLabel: string;

  // Dashboard page
  dashboardTitle: string;
  dashboardNewButton: string | null; // null = hide
  dashboardEmptyHeading: string;
  dashboardEmptyDescription: string;
  dashboardEmptyCta: string | null; // null = hide (handled by onboarding)
  dashboardNewRecordTile: string | null; // null = hide "Start a new care record" tile

  // Breadcrumbs
  breadcrumbDashboard: string;

  // Household page
  householdPeopleHeading: string | null; // null = skip label entirely
  householdAddPersonButton: string | null; // null = hide
  householdAddPersonTile: string | null; // null = hide
  householdEmptyPeopleMessage: string | null; // null = hide empty state CTA
  householdCareCircleSection: boolean; // false = hide entire section
  householdNewCareRecordItem: string | null; // null = hide in switcher

  // Person overview page
  personInsightDescription: string; // replaces "across all of X's record at once"
  personConditionsHeading: string;
  personMedicationsHeading: string;
  personAllergiesHeading: string;
  personAppointmentsHeading: string;
  personTestResultsHeading: string;
  personDocumentsHeading: string;

  // Daily care feature
  dailyCareEnableDescription: string;
  dailyCareTrackDescription: string;
  dailyCareReadOnlyHint: string;
  dailyCareEmptyStateSuffix: string; // appended after "start building a picture of "

  // Settings page
  settingsProfileHint: string;
  settingsWeeklyUpdatesDescription: string;
  settingsNoRecordsMessage: string;
  settingsCreateRecordCta: string | null; // null = hide create-record prompt

  // Care record switcher
  showCareRecordSwitcher: boolean;
  showNewCareRecordButton: boolean;
}

export function getLabels(userType: UserType | null): AppLabels {
  const isSelfCare = userType === "self_care";

  if (isSelfCare) {
    return {
      dashboardNavLabel: "Health record",

      dashboardTitle: "Your health record",
      dashboardNewButton: null,
      dashboardEmptyHeading: "Welcome to CareBee",
      dashboardEmptyDescription: "Your health record is being set up. If you see this, please contact support.",
      dashboardEmptyCta: null,
      dashboardNewRecordTile: null,

      breadcrumbDashboard: "Your health record",

      householdPeopleHeading: null,
      householdAddPersonButton: null,
      householdAddPersonTile: null,
      householdEmptyPeopleMessage: null,
      householdCareCircleSection: false,
      householdNewCareRecordItem: null,

      personInsightDescription: "AI checks for missing NICE guideline reviews, overdue tests, drug interactions, care gaps, and benefit eligibility across your record at once.",
      personConditionsHeading: "Your conditions",
      personMedicationsHeading: "Your medications",
      personAllergiesHeading: "Your allergies",
      personAppointmentsHeading: "Your appointments",
      personTestResultsHeading: "Your test results",
      personDocumentsHeading: "Your documents",

      dailyCareEnableDescription: "Keep a day-by-day log of your wellbeing: mood, meals, medication, mobility and more. Useful for tracking patterns over time.",
      dailyCareTrackDescription: "Track your daily wellbeing, meals, medication and more.",
      dailyCareReadOnlyHint: "Turn it back on in settings to add new records.",
      dailyCareEmptyStateSuffix: "your day-to-day wellbeing.",

      settingsProfileHint: "Your display name shown across your health record.",
      settingsWeeklyUpdatesDescription: "Receive a weekly email summary of changes across your health record.",
      settingsNoRecordsMessage: "No health record found. Please contact support if this looks wrong.",
      settingsCreateRecordCta: null,

      showCareRecordSwitcher: false,
      showNewCareRecordButton: false,
    };
  }

  // Carer (default) — identical to current behaviour
  return {
    dashboardNavLabel: "Care records",

    dashboardTitle: "Your care records",
    dashboardNewButton: "New care record",
    dashboardEmptyHeading: "Welcome to CareBee",
    dashboardEmptyDescription: "Create a care record to start tracking health and care information for someone you look after.",
    dashboardEmptyCta: "Create your first care record",
    dashboardNewRecordTile: "Start a new care record",

    breadcrumbDashboard: "Your care records",

    householdPeopleHeading: "People",
    householdAddPersonButton: "Add person",
    householdAddPersonTile: "Add someone you care for",
    householdEmptyPeopleMessage: "No one added yet.",
    householdCareCircleSection: true,
    householdNewCareRecordItem: "New care record",

    personInsightDescription: `AI checks for missing NICE guideline reviews, overdue tests, drug interactions, care gaps, and benefit eligibility across all of {firstName}'s record at once.`,
    personConditionsHeading: "Conditions",
    personMedicationsHeading: "Medications",
    personAllergiesHeading: "Allergies",
    personAppointmentsHeading: "Appointments",
    personTestResultsHeading: "Test Results",
    personDocumentsHeading: "Documents",

    dailyCareEnableDescription: "Keep a shift-by-shift log of {firstName}'s day: mood, meals, medication, mobility and more. Useful when multiple carers are involved or when you want a detailed picture over time.",
    dailyCareTrackDescription: "Track {firstName}'s daily wellbeing, meals, medication and more.",
    dailyCareReadOnlyHint: "Turn it back on in the person's settings to add new records.",
    dailyCareEmptyStateSuffix: "{firstName}'s day-to-day wellbeing.",

    settingsProfileHint: "This name appears when you are listed as a member of a care record.",
    settingsWeeklyUpdatesDescription: "Receive a weekly email summary of changes across your care records.",
    settingsNoRecordsMessage: "No care records found. Add a care record to enable weekly updates.",
    settingsCreateRecordCta: "Create a care record",

    showCareRecordSwitcher: true,
    showNewCareRecordButton: true,
  };
}
