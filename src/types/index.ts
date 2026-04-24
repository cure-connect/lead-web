export type LeadStatus = "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";

export interface LeadInterest {
  name: string;
  procedureId?: number | string;
}

export interface LeadPayment {
  method: "cash" | "transfer" | "card" | "free";
  amount: number;
  serviceCharge?: {
    rate: number;
    amount: number;
    netAmount: number;
  };
  commission?: {
    totalAmount: number;
    details: Array<{
      procedureName: string;
      baseAmount: number;
      rate: number;
      amount: number;
    }>;
  };
}

export interface LeadDeposit {
  amount: number;
  slipUrl?: string;
  slipUrls?: string[];
}

export interface Lead {
  _id: any;
  id: string;
  patientId?: string;

  name: string;
  nickname?: string;
  phone: string;
  socialMedia?: string;

  interest?: Array<{
    name: string;
    procedureId?: string;
  }>;

  referralChannel: string;
  admin: string;
  branch: string;

  status: LeadStatus;

  appointmentISO?: string;

  appointmentDate?: string;
  appointmentTime?: string;

  appointmentDateDisplay?: string;
  createdAtDisplay: string;
  note: string;
  arrivedNote?: string;
  rescheduledNote?: string;
  cancelledNote?: string;
  createdAt: string;
  payments?: LeadPayment;
  deposit?: LeadDeposit;
  receiptUrl?: string;
  receiptUrls?: string[];
  procedures?: Array<{
    name: string;
    price: string;
    commissionRate?: number;
  }>;
}