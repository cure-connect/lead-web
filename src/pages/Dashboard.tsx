import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  Banknote,
  TrendingUp,
  Wallet,
  BadgePercent,
  Eye,
  EyeOff,
  Star,
  Radio,
  UserPlus,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/api/api';

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
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
    commissionRate?: number;
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
    commission?: {
      totalAmount: number;
      details?: Array<{
        procedureName: string;
        rate: number;
        amount: number;
      }>;
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
  appointmentDate?: string;
}

const DashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newPatients, setNewPatients] = useState<NewPatient[]>([]);
  const [newPatientInterests, setNewPatientInterests] = useState<Record<string, number>>({});
  const [newPatientChannels, setNewPatientChannels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCommission, setShowCommission] = useState(false);
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
              commissionRate: p.commissionRate || 0,
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

    const fetchNewPatients = async () => {
      try {
        const res = await api.get("/patient");
        const patients = Array.isArray(res.data?.data) ? res.data.data : [];

        const newPats: NewPatient[] = patients
          .filter((p: any) => p.createdAt?.startsWith(monthPrefix))
          .map((p: any) => ({
            _id: p._id,
            fullname: p.fullname || '',
            nickname: p.nickname || '',
            tel: p.tel || '',
            interest: p.interest || '',
            referralChannel: p.referralChannel || '',
            branch: p.branch || '',
            createdBy: p.createdBy || '',
            createdAt: p.createdAt,
          }));

        setNewPatients(newPats);
        setNewPatientPage(1);

        const interests: Record<string, number> = {};
        const channels: Record<string, number> = {};
        newPats.forEach((p) => {
          if (p.interest) {
            interests[p.interest] = (interests[p.interest] || 0) + 1;
          }
          if (p.referralChannel) {
            channels[p.referralChannel] = (channels[p.referralChannel] || 0) + 1;
          }
        });
        setNewPatientInterests(interests);
        setNewPatientChannels(channels);
      } catch (error) {
        console.error('Fetch patients failed', error);
      }
    };

    fetchLeads();
    fetchNewPatients();
  }, [selectedYear, monthPrefix]);

  const statistics = useMemo(() => {
    // Helper: นับจำนวนคนไข้ unique จาก leads
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

    // Sort by appointment date (arrived leads)
    const sortedArrived = [...arrivedThisMonth].sort((a, b) => {
      if (!a.appointmentDate || !b.appointmentDate) return 0;
      return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
    });

    // Group by patient
    const patientGroupMap = new Map<string, { name: string; nickname?: string; leads: Lead[] }>();
    sortedArrived.forEach((lead) => {
      // ใช้ patientId เป็น key หลัก
      // ถ้าไม่มี patientId → ใช้ชื่อ+เบอร์โทร, ถ้าไม่มีเบอร์โทร → แยกเป็น lead ตัวเอง
      const key = lead.patientId
        ? lead.patientId
        : lead.phone
          ? `${lead.name}|${lead.phone}`
          : `lead-${lead.id}`;
      if (!patientGroupMap.has(key)) {
        patientGroupMap.set(key, { name: lead.name, nickname: lead.nickname, leads: [] });
      }
      patientGroupMap.get(key)!.leads.push(lead);
    });
    const patientGroups = Array.from(patientGroupMap.values());

    return {
      scheduledVisits: scheduledThisMonth.length,
      scheduledPatients: countUniquePatients(scheduledThisMonth),
      arrivedVisits: sortedArrived.length,
      arrivedPatients: patientGroups.length,
      arrivedLeads: sortedArrived,
      patientGroups,
      pendingVisits: pendingNextVisit.length,
      pendingPatients: countUniquePatients(pendingNextVisit),
      noNextVisits: noNextAppointment.length,
      noNextPatients: countUniquePatients(noNextAppointment),
    };
  }, [leads, monthPrefix]);

  // จับคู่คนไข้ใหม่กับวันที่นัดหมายจาก leads
  const enrichedNewPatients = useMemo(() => {
    if (newPatients.length === 0 || leads.length === 0) return newPatients;
    return newPatients.map((p) => {
      const patientLeads = leads
        .filter((l) => l.patientId === p._id && l.appointmentDate)
        .sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime());
      return {
        ...p,
        appointmentDate: patientLeads[0]?.appointmentDate || undefined,
      };
    });
  }, [newPatients, leads]);

  const finance = useMemo(() => {
    const arrivedThisMonth = leads.filter(
      (lead) =>
        lead.status === 'arrived' &&
        lead.appointmentDate?.startsWith(monthPrefix) &&
        lead.payments
    );

    let totalRevenue = 0;
    let totalNetRevenue = 0;
    let totalCommission = 0;
    let totalServiceCharge = 0;

    arrivedThisMonth.forEach((lead) => {
      if (lead.payments) {
        const amount = lead.payments.amount || 0;
        totalRevenue += amount;

        if (lead.payments.serviceCharge) {
          totalNetRevenue += lead.payments.serviceCharge.netAmount || 0;
          totalServiceCharge += lead.payments.serviceCharge.amount || 0;
        } else {
          totalNetRevenue += amount;
        }

        if (lead.payments.commission) {
          totalCommission += lead.payments.commission.totalAmount || 0;
        }
      }
    });

    return {
      totalRevenue,
      totalNetRevenue,
      totalCommission,
      totalServiceCharge,
      transactionCount: arrivedThisMonth.length,
    };
  }, [leads, monthPrefix]);

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

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BadgePercent className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-600">ค่าคอมมิชชัน</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {finance.totalCommission.toLocaleString()} <span className="text-base font-normal">บาท</span>
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
                    {enrichedNewPatients
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
                            {p.appointmentDate ? formatShortDate(p.appointmentDate) : '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.interest ? (
                              <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
                                {p.interest}
                              </span>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.referralChannel ? (
                              <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                                {p.referralChannel}
                              </span>
                            ) : <span className="text-gray-400">-</span>}
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
                {enrichedNewPatients
                  .slice((newPatientPage - 1) * NEW_PATIENT_PER_PAGE, newPatientPage * NEW_PATIENT_PER_PAGE)
                  .map((p, i) => (
                    <div key={p._id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <span className="text-xs text-gray-400 mr-2">{(newPatientPage - 1) * NEW_PATIENT_PER_PAGE + i + 1}.</span>
                          <span className="font-medium text-gray-800">{p.fullname}</span>
                          {p.nickname && <span className="text-gray-500 text-sm"> ({p.nickname})</span>}
                        </div>
                        {p.appointmentDate && (
                          <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {formatShortDate(p.appointmentDate)}
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

        {/* ตารางคนไข้ที่มาตามนัด */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              คนไข้ที่มาตามนัด ({statistics.arrivedPatients} คน / {statistics.arrivedLeads.length} ครั้ง)
            </h2>
            <button
              onClick={() => setShowCommission(!showCommission)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {showCommission ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              ค่าคอมมิชชัน
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 180 }}>
                    ชื่อ นามสกุล (ชื่อเล่น)
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 70 }}>
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 120 }}>
                    รายการ
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 110 }}>
                    ยอด
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 120 }}>
                    ใช้มัดจำ
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 border-b border-gray-200" style={{ minWidth: 110 }}>
                    มัดจำคงเหลือ
                  </th>
                  {showCommission && (
                    <th className="px-4 py-3 text-right font-semibold text-purple-600 border-b border-gray-200 bg-purple-50" style={{ minWidth: 130 }}>
                      ค่าคอมมิชชัน
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {statistics.patientGroups.length === 0 ? (
                  <tr>
                    <td colSpan={showCommission ? 7 : 6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium text-gray-500">ยังไม่มีคนไข้มาตามนัดในเดือนนี้</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  statistics.patientGroups.map((group, groupIndex) => {
                    // สร้าง rows ทุก leads ของคนไข้คนนี้
                    type RowData = {
                      type: 'deposit' | 'procedure';
                      leadId: string;
                      date: string;
                      label: string;
                      amount: number;
                      depositChange: number;
                      depositBalance: number;
                      commissionText: string;
                      isFirstOfLead: boolean;
                      leadIndex: number;
                    };

                    const allRows: RowData[] = [];
                    let groupTotalAmount = 0;
                    let groupTotalCommission = 0;
                    let groupTotalDepositUsed = 0;
                    let groupRunningDeposit = 0;

                    // เรียง leads ภายใน group จากใหม่ → เก่า
                    const sortedLeads = [...group.leads].sort((a, b) => {
                      const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
                      const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
                      return dateB - dateA;
                    });

                    sortedLeads.forEach((lead, leadIdx) => {
                      const depositAmount = lead.deposit?.amount || 0;
                      let isFirst = true;

                      // แถว: วางมัดจำ
                      if (depositAmount > 0) {
                        groupRunningDeposit += depositAmount;
                        allRows.push({
                          type: 'deposit',
                          leadId: lead.id,
                          date: lead.appointmentDate ? formatShortDate(lead.appointmentDate) : (lead.createdAt ? formatShortDate(lead.createdAt) : '-'),
                          label: 'วางมัดจำ',
                          amount: depositAmount,
                          depositChange: depositAmount,
                          depositBalance: groupRunningDeposit,
                          commissionText: '-',
                          isFirstOfLead: isFirst,
                          leadIndex: leadIdx,
                        });
                        isFirst = false;
                      }

                      // แถว: หัตถการ
                      let leadTotalAmount = 0;
                      let leadTotalCommission = 0;
                      let leadTotalDepositUsed = 0;

                      lead.procedures.forEach((proc) => {
                        const price = parseFloat(proc.price) || 0;
                        const depositUsedForProc = proc.depositUsed || 0;
                        leadTotalAmount += price;
                        leadTotalDepositUsed += depositUsedForProc;

                        if (depositUsedForProc > 0) {
                          groupRunningDeposit -= depositUsedForProc;
                        }

                        let commText = '-';
                        const commDetail = lead.payments?.commission?.details?.find(
                          (d) => d.procedureName === proc.name
                        );
                        if (commDetail && commDetail.amount > 0) {
                          leadTotalCommission += commDetail.amount;
                          commText = `${commDetail.rate}% = ${commDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        } else if (proc.commissionRate && proc.commissionRate > 0 && price > 0) {
                          const commAmount = Math.round((price * proc.commissionRate) / 100 * 100) / 100;
                          leadTotalCommission += commAmount;
                          commText = `${proc.commissionRate}% = ${commAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }

                        allRows.push({
                          type: 'procedure',
                          leadId: lead.id,
                          date: lead.appointmentDate ? formatShortDate(lead.appointmentDate) : '-',
                          label: proc.name,
                          amount: price,
                          depositChange: depositUsedForProc > 0 ? -depositUsedForProc : 0,
                          depositBalance: groupRunningDeposit,
                          commissionText: commText,
                          isFirstOfLead: isFirst,
                          leadIndex: leadIdx,
                        });
                        isFirst = false;
                      });

                      if (lead.procedures.length === 0) {
                        allRows.push({
                          type: 'procedure',
                          leadId: lead.id,
                          date: lead.appointmentDate ? formatShortDate(lead.appointmentDate) : '-',
                          label: 'ปรึกษาฟรี',
                          amount: 0,
                          depositChange: 0,
                          depositBalance: groupRunningDeposit,
                          commissionText: '-',
                          isFirstOfLead: isFirst,
                          leadIndex: leadIdx,
                        });
                        isFirst = false;
                      }

                      const finalLeadCommission = lead.payments?.commission?.totalAmount || leadTotalCommission;

                      groupTotalAmount += leadTotalAmount;
                      groupTotalCommission += finalLeadCommission;
                      groupTotalDepositUsed += leadTotalDepositUsed;
                    });

                    // +1 for group summary row
                    const totalRowSpan = allRows.length + 1;

                    // คำนวณ date rowSpan — group วันที่เดียวกันติดกัน
                    const dateSpans: Array<{ show: boolean; span: number }> = [];
                    for (let i = 0; i < allRows.length; i++) {
                      if (i === 0 || allRows[i].date !== allRows[i - 1].date) {
                        let span = 1;
                        for (let j = i + 1; j < allRows.length && allRows[j].date === allRows[i].date; j++) {
                          span++;
                        }
                        dateSpans.push({ show: true, span });
                      } else {
                        dateSpans.push({ show: false, span: 0 });
                      }
                    }

                    return (
                      <React.Fragment key={`group-${groupIndex}`}>
                        {allRows.map((row, rowIndex) => (
                          <tr
                            key={`${row.leadId}-${rowIndex}`}
                            className={`border-b border-gray-100 ${row.type === 'deposit' ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                              }`}
                          >
                            {/* ชื่อคนไข้ — rowSpan ทั้ง group */}
                            {rowIndex === 0 && (
                              <td
                                className="px-5 py-3 align-top border-r border-gray-200 font-medium text-gray-900"
                                rowSpan={totalRowSpan}
                              >
                                <div>
                                  {group.name}
                                  {group.nickname && (
                                    <span className="text-gray-500 font-normal"> ({group.nickname})</span>
                                  )}
                                  {group.leads.length > 1 && (
                                    <div className="text-xs text-indigo-500 mt-1">{group.leads.length} ครั้ง</div>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* วันที่ — group วันเดียวกัน */}
                            {dateSpans[rowIndex].show && (
                              <td
                                className="px-4 py-2.5 text-center text-gray-600"
                                rowSpan={dateSpans[rowIndex].span}
                              >
                                {row.date}
                              </td>
                            )}

                            {/* รายการ */}
                            <td className={`px-4 py-2.5 text-center font-medium ${row.type === 'deposit' ? 'text-blue-600' : 'text-gray-700'
                              }`}>
                              {row.label}
                            </td>

                            {/* ยอด */}
                            <td className={`px-4 py-2.5 text-right tabular-nums ${row.type === 'deposit' ? 'text-blue-600' : 'text-gray-800'
                              }`}>
                              {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* ใช้มัดจำ */}
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {row.depositChange > 0 ? (
                                <span className="text-emerald-600 font-medium">
                                  +{row.depositChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : row.depositChange < 0 ? (
                                <span className="text-red-600 font-medium">
                                  -{Math.abs(row.depositChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* มัดจำคงเหลือ */}
                            <td className={`px-4 py-2.5 text-right tabular-nums ${row.depositBalance < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                              {(groupRunningDeposit !== 0 || row.type === 'deposit')
                                ? row.depositBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'
                              }
                            </td>

                            {/* ค่าคอมมิชชัน */}
                            {showCommission && (
                              <td className="px-4 py-2.5 text-right tabular-nums text-purple-600 bg-purple-50/30">
                                {row.commissionText}
                              </td>
                            )}
                          </tr>
                        ))}

                        {/* แถวรวมทั้ง group */}
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                          <td className="px-4 py-2.5" />
                          <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                            รวม
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                            {groupTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                            {groupTotalDepositUsed > 0 ? (
                              <span className="text-red-600">
                                -{groupTotalDepositUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${groupRunningDeposit < 0 ? 'text-red-600' : 'text-gray-700'
                            }`}>
                            {groupRunningDeposit !== 0
                              ? groupRunningDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'
                            }
                          </td>
                          {showCommission && (
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-purple-700 bg-purple-50/30">
                              {groupTotalCommission > 0
                                ? groupTotalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'
                              }
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {statistics.patientGroups.length > 1 && (
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-300">
                    <td className="px-5 py-3 font-bold text-emerald-800">
                      รวมทั้งหมด ({statistics.arrivedPatients} คน)
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold text-emerald-800 tabular-nums">
                      {statistics.arrivedLeads.reduce((sum, lead) => {
                        return sum + lead.procedures.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
                      }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    {showCommission && (
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-purple-800 bg-purple-50/30">
                        {(() => {
                          const total = statistics.arrivedLeads.reduce((sum, lead) => {
                            return sum + (lead.payments?.commission?.totalAmount || 0);
                          }, 0);
                          return total > 0
                            ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-';
                        })()}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;