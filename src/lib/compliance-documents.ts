import type { EmployeeDocument } from "@/types";

export type RequiredDocumentType = EmployeeDocument["document_type"];

export interface RequiredDocumentDefinition {
  type: RequiredDocumentType;
  name: string;
  expiryLabel?: string;
  versionLabel?: string;
}

export const REQUIRED_DOCUMENTS: RequiredDocumentDefinition[] = [
  { type: "passport_copy", name: "Passport Copy" },
  { type: "current_i20", name: "Current I-20", expiryLabel: "I-20 Program End Date" },
  { type: "ead_card", name: "EAD Card (Front + Back)", expiryLabel: "EAD Expiry Date" },
  { type: "signed_i983", name: "Signed I-983 (Current)", versionLabel: "I-983 Version Date" },
  { type: "dso_ack_email", name: "DSO Acknowledgement Email" },
  { type: "signed_offer_letter", name: "Signed Offer Letter" },
  { type: "completed_i9", name: "Completed I-9 Form" },
  { type: "everify_screenshot", name: "E-Verify Screenshot" },
  { type: "supervisor_ack", name: "Supervisor Acknowledgement" },
];

export function countUploadedDocuments(documents: EmployeeDocument[]): number {
  const uploaded = new Set(
    documents.filter((doc) => !!doc.file_url && doc.status === "uploaded").map((doc) => doc.document_type),
  );
  return REQUIRED_DOCUMENTS.filter((definition) => uploaded.has(definition.type)).length;
}
