import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Search,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    RotateCcw,
    SlidersHorizontal,
    X,
    ChevronDown,
    ChevronUp,
    Users,
    Phone,
    Loader2,
    Stethoscope,
    CalendarCheck,
    Clock,
    XCircle,
    UserCheck,
    ExternalLink,
    CreditCard,
    FileText,
    Heart,
    Image as ImageIcon,
    Plus,
    Pencil,
} from "lucide-react";
import api from "@/api/api";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";
import { type Lead } from "../types";
import { useToast, ToastContainer } from "../components/Toast";

// ============================================
// Types
// ============================================

interface Patient {
    _id: string;
    clinicId: number;
    fullname: string;
    nickname?: string;
    tel?: string;
    socialMedia?: string;
    balance: number;
    transactions: Transaction[];
    createdAt: string;
    updatedAt: string;
}

interface Transaction {
    _id?: string;
    type: "deposit" | "use" | "refund" | "adjust";
    amount: number;
    description?: string;
    appointmentId?: string;
    createdBy?: string;
    createdAt: string;
}

interface Appointment {
    _id: string;
    patient: {
        fullname: string;
        nickname?: string;
        tel?: string;
    };
    appointments: {
        status: "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";
        date?: string;
    };
    interests?: Array<{ name: string }>;
    procedures?: Array<{
        name: string;
        price: string;
        depositUsed?: number;
        commissionRate?: number;
    }>;
    payments?: {
        method?: string;
        amount?: number;
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
    deposit?: {
        amount: number;
    };
    receiptUrls?: string[];
    referralChannel?: string;
    note?: string;
    createdBy?: string;
    createdAt: string;
}

// ============================================
// Helpers
// ============================================

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

const statusLabel: Record<string, string> = {
    pending: "รอตัดสินใจ",
    scheduled: "ทำนัด",
    rescheduled: "เลื่อนนัด",
    cancelled: "ยกเลิกนัด",
    arrived: "มาตามนัด",
};

const statusColor: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    scheduled: "bg-blue-100 text-blue-700",
    rescheduled: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-600",
    arrived: "bg-emerald-100 text-emerald-700",
};

const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3.5 h-3.5" />,
    scheduled: <CalendarCheck className="w-3.5 h-3.5" />,
    rescheduled: <Clock className="w-3.5 h-3.5" />,
    cancelled: <XCircle className="w-3.5 h-3.5" />,
    arrived: <UserCheck className="w-3.5 h-3.5" />,
};

const paymentMethodLabel: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอน",
    card: "บัตรเครดิต",
    free: "ฟรี",
};

const txTypeLabel: Record<string, string> = {
    deposit: "วางมัดจำ",
    use: "ใช้มัดจำ",
    refund: "คืนมัดจำ",
    adjust: "ปรับยอด",
};

const txTypeColor: Record<string, string> = {
    deposit: "text-emerald-600",
    use: "text-red-600",
    refund: "text-amber-600",
    adjust: "text-blue-600",
};

const txTypeBg: Record<string, string> = {
    deposit: "bg-emerald-50 border-emerald-200",
    use: "bg-red-50 border-red-200",
    refund: "bg-amber-50 border-amber-200",
    adjust: "bg-blue-50 border-blue-200",
};

type DetailTab = "treatments" | "visits" | "deposits";

// ============================================
// Main Component
// ============================================

