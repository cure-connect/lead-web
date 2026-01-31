import React, { useState, useMemo, useEffect, type ReactNode } from "react";
import { Search, Plus, Edit2, Trash2, X, Users, CalendarCheck, Clock, XCircle } from "lucide-react";
import { type Lead } from "../types";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "Authorization": `Bearer ${token}`
  };
};

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

const LeadsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"notScheduled" | "scheduled">("notScheduled");
  const [selectedMonth, setSelectedMonth] = useState("2026-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [statusModalLead, setStatusModalLead] = useState<Lead | null>(null);


  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_URL}/lead`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Fetch leads failed");

      const result = await res.json();

      const mappedLeads: Lead[] = (Array.isArray(result.data) ? result.data : []).map(
        (item: any) => {
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
          };
        }
      );


      mappedLeads.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setLeads(mappedLeads);
    } catch (error) {
      console.error(error);
      setLeads([]);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);


  const filteredLeads = useMemo(() => {
    const [year, month] = selectedMonth.split("-");

    return leads.filter((lead) => {
      const matchesMonth = lead.createdAt?.startsWith(`${year}-${month}`);

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
    const leadsInMonth = leads.filter((lead) =>
      lead.createdAt?.startsWith(`${year}-${month}`)
    );
    return {
      total: leadsInMonth.length,
      withAppointment: leadsInMonth.filter((l) =>
        ["scheduled", "rescheduled"].includes(l.status)
      ).length,
      waiting: leadsInMonth.filter((l) => l.status === "pending").length,
      cancelled: leadsInMonth.filter((l) => l.status === "cancelled").length,
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

      if (!editingLead) {
        payload.clinic = { name: lead.name, branch: lead.branch || "Bangkok" };
        const res = await fetch(`${API_URL}/createlead`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Create lead failed");
        }
      } else {
        const res = await fetch(`${API_URL}/${lead.id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Update lead failed");
        }
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
    await fetch(`${API_URL}/${leadToDelete.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    await fetchLeads();
    setIsDeleteModalOpen(false);
    setLeadToDelete(null);
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
                                className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md
    ${lead.status === "scheduled"
                                    ? "bg-blue-100 text-blue-700"
                                    : lead.status === "rescheduled"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : lead.status === "arrived"
                                        ? "bg-green-100 text-green-700"
                                        : lead.status === "cancelled"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-700"
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
                            <Edit2
                              className="w-4 h-4 text-indigo-600 cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}
                            />
                            <Trash2
                              className="w-4 h-4 text-red-600 cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => openDeleteModal(lead)}
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
      procedureId?: string;
      readonly?: boolean;
    }>
  >([{ name: "", price: "0", procedureId: undefined, readonly: false }]);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState<number>(0);
  const [monthlyPayments, setMonthlyPayments] = useState<number[]>([]);


  const totalAmount = procedures.reduce(
    (sum, p) => sum + (parseFloat(p.price) || 0),
    0
  );

  const [procedureOptions, setProcedureOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      selectedStatus === "arrived" &&
      Array.isArray(lead.interest) &&
      lead.interest.length > 0 &&
      procedureOptions.length > 0
    ) {
      setProcedures(
        lead.interest.map((p) => {
          const matched = procedureOptions.find(
            (opt) => opt.name === p.name
          );

          return {
            name: p.name,
            price: String(p.price),
            procedureId: matched?._id ? String(matched._id) : undefined,
            readonly: true,
          };
        })
      );
    }
  }, [selectedStatus, lead.interest, procedureOptions]);


  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_URL}/setting/gettype`, { headers: getAuthHeaders() }
        );
        const data = await res.json();
        setProcedureOptions(data.interests ?? []);
      } catch (error) {
        console.error("Failed to fetch procedures", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, []);

  useEffect(() => {
    if (installmentMonths > 0) {
      setMonthlyPayments((prev) =>
        Array.from({ length: installmentMonths }, (_, i) => prev[i] || 0)
      );
    } else {
      setMonthlyPayments([]);
    }
  }, [installmentMonths]);

  const addProcedure = () => {
    setProcedures([
      ...procedures,
      { name: "", price: "0", procedureId: undefined, readonly: false },
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
        if (paymentMethod === "installment") {
          payments = {
            method: "installment",
            amount: totalAmount,
            installment: {
              months: installmentMonths,
              monthlyAmount: monthlyPayments,
            }
          };
        } else {
          payments = {
            method: paymentMethod,
            amount: totalAmount,
          };
        }
      }

      const payload: any = {
        appointments: {
          status: selectedStatus,
        },
        ...(validProcedures.length > 0 ? {
          interests: validProcedures.map((p) => ({
            name: p.name,
            price: p.price,
            ...(p.procedureId ? { procedureId: p.procedureId } : {}),
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

      const res = await fetch(`${API_URL}/${lead.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Patch lead failed");

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
                  className="flex gap-3 items-center bg-gray-50 p-4 rounded-xl"
                >
                  <select
                    value={procedure.procedureId ?? ""}
                    disabled={procedure.readonly}
                    onChange={(e) => {
                      const selectedId = e.target.value;

                      const selected = procedureOptions.find(
                        (p) => String(p._id) === selectedId
                      );

                      if (!selected) return;

                      updateProcedure(index, "procedureId", String(selected._id));
                      updateProcedure(index, "name", selected.name);
                      updateProcedure(index, "price", String(selected.price));
                    }}
                    className="flex-1 px-3 py-2 border rounded-md bg-white disabled:bg-gray-100"
                  >

                    <option value="">
                      {loading ? "กำลังโหลด..." : "เลือกหัตถการ"}
                    </option>

                    {procedureOptions.map((option) => (
                      <option key={option._id} value={String(option._id)}>
                        {option.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={procedure.price ?? ""}
                    disabled
                    className="w-40 px-3 py-2 border rounded-md bg-gray-100 text-right"
                  />

                  {!procedure.readonly && (
                    <button
                      onClick={() => removeProcedure(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
                  <option value="installment">ผ่อนชำระ</option>
                </select>
              </div>

              {paymentMethod === "installment" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      จำนวนเดือน
                    </label>
                    <select
                      value={installmentMonths}
                      onChange={(e) =>
                        setInstallmentMonths(parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="0">-- เลือก --</option>
                      <option value="3">3 เดือน</option>
                      <option value="6">6 เดือน</option>
                      <option value="12">12 เดือน</option>
                    </select>
                  </div>

                  {monthlyPayments.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {monthlyPayments.map((value, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium mb-2">
                            เดือนที่ {index + 1} (บาท)
                          </label>
                          <input
                            type="number"
                            value={value || ""}
                            onChange={(e) => {
                              const newPayments = [...monthlyPayments];
                              newPayments[index] = parseFloat(e.target.value) || 0;
                              setMonthlyPayments(newPayments);
                            }}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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


export default LeadsPage;