import React, { useState, useMemo, useEffect } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { type Lead } from "../types";
import { mockLeads } from "../lib/mock";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";

const API_URL = "http://localhost:3000/lead/v1/api";
const API_KEY = "cureconnectkeytoken12345";

const statusLabel: Record<string, string> = {
  Pending: "รอตัดสินใจ",
  Scheduled: "ทำนัดแล้ว",
};

const LeadsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState("2025-12");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("http://localhost:3000/lead/v1/api/lead", {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
        });

        if (!res.ok) {
          throw new Error("Fetch leads failed");
        }

        const result = await res.json();

        const mappedLeads: Lead[] = (Array.isArray(result.data) ? result.data : []).map(
          (item: any) => {
            const createdDate = new Date(item.createdAt);
            const buddhistYear = createdDate.getFullYear() + 543;
            const month = String(createdDate.getMonth() + 1).padStart(2, "0");

            return {
              id: item._id,
              name: item.patient?.name || "",
              phone: item.patient?.tel || "",
              lineId: item.patient?.lineId || "",
              interest: item.interests || "",
              referralChannel: item.referralChannel || "",
              admin: item.createdBy || "",
              branch: item.clinic?.branch || "",
              status:
                item.appointments?.status === "scheduled"
                  ? "Scheduled"
                  : "Pending",
              appointmentDate: item.appointments?.date
                ? item.appointments.date.split("T")[0]
                : undefined,
              appointmentTime: item.appointments?.date
                ? item.appointments.date.split("T")[1]?.substring(0, 5)
                : undefined,
              note: item.note || "",
              createdAt: `${buddhistYear}-${month}`,
            };
          }
        );


        setLeads(mappedLeads);
      } catch (error) {
        console.error("❌ fetch leads error:", error);
        setLeads(mockLeads);
      }
    };

    fetchLeads();
  }, []);


  const filteredLeads = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const buddhistMonth = `${Number(year) + 543}-${month}`;

    return leads.filter((lead) => {
      const matchesMonth = lead.createdAt.startsWith(buddhistMonth);
      const matchesSearch =
        searchQuery === "" ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.lineId.toLowerCase().includes(searchQuery.toLowerCase());


      return matchesMonth && matchesSearch;
    });
  }, [leads, selectedMonth, searchQuery]);

  /* ================= SUMMARY ================= */
  const summary = useMemo(() => {
    return {
      total: filteredLeads.length,
      withAppointment: filteredLeads.filter(
        (l) => l.status === "Scheduled"
      ).length,
      waiting: filteredLeads.filter(
        (l) => l.status === "Pending"
      ).length,
    };
  }, [filteredLeads]);

  /* ================= SAVE ================= */
  const handleSave = async (lead: Lead) => {
    try {
      if (!editingLead) {
        const payload = {
          clinic: {
            clinicId: "CLINIC001",
            name: "Smile Dental",
            branch: "Bangkok",
          },
          patient: {
            name: lead.name,
            tel: lead.phone,
            lineId: lead.lineId || undefined,
          },
          appointments: {
            status: lead.status === "Scheduled" ? "scheduled" : "pending",
            date: lead.appointmentDate
              ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
              : new Date().toISOString(),
          },
          interests: lead.interest,
          referralChannel: lead.referralChannel,
          note: lead.note,
          createdBy: "admin",
        };

        const res = await fetch(`${API_URL}/createlead`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Create lead failed");
        }

        const result = await res.json();

        const createdId =
          result?.data?._id ||
          result?._id ||
          result?.lead?._id;

        if (!createdId) {
          throw new Error("Invalid create lead response");
        }

        setLeads((prev) => [
          ...prev,
          {
            ...lead,
            id: createdId,
          },
        ]);
      } else {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? lead : l))
        );
      }

      setIsModalOpen(false);
      setEditingLead(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = (id: string) => {
    if (confirm("คุณต้องการลบข้อมูลนี้ใช่หรือไม่?")) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Leads</h1>
        <p className="text-gray-600 mb-8">
          รายชื่อลูกค้าที่ลงข้อมูลและการติดตาม
        </p>

        {/* SUMMARY */}
        <div className="grid grid-cols-3 gap-6 mb-8 max-md:grid-cols-1">
          <SummaryBox label="ทั้งหมด" value={summary.total} />
          <SummaryBox
            label="ทำนัดแล้ว"
            value={summary.withAppointment}
            color="text-green-600"
          />
          <SummaryBox
            label="รอตัดสินใจ"
            value={summary.waiting}
            color="text-orange-600"
          />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex gap-4 max-md:flex-col">
            {/* 📅 ปฏิทิน เดือน/ปี */}
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
              onClick={() => {
                setEditingLead(null);
                setIsModalOpen(true);
              }}
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
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${lead.status === "Scheduled"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                          }`}
                      >
                        {statusLabel[lead.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">{lead.createdAt}</td>
                    <td className="px-6 py-4">
                      {lead.appointmentDate || "ยังไม่นัด"}
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      <Edit2
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                        onClick={() => {
                          setEditingLead(lead);
                          setIsModalOpen(true);
                        }}
                      />
                      <Trash2
                        className="w-4 h-4 text-red-600 cursor-pointer"
                        onClick={() => handleDelete(lead.id)}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }}
        title={editingLead ? "แก้ไขข้อมูล Lead" : "เพิ่มข้อมูล Lead"}
      >
        <LeadForm
          lead={editingLead}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default LeadsPage;

/* ================= COMPONENT ================= */
const SummaryBox = ({
  label,
  value,
  color = "",
}: {
  label: string;
  value: number;
  color?: string;
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-sm text-gray-600 mb-2">{label}</div>
    <div className={`text-3xl font-bold ${color}`}>{value}</div>
  </div>
);