const PatientsPage: React.FC = () => {

    const { toasts, toast, removeToast } = useToast();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>("treatments");

    const [treatmentModal, setTreatmentModal] = useState<Appointment | null>(null);

    // State: Lead form modal
    const [leadFormOpen, setLeadFormOpen] = useState(false);
    const [leadFormPatient, setLeadFormPatient] = useState<Patient | null>(null);

    const [depositModal, setDepositModal] = useState<{
        open: boolean;
        type: "deposit" | "refund" | "adjust";
        patientId: string;
        patientName: string;
    } | null>(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDescription, setDepositDescription] = useState("");
    const [depositLoading, setDepositLoading] = useState(false);

    // State: Edit patient modal
    const [editModal, setEditModal] = useState<Patient | null>(null);
    const [editForm, setEditForm] = useState({ fullname: "", nickname: "", tel: "", socialMedia: "" });
    const [editLoading, setEditLoading] = useState(false);
    const [editTelDuplicate, setEditTelDuplicate] = useState<{ fullname: string; nickname?: string } | null>(null);

    const checkTelDuplicate = async (tel: string, excludeId?: string) => {
        const normalized = tel.replace(/[-\s]/g, '');
        if (normalized.length < 9) { setEditTelDuplicate(null); return; }
        try {
            const res = await api.get(`/patient/check-tel?tel=${normalized}${excludeId ? `&excludeId=${excludeId}` : ''}`);
            if (res.data?.exists) {
                setEditTelDuplicate(res.data.patient);
            } else {
                setEditTelDuplicate(null);
            }
        } catch { setEditTelDuplicate(null); }
    };

    // ============================================
    // Fetch patients
    // ============================================

    const fetchPatients = useCallback(async (query: string) => {
        try {
            setLoading(true);
            let res;
            if (query.trim().length > 0) {
                res = await api.get(`/patient/search?q=${encodeURIComponent(query.trim())}`);
            } else {
                res = await api.get("/patient");
            }
            const data = res.data?.data || res.data || [];
            setPatients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch patients failed:", error);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients("");
    }, [fetchPatients]);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchPatients(value);
        }, 400);
    };

    // ============================================
    // Fetch detail + appointments
    // ============================================

    const fetchPatientDetail = async (patientId: string) => {
        try {
            setDetailLoading(true);
            const [patientRes, appointmentsRes] = await Promise.all([
                api.get(`/patient/${patientId}`),
                api.get(`/patient/${patientId}/appointments`),
            ]);
            const patient = patientRes.data?.data || patientRes.data;
            const appointments = appointmentsRes.data?.data || [];
            setSelectedPatient(patient);
            setPatientAppointments(Array.isArray(appointments) ? appointments : []);
        } catch (error) {
            console.error("Fetch patient detail failed:", error);
            setPatientAppointments([]);
        } finally {
            setDetailLoading(false);
        }
    };

    const togglePatientExpand = async (patientId: string) => {
        if (expandedPatientId === patientId) {
            setExpandedPatientId(null);
            setSelectedPatient(null);
            setPatientAppointments([]);
            return;
        }
        setExpandedPatientId(patientId);
        setActiveTab("treatments");
        await fetchPatientDetail(patientId);
    };

    // ============================================
    // Derived data
    // ============================================

    const treatmentHistory = patientAppointments.filter(
        (a) => a.appointments?.status === "arrived" && a.procedures && a.procedures.length > 0
    );

    const visitHistory = patientAppointments;

    // ============================================
    // Deposit actions
    // ============================================

    const openDepositModal = (type: "deposit" | "refund" | "adjust", patient: Patient) => {
        setDepositModal({ open: true, type, patientId: patient._id, patientName: patient.fullname });
        setDepositAmount("");
        setDepositDescription("");
    };

    const handleDepositSubmit = async () => {
        if (!depositModal) return;
        const amount = parseFloat(depositAmount);
        if (!amount || amount <= 0) return;

        try {
            setDepositLoading(true);
            const { type, patientId } = depositModal;
            const endpoint =
                type === "deposit" ? `/patient/${patientId}/deposit`
                    : type === "refund" ? `/patient/${patientId}/refund`
                        : `/patient/${patientId}/adjust`;

            await api.post(endpoint, { amount, description: depositDescription || undefined });
            setDepositModal(null);
            toast.success(type === "deposit" ? "เพิ่มมัดจำสำเร็จ" : type === "refund" ? "คืนมัดจำสำเร็จ" : "ปรับยอดสำเร็จ");
            await fetchPatients(searchQuery);
            if (expandedPatientId === patientId) await fetchPatientDetail(patientId);
        } catch (error: any) {
            console.error("Deposit action failed:", error);
            toast.error(error.response?.data?.message || "ทำรายการไม่สำเร็จ");
        } finally {
            setDepositLoading(false);
        }
    };

    const openEditModal = (patient: Patient) => {
        setEditForm({
            fullname: patient.fullname || "",
            nickname: patient.nickname || "",
            tel: patient.tel || "",
            socialMedia: patient.socialMedia || "",
        });
        setEditTelDuplicate(null);
        setEditModal(patient);
    };

    const handleEditSubmit = async () => {
        if (!editModal || !editForm.fullname.trim()) return;
        setEditLoading(true);
        try {
            await api.patch(`/patient/${editModal._id}`, {
                fullname: editForm.fullname.trim(),
                nickname: editForm.nickname.trim() || undefined,
                tel: editForm.tel.trim() || undefined,
                socialMedia: editForm.socialMedia.trim() || undefined,
            });
            setEditModal(null);
            toast.success("แก้ไขข้อมูลคนไข้สำเร็จ");
            await fetchPatients(searchQuery);
            if (expandedPatientId === editModal._id) {
                await fetchPatientDetail(editModal._id);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "แก้ไขข้อมูลไม่สำเร็จ");
        } finally {
            setEditLoading(false);
        }
    };

    const handleAddLead = (patient: Patient) => {
        setLeadFormPatient(patient);
        setLeadFormOpen(true);
    };

    const handleSaveNewLead = async (lead: Lead) => {
        try {
            const payload: any = {
                clinic: { branch: lead.branch },
                patient: {
                    patientId: lead.patientId || undefined,
                    fullname: lead.name,
                    nickname: lead.nickname || undefined,
                    tel: lead.phone,
                    socialMedia: lead.socialMedia || undefined,
                },
                interests: [lead.interest],
                referralChannel: lead.referralChannel,
                note: lead.note,
                createdBy: lead.admin,
            };

            if (lead.status === "scheduled") {
                payload.appointments = {
                    status: "scheduled",
                    date: lead.appointmentDate && lead.appointmentTime
                        ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
                        : new Date().toISOString(),
                };
            } else {
                payload.appointments = {
                    status: lead.status || "pending",
                    date: null,
                };
            }

            if (lead.deposit) {
                payload.deposit = lead.deposit;
            }

            payload.clinic = {
                name: lead.name,
                branch: lead.branch || "Bangkok",
            };

            await api.post("/createlead", payload);

            setLeadFormOpen(false);
            setLeadFormPatient(null);
            toast.success("เพิ่ม Lead สำเร็จ");

            // Refresh patient detail ถ้ากำลังเปิดอยู่
            if (expandedPatientId) {
                await fetchPatientDetail(expandedPatientId);
            }
        } catch (error: any) {
            console.error("Create lead failed:", error);
            toast.error(error.response?.data?.message || error.message || "เพิ่ม Lead ไม่สำเร็จ");
        }
    };

    // ============================================
    // Render
    // ============================================

    return (
        <div className="min-h-screen bg-gray-50">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-24 sm:py-8">

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(""); fetchPatients(""); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Count */}
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{loading ? "กำลังโหลด..." : `${patients.length} คนไข้`}</span>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                {!loading && patients.length === 0 && (
                    <div className="text-center py-20">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">{searchQuery ? "ไม่พบคนไข้ที่ค้นหา" : "ยังไม่มีข้อมูลคนไข้"}</p>
                        <p className="text-gray-400 text-sm mt-1">{searchQuery ? "ลองค้นหาด้วยชื่อหรือเบอร์โทรอื่น" : "คนไข้จะถูกสร้างอัตโนมัติเมื่อเพิ่ม Lead ใหม่"}</p>
                    </div>
                )}

                {/* Patient List */}
                {!loading && patients.length > 0 && (
                    <div className="space-y-3">
                        {patients.map((patient) => {
                            const isExpanded = expandedPatientId === patient._id;
                            return (
                                <div key={patient._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* Patient Row */}
                                    <div
                                        className="flex items-center gap-4 px-4 sm:px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => togglePatientExpand(patient._id)}
                                    >
                                        <div className="shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <span className="text-indigo-600 font-semibold text-sm">{patient.fullname.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">
                                                {patient.fullname}
                                                {patient.nickname && <span className="text-gray-500 font-normal"> ({patient.nickname})</span>}
                                            </div>
                                            {patient.tel && (
                                                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                                    <Phone className="w-3 h-3" />{patient.tel}
                                                </div>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className="text-xs text-gray-500">มัดจำคงเหลือ</div>
                                            <div className={`text-lg font-bold tabular-nums ${patient.balance > 0 ? "text-emerald-600" : patient.balance < 0 ? "text-red-600" : "text-gray-400"}`}>
                                                {patient.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded — 3 Tabs */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100">
                                            {/* Actions */}
                                            <div className="px-4 sm:px-5 py-3 bg-gray-50 flex flex-wrap gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(patient); }} className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" /> แก้ไขข้อมูล
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openDepositModal("deposit", patient); }} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                                                    <ArrowDownCircle className="w-3.5 h-3.5" /> เพิ่มมัดจำ
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openDepositModal("refund", patient); }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors">
                                                    <RotateCcw className="w-3.5 h-3.5" /> คืนมัดจำ
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openDepositModal("adjust", patient); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors">
                                                    <SlidersHorizontal className="w-3.5 h-3.5" /> ปรับยอด
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleAddLead(patient); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors ml-auto">
                                                    <Plus className="w-3.5 h-3.5" /> เพิ่ม Lead
                                                </button>
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex border-b border-gray-200">
                                                {([
                                                    { key: "treatments" as DetailTab, label: "ประวัติการรักษา", mobileLabel: "การรักษา", icon: <Stethoscope className="w-4 h-4" />, count: treatmentHistory.length },
                                                    { key: "visits" as DetailTab, label: "ประวัติ Visit", mobileLabel: "Visit", icon: <CalendarCheck className="w-4 h-4" />, count: visitHistory.length },
                                                    { key: "deposits" as DetailTab, label: "ประวัติมัดจำ", mobileLabel: "มัดจำ", icon: <Wallet className="w-4 h-4" />, count: selectedPatient?.transactions?.length || 0 },
                                                ]).map((tab) => (
                                                    <button
                                                        key={tab.key}
                                                        onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key); }}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium transition-colors ${activeTab === tab.key
                                                            ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                                                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        {tab.icon}
                                                        <span className="hidden sm:inline">{tab.label}</span>
                                                        <span className="sm:hidden">{tab.mobileLabel}</span>
                                                        {tab.count > 0 && (
                                                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${activeTab === tab.key ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                                                                }`}>{tab.count}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tab Content */}
                                            <div className="px-4 sm:px-5 py-4">
                                                {detailLoading ? (
                                                    <div className="flex items-center justify-center py-10">
                                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* TAB 1: ประวัติการรักษา */}
                                                        {activeTab === "treatments" && (
                                                            <div>
                                                                {treatmentHistory.length === 0 ? (
                                                                    <EmptyState icon={<Stethoscope className="w-12 h-12" />} text="ยังไม่มีประวัติการรักษา" />
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {treatmentHistory.map((appt) => {
                                                                            const totalAmount = (appt.procedures || []).reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
                                                                            return (
                                                                                <div key={appt._id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                                                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/60">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <UserCheck className="w-4 h-4 text-emerald-600" />
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {appt.appointments?.date ? formatDate(appt.appointments.date) : formatDate(appt.createdAt)}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-sm font-semibold text-gray-800 tabular-nums">
                                                                                            {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="px-4 py-2.5">
                                                                                        {(appt.procedures || []).map((proc, i) => (
                                                                                            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                                                                                                <span className="text-gray-700">{proc.name}</span>
                                                                                                <span className="text-gray-600 tabular-nums">
                                                                                                    {parseFloat(proc.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                                                                        <span className="text-xs text-gray-400">{appt.createdBy && `โดย ${appt.createdBy}`}</span>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setTreatmentModal(appt); }}
                                                                                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                                                                        >
                                                                                            <ExternalLink className="w-3 h-3" /> เพิ่มเติม
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* TAB 2: ประวัติ Visit */}
                                                        {activeTab === "visits" && (
                                                            <div>
                                                                {visitHistory.length === 0 ? (
                                                                    <EmptyState icon={<CalendarCheck className="w-12 h-12" />} text="ยังไม่มีประวัติการนัดหมาย" />
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {visitHistory.map((appt) => {
                                                                            const status = appt.appointments?.status || "pending";
                                                                            return (
                                                                                <div key={appt._id} className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                                                    <div className={`shrink-0 p-1.5 rounded-lg ${statusColor[status]}`}>
                                                                                        {statusIcon[status]}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[status]}`}>
                                                                                                {statusLabel[status]}
                                                                                            </span>
                                                                                            {appt.interests && appt.interests.length > 0 && (
                                                                                                <span className="text-xs text-gray-400 truncate">
                                                                                                    {appt.interests.map(i => i.name).join(", ")}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                                            {appt.appointments?.date
                                                                                                ? `นัด: ${formatDateTime(appt.appointments.date)}`
                                                                                                : `สร้าง: ${formatDateTime(appt.createdAt)}`}
                                                                                            {appt.createdBy && ` • ${appt.createdBy}`}
                                                                                        </div>
                                                                                        {appt.note && <div className="text-xs text-gray-400 mt-0.5 truncate">{appt.note}</div>}
                                                                                    </div>
                                                                                    <div className="shrink-0 text-right">
                                                                                        {status === "arrived" && appt.payments?.amount ? (
                                                                                            <span className="text-sm font-semibold text-gray-800 tabular-nums">
                                                                                                {appt.payments.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        ) : appt.deposit?.amount ? (
                                                                                            <span className="text-sm text-emerald-600 tabular-nums">
                                                                                                มัดจำ {appt.deposit.amount.toLocaleString()}
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* TAB 3: ประวัติมัดจำ */}
                                                        {activeTab === "deposits" && (
                                                            <div>
                                                                {!selectedPatient || selectedPatient.transactions.length === 0 ? (
                                                                    <EmptyState icon={<Wallet className="w-12 h-12" />} text="ยังไม่มีประวัติมัดจำ" />
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {[...selectedPatient.transactions]
                                                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                                            .map((tx, i) => (
                                                                                <div key={tx._id || i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${txTypeBg[tx.type] || "bg-gray-50 border-gray-200"}`}>
                                                                                    <div className="shrink-0">
                                                                                        {tx.type === "deposit" && <ArrowDownCircle className={`w-5 h-5 ${txTypeColor[tx.type]}`} />}
                                                                                        {tx.type === "use" && <ArrowUpCircle className={`w-5 h-5 ${txTypeColor[tx.type]}`} />}
                                                                                        {tx.type === "refund" && <RotateCcw className={`w-5 h-5 ${txTypeColor[tx.type]}`} />}
                                                                                        {tx.type === "adjust" && <SlidersHorizontal className={`w-5 h-5 ${txTypeColor[tx.type]}`} />}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-sm font-medium text-gray-800">{txTypeLabel[tx.type] || tx.type}</div>
                                                                                        {tx.description && <div className="text-xs text-gray-500 truncate">{tx.description}</div>}
                                                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                                                            {formatDateTime(tx.createdAt)}
                                                                                            {tx.createdBy && ` • ${tx.createdBy}`}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`shrink-0 text-sm font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : tx.amount < 0 ? "text-red-600" : "text-gray-500"}`}>
                                                                                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* Treatment Detail Modal */}
            {/* ============================================ */}
            {treatmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setTreatmentModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-emerald-600 px-6 py-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5" /> รายละเอียดการรักษา
                                </h3>
                                <button onClick={() => setTreatmentModal(null)} className="text-white/70 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-emerald-100 text-sm mt-1">
                                {treatmentModal.appointments?.date ? formatDate(treatmentModal.appointments.date) : formatDate(treatmentModal.createdAt)}
                                {treatmentModal.createdBy && ` • ${treatmentModal.createdBy}`}
                            </p>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* ความสนใจ */}
                            {treatmentModal.interests && treatmentModal.interests.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <Heart className="w-4 h-4 text-pink-500" /> ความสนใจ
                                    </h4>
                                    <div className="bg-pink-50 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                                        {treatmentModal.interests.map((interest, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-gray-700">{interest.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* หัตถการ */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Stethoscope className="w-4 h-4 text-emerald-600" /> หัตถการ
                                </h4>
                                <div className="space-y-1.5">
                                    {(treatmentModal.procedures || []).map((proc, i) => {
                                        const price = parseFloat(proc.price) || 0;
                                        return (
                                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                                                <div>
                                                    <span className="text-gray-800 font-medium">{proc.name}</span>
                                                    {proc.depositUsed && proc.depositUsed > 0 && (
                                                        <span className="ml-2 text-xs text-red-500">ใช้มัดจำ -{proc.depositUsed.toLocaleString()}</span>
                                                    )}
                                                </div>
                                                <span className="text-gray-700 font-medium tabular-nums">
                                                    {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* การชำระเงิน */}
                            {treatmentModal.payments && treatmentModal.payments.amount && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-blue-600" /> การชำระเงิน
                                    </h4>
                                    <div className="bg-blue-50 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">วิธีชำระ</span>
                                            <span className="font-medium text-gray-800">
                                                {paymentMethodLabel[treatmentModal.payments.method || ""] || treatmentModal.payments.method || "-"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">ยอดชำระ</span>
                                            <span className="font-semibold text-gray-800 tabular-nums">
                                                {(treatmentModal.payments.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                            </span>
                                        </div>
                                        {treatmentModal.payments.serviceCharge && (
                                            <>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Service charge ({treatmentModal.payments.serviceCharge.rate}%)</span>
                                                    <span className="tabular-nums">
                                                        {treatmentModal.payments.serviceCharge.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium text-gray-700 border-t border-blue-200 pt-1.5">
                                                    <span>ยอดสุทธิ</span>
                                                    <span className="tabular-nums">
                                                        {treatmentModal.payments.serviceCharge.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* มัดจำ */}
                            {treatmentModal.deposit && treatmentModal.deposit.amount > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <Wallet className="w-4 h-4 text-emerald-600" /> เงินมัดจำ
                                    </h4>
                                    <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">วางมัดจำ</span>
                                            <span className="font-semibold text-emerald-700 tabular-nums">
                                                +{treatmentModal.deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* หมายเหตุ */}
                            {treatmentModal.note && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">หมายเหตุ</h4>
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">{treatmentModal.note}</p>
                                </div>
                            )}

                            {/* ใบเสร็จ */}
                            {treatmentModal.receiptUrls && treatmentModal.receiptUrls.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <ImageIcon className="w-4 h-4 text-gray-600" /> ใบเสร็จ
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {treatmentModal.receiptUrls.map((url, i) => {
                                            const fullUrl = url.startsWith("http")
                                                ? url
                                                : `${import.meta.env.VITE_API_URL || ""}${url}`;
                                            return (
                                                <div
                                                    key={i}
                                                    className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
                                                    onClick={() => window.open(fullUrl, "_blank")}
                                                >
                                                    <img
                                                        src={fullUrl}
                                                        alt={`ใบเสร็จ ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <ExternalLink className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                            <button onClick={() => setTreatmentModal(null)} className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* Lead Form Modal */}
            {/* ============================================ */}
            <Modal
                isOpen={leadFormOpen}
                onClose={() => { setLeadFormOpen(false); setLeadFormPatient(null); }}
                title="เพิ่ม Lead"
            >
                <LeadForm
                    lead={leadFormPatient ? {
                        _id: "",
                        id: "",
                        name: leadFormPatient.fullname,
                        nickname: leadFormPatient.nickname || "",
                        phone: leadFormPatient.tel || "",
                        socialMedia: leadFormPatient.socialMedia || "",
                        interest: [],
                        referralChannel: "",
                        admin: "",
                        branch: "",
                        status: "pending" as const,
                        appointmentDate: "",
                        createdAt: "",
                        createdAtDisplay: "",
                        note: "",
                        patientId: leadFormPatient._id,
                    } as Lead & { patientId: string } : null}
                    onSave={handleSaveNewLead}
                    onClose={() => { setLeadFormOpen(false); setLeadFormPatient(null); }}
                />
            </Modal>

            {/* ============================================ */}
            {/* Deposit / Refund / Adjust Modal */}
            {/* ============================================ */}
            {depositModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDepositModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 ${depositModal.type === "deposit" ? "bg-emerald-600" : depositModal.type === "refund" ? "bg-amber-500" : "bg-blue-500"}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    {depositModal.type === "deposit" && (<><ArrowDownCircle className="w-5 h-5" /> เพิ่มมัดจำ</>)}
                                    {depositModal.type === "refund" && (<><RotateCcw className="w-5 h-5" /> คืนมัดจำ</>)}
                                    {depositModal.type === "adjust" && (<><SlidersHorizontal className="w-5 h-5" /> ปรับยอด</>)}
                                </h3>
                                <button onClick={() => setDepositModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-white/80 text-sm mt-1">{depositModal.patientName}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                                <input type="number" min="0" step="0.01" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold text-right tabular-nums focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                                <input type="text" placeholder="เช่น มัดจำหัตถการ..." value={depositDescription} onChange={(e) => setDepositDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setDepositModal(null)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">ยกเลิก</button>
                            <button onClick={handleDepositSubmit} disabled={depositLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                                className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${depositModal.type === "deposit" ? "bg-emerald-600 hover:bg-emerald-700" : depositModal.type === "refund" ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"}`}>
                                {depositLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {depositModal.type === "deposit" ? "เพิ่มมัดจำ" : depositModal.type === "refund" ? "คืนมัดจำ" : "ปรับยอด"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* Edit Patient Modal */}
            {/* ============================================ */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setEditModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 bg-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Pencil className="w-5 h-5" /> แก้ไขข้อมูลคนไข้
                                </h3>
                                <button onClick={() => setEditModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-white/80 text-sm mt-1">{editModal.fullname}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editForm.fullname}
                                    onChange={(e) => setEditForm((f) => ({ ...f, fullname: e.target.value }))}
                                    placeholder="ชื่อ-นามสกุล"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเล่น</label>
                                <input
                                    type="text"
                                    value={editForm.nickname}
                                    onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))}
                                    placeholder="ชื่อเล่น"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                                <input
                                    type="tel"
                                    value={editForm.tel}
                                    onChange={(e) => { setEditForm((f) => ({ ...f, tel: e.target.value })); setEditTelDuplicate(null); }}
                                    onBlur={() => checkTelDuplicate(editForm.tel, editModal?._id)}
                                    placeholder="0xx-xxx-xxxx"
                                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none ${editTelDuplicate ? 'border-amber-400' : 'border-gray-200'}`}
                                />
                                {editTelDuplicate && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        ⚠ เบอร์นี้ซ้ำกับ: {editTelDuplicate.fullname}{editTelDuplicate.nickname ? ` (${editTelDuplicate.nickname})` : ''}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Social Media</label>
                                <input
                                    type="text"
                                    value={editForm.socialMedia}
                                    onChange={(e) => setEditForm((f) => ({ ...f, socialMedia: e.target.value }))}
                                    placeholder="Line ID, Facebook, IG..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setEditModal(null)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={editLoading || !editForm.fullname.trim()}
                                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="text-center py-10 text-gray-400">
        <div className="flex justify-center mb-3 opacity-40">{icon}</div>
        <p className="text-sm">{text}</p>
    </div>
);

export default PatientsPage;