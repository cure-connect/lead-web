import React, { useState, useMemo, useEffect, type ReactNode } from "react";
import { Search, Plus, Edit2, Trash2, X, Users, CalendarCheck, Clock, XCircle, Eye } from "lucide-react";
import { type Lead } from "../types";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";
import api from "@/api/api";

const statusLabel: Record<string, string> = {
  pending: "รอตัดสินใจ",
  scheduled: "ทำนัด",
  rescheduled: "เลื่อนนัด",
  cancelled: "ยกเลิกนัด",
  arrived: "มาตามนัด",
};


const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const getDaysUntilAppointment = (appointmentDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(appointmentDate);
  apptDate.setHours(0, 0, 0, 0);
  const diffTime = apptDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isLeadLocked = (lead: Lead): boolean => {
  const hasArrivedStatus = lead.status === "arrived";
  const hasProcedures = Array.isArray(lead.procedures) && lead.procedures.length > 0;
  const hasPayment = !!(lead.payments && lead.payments.method);

  return hasArrivedStatus && hasProcedures && hasPayment;
};

const LeadsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"notScheduled" | "scheduled">("notScheduled");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [statusModalLead, setStatusModalLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    try {
      const res = await api.get("/lead");

      const result = res.data;

      const mappedLeads: Lead[] = (
        Array.isArray(result.data) ? result.data : []
      ).map((item: any) => {
        const status = item.appointments?.status ?? "pending";

        return {
          id: item._id,
          name: item.patient?.name || "",
          phone: item.patient?.tel || "",
          lineId: item.patient?.lineId || "",
          interest: Array.isArray(item.interests) ? item.interests : [],
          referralChannel: item.referralChannel || "",
          admin: item.createdBy || "",
          branch: item.clinic?.branch || "",
          status,
          createdAt: item.createdAt,
          createdAtDisplay: formatDate(item.createdAt),
          appointmentDate: item.appointments?.date,
          appointmentDateDisplay: item.appointments?.date
            ? formatDateTime(item.appointments.date)
            : "ยังไม่นัด",
          note: item.note || "",
          payments: item.payments,
          procedures: Array.isArray(item.procedures) ? item.procedures : [],
          deposit: item.deposit,
        };
      });

      mappedLeads.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setLeads(mappedLeads);
    } catch (error) {
      console.error("Fetch leads failed", error);
      setLeads([]);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);


  const filteredLeads = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const monthPrefix = `${year}-${month}`;

    return leads.filter((lead) => {
      // แท็บ "นัดแล้ว" > กรองจากวันที่นัด
      // แท็บ "ยังไม่นัด" > กรองจากวันที่สร้าง
      const matchesMonth =
        activeTab === "scheduled" && lead.appointmentDate
          ? lead.appointmentDate.startsWith(monthPrefix)
          : lead.createdAt?.startsWith(monthPrefix);

      const matchesSearch =
        searchQuery === "" ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.lineId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "notScheduled"
          ? lead.status === "pending"
          : lead.status !== "pending";

      return matchesMonth && matchesSearch && matchesTab;
    });
  }, [leads, selectedMonth, searchQuery, activeTab]);

  const summary = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const monthPrefix = `${year}-${month}`;

    // ทั้งหมด + รอตัดสินใจ > นับจากวันที่สร้าง
    const leadsCreatedInMonth = leads.filter((lead) =>
      lead.createdAt?.startsWith(monthPrefix)
    );

    // ทำนัด + ยกเลิก > นับจากวันที่นัด
    const leadsWithApptInMonth = leads.filter((lead) =>
      lead.appointmentDate?.startsWith(monthPrefix)
    );

    return {
      total: leadsCreatedInMonth.length,
      withAppointment: leadsWithApptInMonth.filter((l) =>
        ["scheduled", "rescheduled"].includes(l.status)
      ).length,
      waiting: leadsCreatedInMonth.filter((l) => l.status === "pending").length,
      cancelled: leadsWithApptInMonth.filter((l) => l.status === "cancelled").length,
    };
  }, [leads, selectedMonth]);

  const handleSave = async (lead: Lead) => {
    try {
      const payload: any = {
        clinic: { branch: lead.branch },
        patient: { name: lead.name, tel: lead.phone, lineId: lead.lineId || undefined },
        interests: [lead.interest],
        referralChannel: lead.referralChannel,
        note: lead.note,
        createdBy: lead.admin,
      };

      if (lead.status === "pending") {
        payload.appointments = {
          status: "pending",
          date: null
        }
      }

      if (lead.status === "scheduled") {
        payload.appointments = {
          status: "scheduled",
          date: lead.appointmentDate && lead.appointmentTime
            ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
            : new Date().toISOString(),
        };
      } else if (lead.status === "rescheduled") {
        payload.appointments = {
          status: "rescheduled",
          date: lead.appointmentDate && lead.appointmentTime ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00` : new Date().toISOString()
        }
      } else if (lead.status === "cancelled") {
        payload.appointments = {
          status: "cancelled",
          date: null
        }
      }

      if (lead.deposit) {
        payload.deposit = lead.deposit;
      } else if (lead.deposit === null) {
        payload.deposit = null;
      }

      if (!editingLead) {
        payload.clinic = {
          name: lead.name,
          branch: lead.branch || "Bangkok",
        };

        await api.post("/createlead", payload);
      } else {
        await api.patch(`/${lead.id}`, payload);
      }

      await fetchLeads();
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openDeleteModal = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      await api.delete(`/${leadToDelete.id}`);
      await fetchLeads();
    } catch (err) {
      console.error("Delete lead failed", err);
    } finally {
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const openStatusModal = (lead: Lead) => {
    setStatusModalLead(lead);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Leads</h1>
          <p className="text-gray-600 mb-8">รายชื่อลูกค้าที่ลงข้อมูลและการติดตาม</p>

          <div className="grid grid-cols-4 gap-6 mb-8 max-md:grid-cols-1">
            <SummaryBox
              label="ทั้งหมด"
              value={summary.total}
              icon={<Users />}
            />

            <SummaryBox
              label="ทำนัดแล้ว"
              value={summary.withAppointment}
              color="text-green-600"
              icon={<CalendarCheck className="text-green-500" />}
            />

            <SummaryBox
              label="รอตัดสินใจ"
              value={summary.waiting}
              color="text-orange-600"
              icon={<Clock className="text-orange-500" />}
            />

            <SummaryBox
              label="ยกเลิกนัด"
              value={summary.cancelled}
              color="text-red-600"
              icon={<XCircle className="text-red-500" />}
            />
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="shadow">
              <div className="flex gap-4 px-6">
                <button
                  onClick={() => setActiveTab("notScheduled")}
                  className={`py-4 px-6 font-medium border-b-2 transition-colors ${activeTab === "notScheduled"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  ยังไม่นัด
                </button>
                <button
                  onClick={() => setActiveTab("scheduled")}
                  className={`py-4 px-6 font-medium border-b-2 transition-colors ${activeTab === "scheduled"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  นัดแล้ว
                </button>
              </div>
            </div>

            <div className="p-6 shadow flex gap-4 max-md:flex-col">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 shadow rounded-md"
              />

              <div className="flex items-center w-full shadow rounded-md px-3">
                <Search className="w-5 h-5 text-gray-400 mr-2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา Lead..."
                  className="w-full py-2 outline-none"
                />
              </div>

              <button
                onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                เพิ่ม Lead
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">ชื่อ</th>
                    <th className="px-6 py-4 text-left font-semibold">โทร</th>
                    <th className="px-6 py-4 text-left font-semibold">วันที่สร้าง</th>

                    {activeTab === "scheduled" && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">วันที่นัด</th>
                        <th className="px-6 py-4 text-center font-semibold">
                          ระยะเวลาก่อนวันนัด
                        </th>
                        <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                      </>
                    )}

                    <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="border-t">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "scheduled" ? 7 : 4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Users className="w-12 h-12 mb-4 opacity-50" />
                          <p className="text-lg font-medium text-gray-500">ยังไม่มีข้อมูล</p>
                          <p className="text-sm mt-1">กดปุ่ม "เพิ่ม Lead" เพื่อเริ่มต้นเพิ่มข้อมูล</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {lead.name}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {lead.phone}
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {lead.createdAtDisplay}
                        </td>

                        {activeTab === "scheduled" && (
                          <>
                            <td className="px-6 py-4 text-gray-700">
                              {lead.appointmentDateDisplay}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {lead.appointmentDate && (
                                <span className="font-medium">
                                  {lead.status === "cancelled" && "-"}

                                  {lead.status === "arrived" && (
                                    <span className="text-green-600">ถึงวันนัดแล้ว</span>
                                  )}

                                  {["scheduled", "rescheduled"].includes(lead.status) && (() => {
                                    const days = getDaysUntilAppointment(lead.appointmentDate);

                                    if (days === 0)
                                      return <span className="text-green-600">ถึงวันนัดแล้ว</span>;

                                    if (days > 0)
                                      return <span className="text-green-600">อีก {days} วัน</span>;

                                    return (
                                      <span className="text-red-600">
                                        เลยมาแล้ว {Math.abs(days)} วัน
                                      </span>
                                    );
                                  })()}
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => openStatusModal(lead)}
                                disabled={isLeadLocked(lead)}
                                className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md transition-all
    ${lead.status === "scheduled"
                                    ? `bg-blue-100 text-blue-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-blue-200"}`
                                    : lead.status === "rescheduled"
                                      ? `bg-yellow-100 text-yellow-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-yellow-200"}`
                                      : lead.status === "arrived"
                                        ? `bg-green-100 text-green-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-green-200"}`
                                        : lead.status === "cancelled"
                                          ? `bg-red-100 text-red-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-red-200"}`
                                          : `bg-gray-100 text-gray-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-gray-200"}`
                                  }
  `}
                              >
                                {statusLabel[lead.status]}
                              </button>

                            </td>
                          </>
                        )}

                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-4">
                            <Eye
                              className="w-4 h-4 text-blue-600 cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => setViewingLead(lead)}
                            />
                            <Edit2
                              className={`w-4 h-4 transition-all ${isLeadLocked(lead)
                                ? "text-gray-300 cursor-not-allowed opacity-50"
                                : "text-indigo-600 cursor-pointer hover:scale-110"
                                }`}
                              onClick={() => {
                                if (!isLeadLocked(lead)) {
                                  setEditingLead(lead);
                                  setIsModalOpen(true);
                                }
                              }}
                            />
                            <Trash2
                              className={`w-4 h-4 transition-all ${isLeadLocked(lead)
                                ? "text-gray-300 cursor-not-allowed opacity-50"
                                : "w-4 h-4 text-red-600 cursor-pointer hover:scale-110 transition-transform"
                                }`}
                              onClick={() => {
                                if (!isLeadLocked(lead)) {
                                  openDeleteModal(lead)
                                }
                              }}
                            />
                          </div>
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

      {statusModalLead && (
        <StatusModal
          lead={statusModalLead}
          onClose={() => setStatusModalLead(null)}
          onSave={async () => {
            await fetchLeads();
            setStatusModalLead(null);
          }}
        />
      )}

      {viewingLead && (
        <ViewLeadModal
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
        title={editingLead ? "แก้ไขข้อมูล Lead" : "เพิ่มข้อมูล Lead"}
      >
        <LeadForm
          lead={editingLead}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
        />
      </Modal>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[90%] max-w-sm p-6">
            <h3 className="font-semibold text-lg mb-4">ยืนยันการลบ</h3>
            <p className="text-sm text-gray-600 mb-6">
              ต้องการลบ <b>{leadToDelete?.name}</b> ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

type SummaryBoxProps = {
  label: string;
  value: number;
  color?: string;
  icon?: ReactNode;
};

const SummaryBox = ({ label, value, color = "text-gray-800", icon }: SummaryBoxProps) => {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="text-3xl text-gray-400">
            {icon}
          </div>
        )}
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
};


const StatusModal = ({
  lead,
  onClose,
  onSave,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [newAppointmentDate, setNewAppointmentDate] = useState("");
  const [newAppointmentTime, setNewAppointmentTime] = useState("");
  const [procedures, setProcedures] = useState<
    Array<{
      name: string;
      price: string;
      commissionRate: number;
    }>
  >([{ name: "", price: "0", commissionRate: 0 }]);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(3);
  const [commissionEnabled, setCommissionEnabled] = useState(false);

  // นัดหมายครั้งถัดไป
  const [nextAppointmentEnabled, setNextAppointmentEnabled] = useState(false);
  const [nextAppointmentDate, setNextAppointmentDate] = useState("");
  const [nextAppointmentTime, setNextAppointmentTime] = useState("");


  const totalAmount = procedures.reduce(
    (sum, p) => sum + (parseFloat(p.price) || 0),
    0
  );

  const serviceChargeAmount = paymentMethod === "card"
    ? Math.round((totalAmount * serviceChargeRate) / 100 * 100) / 100
    : 0;

  const netAmount = totalAmount - serviceChargeAmount;

  // คำนวณค่าคอมแต่ละหัตถการ — ถ้าบัตรเครดิตให้คิดจากยอดหลังหัก SC
  const commissionDetails = commissionEnabled
    ? procedures
      .filter((p) => p.name && parseFloat(p.price) > 0 && p.commissionRate > 0)
      .map((p) => {
        const price = parseFloat(p.price) || 0;
        const baseAmount =
          paymentMethod === "card"
            ? price - Math.round((price * serviceChargeRate) / 100 * 100) / 100
            : price;
        const commAmount = Math.round((baseAmount * p.commissionRate) / 100 * 100) / 100;
        return {
          procedureName: p.name,
          baseAmount,
          rate: p.commissionRate,
          amount: commAmount,
        };
      })
    : [];

  const totalCommission = commissionDetails.reduce((sum, d) => sum + d.amount, 0);

  const addProcedure = () => {
    setProcedures([
      ...procedures,
      { name: "", price: "0", commissionRate: 0 },
    ]);
  };


  const removeProcedure = (index: number) => {
    setProcedures(procedures.filter((_, i) => i !== index));
  };

  const updateProcedure = (index: number, key: string, value: any) => {
    setProcedures((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    );
  };

  const handleSave = async () => {
    try {
      if (!selectedStatus) return;

      const validProcedures = procedures.filter(p => p.name && p.price);

      const totalAmount = validProcedures.reduce(
        (sum, p) => sum + (parseFloat(p.price) || 0),
        0
      );

      let payments: any = undefined;
      if (paymentMethod && totalAmount > 0) {
        const scRate = paymentMethod === "card" ? serviceChargeRate : 0;
        const scAmount = paymentMethod === "card"
          ? Math.round((totalAmount * scRate) / 100 * 100) / 100
          : 0;

        payments = {
          method: paymentMethod,
          amount: totalAmount,
        };

        if (paymentMethod === "card") {
          payments.serviceCharge = {
            rate: scRate,
            amount: scAmount,
            netAmount: totalAmount - scAmount,
          };
        }

        // Commission
        if (commissionEnabled) {
          const details = validProcedures
            .filter((p) => p.commissionRate > 0)
            .map((p) => {
              const price = parseFloat(p.price) || 0;
              const base =
                paymentMethod === "card"
                  ? price - Math.round((price * scRate) / 100 * 100) / 100
                  : price;
              const commAmt = Math.round((base * p.commissionRate) / 100 * 100) / 100;
              return {
                procedureName: p.name,
                baseAmount: base,
                rate: p.commissionRate,
                amount: commAmt,
              };
            });

          if (details.length > 0) {
            payments.commission = {
              totalAmount: details.reduce((s, d) => s + d.amount, 0),
              details,
            };
          }
        }
      }

      const payload: any = {
        appointments: {
          status: selectedStatus,
        },
        ...(validProcedures.length > 0 ? {
          procedures: validProcedures.map((p) => ({
            name: p.name,
            price: p.price,
            ...(commissionEnabled && p.commissionRate > 0
              ? { commissionRate: p.commissionRate }
              : {}),
          }))
        } : {}),
        ...(payments ? { payments } : {}),
      };

      if (selectedStatus === "scheduled") {
        payload.appointments.date =
          lead.appointmentDate && lead.appointmentTime
            ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
            : new Date().toISOString();
      } else if (selectedStatus === "rescheduled") {
        if (!newAppointmentDate || !newAppointmentTime) {
          alert("กรุณาเลือกวันและเวลานัดใหม่");
          return;
        }
        payload.appointments.date = `${newAppointmentDate}T${newAppointmentTime}:00+07:00`;
      } else if (selectedStatus === "cancelled") {
        payload.appointments.date = new Date().toISOString();
      }

      await api.patch(`/${lead.id}`, payload);

      // สร้าง Lead ใหม่สำหรับนัดหมายครั้งถัดไป
      if (selectedStatus === "arrived" && nextAppointmentEnabled) {
        const hasNextDate = nextAppointmentDate && nextAppointmentTime;

        const nextLeadPayload: any = {
          clinic: { branch: lead.branch },
          patient: {
            name: lead.name,
            tel: lead.phone,
            lineId: lead.lineId || undefined
          },
          interests: lead.interest,
          referralChannel: lead.referralChannel,
          createdBy: lead.admin,
          note: "",
          previousAppointmentId: lead.id,
        };

        if (hasNextDate) {
          const appointmentDate = new Date(nextAppointmentDate);
          const firstDayOfMonth = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1);

          nextLeadPayload.appointments = {
            status: "scheduled",
            date: `${nextAppointmentDate}T${nextAppointmentTime}:00+07:00`,
          };
          nextLeadPayload.overrideCreatedAt = firstDayOfMonth.toISOString();
        } else {
          nextLeadPayload.appointments = {
            status: "pending",
          };
        }

        try {
          await api.post("/createlead", nextLeadPayload);
        } catch (err) {
          console.error("สร้าง Lead นัดครั้งถัดไปไม่สำเร็จ", err);
        }
      }

      onSave({
        ...lead,
        ...payload,
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const statusButtons = [
    { value: "arrived", label: "มาตามนัด", activeClass: "bg-blue-600 text-white" },
    { value: "rescheduled", label: "เลื่อนนัด", activeClass: "bg-yellow-500 text-white" },
    { value: "cancelled", label: "ยกเลิกนัด", activeClass: "bg-red-600 text-white" },
  ];


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">อัปเดตสถานะ Lead</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">
              เลือกสถานะ
            </label>

            <div className="grid grid-cols-3 rounded-xl overflow-hidden border">
              {statusButtons.map((btn) => {
                const isActive = selectedStatus === btn.value;
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => setSelectedStatus(btn.value)}
                    className={`py-3 text-sm font-medium transition
                      ${isActive
                        ? btn.activeClass
                        : "bg-white hover:bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedStatus === "arrived" && (
            <div className="space-y-6 border-t pt-6">
              <h3 className="font-semibold text-gray-700">
                ข้อมูลการทำหัตถการ
              </h3>

              {procedures.map((procedure, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-xl space-y-3"
                >
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหัตถการ</label>
                      <input
                        type="text"
                        placeholder="ชื่อหัตถการ"
                        value={procedure.name}
                        onChange={(e) => updateProcedure(index, "name", e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-white"
                      />
                    </div>

                    <div className="w-36">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={procedure.price ?? ""}
                        onChange={(e) => updateProcedure(index, "price", e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-white text-right"
                      />
                    </div>

                    {commissionEnabled && (
                      <div className="w-28">
                        <label className="block text-sm font-medium text-gray-700 mb-1">ค่าคอม (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={procedure.commissionRate || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateProcedure(index, "commissionRate", parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 pr-8 border rounded-md text-right bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                        </div>
                      </div>
                    )}

                    {procedures.length > 1 && (
                      <button
                        onClick={() => removeProcedure(index)}
                        className="text-red-500 hover:text-red-700 pb-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {commissionEnabled && procedure.commissionRate > 0 && parseFloat(procedure.price) > 0 && (
                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-xs text-purple-600 font-medium">
                        ค่าคอม = {(() => {
                          const price = parseFloat(procedure.price) || 0;
                          const base =
                            paymentMethod === "card"
                              ? price - Math.round((price * serviceChargeRate) / 100 * 100) / 100
                              : price;
                          return Math.round((base * procedure.commissionRate) / 100 * 100) / 100;
                        })().toLocaleString()} บาท
                      </span>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addProcedure}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                เพิ่มหัตถการ
              </button>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">ค่าคอมมิชชั่น</span>
                    <p className="text-xs text-gray-400 mt-0.5">เปิดเพื่อใส่ % ค่าคอมในแต่ละหัตถการ</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={commissionEnabled}
                    onClick={() => {
                      const next = !commissionEnabled;
                      setCommissionEnabled(next);
                      if (!next) {
                        setProcedures((prev) =>
                          prev.map((p) => ({ ...p, commissionRate: 0 }))
                        );
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${commissionEnabled ? "bg-purple-600" : "bg-gray-200"
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${commissionEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                {commissionEnabled && totalCommission > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    {commissionDetails.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {d.procedureName} ({d.rate}%
                          {paymentMethod === "card" ? ` จาก ${d.baseAmount.toLocaleString()} บาท` : ""})
                        </span>
                        <span className="font-medium text-purple-600">
                          {d.amount.toLocaleString()} บาท
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                      <span className="text-sm font-semibold text-gray-800">รวมค่าคอมมิชชั่น</span>
                      <span className="text-lg font-bold text-purple-600">
                        {totalCommission.toLocaleString()} บาท
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center bg-indigo-50 px-4 py-3 rounded-lg">
                <span className="text-sm font-medium">ยอดรวม</span>
                <span className="text-xl font-semibold text-indigo-600">
                  {totalAmount.toLocaleString()} บาท
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ช่องทางชำระเงิน
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg"
                >
                  <option value="">-- เลือกช่องทาง --</option>
                  <option value="cash">เงินสด</option>
                  <option value="transfer">โอนเงิน</option>
                  <option value="card">บัตรเครดิต</option>
                </select>
              </div>

              {paymentMethod === "card" && totalAmount > 0 && (
                <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm font-semibold">Service Charge บัตรเครดิต</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      อัตรา Service Charge (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={serviceChargeRate}
                        onChange={(e) => setServiceChargeRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 pr-10 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-amber-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ยอดรวมหัตถการ</span>
                      <span className="font-medium">{totalAmount.toLocaleString()} บาท</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">หัก Service Charge ({serviceChargeRate}%)</span>
                      <span className="font-medium text-red-600">-{serviceChargeAmount.toLocaleString()} บาท</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-amber-300">
                      <span className="text-sm font-semibold text-gray-800">ยอดสุทธิที่คลินิกได้รับ</span>
                      <span className="text-lg font-bold text-green-600">{netAmount.toLocaleString()} บาท</span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod && totalAmount > 0 && (
                <div className="bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    สรุปยอดเงิน
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ยอดก่อนหัก Service Charge</span>
                      <span className="font-medium">{totalAmount.toLocaleString()} บาท</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">หัก Service Charge</span>
                      <span className={`font-medium ${serviceChargeAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {serviceChargeAmount > 0 ? `-${serviceChargeAmount.toLocaleString()}` : '0'} บาท
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ค่าคอมมิชชัน</span>
                      <span className={`font-medium ${totalCommission > 0 ? 'text-purple-600' : 'text-gray-500'}`}>
                        {totalCommission > 0 ? totalCommission.toLocaleString() : '0'} บาท
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">หักเงินมัดจำ</span>
                      <span className={`font-medium ${(lead.deposit?.amount || 0) > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                        {(lead.deposit?.amount || 0) > 0 ? `-${(lead.deposit?.amount || 0).toLocaleString()}` : '0'} บาท
                      </span>
                    </div>

                    <div className="border-t border-slate-300 pt-3 mt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">ยอดที่ลูกค้าต้องชำระเพิ่ม</span>
                        <span className="text-xl font-bold text-indigo-600">
                          {Math.max(0, totalAmount - (lead.deposit?.amount || 0)).toLocaleString()} บาท
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-green-50 -mx-5 px-5 py-3 rounded-b-xl -mb-5 border-t border-green-200">
                        <span className="text-sm font-semibold text-gray-800">ยอดสุทธิที่คลินิกได้รับ</span>
                        <span className="text-xl font-bold text-green-600">
                          {(totalAmount - serviceChargeAmount - totalCommission).toLocaleString()} บาท
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">นัดหมายครั้งถัดไป</span>
                    <p className="text-xs text-gray-400 mt-0.5">สร้าง Lead ใหม่สำหรับการนัดหมายครั้งถัดไป</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={nextAppointmentEnabled}
                    onClick={() => {
                      const next = !nextAppointmentEnabled;
                      setNextAppointmentEnabled(next);
                      if (!next) {
                        setNextAppointmentDate("");
                        setNextAppointmentTime("");
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${nextAppointmentEnabled ? "bg-indigo-600" : "bg-gray-200"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nextAppointmentEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                {nextAppointmentEnabled && (
                  <div className="space-y-4 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่นัด</label>
                        <input
                          type="date"
                          value={nextAppointmentDate}
                          onChange={(e) => setNextAppointmentDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เวลานัด</label>
                        <input
                          type="time"
                          value={nextAppointmentTime}
                          onChange={(e) => setNextAppointmentTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {nextAppointmentDate
                        ? `จะสร้าง Lead ใหม่สถานะ "ทำนัด" วันที่สร้างจะเป็นวันที่ 1 ของเดือน ${new Date(nextAppointmentDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`
                        : 'ไม่ระบุวันที่ = สร้าง Lead ใหม่สถานะ "รอตัดสินใจ" วันที่สร้างเป็นวันนี้'
                      }
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {selectedStatus === "rescheduled" && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-700">
                กำหนดนัดใหม่
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    วันที่นัด
                  </label>
                  <input
                    type="date"
                    value={newAppointmentDate}
                    onChange={(e) =>
                      setNewAppointmentDate(e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    เวลานัด
                  </label>
                  <input
                    type="time"
                    value={newAppointmentTime}
                    onChange={(e) =>
                      setNewAppointmentTime(e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedStatus}
            className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:bg-gray-300"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewLeadModal = ({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) => {
  const interestDisplay = Array.isArray(lead.interest)
    ? lead.interest.map((i) => `${i.name} (${Number(i.price).toLocaleString()} บาท)`).join(", ")
    : "ไม่มี";

  const proceduresDisplay = Array.isArray(lead.procedures) && lead.procedures.length > 0
    ? lead.procedures
    : null;

  const paymentMethodMap: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    card: "บัตรเครดิต",
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-orange-100", text: "text-orange-700", label: "รอดำเนินการ" },
    scheduled: { bg: "bg-blue-100", text: "text-blue-700", label: "นัดหมายแล้ว" },
    rescheduled: { bg: "bg-yellow-100", text: "text-yellow-700", label: "เลื่อนนัด" },
    arrived: { bg: "bg-green-100", text: "text-green-700", label: "มาตามนัด" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "ยกเลิก" },
  };

  const status = statusConfig[lead.status] || statusConfig.pending;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">

        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b bg-white rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">รายละเอียด Lead</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{lead.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            {lead.status !== "pending" && lead.appointmentDateDisplay && !lead.appointmentDateDisplay.includes("1970") && (
              <span className="text-xs sm:text-sm text-gray-500">
                📅 {lead.appointmentDateDisplay}
              </span>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              ข้อมูลลูกค้า
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem label="ชื่อนามสกุล" value={lead.name} />
              <InfoItem label="เบอร์ติดต่อ" value={lead.phone} />
              <InfoItem label="Line ID" value={lead.lineId || "-"} />
              <InfoItem label="ช่องทางที่รู้จัก" value={lead.referralChannel || "-"} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              ข้อมูลคลินิก
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem label="สาขา" value={lead.branch || "-"} />
              <InfoItem label="แอดมิน" value={lead.admin || "-"} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              ความสนใจ (หัตถการ)
            </h3>
            <p className="text-sm text-gray-800">{interestDisplay}</p>
          </div>

          {proceduresDisplay && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                หัตถการที่ทำ
              </h3>
              <div className="space-y-2">
                {proceduresDisplay.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="font-medium text-emerald-600">{Number(p.price).toLocaleString()} บาท</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lead.deposit && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                ข้อมูลมัดจำ
              </h3>
              <div className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2">
                <span className="text-gray-600">จำนวนเงินมัดจำ</span>
                <span className="font-bold text-blue-600">{lead.deposit.amount?.toLocaleString()} บาท</span>
              </div>
              {lead.deposit.slipUrl && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-500 block mb-2">สลิปการโอนเงิน</label>
                  <div
                    className="relative bg-white rounded-lg overflow-hidden border border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      const url = lead.deposit?.slipUrl?.startsWith('http')
                        ? lead.deposit.slipUrl
                        : `${import.meta.env.VITE_API_URL || ''}${lead.deposit?.slipUrl}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <img
                      src={lead.deposit.slipUrl.startsWith('http')
                        ? lead.deposit.slipUrl
                        : `${import.meta.env.VITE_API_URL || ''}${lead.deposit.slipUrl}`}
                      alt="สลิปการโอน"
                      className="w-full max-h-48 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 hover:opacity-100 text-white text-xs bg-black/50 px-2 py-1 rounded">
                        คลิกเพื่อดูขนาดเต็ม
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {lead.status === "arrived" && (
            <div className="bg-violet-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                ข้อมูลการชำระเงิน
              </h3>

              {lead.payments ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500">วิธีชำระเงิน</p>
                      <p className="text-sm font-medium text-gray-800">{paymentMethodMap[lead.payments?.method] || "-"}</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500">จำนวนเงิน</p>
                      <p className="text-sm font-bold text-violet-600">{lead.payments.amount?.toLocaleString()} บาท</p>
                    </div>
                  </div>

                  {lead.payments.serviceCharge && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-700">Service Charge บัตรเครดิต</p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">อัตรา</span>
                          <span className="font-medium">{lead.payments.serviceCharge.rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">จำนวนที่หัก</span>
                          <span className="font-medium text-red-600">-{lead.payments.serviceCharge.amount?.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-amber-200">
                          <span className="font-semibold text-gray-800">ยอดสุทธิ</span>
                          <span className="font-bold text-green-600">{lead.payments.serviceCharge.netAmount?.toLocaleString()} บาท</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {lead.payments.commission && lead.payments.commission.totalAmount > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-purple-700">ค่าคอมมิชชั่น</p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        {lead.payments.commission.details?.map((d, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-gray-600 truncate mr-2">
                              {d.procedureName} ({d.rate}%)
                            </span>
                            <span className="font-medium text-purple-600 whitespace-nowrap">{d.amount?.toLocaleString()} บาท</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1 border-t border-purple-200">
                          <span className="font-semibold text-gray-800">รวม</span>
                          <span className="font-bold text-purple-600">{lead.payments.commission.totalAmount?.toLocaleString()} บาท</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">ยังไม่มีข้อมูลการชำระเงิน</p>
                </div>
              )}
            </div>
          )}

          {lead.note && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                หมายเหตุ
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3">{lead.note}</p>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center pt-2">
            สร้างเมื่อ: {lead.createdAtDisplay}
          </div>
        </div>

        <div className="flex justify-end px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white rounded-lg px-3 py-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
  </div>
);


export default LeadsPage;