import type { Lead } from '../types';

export const mockLeads: Lead[] = [
  {
    id: '1',
    firstName: 'คชาธร',
    lastName: 'มีกุมาร',
    phone: '0995588665',
    interest: 'การรักษาคิ้วหน้า',
    source: 'Facebook',
    lineId: '-',
    admin: 'Admin 1',
    branch: 'สาขา 1',
    status: 'วัดหมาย',
    createdAt: '2568-07-08',
    notes: ''
  },
  {
    id: '2',
    firstName: 'คุณเพชร',
    lastName: '',
    phone: '0838068396',
    interest: 'การฉีดโบท็อกซ์',
    source: 'Google',
    lineId: 'prare111',
    admin: 'Admin 2',
    branch: 'สาขา 1',
    status: 'ทำนัด',
    appointmentDate: '2568-07-15',
    appointmentTime: '14:00',
    createdAt: '2568-07-08',
    notes: 'แอดไลน์แล้ว'
  },
  {
    id: '3',
    firstName: 'กมลวัน',
    lastName: '',
    phone: '0900000000',
    interest: 'การดูดไขมัน',
    source: 'Line',
    lineId: '-',
    admin: 'Admin 1',
    branch: 'สาขา 2',
    status: 'ทำนัด',
    appointmentDate: '2568-09-10',
    appointmentTime: '10:00',
    createdAt: '2568-09-08',
    notes: 'แอดไลน์แล้ว'
  }
];