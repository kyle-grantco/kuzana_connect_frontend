// Shared vocabulary + helpers for the vouch fields used by both invites and
// endorsements (relationship, remarks, year of engagement).
//
// RELATIONSHIP_OPTIONS is the canonical dropdown. "Other" reveals a free-text
// field; the backend stores whatever string is sent (it only length-validates,
// never checks against this list), so the set can evolve without a migration.

export const RELATIONSHIP_OPTIONS = [
  "Business partner",
  "Colleague",
  "Client",
  "Service provider",
  "Employer",
  "Employee",
  "Investor",
  "Investee",
  "Mentor",
  "Contractor",
  "Supplier",
  "Other",
];

// Field limits mirror the backend schema (relationship 2..40, remarks 2..1000).
export const LIMITS = {
  relationship: 40,
  remarks: 140,
  name: 120,
};
