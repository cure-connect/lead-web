export type LeadStatus = "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";

export interface LeadInterest {
  name: string;
  price: string;
  procedureId?: number | string;
}

export interface Lead {
  _id: any;
  id: string;

  name: string
  phone: string;
  lineId: string;

  interest?: Array<{
    name: string;
    price: number | string;
    procedureId?: string;
  }>;
  price: string;
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
