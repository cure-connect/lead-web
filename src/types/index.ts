export type LeadStatus = "Pending" | "Scheduled";

export interface Lead {
  id: string;

  name: string
  phone: string;
  lineId: string;

  interest: string;
  referralChannel: string;
  admin: string;
  branch: string;

  status: LeadStatus;

  appointmentISO?: string;

  appointmentDate?: string;
  appointmentTime?: string;
  
  appointmentDateDisplay?: string;
  createdAtDisplay:string
  note: string;
  createdAt: string;
}
