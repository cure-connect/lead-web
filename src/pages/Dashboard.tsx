import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  UserX,
  Banknote,
  TrendingUp,
  Wallet,
  BadgePercent
} from 'lucide-react';
import api from '@/api/api';

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

interface Lead {
  id: string;
  name: string;
  nickname?: string;
  phone: string;
  status: string;
  createdAt: string;
  appointmentDate?: string;
  previousAppointmentId?: string;
  nextAppointmentId?: string;
  interests: Array<{ name: string; price: string }>;
  procedures: Array<{ name: string; price: string }>;
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
          name: item.patient?.fullname || '',
          nickname: item.patient?.nickname || '',
          phone: item.patient?.tel || '',
          status: item.appointments?.status ?? 'pending',
          createdAt: item.createdAt,
          appointmentDate: item.appointments?.date,
          previousAppointmentId: item.previousAppointmentId,
          nextAppointmentId: item.nextAppointmentId,
          interests: Array.isArray(item.interests) ? item.interests : [],
          procedures: Array.isArray(item.procedures) ? item.procedures : [],
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

    return {
      scheduledThisMonth: scheduledThisMonth.length,
      arrivedLeads: sortedArrived,
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
          <div className="bg-linear-to-r from-green-500 to-green-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              คนไข้ที่มาตามนัด ({statistics.arrivedLeads.length} คน)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">คนไข้</th>
                  <th className="px-6 py-4 text-left font-semibold">วันที่มา</th>
                  <th className="px-6 py-4 text-left font-semibold">หัตถการที่สนใจ</th>
                  <th className="px-6 py-4 text-right font-semibold">ยอดชำระ</th>
                  <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
                </tr>
              </thead>
              <tbody className="border-t">
                {statistics.arrivedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium text-gray-500">ยังไม่มีคนไข้มาตามนัดในเดือนนี้</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  statistics.arrivedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {lead.name}{lead.nickname && <span className="text-gray-500 font-normal"> ({lead.nickname})</span>}
                        </div>
                        <div className="text-sm text-gray-500">{lead.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {lead.appointmentDate ? formatDateTime(lead.appointmentDate) : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.interests && lead.interests.length > 0
                          ? lead.interests.map((i: any) => i.name || i).join(", ")
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {lead.payments?.amount ? (
                          <span className="font-medium text-green-600">
                            {lead.payments.amount.toLocaleString()} บาท
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.admin || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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