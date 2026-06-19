import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Clock,
  Banknote,
  TrendingUp,
  Wallet,
  UserPlus,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Radio,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/api/api';

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatShortDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

// แปลชื่อช่องทางการชำระเงินให้อ่านง่าย
const formatPaymentMethod = (method?: string) => {
  if (!method) return '-';
  const map: Record<string, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    bank_transfer: 'โอนเงิน',
    credit_card: 'บัตรเครดิต',
    debit_card: 'บัตรเดบิต',
    card: 'บัตรเครดิต',
    qr: 'QR Code',
    qr_code: 'QR Code',
    promptpay: 'พร้อมเพย์',
  };
  return map[method.toLowerCase()] || method;
};

interface Lead {
  id: string;
  patientId?: string;
  name: string;
  nickname?: string;
  phone: string;
  status: string;
  createdAt: string;
  appointmentDate?: string;
  previousAppointmentId?: string;
  nextAppointmentId?: string;
  interests: Array<{ name: string; price: string }>;
  procedures: Array<{
    name: string;
    price: string;
    depositUsed?: number;
  }>;
  admin?: string;
  referralChannel?: string;
  deposit?: {
    amount: number;
  };
  payments?: {
    amount?: number;
    method?: string;
    serviceCharge?: {
      rate: number;
      amount: number;
      netAmount: number;
    };
  };
}

interface NewPatient {
  _id: string;
  fullname: string;
  nickname?: string;
  tel?: string;
  interest?: string;
  referralChannel?: string;
  branch?: string;
  createdBy?: string;
  createdAt: string;
  firstAppointmentDate?: string;
}

const DashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newPatients, setNewPatients] = useState<NewPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPatientPage, setNewPatientPage] = useState(1);
  const NEW_PATIENT_PER_PAGE = 10;

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));

  const monthPrefix = `${selectedYear}-${selectedMonth}`;

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const selectedMonthName = `${thaiMonthNames[parseInt(selectedMonth) - 1]} ${parseInt(selectedYear) + 543}`;

  const START_YEAR = 2025;

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/lead?year=${selectedYear}`);
        const result = res.data;

        const mappedLeads: Lead[] = (Array.isArray(result.data) ? result.data : []).map((item: any) => ({
          id: item._id,
          patientId: item.patientId ? String(item.patientId) : '',
          name: item.patient?.fullname || '',
          nickname: item.patient?.nickname || '',
          phone: item.patient?.tel || '',
          status: item.appointments?.status ?? 'pending',
          createdAt: item.createdAt,
          appointmentDate: item.appointments?.date,
          previousAppointmentId: item.previousAppointmentId,
          nextAppointmentId: item.nextAppointmentId,
          interests: Array.isArray(item.interests) ? item.interests : [],
          procedures: Array.isArray(item.procedures)
            ? item.procedures.map((p: any) => ({
              name: p.name,
              price: p.price,
              depositUsed: Number(p.depositUsed) || 0,
            }))
            : [],
          admin: item.createdBy || '',
          referralChannel: item.referralChannel || '',
          deposit: item.deposit,
          payments: item.payments,
        }));

        setLeads(mappedLeads);
      } catch (error) {
        console.error('Fetch leads failed', error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    // ดึงคนไข้ใหม่ของเดือนที่เลือก จาก backend
    // Backend คำนวณจาก "นัดหมายแรกที่ไม่ถูกยกเลิก" ของคนไข้แต่ละคน
    // (ดู getNewPatientsByMonth ใน patient.service.ts)
    const fetchNewPatients = async () => {
      try {
        const res = await api.get("/patient/new", {
          params: {
            year: selectedYear,
            month: parseInt(selectedMonth, 10), // ส่งเป็น integer 1-12
            limit: 1000, // ดึงทั้งหมดของเดือนนี้ แล้วค่อย paginate ฝั่ง frontend
          },
        });
        const patients = Array.isArray(res.data?.data) ? res.data.data : [];

        const newPats: NewPatient[] = patients.map((p: any) => ({
          _id: p._id,
          fullname: p.fullname || '',
          nickname: p.nickname || '',
          tel: p.tel || '',
          interest: p.interest || '',
          referralChannel: p.referralChannel || '',
          branch: p.branch || '',
          createdBy: p.createdBy || '',
          createdAt: p.createdAt,
          firstAppointmentDate: p.firstAppointmentDate,
        }));

        setNewPatients(newPats);
        setNewPatientPage(1);
      } catch (error) {
        console.error('Fetch new patients failed', error);
        setNewPatients([]);
      }
    };

    fetchLeads();
    fetchNewPatients();
  }, [selectedYear, selectedMonth]);

  const statistics = useMemo(() => {
    const countUniquePatients = (list: Lead[]) => {
      const seen = new Set<string>();
      list.forEach((lead) => {
        const key = lead.patientId || (lead.phone ? `${lead.name}|${lead.phone}` : `lead-${lead.id}`);
        seen.add(key);
      });
      return seen.size;
    };

    const scheduledThisMonth = leads.filter(
      (lead) =>
        ['scheduled', 'rescheduled', 'arrived'].includes(lead.status) &&
        lead.appointmentDate?.startsWith(monthPrefix)
    );

    const arrivedThisMonth = leads.filter(
      (lead) =>
        lead.status === 'arrived' &&
        lead.appointmentDate?.startsWith(monthPrefix)
    );

    const pendingNextVisit = leads.filter(
      (lead) =>
        lead.status === 'pending' &&
        !lead.appointmentDate &&
        lead.previousAppointmentId
    );

    const noNextAppointment = leads.filter(
      (lead) =>
        lead.status === 'arrived' &&
        !lead.nextAppointmentId &&
        lead.appointmentDate?.startsWith(monthPrefix)
    );

    return {
      scheduledVisits: scheduledThisMonth.length,
      scheduledPatients: countUniquePatients(scheduledThisMonth),
      arrivedVisits: arrivedThisMonth.length,
      arrivedPatients: countUniquePatients(arrivedThisMonth),
      arrivedLeads: arrivedThisMonth,
      pendingVisits: pendingNextVisit.length,
      pendingPatients: countUniquePatients(pendingNextVisit),
      noNextVisits: noNextAppointment.length,
      noNextPatients: countUniquePatients(noNextAppointment),
    };
  }, [leads, monthPrefix]);

  // คำนวณสรุปหัตถการที่สนใจ + ช่องทางที่รู้จัก จากคนไข้ใหม่ของเดือนนี้
  // (newPatients มาจาก /patient/new ที่ filter ตามเดือนมาเรียบร้อยแล้ว)
  const newPatientInterests = useMemo(() => {
    const interests: Record<string, number> = {};
    newPatients.forEach((p) => {
      if (p.interest) {
        interests[p.interest] = (interests[p.interest] || 0) + 1;
      }
    });
    return interests;
  }, [newPatients]);

  const newPatientChannels = useMemo(() => {
    const channels: Record<string, number> = {};
    newPatients.forEach((p) => {
      if (p.referralChannel) {
        channels[p.referralChannel] = (channels[p.referralChannel] || 0) + 1;
      }
    });
    return channels;
  }, [newPatients]);

  // สรุปค่าใช้จ่าย: 1 row = 1 visit ที่มีการชำระเงิน
  const paymentRows = useMemo(() => {
    return leads
      .filter(
        (lead) =>
          lead.status === 'arrived' &&
          lead.appointmentDate?.startsWith(monthPrefix) &&
          lead.payments
      )
      .sort((a, b) => {
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
        return dateB - dateA;
      })
      .map((lead) => {
        const proceduresText = lead.procedures.length > 0
          ? lead.procedures.map((p) => p.name).join(', ')
          : 'ปรึกษาฟรี';
        const proceduresTotal = lead.procedures.reduce(
          (s, p) => s + (parseFloat(p.price) || 0),
          0
        );
        const depositUsed = lead.procedures.reduce(
          (s, p) => s + (p.depositUsed || 0),
          0
        );
        const amount = lead.payments?.amount || 0;
        const serviceCharge = lead.payments?.serviceCharge?.amount || 0;
        const netAmount = lead.payments?.serviceCharge?.netAmount ?? amount;
        const interestText = Array.isArray(lead.interests) && lead.interests.length > 0
          ? lead.interests.map((it) => it.name).join(', ')
          : '';
        return {
          id: lead.id,
          name: lead.name,
          nickname: lead.nickname || '',
          date: lead.appointmentDate ? formatShortDateTime(lead.appointmentDate) : '-',
          interest: interestText,
          procedures: proceduresText,
          rawProcedures: lead.procedures,
          proceduresTotal,
          depositUsed,
          amount,
          method: lead.payments?.method || '',
          methodLabel: formatPaymentMethod(lead.payments?.method),
          serviceCharge,
          netAmount,
        };
      });
  }, [leads, monthPrefix]);

  const finance = useMemo(() => {
    let totalRevenue = 0;
    let totalNetRevenue = 0;
    let totalServiceCharge = 0;

    paymentRows.forEach((row) => {
      totalRevenue += row.amount;
      totalNetRevenue += row.netAmount;
      totalServiceCharge += row.serviceCharge;
    });

    return {
      totalRevenue,
      totalNetRevenue,
      totalServiceCharge,
      transactionCount: paymentRows.length,
    };
  }, [paymentRows]);

  // Export ตารางสรุปค่าใช้จ่ายเป็น xlsx (1 หัตถการ = 1 row)
  const handleExportXlsx = () => {
    if (paymentRows.length === 0) return;

    const data: any[] = [];
    let rowNum = 1;

    paymentRows.forEach((row) => {
      const procs = row.rawProcedures.length > 0
        ? row.rawProcedures
        : [{ name: 'ปรึกษาฟรี', price: '0', depositUsed: 0 }];

      procs.forEach((proc, procIdx) => {
        const price = parseFloat(proc.price) || 0;
        const depUsed = proc.depositUsed || 0;
        const isFirstProc = procIdx === 0;

        data.push({
          '#': rowNum++,
          'ชื่อ-นามสกุล': row.name,
          'ชื่อเล่น': row.nickname,
          'วันที่': row.date,
          'หัตถการที่สนใจ': isFirstProc ? row.interest : '',
          'รายการ': proc.name,
          'ราคาหัตถการ': price,
          'ใช้มัดจำ': depUsed,
          // ยอดรวม ช่องทาง ค่าธรรมเนียม ยอดสุทธิ → แสดงเฉพาะ row แรกของแต่ละ visit
          'ยอดชำระ (รวม)': isFirstProc ? row.amount : '',
          'ช่องทาง': isFirstProc ? row.methodLabel : '',
          'ค่าธรรมเนียม': isFirstProc ? row.serviceCharge : '',
          'ยอดสุทธิ': isFirstProc ? row.netAmount : '',
        });
      });
    });

    data.push({
      '#': '',
      'ชื่อ-นามสกุล': 'รวมทั้งหมด',
      'ชื่อเล่น': '',
      'วันที่': `${paymentRows.length} ครั้ง`,
      'หัตถการที่สนใจ': '',
      'รายการ': `${data.length} รายการ`,
      'ราคาหัตถการ': paymentRows.reduce((s, r) => s + r.proceduresTotal, 0),
      'ใช้มัดจำ': paymentRows.reduce((s, r) => s + r.depositUsed, 0),
      'ยอดชำระ (รวม)': finance.totalRevenue,
      'ช่องทาง': '',
      'ค่าธรรมเนียม': finance.totalServiceCharge,
      'ยอดสุทธิ': finance.totalNetRevenue,
    });

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 25 },  // ชื่อ-นามสกุล
      { wch: 12 },  // ชื่อเล่น
      { wch: 18 },  // วันที่
      { wch: 25 },  // ความสนใจ
      { wch: 30 },  // รายการ
      { wch: 14 },  // ราคาหัตถการ
      { wch: 12 },  // ใช้มัดจำ
      { wch: 14 },  // ยอดชำระ (รวม)
      { wch: 14 },  // ช่องทาง
      { wch: 14 },  // ค่าธรรมเนียม
      { wch: 14 },  // ยอดสุทธิ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'สรุปค่าใช้จ่าย');
    XLSX.writeFile(wb, `payment-summary-${monthPrefix}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">ข้อมูลประจำ{selectedMonthName}</p>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {thaiMonthNames.map((month, index) => (
                <option key={index} value={String(index + 1).padStart(2, '0')}>
                  {month}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {(() => {
                const currentYear = new Date().getFullYear();
                const years = [];
                for (let year = currentYear; year >= START_YEAR; year--) {
                  years.push(
                    <option key={year} value={year.toString()}>
                      {year + 543}
                    </option>
                  );
                }
                return years;
              })()}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-linear-to-r from-indigo-500 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                สถิติประจำเดือน
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* นัดหมายในเดือนนี้ */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <div>
                    <div className="inline-flex p-2 bg-blue-100 rounded-lg mb-3">
                      <CalendarCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">นัดหมายในเดือนนี้</p>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{statistics.scheduledVisits} </span>
                        <span className="text-[10px] text-gray-400 ml-1">ครั้ง</span>
                      </div>
                      <div className="text-sm text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                        {statistics.scheduledPatients}
                        <span className="text-[10px] text-gray-400 ml-1">คน</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* มาตามนัด */}
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div>
                    <div className="inline-flex p-2 bg-emerald-100 rounded-lg mb-3">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">มาตามนัด</p>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{statistics.arrivedVisits}</span>
                        <span className="text-[10px] text-gray-400 ml-1">ครั้ง</span>
                      </div>
                      <div className="text-sm text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                        {statistics.arrivedPatients}
                        <span className="text-[10px] text-gray-400 ml-1">คน</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* รอนัดถัดไป */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <div>
                    <div className="inline-flex p-2 bg-amber-100 rounded-lg mb-3">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">รอนัดถัดไป</p>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{statistics.pendingVisits}</span>
                        <span className="text-[10px] text-gray-400 ml-1">ครั้ง</span>
                      </div>
                      <div className="text-sm text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                        {statistics.pendingPatients}
                        <span className="text-[10px] text-gray-400 ml-1">คน</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ไม่ได้นัดต่อ */}
                <div className="bg-red-50 rounded-xl p-4">
                  <div>
                    <div className="inline-flex p-2 bg-red-100 rounded-lg mb-3">
                      <UserX className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">ไม่ได้นัดต่อ</p>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{statistics.noNextVisits}</span>
                        <span className="text-[10px] text-gray-400 ml-1">ครั้ง</span>
                      </div>
                      <div className="text-sm text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                        {statistics.noNextPatients}
                        <span className="text-[10px] text-gray-400 ml-1">คน</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* จำนวนคนไข้ใหม่ — 2 ฝั่ง */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  จำนวนคนไข้ใหม่
                  <span className="ml-auto text-lg font-bold text-indigo-600">{newPatients.length} คน</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* หัตถการที่สนใจ */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      หัตถการที่สนใจ
                    </h4>
                    {Object.keys(newPatientInterests).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(newPatientInterests)
                          .sort(([, a], [, b]) => b - a)
                          .map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center bg-white rounded-lg px-3 py-1.5">
                              <span className="text-sm text-gray-700">{name}</span>
                              <span className="text-sm font-semibold text-indigo-600">{count}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-xs py-3">ยังไม่มีข้อมูล</div>
                    )}
                  </div>

                  {/* ช่องทางที่รู้จัก */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-500" />
                      ช่องทางที่รู้จัก
                    </h4>
                    {Object.keys(newPatientChannels).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(newPatientChannels)
                          .sort(([, a], [, b]) => b - a)
                          .map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center bg-white rounded-lg px-3 py-1.5">
                              <span className="text-sm text-gray-700">{name}</span>
                              <span className="text-sm font-semibold text-purple-600">{count}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-xs py-3">ยังไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                การเงินประจำเดือน
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-linear-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">รายรับทั้งหมด</span>
                      <p className="text-xs text-gray-500">จาก {finance.transactionCount} รายการ</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {finance.totalRevenue.toLocaleString()} <span className="text-base font-normal">บาท</span>
                  </p>
                </div>
              </div>

              {finance.totalServiceCharge > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-700">
                      ค่าธรรมเนียม (บัตรเครดิต)
                    </span>
                    <span className="text-sm font-semibold text-red-600">
                      -{finance.totalServiceCharge.toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                    <span className="text-sm font-semibold text-gray-800">รายรับสุทธิ</span>
                    <span className="text-lg font-bold text-green-600">
                      {finance.totalNetRevenue.toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              )}

              {finance.totalServiceCharge === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">รายรับสุทธิ</span>
                    <span className="text-lg font-bold text-green-600">
                      {finance.totalNetRevenue.toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              )}

              {finance.transactionCount === 0 && (
                <div className="text-center text-gray-400 text-sm py-4 border-t">
                  ยังไม่มีข้อมูลการเงินในเดือนนี้
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ตารางคนไข้ใหม่ */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              คนไข้ใหม่ ({newPatients.length} คน)
            </h2>
          </div>

          {newPatients.length > 0 ? (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs w-10">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">ชื่อ-นามสกุล</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">เบอร์โทร</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-gray-200 text-xs">วันที่นัด</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">หัตถการที่สนใจ</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">ช่องทาง</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">สาขา</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs">แอดมิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newPatients
                      .slice((newPatientPage - 1) * NEW_PATIENT_PER_PAGE, newPatientPage * NEW_PATIENT_PER_PAGE)
                      .map((p, i) => (
                        <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{(newPatientPage - 1) * NEW_PATIENT_PER_PAGE + i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            {p.fullname}
                            {p.nickname && <span className="text-gray-500 font-normal"> ({p.nickname})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{p.tel || '-'}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600 text-xs">
                            {p.firstAppointmentDate ? formatShortDate(p.firstAppointmentDate) : '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.interest ? (
                              <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] rounded-full border border-amber-200">
                                {p.interest}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.referralChannel ? (
                              <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] rounded-full border border-purple-200">
                                {p.referralChannel}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{p.branch || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{p.createdBy || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {newPatients
                  .slice((newPatientPage - 1) * NEW_PATIENT_PER_PAGE, newPatientPage * NEW_PATIENT_PER_PAGE)
                  .map((p, i) => (
                    <div key={p._id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <span className="text-xs text-gray-400 mr-2">{(newPatientPage - 1) * NEW_PATIENT_PER_PAGE + i + 1}.</span>
                          <span className="font-medium text-gray-800">{p.fullname}</span>
                          {p.nickname && <span className="text-gray-500 text-sm"> ({p.nickname})</span>}
                        </div>
                        {p.firstAppointmentDate && (
                          <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {formatShortDate(p.firstAppointmentDate)}
                          </span>
                        )}
                      </div>
                      {p.tel && <p className="text-xs text-gray-500 mb-1.5">{p.tel}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {p.interest && (
                          <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] rounded-full border border-amber-200">
                            {p.interest}
                          </span>
                        )}
                        {p.referralChannel && (
                          <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] rounded-full border border-purple-200">
                            {p.referralChannel}
                          </span>
                        )}
                      </div>
                      {(p.branch || p.createdBy) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          {p.branch && <span>สาขา: <span className="text-gray-600">{p.branch}</span></span>}
                          {p.createdBy && <span>แอดมิน: <span className="text-gray-600">{p.createdBy}</span></span>}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              {newPatients.length > NEW_PATIENT_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {(newPatientPage - 1) * NEW_PATIENT_PER_PAGE + 1}-{Math.min(newPatientPage * NEW_PATIENT_PER_PAGE, newPatients.length)} / {newPatients.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setNewPatientPage((p) => Math.max(1, p - 1))}
                      disabled={newPatientPage === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    {Array.from({ length: Math.ceil(newPatients.length / NEW_PATIENT_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setNewPatientPage(page)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-medium transition-colors ${page === newPatientPage
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setNewPatientPage((p) => Math.min(Math.ceil(newPatients.length / NEW_PATIENT_PER_PAGE), p + 1))}
                      disabled={newPatientPage >= Math.ceil(newPatients.length / NEW_PATIENT_PER_PAGE)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <UserPlus className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium text-gray-500">ยังไม่มีคนไข้ใหม่ในเดือนนี้</p>
              </div>
            </div>
          )}
        </div>

        {/* ตารางสรุปค่าใช้จ่าย */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              สรุปค่าใช้จ่าย ({paymentRows.length} รายการ)
            </h2>
            <button
              onClick={handleExportXlsx}
              disabled={paymentRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>

          {paymentRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <Wallet className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium text-gray-500">ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs w-10">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 180 }}>
                        ชื่อ-นามสกุล (ชื่อเล่น)
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 90 }}>
                        วันที่
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 160 }}>
                        หัตถการที่สนใจ
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 200 }}>
                        รายการ
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 110 }}>
                        ยอดรวม
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 110 }}>
                        ใช้มัดจำ
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 110 }}>
                        ยอดชำระ
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 110 }}>
                        ช่องทาง
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200 text-xs" style={{ minWidth: 110 }}>
                        ค่าธรรมเนียม
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-emerald-700 border-b border-gray-200 bg-emerald-50/50 text-xs" style={{ minWidth: 120 }}>
                        ยอดสุทธิ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRows.map((row, i) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {row.name}
                          {row.nickname && (
                            <span className="text-gray-500 font-normal"> ({row.nickname})</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-600 text-xs">{row.date}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs">
                          {row.interest ? (
                            <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] rounded-full border border-amber-200">
                              {row.interest}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs">{row.procedures}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {row.proceduresTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.depositUsed > 0 ? (
                            <span className="text-red-600 font-medium">
                              -{row.depositUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">
                          {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-full border border-blue-200">
                            {row.methodLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.serviceCharge > 0 ? (
                            <span className="text-red-600">
                              -{row.serviceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700 bg-emerald-50/30">
                          {row.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-300">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 font-bold text-emerald-800" colSpan={4}>
                        รวมทั้งหมด ({paymentRows.length} รายการ)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                        {paymentRows.reduce((s, r) => s + r.proceduresTotal, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 tabular-nums">
                        {(() => {
                          const total = paymentRows.reduce((s, r) => s + r.depositUsed, 0);
                          return total > 0
                            ? `-${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-';
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                        {finance.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-bold text-red-600 tabular-nums">
                        {finance.totalServiceCharge > 0
                          ? `-${finance.totalServiceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50">
                        {finance.totalNetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {paymentRows.map((row, i) => (
                  <div key={row.id} className="px-4 py-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <span className="text-xs text-gray-400 mr-2">{i + 1}.</span>
                        <span className="font-medium text-gray-800">{row.name}</span>
                        {row.nickname && <span className="text-gray-500 text-sm"> ({row.nickname})</span>}
                      </div>
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {row.date}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{row.procedures}</p>
                    {row.interest && (
                      <p className="text-xs mb-2">
                        <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] rounded-full border border-amber-200">
                          {row.interest}
                        </span>
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-500">ยอดรวม</span>
                        <span className="tabular-nums text-gray-800">
                          {row.proceduresTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {row.depositUsed > 0 && (
                        <div className="flex justify-between bg-gray-50 rounded px-2 py-1">
                          <span className="text-gray-500">ใช้มัดจำ</span>
                          <span className="tabular-nums text-red-600">
                            -{row.depositUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-500">ยอดชำระ</span>
                        <span className="tabular-nums text-gray-800 font-medium">
                          {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between bg-blue-50 rounded px-2 py-1">
                        <span className="text-gray-500">ช่องทาง</span>
                        <span className="text-blue-700 font-medium">{row.methodLabel}</span>
                      </div>
                      {row.serviceCharge > 0 && (
                        <div className="flex justify-between bg-gray-50 rounded px-2 py-1 col-span-2">
                          <span className="text-gray-500">ค่าธรรมเนียม</span>
                          <span className="tabular-nums text-red-600">
                            -{row.serviceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between bg-emerald-50 rounded px-2 py-1.5 col-span-2 border border-emerald-200">
                        <span className="text-emerald-700 font-semibold">ยอดสุทธิ</span>
                        <span className="tabular-nums text-emerald-700 font-bold">
                          {row.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile total */}
                <div className="px-4 py-3 bg-emerald-50 border-t-2 border-emerald-300">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-emerald-800">รวมทั้งหมด ({paymentRows.length} รายการ)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ยอดชำระรวม</span>
                      <span className="tabular-nums font-bold text-gray-800">
                        {finance.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {finance.totalServiceCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ค่าธรรมเนียมรวม</span>
                        <span className="tabular-nums font-bold text-red-600">
                          -{finance.totalServiceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between col-span-2 pt-1 border-t border-emerald-300">
                      <span className="text-emerald-800 font-bold">ยอดสุทธิรวม</span>
                      <span className="tabular-nums font-bold text-emerald-800">
                        {finance.totalNetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;