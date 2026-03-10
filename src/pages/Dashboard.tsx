import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  UserX,
  Banknote,
  TrendingUp,
  Wallet,
  BadgePercent,
  Eye,
  EyeOff
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

const DashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommission, setShowCommission] = useState(false);

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

    fetchLeads();
  }, [selectedYear]);

  const statistics = useMemo(() => {
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

    const interestCounts: Record<string, number> = {};
    arrivedThisMonth.forEach((lead) => {
      lead.interests.forEach((item) => {
        if (item.name) {
          interestCounts[item.name] = (interestCounts[item.name] || 0) + 1;
        }
      });
    });

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
      scheduledThisMonth: scheduledThisMonth.length,
      arrivedLeads: sortedArrived,
      patientGroups,
      interestCounts,
      pendingNextVisit: pendingNextVisit.length,
      noNextAppointment: noNextAppointment.length,
    };
  }, [leads, monthPrefix]);

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
                  label="นัดหมายในเดือนนี้"
                  value={statistics.scheduledThisMonth}
                  bgColor="bg-blue-50"
                />
                <StatCard
                  icon={<Clock className="w-5 h-5 text-orange-600" />}
                  label="รอนัดวันครั้งถัดไป"
                  value={statistics.pendingNextVisit}
                  bgColor="bg-orange-50"
                />
                <StatCard
                  icon={<UserX className="w-5 h-5 text-red-600" />}
                  label="ไม่ได้นัดต่อ"
                  value={statistics.noNextAppointment}
                  bgColor="bg-red-50"
                />
              </div>

              {Object.keys(statistics.interestCounts).length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    หัตถการที่สนใจ (คนไข้ที่มาจริง)
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(statistics.interestCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <div
                          key={name}
                          className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2"
                        >
                          <span className="text-sm text-gray-700">{name}</span>
                          <span className="text-sm font-semibold text-indigo-600">
                            {count} คน
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {Object.keys(statistics.interestCounts).length === 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-center text-gray-400 text-sm py-4">
                    ยังไม่มีข้อมูลหัตถการในเดือนนี้
                  </div>
                </div>
              )}
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

        {/* ตารางคนไข้ที่มาตามนัด */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              คนไข้ที่มาตามนัด ({statistics.patientGroups.length} คน / {statistics.arrivedLeads.length} ครั้ง)
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
                            className={`border-b border-gray-100 ${
                              row.type === 'deposit' ? 'bg-blue-50/40' : 'hover:bg-gray-50'
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
                            <td className={`px-4 py-2.5 text-center font-medium ${
                              row.type === 'deposit' ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                              {row.label}
                            </td>

                            {/* ยอด */}
                            <td className={`px-4 py-2.5 text-right tabular-nums ${
                              row.type === 'deposit' ? 'text-blue-600' : 'text-gray-800'
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
                            <td className={`px-4 py-2.5 text-right tabular-nums ${
                              row.depositBalance < 0 ? 'text-red-600' : 'text-gray-600'
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
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                            groupRunningDeposit < 0 ? 'text-red-600' : 'text-gray-700'
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
                      รวมทั้งหมด ({statistics.patientGroups.length} คน)
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

const StatCard = ({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
}) => (
  <div className={`${bgColor} rounded-xl p-4`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs text-gray-600">{label}</span>
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

export default DashboardPage;