import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  UserX,
  Banknote,
  TrendingUp,
  Wallet,
  CreditCard,
  BadgePercent
} from 'lucide-react';
import api from '@/api/api';

interface Lead {
  id: string;
  status: string;
  createdAt: string;
  appointmentDate?: string;
  previousAppointmentId?: string;
  nextAppointmentId?: string;
  interests: Array<{ name: string; price: string }>;
  procedures: Array<{ name: string; price: string }>;
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

  const START_YEAR = 2024;

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/lead?year=${selectedYear}`);
        const result = res.data;

        const mappedLeads: Lead[] = (Array.isArray(result.data) ? result.data : []).map((item: any) => ({
          id: item._id,
          status: item.appointments?.status ?? 'pending',
          createdAt: item.createdAt,
          appointmentDate: item.appointments?.date,
          previousAppointmentId: item.previousAppointmentId,
          nextAppointmentId: item.nextAppointmentId,
          interests: Array.isArray(item.interests) ? item.interests : [],
          procedures: Array.isArray(item.procedures) ? item.procedures : [],
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
        lead.previousAppointmentId &&
        lead.createdAt?.startsWith(monthPrefix)
    );

    const noNextAppointment = leads.filter(
      (lead) =>
        lead.status === 'arrived' &&
        !lead.nextAppointmentId &&
        lead.appointmentDate?.startsWith(monthPrefix)
    );

    return {
      scheduledThisMonth: scheduledThisMonth.length,
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

    const finalNetRevenue = totalNetRevenue - totalCommission;

    return {
      totalRevenue,
      totalNetRevenue,
      finalNetRevenue,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-28 sm:pb-8 sm:pt-8">
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

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="bg-linear-to-br from-emerald-50 to-green-50 rounded-xl p-3 sm:p-4 border border-emerald-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">รายรับทั้งหมด</span>
                      <p className="text-xs text-gray-400">จาก {finance.transactionCount} รายการ</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 text-right">
                    {finance.totalRevenue.toLocaleString()} <span className="text-sm font-normal">บาท</span>
                  </p>
                </div>
              </div>

              {finance.totalServiceCharge > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-amber-600" />
                      </div>
                      <span className="text-sm text-gray-600">ค่าธรรมเนียม (บัตรเครดิต)</span>
                    </div>
                    <p className="text-xl font-bold text-red-600 text-right">
                      -{finance.totalServiceCharge.toLocaleString()} <span className="text-sm font-normal">บาท</span>
                    </p>
                  </div>
                </div>
              )}

              {finance.totalCommission > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BadgePercent className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-600">ค่าคอมมิชชันทั้งหมด</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700 text-right">
                      {finance.totalCommission.toLocaleString()} <span className="text-sm font-normal">บาท</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wallet className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">รายรับสุทธิ</span>
                      {(finance.totalServiceCharge > 0 || finance.totalCommission > 0) && (
                        <p className="text-xs text-gray-400">
                          หลังหัก{finance.totalServiceCharge > 0 ? ' ค่าธรรมเนียม' : ''}{finance.totalServiceCharge > 0 && finance.totalCommission > 0 ? ',' : ''}{finance.totalCommission > 0 ? ' คอมมิชชัน' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-600 text-right">
                    {finance.finalNetRevenue.toLocaleString()} <span className="text-sm font-normal">บาท</span>
                  </p>
                </div>
              </div>

              {finance.transactionCount === 0 && (
                <div className="text-center text-gray-400 text-sm py-4 border-t">
                  ยังไม่มีข้อมูลการเงินในเดือนนี้
                </div>
              )}
            </div>
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