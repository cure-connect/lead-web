export type LeadStatus = "Pending" | "Scheduled";

export interface Lead {
  id: string;

  // patient
  name: string
  phone: string;
  lineId: string;

  // business
  interest: string;
  referralChannel: string;
  admin: string;
  branch: string;

  // status
  status: LeadStatus;

  // appointment
  appointmentDate?: string;
  appointmentTime?: string;

  // misc
  note: string;
  createdAt: string;
}
