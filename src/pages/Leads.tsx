import React, { useState, useMemo, useEffect } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { type Lead } from "../types";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const statusLabel: Record<string, string> = {
  Pending: "รอตัดสินใจ",
  Scheduled: "ทำนัดแล้ว",
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const LeadsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState("2026-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_URL}/lead`, {
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      });

      if (!res.ok) throw new Error("Fetch leads failed");

      const result = await res.json();

      const mappedLeads: Lead[] = (Array.isArray(result.data) ? result.data : []).map(
        (item: any) => {
          const createdAtDisplay = formatDate(item.createdAt);

          const status = item.appointments?.status === "scheduled" ? "Scheduled" : "Pending";

          const appointmentDateDisplay =
            status === "Scheduled" && item.appointments?.date && item.appointments.date !== null
              ? formatDateTime(item.appointments.date)
              : "ยังไม่นัด";

          return {
            id: item._id,
            name: item.patient?.name || "",
            phone: item.patient?.tel || "",
            lineId: item.patient?.lineId || "",
            interest: item.interests || "",
            referralChannel: item.referralChannel || "",
            admin: item.createdBy || "",
            branch: item.clinic?.branch || "",
            status,
            createdAt: item.createdAt,
            createdAtDisplay,
            appointmentDate: status === "Scheduled" && item.appointments?.date ? item.appointments.date : undefined,
            appointmentDateDisplay,
            note: item.note || "",
          };
        }
      );

      mappedLeads.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setLeads(mappedLeads);
    } catch (error) {
      console.error("fetch leads error:", error);
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
      return matchesMonth && matchesSearch;
    });
  }, [leads, selectedMonth, searchQuery]);

  const summary = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const leadsInMonth = leads.filter((lead) =>
      lead.createdAt?.startsWith(`${year}-${month}`)
    );
    return {
      total: leadsInMonth.length,
      withAppointment: leadsInMonth.filter((l) => l.status === "Scheduled").length,
      waiting: leadsInMonth.filter((l) => l.status === "Pending").length,
    };
  }, [leads, selectedMonth]);

  const handleSave = async (lead: Lead) => {
    try {
      const payload: any = {
        clinic: { branch: lead.branch },
        patient: { name: lead.name, tel: lead.phone, lineId: lead.lineId || undefined },
        interests: lead.interest,
        referralChannel: lead.referralChannel,
        note: lead.note,
        createdBy: lead.admin,
      };

      if (lead.status === "Scheduled") {
        payload.appointments = {
          status: "scheduled",
          date: lead.appointmentDate && lead.appointmentTime
            ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
            : new Date().toISOString(),
        };
      } else {
        payload.appointments = { status: "pending", date: null };
      }

      if (!editingLead) {
        payload.clinic = { clinicId: "CLINIC001", name: "Smile Dental", branch: lead.branch || "Bangkok" };
        const res = await fetch(`${API_URL}/createlead`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Create lead failed");
        }
      } else {
        const res = await fetch(`${API_URL}/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.log('error', payload)
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
      headers: { "x-api-key": API_KEY },
    });
    await fetchLeads();
    setIsDeleteModalOpen(false);
    setLeadToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Leads</h1>
        <p className="text-gray-600 mb-8">รายชื่อลูกค้าที่ลงข้อมูลและการติดตาม</p>

        <div className="grid grid-cols-3 gap-6 mb-8 max-md:grid-cols-1">
          <SummaryBox label="ทั้งหมด" value={summary.total} />
          <SummaryBox label="ทำนัดแล้ว" value={summary.withAppointment} color="text-green-600" />
          <SummaryBox label="รอตัดสินใจ" value={summary.waiting} color="text-orange-600" />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex gap-4 max-md:flex-col">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-md"
            />
            <div className="flex items-center w-full border rounded-md px-3">
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
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md"
            >
              <Plus className="w-5 h-5" />
              เพิ่ม Lead
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs">ชื่อ</th>
                  <th className="px-6 py-3 text-left text-xs">โทร</th>
                  <th className="px-6 py-3 text-left text-xs">สถานะ</th>
                  <th className="px-6 py-3 text-left text-xs">วันที่สร้าง</th>
                  <th className="px-6 py-3 text-left text-xs">วันที่นัด</th>
                  <th className="px-6 py-3 text-left text-xs">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t">
                    <td className="px-6 py-4">{lead.name}</td>
                    <td className="px-6 py-4">{lead.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${lead.status === "Scheduled" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                        {statusLabel[lead.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">{lead.createdAtDisplay}</td>
                    <td className="px-6 py-4">{lead.appointmentDateDisplay}</td>
                    <td className="px-6 py-4 flex gap-3">
                      <Edit2 className="w-4 h-4 text-indigo-600 cursor-pointer"
                        onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}
                      />
                      <Trash2 className="w-4 h-4 text-red-600 cursor-pointer"
                        onClick={() => openDeleteModal(lead)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
        title="ยืนยันการลบ"
      >
        <div className="mb-4 text-sm">
          คุณต้องการลบ Lead <b>{leadToDelete?.name}</b> ใช่หรือไม่?
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }} className="px-4 py-2 border rounded-md text-sm">ยกเลิก</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">ลบ</button>
        </div>
      </Modal>
    </div>
  );
};

export default LeadsPage;

const SummaryBox = ({ label, value, color = "" }: { label: string; value: number; color?: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-sm text-gray-600 mb-2">{label}</div>
    <div className={`text-3xl font-bold ${color}`}>{value}</div>
  </div>
);
