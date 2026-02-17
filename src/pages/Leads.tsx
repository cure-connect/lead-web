// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { Search, Plus, Edit2, Trash2, X, Users, CalendarCheck, Clock, XCircle, Eye, UserCheck, Wallet, Calendar, ChevronRight, User, Upload, ImageIcon, Loader2 } from "lucide-react";
// import { type Lead } from "../types";
// import Modal from "../components/UI/Modal";
// import LeadForm from "../components/UI/LeadForm";
// import { ToastContainer, useToast } from "../components/Toast";
// import api from "@/api/api";

// const statusLabel: Record<string, string> = {
//   pending: "รอตัดสินใจ",
//   scheduled: "ทำนัด",
//   rescheduled: "เลื่อนนัด",
//   cancelled: "ยกเลิกนัด",
//   arrived: "มาตามนัด",
// };


// const formatDate = (dateStr: string) => {
//   const date = new Date(dateStr);
//   return `${String(date.getDate()).padStart(2, "0")}/${String(
//     date.getMonth() + 1
//   ).padStart(2, "0")}/${date.getFullYear()}`;
// };

// const formatDateTime = (dateStr: string) => {
//   const date = new Date(dateStr);
//   return `${String(date.getDate()).padStart(2, "0")}/${String(
//     date.getMonth() + 1
//   ).padStart(2, "0")}/${date.getFullYear()} ${String(
//     date.getHours()
//   ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
// };

// const getDaysUntilAppointment = (appointmentDate: string) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const apptDate = new Date(appointmentDate);
//   apptDate.setHours(0, 0, 0, 0);
//   const diffTime = apptDate.getTime() - today.getTime();
//   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//   return diffDays;
// };

// const isLeadLocked = (lead: Lead): boolean => {
//   const hasArrivedStatus = lead.status === "arrived";
//   const hasProcedures = Array.isArray(lead.procedures) && lead.procedures.length > 0;
//   const hasPayment = !!(lead.payments && lead.payments.method);

//   return hasArrivedStatus && hasProcedures && hasPayment;
// };

// const LeadsPage: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<"notScheduled" | "scheduled" | "arrived">("notScheduled");
//   const [selectedYear, setSelectedYear] = useState(
//     new Date().getFullYear().toString()
//   );

//   const [searchQuery, setSearchQuery] = useState("");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingLead, setEditingLead] = useState<Lead | null>(null);
//   const [leads, setLeads] = useState<Lead[]>([]);

//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [statusModalLead, setStatusModalLead] = useState<Lead | null>(null);
//   const [viewingLead, setViewingLead] = useState<Lead | null>(null);

//   const { toasts, toast, removeToast } = useToast();

//   const fetchLeads = async (year: string) => {
//     try {
//       const res = await api.get(`/lead?year=${year}`);

//       const result = res.data;

//       const mappedLeads: Lead[] = (
//         Array.isArray(result.data) ? result.data : []
//       ).map((item: any) => {
//         const status = item.appointments?.status ?? "pending";

//         return {
//           id: item._id,
//           name: item.patient?.fullname || "",
//           nickname: item.patient?.nickname || "",
//           phone: item.patient?.tel || "",
//           socialMedia: item.patient?.socialMedia || "",
//           interest: Array.isArray(item.interests) ? item.interests : [],
//           referralChannel: item.referralChannel || "",
//           admin: item.createdBy || "",
//           branch: item.clinic?.branch || "",
//           status,
//           createdAt: item.createdAt,
//           createdAtDisplay: formatDate(item.createdAt),
//           appointmentDate: item.appointments?.date,
//           appointmentDateDisplay: item.appointments?.date
//             ? formatDateTime(item.appointments.date)
//             : "ยังไม่นัด",
//           note: item.note || "",
//           payments: item.payments,
//           procedures: Array.isArray(item.procedures) ? item.procedures : [],
//           deposit: item.deposit,
//           receiptUrl: item.receiptUrl || "",
//         };
//       });

//       mappedLeads.sort((a, b) =>
//         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       );

//       setLeads(mappedLeads);
//     } catch (error) {
//       console.error("Fetch leads failed", error);
//       setLeads([]);
//     }
//   };

//   useEffect(() => {
//     fetchLeads(selectedYear);
//   }, [selectedYear]);


//   const filteredLeads = useMemo(() => {
//     const filtered = leads.filter((lead) => {
//       const matchesSearch =
//         searchQuery === "" ||
//         lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         (lead.nickname && lead.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
//         lead.phone.includes(searchQuery) ||
//         (lead.socialMedia && lead.socialMedia.toLowerCase().includes(searchQuery.toLowerCase()));

//       let matchesTab = false;
//       if (activeTab === "notScheduled") {
//         matchesTab = lead.status === "pending";
//       } else if (activeTab === "scheduled") {
//         matchesTab = ["scheduled", "rescheduled", "cancelled"].includes(lead.status);
//       } else if (activeTab === "arrived") {
//         matchesTab = lead.status === "arrived";
//       }

//       return matchesSearch && matchesTab;
//     });

//     if (activeTab === "notScheduled") {
//       filtered.sort((a, b) =>
//         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       );
//     } else if (activeTab === "scheduled") {
//       filtered.sort((a, b) => {
//         const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : Infinity;
//         const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : Infinity;
//         return dateA - dateB;
//       });
//     } else if (activeTab === "arrived") {
//       filtered.sort((a, b) => {
//         const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
//         const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
//         return dateB - dateA;
//       });
//     }

//     return filtered;
//   }, [leads, searchQuery, activeTab]);

//   const summary = useMemo(() => {
//     return {
//       total: leads.length,
//       withAppointment: leads.filter((l) =>
//         ["scheduled", "rescheduled"].includes(l.status)
//       ).length,
//       waiting: leads.filter((l) => l.status === "pending").length,
//       arrived: leads.filter((l) => l.status === "arrived").length,
//       cancelled: leads.filter((l) => l.status === "cancelled").length,
//     };
//   }, [leads]);

//   const handleSave = async (lead: Lead) => {
//     try {
//       const payload: any = {
//         clinic: { branch: lead.branch },
//         patient: {
//           fullname: lead.name,
//           nickname: lead.nickname || undefined,
//           tel: lead.phone,
//           socialMedia: lead.socialMedia || undefined
//         },
//         interests: [lead.interest],
//         referralChannel: lead.referralChannel,
//         note: lead.note,
//         createdBy: lead.admin,
//       };

//       if (lead.status === "pending") {
//         payload.appointments = {
//           status: "pending",
//           date: null
//         }
//       }

//       if (lead.status === "scheduled") {
//         payload.appointments = {
//           status: "scheduled",
//           date: lead.appointmentDate && lead.appointmentTime
//             ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
//             : new Date().toISOString(),
//         };
//       } else if (lead.status === "rescheduled") {
//         payload.appointments = {
//           status: "rescheduled",
//           date: lead.appointmentDate && lead.appointmentTime ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00` : new Date().toISOString()
//         }
//       } else if (lead.status === "cancelled") {
//         payload.appointments = {
//           status: "cancelled",
//           date: null
//         }
//       }

//       if (lead.deposit) {
//         payload.deposit = lead.deposit;
//       } else if (lead.deposit === null) {
//         payload.deposit = null;
//       }

//       if (!editingLead) {
//         payload.clinic = {
//           name: lead.name,
//           branch: lead.branch || "Bangkok",
//         };

//         await api.post("/createlead", payload);
//         toast.success("เพิ่ม Lead สำเร็จ");
//       } else {
//         await api.patch(`/${lead.id}`, payload);
//         toast.success("บันทึกข้อมูลสำเร็จ");
//       }

//       await fetchLeads(selectedYear);
//       setIsModalOpen(false);
//       setEditingLead(null);
//     } catch (error: any) {
//       toast.error(error.message || "เกิดข้อผิดพลาด");
//     }
//   };

//   const openDeleteModal = (lead: Lead) => {
//     setLeadToDelete(lead);
//     setIsDeleteModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     if (!leadToDelete || isDeleting) return;

//     setIsDeleting(true);
//     try {
//       await api.delete(`/${leadToDelete.id}`);
//       await fetchLeads(selectedYear);
//       toast.success("ลบข้อมูลสำเร็จ");
//     } catch (err) {
//       console.error("Delete lead failed", err);
//       toast.error("ลบข้อมูลไม่สำเร็จ");
//     } finally {
//       setIsDeleting(false);
//       setIsDeleteModalOpen(false);
//       setLeadToDelete(null);
//     }
//   };

//   const openStatusModal = (lead: Lead) => {
//     setStatusModalLead(lead);
//   };

//   return (
//     <>
//       <ToastContainer toasts={toasts} onClose={removeToast} />
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-28 sm:pb-8 sm:pt-8">
//           <p className="hidden sm:block text-gray-600 mb-6">รายชื่อลูกค้าที่ลงข้อมูลและการติดตาม</p>

//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-4 sm:mb-8">
//             <SummaryBox
//               label="ทั้งหมด"
//               value={summary.total}
//               icon={<Users />}
//             />

//             <SummaryBox
//               label="ทำนัดแล้ว"
//               value={summary.withAppointment}
//               color="text-blue-600"
//               icon={<CalendarCheck className="text-blue-500" />}
//             />

//             <SummaryBox
//               label="รอตัดสินใจ"
//               value={summary.waiting}
//               color="text-orange-600"
//               icon={<Clock className="text-orange-500" />}
//             />

//             <SummaryBox
//               label="มาแล้ว"
//               value={summary.arrived}
//               color="text-green-600"
//               icon={<UserCheck className="text-green-500" />}
//             />

//             <SummaryBox
//               label="ยกเลิกนัด"
//               value={summary.cancelled}
//               color="text-red-600"
//               icon={<XCircle className="text-red-500" />}
//             />
//           </div>

//           <div className="bg-white rounded-lg shadow">
//             <div className="shadow">
//               <div className="flex gap-0 sm:gap-4 px-2 sm:px-6 overflow-x-auto">
//                 <button
//                   onClick={() => setActiveTab("notScheduled")}
//                   className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "notScheduled"
//                     ? "border-indigo-600 text-indigo-600"
//                     : "border-transparent text-gray-500 hover:text-gray-700"
//                     }`}
//                 >
//                   ยังไม่นัด
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("scheduled")}
//                   className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "scheduled"
//                     ? "border-indigo-600 text-indigo-600"
//                     : "border-transparent text-gray-500 hover:text-gray-700"
//                     }`}
//                 >
//                   นัดแล้ว
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("arrived")}
//                   className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "arrived"
//                     ? "border-indigo-600 text-indigo-600"
//                     : "border-transparent text-gray-500 hover:text-gray-700"
//                     }`}
//                 >
//                   มาแล้ว
//                 </button>
//               </div>
//             </div>

//             <div className="p-4 sm:p-6 shadow flex gap-3 sm:gap-4 flex-col sm:flex-row">
//               <select
//                 value={selectedYear}
//                 onChange={(e) => setSelectedYear(e.target.value)}
//                 className="px-3 sm:px-4 py-2 shadow rounded-md bg-white min-w-[100px] sm:min-w-[120px] text-sm"
//               >
//                 {(() => {
//                   const START_YEAR = 2024;
//                   const currentYear = new Date().getFullYear();
//                   const years = [];

//                   for (let year = currentYear; year >= START_YEAR; year--) {
//                     years.push(
//                       <option key={year} value={year.toString()}>
//                         {year + 543}
//                       </option>
//                     );
//                   }
//                   return years;
//                 })()}
//               </select>

//               <div className="flex items-center flex-1 shadow rounded-md px-3">
//                 <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
//                 <input
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   placeholder="ค้นหา Lead..."
//                   className="w-full py-2 outline-none text-sm"
//                 />
//               </div>

//               <button
//                 onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
//                 className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-md whitespace-nowrap text-sm font-medium"
//               >
//                 <Plus className="w-5 h-5" />
//                 เพิ่ม Lead
//               </button>
//             </div>

//             <div className="hidden md:block overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
//                   <tr>
//                     <th className="px-6 py-4 text-left font-semibold">ชื่อ</th>
//                     <th className="px-6 py-4 text-left font-semibold">โทร</th>

//                     {activeTab === "notScheduled" && (
//                       <>
//                         <th className="px-6 py-4 text-left font-semibold">วันที่สร้าง</th>
//                         <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
//                       </>
//                     )}

//                     {activeTab === "scheduled" && (
//                       <>
//                         <th className="px-6 py-4 text-left font-semibold">วันที่สร้าง</th>
//                         <th className="px-6 py-4 text-left font-semibold">วันที่นัด</th>
//                         <th className="px-6 py-4 text-right font-semibold">มัดจำ</th>
//                         <th className="px-6 py-4 text-center font-semibold">
//                           ระยะเวลาก่อนวันนัด
//                         </th>
//                         <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
//                         <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
//                       </>
//                     )}

//                     {activeTab === "arrived" && (
//                       <>
//                         <th className="px-6 py-4 text-left font-semibold">วันที่มา</th>
//                         <th className="px-6 py-4 text-left font-semibold">หัตถการที่สนใจ</th>
//                         <th className="px-6 py-4 text-right font-semibold">ยอดชำระ</th>
//                         <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
//                         <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
//                       </>
//                     )}

//                     <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
//                   </tr>
//                 </thead>

//                 <tbody className="border-t">
//                   {filteredLeads.length === 0 ? (
//                     <tr>
//                       <td colSpan={activeTab === "scheduled" ? 9 : activeTab === "arrived" ? 7 : 5} className="px-6 py-16 text-center">
//                         <div className="flex flex-col items-center justify-center text-gray-400">
//                           <Users className="w-12 h-12 mb-4 opacity-50" />
//                           <p className="text-lg font-medium text-gray-500">ยังไม่มีข้อมูล</p>
//                           <p className="text-sm mt-1">กดปุ่ม "เพิ่ม Lead" เพื่อเริ่มต้นเพิ่มข้อมูล</p>
//                         </div>
//                       </td>
//                     </tr>
//                   ) : (
//                     filteredLeads.map((lead) => (
//                       <tr
//                         key={lead.id}
//                         className="hover:bg-gray-50 transition-colors"
//                       >
//                         <td className="px-6 py-4 font-medium text-gray-900">
//                           {lead.name}{lead.nickname && <span className="text-gray-500 font-normal"> ({lead.nickname})</span>}
//                         </td>

//                         <td className="px-6 py-4 text-gray-600">
//                           {lead.phone}
//                         </td>

//                         {activeTab === "notScheduled" && (
//                           <>
//                             <td className="px-6 py-4 text-gray-500">
//                               {lead.createdAtDisplay}
//                             </td>
//                             <td className="px-6 py-4 text-gray-600">
//                               {lead.admin || "-"}
//                             </td>
//                           </>
//                         )}

//                         {activeTab === "scheduled" && (
//                           <>
//                             <td className="px-6 py-4 text-gray-500">
//                               {lead.createdAtDisplay}
//                             </td>

//                             <td className="px-6 py-4 text-gray-700">
//                               {lead.appointmentDateDisplay}
//                             </td>

//                             <td className="px-6 py-4 text-right">
//                               {lead.deposit?.amount ? (
//                                 <span className="font-medium text-blue-600">
//                                   {lead.deposit.amount.toLocaleString()} บาท
//                                 </span>
//                               ) : (
//                                 <span className="text-gray-400">-</span>
//                               )}
//                             </td>

//                             <td className="px-6 py-4 text-center">
//                               {lead.appointmentDate && (
//                                 <span className="font-medium">
//                                   {lead.status === "cancelled" && "-"}

//                                   {["scheduled", "rescheduled"].includes(lead.status) && (() => {
//                                     const days = getDaysUntilAppointment(lead.appointmentDate);

//                                     if (days === 0)
//                                       return <span className="text-green-600">ถึงวันนัดแล้ว</span>;

//                                     if (days > 0)
//                                       return <span className="text-green-600">อีก {days} วัน</span>;

//                                     return (
//                                       <span className="text-red-600">
//                                         เลยมาแล้ว {Math.abs(days)} วัน
//                                       </span>
//                                     );
//                                   })()}
//                                 </span>
//                               )}
//                             </td>

//                             <td className="px-6 py-4 text-gray-600">
//                               {lead.admin || "-"}
//                             </td>

//                             <td className="px-6 py-4 text-center">
//                               <button
//                                 onClick={() => openStatusModal(lead)}
//                                 disabled={isLeadLocked(lead)}
//                                 className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md transition-all
//                                   ${lead.status === "scheduled"
//                                     ? `bg-blue-100 text-blue-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-blue-200"}`
//                                     : lead.status === "rescheduled"
//                                       ? `bg-yellow-100 text-yellow-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-yellow-200"}`
//                                       : lead.status === "cancelled"
//                                         ? `bg-red-100 text-red-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-red-200"}`
//                                         : `bg-gray-100 text-gray-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-gray-200"}`
//                                   }
//                                 `}
//                               >
//                                 {statusLabel[lead.status]}
//                               </button>

//                             </td>
//                           </>
//                         )}

//                         {activeTab === "arrived" && (
//                           <>
//                             <td className="px-6 py-4 text-gray-700">
//                               {lead.appointmentDateDisplay}
//                             </td>

//                             <td className="px-6 py-4 text-gray-600">
//                               {lead.interest && lead.interest.length > 0
//                                 ? lead.interest.map((i: any) => i.name || i).join(", ")
//                                 : "-"}
//                             </td>

//                             <td className="px-6 py-4 text-right font-medium text-green-600">
//                               {lead.payments?.amount
//                                 ? `${lead.payments.amount.toLocaleString()} บาท`
//                                 : "-"}
//                             </td>

//                             <td className="px-6 py-4 text-gray-600">
//                               {lead.admin || "-"}
//                             </td>

//                             <td className="px-6 py-4 text-center">
//                               <button
//                                 onClick={() => openStatusModal(lead)}
//                                 // disabled={isLeadLocked(lead)}
//                                 className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md transition-all
//                                   ${lead.status === "scheduled"
//                                     ? `bg-blue-100 text-blue-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-blue-200"}`
//                                     : lead.status === "rescheduled"
//                                       ? `bg-yellow-100 text-yellow-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-yellow-200"}`
//                                       : lead.status === "cancelled"
//                                         ? `bg-red-100 text-red-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-red-200"}`
//                                         : `bg-gray-100 text-gray-700 ${isLeadLocked(lead) ? "cursor-not-allowed" : "hover:bg-gray-200"}`
//                                   }
//                                 `}
//                               >
//                                 {statusLabel[lead.status]}
//                               </button>

//                             </td>

//                           </>
//                         )}

//                         <td className="px-6 py-4 text-center">
//                           <div className="flex justify-center gap-4">
//                             <Eye
//                               className="w-4 h-4 text-blue-600 cursor-pointer hover:scale-110 transition-transform"
//                               onClick={() => setViewingLead(lead)}
//                             />
//                             <Edit2
//                               // className={`w-4 h-4 transition-all ${isLeadLocked(lead)
//                               //   ? "text-gray-300 cursor-not-allowed opacity-50"
//                               //   : "text-indigo-600 cursor-pointer hover:scale-110"
//                               //   }`}
//                               className="w-4 h-4 transition-all text-indigo-600 cursor-pointer hover:scale-110"
//                               onClick={() => {
//                                 // if (!isLeadLocked(lead)) {
//                                 setEditingLead(lead);
//                                 setIsModalOpen(true);
//                                 // }
//                               }}
//                             />
//                             <Trash2
//                               // className={`w-4 h-4 transition-all ${isLeadLocked(lead)
//                               //   ? "text-gray-300 cursor-not-allowed opacity-50"
//                               //   : "w-4 h-4 text-red-600 cursor-pointer hover:scale-110 transition-transform"
//                               //   }`}
//                               className="w-4 h-4 text-red-600 cursor-pointer hover:scale-110 transition-transform"
//                               onClick={() => {
//                                 // if (!isLeadLocked(lead)) {
//                                 openDeleteModal(lead)
//                                 // }
//                               }}
//                             />
//                           </div>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             <div className="md:hidden">
//               {filteredLeads.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center text-gray-400 py-16">
//                   <Users className="w-12 h-12 mb-4 opacity-50" />
//                   <p className="text-lg font-medium text-gray-500">ยังไม่มีข้อมูล</p>
//                   <p className="text-sm mt-1">กดปุ่ม "เพิ่ม Lead" เพื่อเริ่มต้น</p>
//                 </div>
//               ) : (
//                 <div className="divide-y divide-gray-100">
//                   {filteredLeads.map((lead) => (
//                     <div key={lead.id} className="p-4 hover:bg-gray-50 transition-colors">
//                       <div className="flex items-start justify-between mb-1">
//                         <div className="flex-1 min-w-0">
//                           <h3 className="font-semibold text-gray-900 truncate">
//                             {lead.name}{lead.nickname && <span className="text-gray-500 font-normal"> ({lead.nickname})</span>}
//                           </h3>
//                           <p className="text-sm text-gray-500">{lead.phone}</p>
//                         </div>

//                         {activeTab === "scheduled" && (
//                           <button
//                             onClick={() => openStatusModal(lead)}
//                             disabled={isLeadLocked(lead)}
//                             className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ml-2 shrink-0
//                               ${lead.status === "scheduled"
//                                 ? "bg-blue-100 text-blue-700"
//                                 : lead.status === "rescheduled"
//                                   ? "bg-yellow-100 text-yellow-700"
//                                   : lead.status === "cancelled"
//                                     ? "bg-red-100 text-red-700"
//                                     : "bg-gray-100 text-gray-700"
//                               }
//                               ${isLeadLocked(lead) ? "opacity-50" : "active:scale-95"}
//                             `}
//                           >
//                             {statusLabel[lead.status]}
//                             {!isLeadLocked(lead) && (
//                               <ChevronRight className="w-3 h-3" />
//                             )}
//                           </button>
//                         )}
//                       </div>

//                       <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
//                         {activeTab === "notScheduled" && (
//                           <span className="flex items-center gap-1">
//                             <Calendar className="w-3.5 h-3.5" />
//                             สร้าง: {lead.createdAtDisplay}
//                           </span>
//                         )}

//                         {activeTab === "scheduled" && (
//                           <>
//                             <span className="flex items-center gap-1">
//                               <CalendarCheck className="w-3.5 h-3.5" />
//                               นัด: {lead.appointmentDateDisplay || "-"}
//                             </span>
//                             {lead.appointmentDate && ["scheduled", "rescheduled"].includes(lead.status) && (
//                               <span className="flex items-center gap-1">
//                                 <Clock className="w-3.5 h-3.5" />
//                                 {(() => {
//                                   const days = getDaysUntilAppointment(lead.appointmentDate);
//                                   if (days === 0) return <span className="text-green-600 font-medium">ถึงวันนัดแล้ว</span>;
//                                   if (days > 0) return <span className="text-green-600 font-medium">อีก {days} วัน</span>;
//                                   return <span className="text-red-600 font-medium">เลยมา {Math.abs(days)} วัน</span>;
//                                 })()}
//                               </span>
//                             )}
//                             {lead.deposit?.amount && (
//                               <span className="flex items-center gap-1 text-blue-600 font-medium">
//                                 <Wallet className="w-3.5 h-3.5" />
//                                 มัดจำ: {lead.deposit.amount.toLocaleString()} บาท
//                               </span>
//                             )}
//                           </>
//                         )}

//                         {activeTab === "arrived" && (
//                           <>
//                             <span className="flex items-center gap-1">
//                               <CalendarCheck className="w-3.5 h-3.5" />
//                               มา: {lead.appointmentDateDisplay || "-"}
//                             </span>
//                             {lead.payments?.amount && (
//                               <span className="flex items-center gap-1 text-green-600 font-medium">
//                                 <Wallet className="w-3.5 h-3.5" />
//                                 {lead.payments.amount.toLocaleString()} บาท
//                               </span>
//                             )}
//                           </>
//                         )}

//                         <span className="flex items-center gap-1">
//                           <User className="w-3.5 h-3.5" />
//                           {lead.admin || "-"}
//                         </span>
//                       </div>

//                       {activeTab === "arrived" && lead.interest && lead.interest.length > 0 && (
//                         <div className="text-xs text-gray-600 mb-3">
//                           <span className="text-gray-400">หัตถการ:</span>{" "}
//                           {lead.interest.map((i: any) => i.name || i).join(", ")}
//                         </div>
//                       )}

//                       <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
//                         <button
//                           onClick={() => setViewingLead(lead)}
//                           className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
//                         >
//                           <Eye className="w-4 h-4" />
//                           ดูข้อมูล
//                         </button>
//                         <button
//                           onClick={() => {
//                             if (!isLeadLocked(lead)) {
//                               setEditingLead(lead);
//                               setIsModalOpen(true);
//                             }
//                           }}
//                           disabled={isLeadLocked(lead)}
//                           className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
//                             ${isLeadLocked(lead)
//                               ? "text-gray-300 bg-gray-50"
//                               : "text-indigo-600 bg-indigo-50 active:bg-indigo-100"
//                             }
//                           `}
//                         >
//                           <Edit2 className="w-4 h-4" />
//                           แก้ไข
//                         </button>
//                         <button
//                           onClick={() => {
//                             if (!isLeadLocked(lead)) {
//                               openDeleteModal(lead);
//                             }
//                           }}
//                           disabled={isLeadLocked(lead)}
//                           className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
//                             ${isLeadLocked(lead)
//                               ? "text-gray-300 bg-gray-50"
//                               : "text-red-600 bg-red-50 active:bg-red-100"
//                             }
//                           `}
//                         >
//                           <Trash2 className="w-4 h-4" />
//                           ลบ
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {statusModalLead && (
//         <StatusModal
//           lead={statusModalLead}
//           onClose={() => setStatusModalLead(null)}
//           onSave={async () => {
//             await fetchLeads(selectedYear);
//             setStatusModalLead(null);
//           }}
//           onSuccess={(message) => toast.success(message)}
//           onError={(message) => toast.error(message)}
//         />
//       )}

//       {viewingLead && (
//         <ViewLeadModal
//           lead={viewingLead}
//           onClose={() => setViewingLead(null)}
//         />
//       )}

//       <Modal
//         isOpen={isModalOpen}
//         onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
//         title={editingLead ? "แก้ไขข้อมูล" : "เพิ่มข้อมูล"}
//       >
//         <LeadForm
//           lead={editingLead}
//           onSave={handleSave}
//           onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
//         />
//       </Modal>

//       {isDeleteModalOpen && (
//         <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
//           <div className="bg-white w-full sm:max-w-sm sm:mx-4 p-6 rounded-t-2xl sm:rounded-2xl">
//             <h3 className="font-semibold text-lg mb-4">ยืนยันการลบ</h3>
//             <p className="text-sm text-gray-600 mb-6">
//               ต้องการลบ <b>{leadToDelete?.name}{leadToDelete?.nickname && ` (${leadToDelete.nickname})`}</b> ใช่หรือไม่?
//             </p>
//             <div className="flex justify-end gap-2">
//               <button
//                 onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
//                 disabled={isDeleting}
//                 className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
//               >
//                 ยกเลิก
//               </button>
//               <button
//                 onClick={confirmDelete}
//                 disabled={isDeleting}
//                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
//               >
//                 {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
//                 {isDeleting ? "กำลังลบ..." : "ลบ"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// type SummaryBoxProps = {
//   label: string;
//   value: number;
//   color?: string;
//   icon?: React.ReactNode;
// };

// const SummaryBox = ({ label, value, color = "text-gray-800", icon }: SummaryBoxProps) => {
//   return (
//     <div className="bg-white rounded-xl shadow p-3 sm:p-6 flex items-center justify-between">
//       <div className="flex items-center gap-2 sm:gap-4">
//         {icon && (
//           <div className="text-2xl sm:text-3xl text-gray-400">
//             {icon}
//           </div>
//         )}
//         <p className="text-xs sm:text-sm text-gray-500">{label}</p>
//       </div>
//       <p className={`text-xl sm:text-2xl font-bold ${color}`}>
//         {value}
//       </p>
//     </div>
//   );
// };


// const StatusModal = ({
//   lead,
//   onClose,
//   onSave,
//   onSuccess,
//   onError,
// }: {
//   lead: Lead;
//   onClose: () => void;
//   onSave: (lead: Lead) => void;
//   onSuccess?: (message: string) => void;
//   onError?: (message: string) => void;
// }) => {
//   const [selectedStatus, setSelectedStatus] = useState<string>("");
//   const [newAppointmentDate, setNewAppointmentDate] = useState("");
//   const [newAppointmentTime, setNewAppointmentTime] = useState("");
//   const [procedures, setProcedures] = useState<
//     Array<{
//       name: string;
//       price: string;
//       commissionRate: number;
//     }>
//   >([{ name: "", price: "0", commissionRate: 0 }]);

//   const [paymentMethod, setPaymentMethod] = useState("");
//   const [serviceChargeRate, setServiceChargeRate] = useState<number>(3);
//   const [commissionEnabled, setCommissionEnabled] = useState(false);

//   const [nextAppointmentEnabled, setNextAppointmentEnabled] = useState(false);
//   const [nextAppointmentDate, setNextAppointmentDate] = useState("");
//   const [nextAppointmentTime, setNextAppointmentTime] = useState("");
//   const [validationError, setValidationError] = useState("");

//   const [patientName, setPatientName] = useState(lead.name || "");
//   const [nickname, setNickname] = useState(lead.nickname || "");

//   const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
//   const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
//   const [receiptUploading, setReceiptUploading] = useState(false);
//   const receiptInputRef = useRef<HTMLInputElement>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = () => setReceiptPreview(reader.result as string);
//     reader.readAsDataURL(file);

//     setReceiptUploading(true);
//     try {
//       const formData = new FormData();
//       formData.append('slip', file);
//       const res = await api.post('/upload/slip', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' }
//       });
//       setReceiptUrl(res.data.data.url);
//     } catch (err) {
//       console.error('Upload receipt failed', err);
//       setReceiptPreview(null);
//     } finally {
//       setReceiptUploading(false);
//     }
//   };

//   const removeReceipt = () => {
//     setReceiptUrl(null);
//     setReceiptPreview(null);
//     if (receiptInputRef.current) receiptInputRef.current.value = '';
//   };


//   const totalAmount = procedures.reduce(
//     (sum, p) => sum + (parseFloat(p.price) || 0),
//     0
//   );

//   const serviceChargeAmount = paymentMethod === "card"
//     ? Math.round((totalAmount * serviceChargeRate) / 100 * 100) / 100
//     : 0;

//   const netAmount = totalAmount - serviceChargeAmount;

//   const commissionDetails = commissionEnabled
//     ? procedures
//       .filter((p) => p.name && parseFloat(p.price) > 0 && p.commissionRate > 0)
//       .map((p) => {
//         const price = parseFloat(p.price) || 0;
//         const baseAmount =
//           paymentMethod === "card"
//             ? price - Math.round((price * serviceChargeRate) / 100 * 100) / 100
//             : price;
//         const commAmount = Math.round((baseAmount * p.commissionRate) / 100 * 100) / 100;
//         return {
//           procedureName: p.name,
//           baseAmount,
//           rate: p.commissionRate,
//           amount: commAmount,
//         };
//       })
//     : [];

//   const totalCommission = commissionDetails.reduce((sum, d) => sum + d.amount, 0);

//   const addProcedure = () => {
//     setProcedures([
//       ...procedures,
//       { name: "", price: "0", commissionRate: 0 },
//     ]);
//   };


//   const removeProcedure = (index: number) => {
//     setProcedures(procedures.filter((_, i) => i !== index));
//   };

//   const updateProcedure = (index: number, key: string, value: any) => {
//     setProcedures((prev) =>
//       prev.map((item, i) =>
//         i === index ? { ...item, [key]: value } : item
//       )
//     );
//     setValidationError("");
//   };

//   const handleSave = async () => {
//     if (isSaving) return;

//     try {
//       if (!selectedStatus) return;

//       setValidationError("");

//       const validProcedures = procedures.filter(p => p.name && p.price);

//       if (selectedStatus === "arrived") {
//         if (validProcedures.length === 0 || !validProcedures.some(p => p.name.trim())) {
//           setValidationError("กรุณากรอกข้อมูลหัตถการอย่างน้อย 1 รายการ");
//           return;
//         }
//         if (!paymentMethod) {
//           setValidationError("กรุณาเลือกช่องทางการชำระเงิน");
//           return;
//         }
//         if (!receiptUrl) {
//           setValidationError("กรุณาอัปโหลดรูปใบเสร็จ");
//           return;
//         }
//       }

//       setIsSaving(true);

//       const totalAmount = validProcedures.reduce(
//         (sum, p) => sum + (parseFloat(p.price) || 0),
//         0
//       );

//       let payments: any = undefined;
//       if (paymentMethod && totalAmount > 0) {
//         const scRate = paymentMethod === "card" ? serviceChargeRate : 0;
//         const scAmount = paymentMethod === "card"
//           ? Math.round((totalAmount * scRate) / 100 * 100) / 100
//           : 0;

//         payments = {
//           method: paymentMethod,
//           amount: totalAmount,
//         };

//         if (paymentMethod === "card") {
//           payments.serviceCharge = {
//             rate: scRate,
//             amount: scAmount,
//             netAmount: totalAmount - scAmount,
//           };
//         }

//         if (commissionEnabled) {
//           const details = validProcedures
//             .filter((p) => p.commissionRate > 0)
//             .map((p) => {
//               const price = parseFloat(p.price) || 0;
//               const base =
//                 paymentMethod === "card"
//                   ? price - Math.round((price * scRate) / 100 * 100) / 100
//                   : price;
//               const commAmt = Math.round((base * p.commissionRate) / 100 * 100) / 100;
//               return {
//                 procedureName: p.name,
//                 baseAmount: base,
//                 rate: p.commissionRate,
//                 amount: commAmt,
//               };
//             });

//           if (details.length > 0) {
//             payments.commission = {
//               totalAmount: details.reduce((s, d) => s + d.amount, 0),
//               details,
//             };
//           }
//         }
//       }

//       const payload: any = {
//         appointments: {
//           status: selectedStatus,
//         },
//         ...(validProcedures.length > 0 ? {
//           procedures: validProcedures.map((p) => ({
//             name: p.name,
//             price: p.price,
//             ...(commissionEnabled && p.commissionRate > 0
//               ? { commissionRate: p.commissionRate }
//               : {}),
//           }))
//         } : {}),
//         ...(payments ? { payments } : {}),
//       };

//       if (selectedStatus === "arrived") {
//         payload.patient = {
//           fullname: patientName || lead.name,
//           nickname: nickname || undefined,
//           tel: lead.phone,
//           socialMedia: lead.socialMedia || undefined,
//         };
//         if (receiptUrl) {
//           payload.receiptUrl = receiptUrl;
//         }
//       }

//       if (selectedStatus === "scheduled") {
//         payload.appointments.date =
//           lead.appointmentDate && lead.appointmentTime
//             ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
//             : new Date().toISOString();
//       } else if (selectedStatus === "rescheduled") {
//         if (!newAppointmentDate || !newAppointmentTime) {
//           setValidationError("กรุณาเลือกวันและเวลานัดใหม่");
//           return;
//         }
//         payload.appointments.date = `${newAppointmentDate}T${newAppointmentTime}:00+07:00`;
//       } else if (selectedStatus === "cancelled") {
//         payload.appointments.date = new Date().toISOString();
//       }

//       await api.patch(`/${lead.id}`, payload);

//       if (selectedStatus === "arrived" && nextAppointmentEnabled) {
//         const hasNextDate = nextAppointmentDate && nextAppointmentTime;

//         const nextLeadPayload: any = {
//           clinic: { branch: lead.branch },
//           patient: {
//             fullname: patientName || lead.name,
//             nickname: nickname || undefined,
//             tel: lead.phone,
//             socialMedia: lead.socialMedia || undefined
//           },
//           interests: lead.interest,
//           referralChannel: lead.referralChannel,
//           createdBy: lead.admin,
//           note: "",
//           previousAppointmentId: lead.id,
//         };

//         if (hasNextDate) {
//           const appointmentDate = new Date(nextAppointmentDate);
//           const firstDayOfMonth = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1);

//           nextLeadPayload.appointments = {
//             status: "scheduled",
//             date: `${nextAppointmentDate}T${nextAppointmentTime}:00+07:00`,
//           };
//           nextLeadPayload.overrideCreatedAt = firstDayOfMonth.toISOString();
//         } else {
//           nextLeadPayload.appointments = {
//             status: "pending",
//           };
//         }

//         try {
//           await api.post("/createlead", nextLeadPayload);
//         } catch (err) {
//           console.error("สร้าง Lead นัดครั้งถัดไปไม่สำเร็จ", err);
//         }
//       }

//       onSave({
//         ...lead,
//         ...payload,
//         ...(selectedStatus === "arrived" ? {
//           name: patientName || lead.name,
//           nickname: nickname || undefined,
//           receiptUrl: receiptUrl || undefined,
//         } : {}),
//       });

//       const statusLabels: Record<string, string> = {
//         arrived: "อัปเดตสถานะมาตามนัดสำเร็จ",
//         rescheduled: "เลื่อนนัดสำเร็จ",
//         cancelled: "ยกเลิกนัดสำเร็จ",
//       };
//       onSuccess?.(statusLabels[selectedStatus] || "อัปเดตสถานะสำเร็จ");

//       onClose();
//     } catch (err) {
//       console.error(err);
//       onError?.("อัปเดตสถานะไม่สำเร็จ");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const statusButtons = [
//     {
//       value: "arrived",
//       label: "มาตามนัด",
//       icon: <UserCheck className="w-4 h-4" />,
//       activeBg: "bg-green-50",
//       activeBorder: "border-green-500",
//       activeText: "text-green-700",
//       iconBg: "bg-green-100",
//     },
//     {
//       value: "rescheduled",
//       label: "เลื่อนนัด",
//       icon: <Calendar className="w-4 h-4" />,
//       activeBg: "bg-amber-50",
//       activeBorder: "border-amber-500",
//       activeText: "text-amber-700",
//       iconBg: "bg-amber-100",
//     },
//     {
//       value: "cancelled",
//       label: "ยกเลิกนัด",
//       icon: <XCircle className="w-4 h-4" />,
//       activeBg: "bg-red-50",
//       activeBorder: "border-red-500",
//       activeText: "text-red-700",
//       iconBg: "bg-red-100",
//     },
//   ];
//   return (
//     <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
//       <div className="bg-white w-full sm:max-w-2xl sm:w-full sm:mx-4 max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-xl overflow-hidden rounded-t-2xl sm:rounded-2xl">
//         <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#1479FF] shrink-0">
//           <h2 className="text-base font-semibold text-white">อัปเดตสถานะ</h2>
//           <button
//             onClick={onClose}
//             className="p-1 rounded-full hover:bg-white/20 transition-colors"
//           >
//             <X className="w-5 h-5 text-white" />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 pb-6 sm:p-6 space-y-6 overscroll-contain">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-3">
//               เลือกสถานะ
//             </label>

//             <div className="grid grid-cols-3 gap-3">
//               {statusButtons.map((btn) => {
//                 const isActive = selectedStatus === btn.value;
//                 return (
//                   <button
//                     key={btn.value}
//                     type="button"
//                     onClick={() => {
//                       setSelectedStatus(btn.value);
//                       setValidationError("");
//                     }}
//                     className={`
//                       flex items-center gap-1.5 px-3 py-3 rounded-lg border transition-all text-sm font-medium
//                       ${isActive
//                         ? `${btn.activeBg} ${btn.activeBorder} ${btn.activeText}`
//                         : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
//                       }
//                     `}
//                   >
//                     {btn.icon}
//                     {btn.label}
//                   </button>
//                 );
//               })}
//             </div>
//           </div>

//           {selectedStatus === "arrived" && (
//             <div className="space-y-6 pt-6">
//               <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
//                 <div className="flex items-center gap-2">
//                   <div className="p-2 bg-gray-100 rounded-lg">
//                     <User className="w-5 h-5 text-gray-600" />
//                   </div>
//                   <span className="text-sm font-semibold text-gray-700">ข้อมูลคนไข้</span>
//                 </div>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
//                     <input
//                       type="text"
//                       value={patientName}
//                       onChange={(e) => setPatientName(e.target.value)}
//                       placeholder="ชื่อ-นามสกุล"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเล่น</label>
//                     <input
//                       type="text"
//                       value={nickname}
//                       onChange={(e) => setNickname(e.target.value)}
//                       placeholder="ชื่อเล่น"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
//                     />
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-2">
//                     <div className="p-2 bg-blue-100 rounded-lg">
//                       <Wallet className="w-5 h-5 text-blue-600" />
//                     </div>
//                     <span className="text-sm font-medium text-gray-700">เงินมัดจำ</span>
//                   </div>
//                   <span className="text-lg font-bold text-blue-700">
//                     {lead.deposit?.amount ? lead.deposit.amount.toLocaleString() : 0} บาท
//                   </span>
//                 </div>
//               </div>

//               <h3 className="font-semibold text-gray-700">
//                 ข้อมูลการทำหัตถการ
//               </h3>

//               {procedures.map((procedure, index) => (
//                 <div
//                   key={index}
//                   className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200"
//                 >
//                   <div className="flex gap-3 items-end">
//                     <div className="flex-1">
//                       <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหัตถการ</label>
//                       <input
//                         type="text"
//                         placeholder="ชื่อหัตถการ"
//                         value={procedure.name}
//                         onChange={(e) => updateProcedure(index, "name", e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
//                       />
//                     </div>

//                     <div className="w-36">
//                       <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท)</label>
//                       <input
//                         type="number"
//                         placeholder="0"
//                         value={procedure.price ?? ""}
//                         onChange={(e) => updateProcedure(index, "price", e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-right"
//                       />
//                     </div>

//                     {commissionEnabled && (
//                       <div className="w-28">
//                         <label className="block text-sm font-medium text-gray-700 mb-1">ค่าคอม (%)</label>
//                         <div className="relative">
//                           <input
//                             type="number"
//                             min="0"
//                             max="100"
//                             step="0.1"
//                             value={procedure.commissionRate || ""}
//                             placeholder="0"
//                             onChange={(e) =>
//                               updateProcedure(index, "commissionRate", parseFloat(e.target.value) || 0)
//                             }
//                             className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-md text-right bg-white"
//                           />
//                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
//                         </div>
//                       </div>
//                     )}

//                     {procedures.length > 1 && (
//                       <button
//                         onClick={() => removeProcedure(index)}
//                         className="text-red-500 hover:text-red-700 pb-2"
//                       >
//                         <Trash2 className="w-5 h-5" />
//                       </button>
//                     )}
//                   </div>

//                   {commissionEnabled && procedure.commissionRate > 0 && parseFloat(procedure.price) > 0 && (
//                     <div className="flex items-center gap-1 pl-1">
//                       <span className="text-xs text-purple-600 font-medium">
//                         ค่าคอม = {(() => {
//                           const price = parseFloat(procedure.price) || 0;
//                           const base =
//                             paymentMethod === "card"
//                               ? price - Math.round((price * serviceChargeRate) / 100 * 100) / 100
//                               : price;
//                           return Math.round((base * procedure.commissionRate) / 100 * 100) / 100;
//                         })().toLocaleString()} บาท
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               ))}

//               <button
//                 onClick={addProcedure}
//                 className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
//               >
//                 <Plus className="w-4 h-4" />
//                 เพิ่มหัตถการ
//               </button>

//               <div className="border border-gray-200 rounded-lg p-4">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <span className="text-sm font-medium text-gray-700">ค่าคอมมิชชั่น</span>
//                     <p className="text-xs text-gray-400 mt-0.5">เปิดเพื่อใส่ % ค่าคอมในแต่ละหัตถการ</p>
//                   </div>
//                   <button
//                     type="button"
//                     role="switch"
//                     aria-checked={commissionEnabled}
//                     onClick={() => {
//                       const next = !commissionEnabled;
//                       setCommissionEnabled(next);
//                       if (!next) {
//                         setProcedures((prev) =>
//                           prev.map((p) => ({ ...p, commissionRate: 0 }))
//                         );
//                       }
//                     }}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${commissionEnabled ? "bg-[#1479FF]" : "bg-gray-200"
//                       }`}
//                   >
//                     <span
//                       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${commissionEnabled ? "translate-x-6" : "translate-x-1"
//                         }`}
//                     />
//                   </button>
//                 </div>

//                 {commissionEnabled && totalCommission > 0 && (
//                   <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
//                     {commissionDetails.map((d, i) => (
//                       <div key={i} className="flex justify-between text-sm">
//                         <span className="text-gray-600">
//                           {d.procedureName} ({d.rate}%
//                           {paymentMethod === "card" ? ` จาก ${d.baseAmount.toLocaleString()} บาท` : ""})
//                         </span>
//                         <span className="font-medium text-purple-600">
//                           {d.amount.toLocaleString()} บาท
//                         </span>
//                       </div>
//                     ))}
//                     <div className="flex justify-between items-center pt-2 border-t border-purple-200">
//                       <span className="text-sm font-semibold text-gray-800">รวมค่าคอมมิชชั่น</span>
//                       <span className="text-lg font-bold text-purple-600">
//                         {totalCommission.toLocaleString()} บาท
//                       </span>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <div className="flex justify-between items-center bg-indigo-50 px-4 py-3 rounded-lg">
//                 <span className="text-sm font-medium">ยอดรวม</span>
//                 <span className="text-xl font-semibold text-indigo-600">
//                   {totalAmount.toLocaleString()} บาท
//                 </span>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-2">
//                   ช่องทางชำระเงิน
//                 </label>
//                 <select
//                   value={paymentMethod}
//                   onChange={(e) => {
//                     setPaymentMethod(e.target.value);
//                     setValidationError("");
//                   }}
//                   className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
//                 >
//                   <option value="">เลือกช่องทางชำระเงิน</option>
//                   <option value="cash">เงินสด</option>
//                   <option value="transfer">โอนเงิน</option>
//                   <option value="card">บัตรเครดิต</option>
//                 </select>
//               </div>

//               {paymentMethod === "card" && totalAmount > 0 && (
//                 <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
//                   <div className="flex items-center gap-2 text-amber-700">
//                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
//                     </svg>
//                     <span className="text-sm font-semibold">Service Charge บัตรเครดิต</span>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       อัตรา Service Charge (%)
//                     </label>
//                     <div className="relative">
//                       <input
//                         type="number"
//                         min="0"
//                         max="100"
//                         step="0.1"
//                         value={serviceChargeRate}
//                         onChange={(e) => setServiceChargeRate(parseFloat(e.target.value) || 0)}
//                         className="w-full px-3 py-2 pr-10 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
//                         %
//                       </span>
//                     </div>
//                   </div>

//                   <div className="space-y-2 pt-2 border-t border-amber-200">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">ยอดรวมหัตถการ</span>
//                       <span className="font-medium">{totalAmount.toLocaleString()} บาท</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-red-600">หัก Service Charge ({serviceChargeRate}%)</span>
//                       <span className="font-medium text-red-600">-{serviceChargeAmount.toLocaleString()} บาท</span>
//                     </div>
//                     <div className="flex justify-between items-center pt-2 border-t border-amber-300">
//                       <span className="text-sm font-semibold text-gray-800">ยอดสุทธิที่คลินิกได้รับ</span>
//                       <span className="text-lg font-bold text-green-600">{netAmount.toLocaleString()} บาท</span>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {paymentMethod && totalAmount > 0 && (
//                 <div className="bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 space-y-3">
//                   <h4 className="font-semibold text-slate-700 flex items-center gap-2">
//                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                     </svg>
//                     สรุปยอดเงิน
//                   </h4>

//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">ยอดก่อนหัก Service Charge</span>
//                       <span className="font-medium">{totalAmount.toLocaleString()} บาท</span>
//                     </div>

//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">หัก Service Charge</span>
//                       <span className={`font-medium ${serviceChargeAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
//                         {serviceChargeAmount > 0 ? `-${serviceChargeAmount.toLocaleString()}` : '0'} บาท
//                       </span>
//                     </div>

//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">ค่าคอมมิชชัน</span>
//                       <span className={`font-medium ${totalCommission > 0 ? 'text-purple-600' : 'text-gray-500'}`}>
//                         {totalCommission > 0 ? totalCommission.toLocaleString() : '0'} บาท
//                       </span>
//                     </div>

//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">เงินมัดจำ</span>
//                       <span className={`font-medium ${(lead.deposit?.amount || 0) > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
//                         {(lead.deposit?.amount || 0).toLocaleString()} บาท
//                       </span>
//                     </div>

//                     <div className="border-t border-slate-300 pt-3 mt-3">
//                       <div className="flex justify-between items-center bg-green-50 -mx-5 px-5 py-3 rounded-b-xl -mb-5 border-t border-green-200">
//                         <span className="text-sm font-semibold text-gray-800">ยอดสุทธิที่คลินิกได้รับ</span>
//                         <span className="text-xl font-bold text-green-600">
//                           {(totalAmount - serviceChargeAmount - totalCommission).toLocaleString()} บาท
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="border border-gray-200 rounded-lg p-4 space-y-4">
//                 <div className="flex items-center gap-2">
//                   <div className="p-2 bg-amber-100 rounded-lg">
//                     <ImageIcon className="w-5 h-5 text-amber-600" />
//                   </div>
//                   <span className="text-sm font-semibold text-gray-700">ใบเสร็จ / หลักฐานการรับชำระ <span className="text-red-500">*</span></span>
//                 </div>

//                 {!receiptPreview ? (
//                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
//                     <div className="flex flex-col items-center justify-center py-4">
//                       <Upload className="w-8 h-8 text-gray-400 mb-2" />
//                       <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูปใบเสร็จ</p>
//                       <p className="text-xs text-gray-400 mt-1">PNG, JPG ไม่เกิน 5MB</p>
//                     </div>
//                     <input
//                       ref={receiptInputRef}
//                       type="file"
//                       accept="image/*"
//                       onChange={handleReceiptUpload}
//                       className="hidden"
//                     />
//                   </label>
//                 ) : (
//                   <div className="relative">
//                     <img
//                       src={receiptPreview}
//                       alt="Receipt preview"
//                       className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
//                     />
//                     {receiptUploading && (
//                       <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
//                         <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
//                       </div>
//                     )}
//                     {!receiptUploading && (
//                       <button
//                         type="button"
//                         onClick={removeReceipt}
//                         className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
//                       >
//                         <X className="w-4 h-4" />
//                       </button>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <div className="border border-gray-200 rounded-lg p-4 space-y-4">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <span className="text-sm font-medium text-gray-700">นัดหมายครั้งถัดไป</span>
//                     <p className="text-xs text-gray-400 mt-0.5">สร้างข้อมูลใหม่สำหรับการนัดหมายครั้งถัดไป</p>
//                   </div>
//                   <button
//                     type="button"
//                     role="switch"
//                     aria-checked={nextAppointmentEnabled}
//                     onClick={() => {
//                       const next = !nextAppointmentEnabled;
//                       setNextAppointmentEnabled(next);
//                       if (!next) {
//                         setNextAppointmentDate("");
//                         setNextAppointmentTime("");
//                       }
//                     }}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${nextAppointmentEnabled ? "bg-[#1479FF]" : "bg-gray-200"}`}
//                   >
//                     <span
//                       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nextAppointmentEnabled ? "translate-x-6" : "translate-x-1"}`}
//                     />
//                   </button>
//                 </div>

//                 {nextAppointmentEnabled && (
//                   <div className="space-y-4 pt-3 border-t border-gray-100">
//                     <div className="flex gap-3">
//                       <div className="flex-1 min-w-0">
//                         <label className="block text-sm font-medium text-gray-700 mb-1">วันที่นัด</label>
//                         <input
//                           type="date"
//                           value={nextAppointmentDate}
//                           onChange={(e) => setNextAppointmentDate(e.target.value)}
//                           // className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
//                           className={`
//                                     block w-full px-4 py-3.5
//                                     border border-gray-300 rounded-lg
//                                     text-base
//                                     focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
//                                     min-h-[52px]
//                                     appearance-none
//                                   `}
//                         />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <label className="block text-sm font-medium text-gray-700 mb-1">เวลานัด</label>
//                         <input
//                           type="time"
//                           value={nextAppointmentTime}
//                           onChange={(e) => setNextAppointmentTime(e.target.value)}
//                           // className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
//                           className={`
//                                     block w-full px-4 py-3.5
//                                     border border-gray-300 rounded-lg
//                                     text-base
//                                     focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
//                                     min-h-[52px]
//                                     appearance-none
//                                   `}
//                         />
//                       </div>
//                     </div>
//                     <p className="text-xs text-gray-500">
//                       {nextAppointmentDate
//                         ? `จะสร้างข้อมูลสถานะ "ทำนัด" ในเดือน ${new Date(nextAppointmentDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`
//                         : 'ไม่ระบุวันนัดหมาย จะสร้างข้อมูลในสถานะ "รอตัดสินใจ" ของเดือนนี้'
//                       }
//                     </p>
//                   </div>
//                 )}
//               </div>

//             </div>
//           )}

//           {selectedStatus === "rescheduled" && (
//             <div className="space-y-5 mt-4">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
//                 <div className="space-y-1.5">
//                   <label
//                     htmlFor="new-date"
//                     className="block text-sm font-medium text-gray-700"
//                   >
//                     วันที่นัดใหม่
//                   </label>
//                   <input
//                     id="new-date"
//                     type="date"
//                     value={newAppointmentDate || ''}
//                     onChange={(e) => setNewAppointmentDate(e.target.value)}
//                     className={`
//                       block w-full px-4 py-3.5
//                       border border-gray-300 rounded-lg
//                       text-base
//                       focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
//                       min-h-[52px]
//                       appearance-none
//                     `}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label
//                     htmlFor="new-time"
//                     className="block text-sm font-medium text-gray-700"
//                   >
//                     เวลานัดใหม่
//                   </label>
//                   <input
//                     id="new-time"
//                     type="time"
//                     value={newAppointmentTime || ''}
//                     onChange={(e) => setNewAppointmentTime(e.target.value)}
//                     className={`
//                       block w-full px-4 py-3.5
//                       border border-gray-300 rounded-lg
//                       text-base
//                       focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
//                       min-h-[52px]
//                       appearance-none
//                     `}
//                   />
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="px-6 py-3 bg-gray-50 shrink-0">
//           {validationError && (
//             <p className="text-sm text-red-500 mb-3">* {validationError}</p>
//           )}
//           <div className="flex justify-end gap-3">
//             <button
//               onClick={onClose}
//               disabled={isSaving}
//               className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
//             >
//               ยกเลิก
//             </button>
//             <button
//               onClick={handleSave}
//               disabled={!selectedStatus || isSaving || receiptUploading}
//               className="px-5 py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] disabled:bg-gray-300 transition-colors flex items-center gap-2"
//             >
//               {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
//               {isSaving ? "กำลังบันทึก..." : "บันทึก"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ViewLeadModal = ({
//   lead,
//   onClose,
// }: {
//   lead: Lead;
//   onClose: () => void;
// }) => {
//   const interestDisplay = Array.isArray(lead.interest)
//     ? lead.interest.map((i) => `${i.name}`)
//     : "ไม่มี";

//   const proceduresDisplay = Array.isArray(lead.procedures) && lead.procedures.length > 0
//     ? lead.procedures
//     : null;

//   const paymentMethodMap: Record<string, string> = {
//     cash: "เงินสด",
//     transfer: "โอนเงิน",
//     card: "บัตรเครดิต",
//   };

//   const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
//     pending: { bg: "bg-orange-100", text: "text-orange-700", label: "รอดำเนินการ" },
//     scheduled: { bg: "bg-blue-100", text: "text-blue-700", label: "นัดหมายแล้ว" },
//     rescheduled: { bg: "bg-yellow-100", text: "text-yellow-700", label: "เลื่อนนัด" },
//     arrived: { bg: "bg-green-100", text: "text-green-700", label: "มาตามนัด" },
//     cancelled: { bg: "bg-red-100", text: "text-red-700", label: "ยกเลิก" },
//   };

//   const status = statusConfig[lead.status] || statusConfig.pending;

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
//       <div className="bg-white w-full sm:max-w-2xl sm:w-full sm:mx-4 max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl">

//         <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1479FF]">
//           <h2 className="text-base font-semibold text-white">รายละเอียด</h2>
//           <button
//             onClick={onClose}
//             className="p-1 rounded-full hover:bg-white/20 transition-colors"
//           >
//             <X className="w-5 h-5 text-white" />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 pb-8 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain">
//           <div className="flex items-center gap-3 flex-wrap">
//             <span className={`inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full ${status.bg} ${status.text}`}>
//               {status.label}
//             </span>
//             {lead.status !== "pending" && lead.appointmentDateDisplay && !lead.appointmentDateDisplay.includes("1970") && (
//               <span className="text-xs sm:text-sm text-gray-500">
//                 วันนัด: {lead.appointmentDateDisplay}
//               </span>
//             )}
//           </div>

//           <div className="bg-gray-50 rounded-xl p-4 space-y-3">
//             <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//               <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
//               ข้อมูลลูกค้า
//             </h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <InfoItem label="ชื่อนามสกุล" value={lead.name} />
//               <InfoItem label="ชื่อเล่น" value={lead.nickname || "-"} />
//               <InfoItem label="เบอร์ติดต่อ" value={lead.phone} />
//               <InfoItem label="Social Media" value={lead.socialMedia || "-"} />
//               <InfoItem label="ช่องทางที่รู้จัก" value={lead.referralChannel || "-"} />
//             </div>
//           </div>

//           <div className="bg-gray-50 rounded-xl p-4 space-y-3">
//             <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//               <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
//               ข้อมูลคลินิก
//             </h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <InfoItem label="สาขา" value={lead.branch || "-"} />
//               <InfoItem label="แอดมิน" value={lead.admin || "-"} />
//             </div>
//           </div>

//           <div className="bg-gray-50 rounded-xl p-4 space-y-3">
//             <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//               <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
//               ความสนใจ (หัตถการ)
//             </h3>
//             <p className="text-sm text-gray-800">{interestDisplay}</p>
//           </div>

//           {proceduresDisplay && (
//             <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
//               <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
//                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
//                 หัตถการที่ทำ
//               </h3>
//               <div className="space-y-2">
//                 {proceduresDisplay.map((p, i) => (
//                   <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2">
//                     <span className="text-gray-700">{p.name}</span>
//                     <span className="font-medium text-emerald-600">{Number(p.price).toLocaleString()} บาท</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {lead.deposit && (
//             <div className="bg-blue-50 rounded-xl p-4 space-y-3">
//               <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
//                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
//                 ข้อมูลมัดจำ
//               </h3>
//               <div className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2">
//                 <span className="text-gray-600">จำนวนเงินมัดจำ</span>
//                 <span className="font-bold text-blue-600">{lead.deposit.amount?.toLocaleString()} บาท</span>
//               </div>
//               {lead.deposit.slipUrl && (
//                 <div className="mt-3">
//                   <label className="text-xs font-medium text-gray-500 block mb-2">สลิปการโอนเงิน</label>
//                   <div
//                     className="relative bg-white rounded-lg overflow-hidden border border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
//                     onClick={() => {
//                       const url = lead.deposit?.slipUrl?.startsWith('http')
//                         ? lead.deposit.slipUrl
//                         : `${import.meta.env.VITE_API_URL || ''}${lead.deposit?.slipUrl}`;
//                       window.open(url, '_blank');
//                     }}
//                   >
//                     <img
//                       src={lead.deposit.slipUrl.startsWith('http')
//                         ? lead.deposit.slipUrl
//                         : `${import.meta.env.VITE_API_URL || ''}${lead.deposit.slipUrl}`}
//                       alt="สลิปการโอน"
//                       className="w-full max-h-48 object-contain"
//                     />
//                     <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
//                       <span className="opacity-0 hover:opacity-100 text-white text-xs bg-black/50 px-2 py-1 rounded">
//                         คลิกเพื่อดูขนาดเต็ม
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {lead.status === "arrived" && (
//             <div className="bg-violet-50 rounded-xl p-4 space-y-3">
//               <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
//                 <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
//                 ข้อมูลการชำระเงิน
//               </h3>

//               {lead.payments ? (
//                 <>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     <div className="bg-white rounded-lg px-3 py-2">
//                       <p className="text-xs text-gray-500">วิธีชำระเงิน</p>
//                       <p className="text-sm font-medium text-gray-800">{paymentMethodMap[lead.payments?.method] || "-"}</p>
//                     </div>
//                     <div className="bg-white rounded-lg px-3 py-2">
//                       <p className="text-xs text-gray-500">จำนวนเงิน</p>
//                       <p className="text-sm font-bold text-violet-600">{lead.payments.amount?.toLocaleString()} บาท</p>
//                     </div>
//                   </div>

//                   {lead.payments.serviceCharge && (
//                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
//                       <p className="text-xs font-semibold text-amber-700">Service Charge บัตรเครดิต</p>
//                       <div className="space-y-1 text-xs sm:text-sm">
//                         <div className="flex justify-between">
//                           <span className="text-gray-600">อัตรา</span>
//                           <span className="font-medium">{lead.payments.serviceCharge.rate}%</span>
//                         </div>
//                         <div className="flex justify-between">
//                           <span className="text-red-600">จำนวนที่หัก</span>
//                           <span className="font-medium text-red-600">-{lead.payments.serviceCharge.amount?.toLocaleString()} บาท</span>
//                         </div>
//                         <div className="flex justify-between pt-1 border-t border-amber-200">
//                           <span className="font-semibold text-gray-800">ยอดสุทธิ</span>
//                           <span className="font-bold text-green-600">{lead.payments.serviceCharge.netAmount?.toLocaleString()} บาท</span>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   {lead.payments.commission && lead.payments.commission.totalAmount > 0 && (
//                     <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
//                       <p className="text-xs font-semibold text-purple-700">ค่าคอมมิชชั่น</p>
//                       <div className="space-y-1 text-xs sm:text-sm">
//                         {lead.payments.commission.details?.map((d, i) => (
//                           <div key={i} className="flex justify-between">
//                             <span className="text-gray-600 truncate mr-2">
//                               {d.procedureName} ({d.rate}%)
//                             </span>
//                             <span className="font-medium text-purple-600 whitespace-nowrap">{d.amount?.toLocaleString()} บาท</span>
//                           </div>
//                         ))}
//                         <div className="flex justify-between pt-1 border-t border-purple-200">
//                           <span className="font-semibold text-gray-800">รวม</span>
//                           <span className="font-bold text-purple-600">{lead.payments.commission.totalAmount?.toLocaleString()} บาท</span>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   {lead.receiptUrl && (
//                     <div className="mt-3">
//                       <label className="text-xs font-medium text-gray-500 block mb-2">ใบเสร็จ / หลักฐานการรับชำระ</label>
//                       <div
//                         className="relative bg-white rounded-lg overflow-hidden border border-violet-200 cursor-pointer hover:shadow-md transition-shadow"
//                         onClick={() => {
//                           const url = lead.receiptUrl?.startsWith('http')
//                             ? lead.receiptUrl
//                             : `${import.meta.env.VITE_API_URL || ''}${lead.receiptUrl}`;
//                           window.open(url, '_blank');
//                         }}
//                       >
//                         <img
//                           src={lead.receiptUrl.startsWith('http')
//                             ? lead.receiptUrl
//                             : `${import.meta.env.VITE_API_URL || ''}${lead.receiptUrl}`}
//                           alt="ใบเสร็จ"
//                           className="w-full max-h-48 object-contain"
//                         />
//                         <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
//                           <span className="opacity-0 hover:opacity-100 text-white text-xs bg-black/50 px-2 py-1 rounded">
//                             คลิกเพื่อดูขนาดเต็ม
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </>
//               ) : (
//                 <div className="bg-white rounded-lg px-4 py-6 text-center">
//                   <p className="text-sm text-gray-400">ยังไม่มีข้อมูลการชำระเงิน</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {lead.note && (
//             <div className="bg-gray-50 rounded-xl p-4 space-y-2">
//               <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                 <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
//                 หมายเหตุ
//               </h3>
//               <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3">{lead.note}</p>
//             </div>
//           )}
//         </div>

//         <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-50">
//           <p className="text-xs text-gray-400">
//             สร้างเมื่อ: {lead.createdAtDisplay}
//           </p>
//           <button
//             onClick={onClose}
//             className="px-5 py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] transition-colors"
//           >
//             ปิด
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const InfoItem = ({ label, value }: { label: string; value: string }) => (
//   <div className="bg-white rounded-lg px-3 py-2">
//     <p className="text-xs text-gray-500">{label}</p>
//     <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
//   </div>
// );


// export default LeadsPage;

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, Edit2, Trash2, X, Users, CalendarCheck, Clock, XCircle, Eye, UserCheck, Wallet, Calendar, ChevronRight, User, Upload, ImageIcon, Loader2 } from "lucide-react";
import { type Lead } from "../types";
import Modal from "../components/UI/Modal";
import LeadForm from "../components/UI/LeadForm";
import { ToastContainer, useToast } from "../components/Toast";
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
  const [activeTab, setActiveTab] = useState<"notScheduled" | "scheduled" | "arrived">("notScheduled");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusModalLead, setStatusModalLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  const { toasts, toast, removeToast } = useToast();

  const fetchLeads = async (year: string) => {
    try {
      const res = await api.get(`/lead?year=${year}`);

      const result = res.data;

      const mappedLeads: Lead[] = (
        Array.isArray(result.data) ? result.data : []
      ).map((item: any) => {
        const status = item.appointments?.status ?? "pending";

        return {
          id: item._id,
          name: item.patient?.fullname || "",
          nickname: item.patient?.nickname || "",
          phone: item.patient?.tel || "",
          socialMedia: item.patient?.socialMedia || "",
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
          receiptUrl: item.receiptUrl || "",
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
    fetchLeads(selectedYear);
  }, [selectedYear]);


  const filteredLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      const matchesSearch =
        searchQuery === "" ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.nickname && lead.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.phone.includes(searchQuery) ||
        (lead.socialMedia && lead.socialMedia.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesTab = false;
      if (activeTab === "notScheduled") {
        matchesTab = lead.status === "pending";
      } else if (activeTab === "scheduled") {
        matchesTab = ["scheduled", "rescheduled", "cancelled"].includes(lead.status);
      } else if (activeTab === "arrived") {
        matchesTab = lead.status === "arrived";
      }

      return matchesSearch && matchesTab;
    });

    if (activeTab === "notScheduled") {
      filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (activeTab === "scheduled") {
      filtered.sort((a, b) => {
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : Infinity;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : Infinity;
        return dateA - dateB;
      });
    } else if (activeTab === "arrived") {
      filtered.sort((a, b) => {
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [leads, searchQuery, activeTab]);

  const summary = useMemo(() => {
    return {
      total: leads.length,
      withAppointment: leads.filter((l) =>
        ["scheduled", "rescheduled"].includes(l.status)
      ).length,
      waiting: leads.filter((l) => l.status === "pending").length,
      arrived: leads.filter((l) => l.status === "arrived").length,
      cancelled: leads.filter((l) => l.status === "cancelled").length,
    };
  }, [leads]);

  const handleSave = async (lead: Lead) => {
    try {
      const payload: any = {
        clinic: { branch: lead.branch },
        patient: { 
          fullname: lead.name, 
          nickname: lead.nickname || undefined,
          tel: lead.phone, 
          socialMedia: lead.socialMedia || undefined 
        },
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
        toast.success("เพิ่ม Lead สำเร็จ");
      } else {
        await api.patch(`/${lead.id}`, payload);
        toast.success("บันทึกข้อมูลสำเร็จ");
      }

      await fetchLeads(selectedYear);
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  const openDeleteModal = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await api.delete(`/${leadToDelete.id}`);
      await fetchLeads(selectedYear);
      toast.success("ลบข้อมูลสำเร็จ");
    } catch (err) {
      console.error("Delete lead failed", err);
      toast.error("ลบข้อมูลไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const openStatusModal = (lead: Lead) => {
    setStatusModalLead(lead);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-28 sm:pb-8 sm:pt-8">
          <p className="hidden sm:block text-gray-600 mb-6">รายชื่อลูกค้าที่ลงข้อมูลและการติดตาม</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-4 sm:mb-8">
            <SummaryBox
              label="ทั้งหมด"
              value={summary.total}
              icon={<Users />}
            />

            <SummaryBox
              label="ทำนัดแล้ว"
              value={summary.withAppointment}
              color="text-blue-600"
              icon={<CalendarCheck className="text-blue-500" />}
            />

            <SummaryBox
              label="รอตัดสินใจ"
              value={summary.waiting}
              color="text-orange-600"
              icon={<Clock className="text-orange-500" />}
            />

            <SummaryBox
              label="มาแล้ว"
              value={summary.arrived}
              color="text-green-600"
              icon={<UserCheck className="text-green-500" />}
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
              <div className="flex gap-0 sm:gap-4 px-2 sm:px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("notScheduled")}
                  className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "notScheduled"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  ยังไม่นัด
                </button>
                <button
                  onClick={() => setActiveTab("scheduled")}
                  className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "scheduled"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  นัดแล้ว
                </button>
                <button
                  onClick={() => setActiveTab("arrived")}
                  className={`py-3 sm:py-4 px-3 sm:px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "arrived"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  มาแล้ว
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 shadow flex gap-3 sm:gap-4 flex-col sm:flex-row">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 sm:px-4 py-2 shadow rounded-md bg-white min-w-[100px] sm:min-w-[120px] text-sm"
              >
                {(() => {
                  const START_YEAR = 2024;
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

              <div className="flex items-center flex-1 shadow rounded-md px-3">
                <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา Lead..."
                  className="w-full py-2 outline-none text-sm"
                />
              </div>

              <button
                onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-[#1479FF] text-white rounded-md whitespace-nowrap text-sm font-medium"
              >
                <Plus className="w-5 h-5" />
                เพิ่ม
              </button>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">ชื่อ</th>
                    <th className="px-6 py-4 text-left font-semibold">โทร</th>

                    {activeTab === "notScheduled" && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">วันที่สร้าง</th>
                        <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
                      </>
                    )}

                    {activeTab === "scheduled" && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">วันที่สร้าง</th>
                        <th className="px-6 py-4 text-left font-semibold">วันที่นัด</th>
                        <th className="px-6 py-4 text-right font-semibold">มัดจำ</th>
                        <th className="px-6 py-4 text-center font-semibold">
                          ระยะเวลาก่อนวันนัด
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
                        <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                      </>
                    )}

                    {activeTab === "arrived" && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">วันที่มา</th>
                        <th className="px-6 py-4 text-left font-semibold">หัตถการที่สนใจ</th>
                        <th className="px-6 py-4 text-right font-semibold">ยอดชำระ</th>
                        <th className="px-6 py-4 text-left font-semibold">แอดมิน</th>
                        <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                      </>
                    )}

                    <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="border-t">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "scheduled" ? 9 : activeTab === "arrived" ? 8 : 5} className="px-6 py-16 text-center">
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
                          {lead.name}{lead.nickname && <span className="text-gray-500 font-normal"> ({lead.nickname})</span>}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {lead.phone}
                        </td>

                        {activeTab === "notScheduled" && (
                          <>
                            <td className="px-6 py-4 text-gray-500">
                              {lead.createdAtDisplay}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {lead.admin || "-"}
                            </td>
                          </>
                        )}

                        {activeTab === "scheduled" && (
                          <>
                            <td className="px-6 py-4 text-gray-500">
                              {lead.createdAtDisplay}
                            </td>

                            <td className="px-6 py-4 text-gray-700">
                              {lead.appointmentDateDisplay}
                            </td>

                            <td className="px-6 py-4 text-right">
                              {lead.deposit?.amount ? (
                                <span className="font-medium text-blue-600">
                                  {lead.deposit.amount.toLocaleString()} บาท
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {lead.appointmentDate && (
                                <span className="font-medium">
                                  {lead.status === "cancelled" && "-"}

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

                            <td className="px-6 py-4 text-gray-600">
                              {lead.admin || "-"}
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

                        {activeTab === "arrived" && (
                          <>
                            <td className="px-6 py-4 text-gray-700">
                              {lead.appointmentDateDisplay}
                            </td>

                            <td className="px-6 py-4 text-gray-600">
                              {lead.interest && lead.interest.length > 0
                                ? lead.interest.map((i: any) => i.name || i).join(", ")
                                : "-"}
                            </td>

                            <td className="px-6 py-4 text-right font-medium text-green-600">
                              {lead.payments?.amount
                                ? `${lead.payments.amount.toLocaleString()} บาท`
                                : "-"}
                            </td>

                            <td className="px-6 py-4 text-gray-600">
                              {lead.admin || "-"}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => openStatusModal(lead)}
                                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md transition-all bg-green-100 text-green-700 hover:bg-green-200"
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

            <div className="md:hidden">
              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 py-16">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-gray-500">ยังไม่มีข้อมูล</p>
                  <p className="text-sm mt-1">กดปุ่ม "เพิ่ม Lead" เพื่อเริ่มต้น</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => (
                    <div key={lead.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {lead.name}{lead.nickname && <span className="text-gray-500 font-normal"> ({lead.nickname})</span>}
                          </h3>
                          <p className="text-sm text-gray-500">{lead.phone}</p>
                        </div>

                        {activeTab === "scheduled" && (
                          <button
                            onClick={() => openStatusModal(lead)}
                            disabled={isLeadLocked(lead)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ml-2 shrink-0
                              ${lead.status === "scheduled"
                                ? "bg-blue-100 text-blue-700"
                                : lead.status === "rescheduled"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : lead.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                              }
                              ${isLeadLocked(lead) ? "opacity-50" : "active:scale-95"}
                            `}
                          >
                            {statusLabel[lead.status]}
                            {!isLeadLocked(lead) && (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        {activeTab === "arrived" && (
                          <button
                            onClick={() => openStatusModal(lead)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ml-2 shrink-0 bg-green-100 text-green-700 active:scale-95"
                          >
                            {statusLabel[lead.status]}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                        {activeTab === "notScheduled" && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            สร้าง: {lead.createdAtDisplay}
                          </span>
                        )}

                        {activeTab === "scheduled" && (
                          <>
                            <span className="flex items-center gap-1">
                              <CalendarCheck className="w-3.5 h-3.5" />
                              นัด: {lead.appointmentDateDisplay || "-"}
                            </span>
                            {lead.appointmentDate && ["scheduled", "rescheduled"].includes(lead.status) && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {(() => {
                                  const days = getDaysUntilAppointment(lead.appointmentDate);
                                  if (days === 0) return <span className="text-green-600 font-medium">ถึงวันนัดแล้ว</span>;
                                  if (days > 0) return <span className="text-green-600 font-medium">อีก {days} วัน</span>;
                                  return <span className="text-red-600 font-medium">เลยมา {Math.abs(days)} วัน</span>;
                                })()}
                              </span>
                            )}
                            {lead.deposit?.amount && (
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <Wallet className="w-3.5 h-3.5" />
                                มัดจำ: {lead.deposit.amount.toLocaleString()} บาท
                              </span>
                            )}
                          </>
                        )}

                        {activeTab === "arrived" && (
                          <>
                            <span className="flex items-center gap-1">
                              <CalendarCheck className="w-3.5 h-3.5" />
                              มา: {lead.appointmentDateDisplay || "-"}
                            </span>
                            {lead.payments?.amount && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <Wallet className="w-3.5 h-3.5" />
                                {lead.payments.amount.toLocaleString()} บาท
                              </span>
                            )}
                          </>
                        )}

                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {lead.admin || "-"}
                        </span>
                      </div>

                      {activeTab === "arrived" && lead.interest && lead.interest.length > 0 && (
                        <div className="text-xs text-gray-600 mb-3">
                          <span className="text-gray-400">หัตถการ:</span>{" "}
                          {lead.interest.map((i: any) => i.name || i).join(", ")}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setViewingLead(lead)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          ดูข้อมูล
                        </button>
                        <button
                          onClick={() => {
                            if (!isLeadLocked(lead)) {
                              setEditingLead(lead);
                              setIsModalOpen(true);
                            }
                          }}
                          disabled={isLeadLocked(lead)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
                            ${isLeadLocked(lead)
                              ? "text-gray-300 bg-gray-50"
                              : "text-indigo-600 bg-indigo-50 active:bg-indigo-100"
                            }
                          `}
                        >
                          <Edit2 className="w-4 h-4" />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            if (!isLeadLocked(lead)) {
                              openDeleteModal(lead);
                            }
                          }}
                          disabled={isLeadLocked(lead)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors
                            ${isLeadLocked(lead)
                              ? "text-gray-300 bg-gray-50"
                              : "text-red-600 bg-red-50 active:bg-red-100"
                            }
                          `}
                        >
                          <Trash2 className="w-4 h-4" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {statusModalLead && (
        <StatusModal
          lead={statusModalLead}
          onClose={() => setStatusModalLead(null)}
          onSave={async () => {
            await fetchLeads(selectedYear);
            setStatusModalLead(null);
          }}
          onSuccess={(message) => toast.success(message)}
          onError={(message) => toast.error(message)}
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
        title={editingLead ? "แก้ไขข้อมูล" : "เพิ่มข้อมูล"}
      >
        <LeadForm
          lead={editingLead}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
        />
      </Modal>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 p-6 rounded-t-2xl sm:rounded-2xl">
            <h3 className="font-semibold text-lg mb-4">ยืนยันการลบ</h3>
            <p className="text-sm text-gray-600 mb-6">
              ต้องการลบ <b>{leadToDelete?.name}{leadToDelete?.nickname && ` (${leadToDelete.nickname})`}</b> ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
                disabled={isDeleting}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? "กำลังลบ..." : "ลบ"}
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
  icon?: React.ReactNode;
};

const SummaryBox = ({ label, value, color = "text-gray-800", icon }: SummaryBoxProps) => {
  return (
    <div className="bg-white rounded-xl shadow p-3 sm:p-6 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4">
        {icon && (
          <div className="text-2xl sm:text-3xl text-gray-400">
            {icon}
          </div>
        )}
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
};


const StatusModal = ({
  lead,
  onClose,
  onSave,
  onSuccess,
  onError,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
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

  const [nextAppointmentEnabled, setNextAppointmentEnabled] = useState(false);
  const [nextAppointmentDate, setNextAppointmentDate] = useState("");
  const [nextAppointmentTime, setNextAppointmentTime] = useState("");
  const [validationError, setValidationError] = useState("");

  const [patientName, setPatientName] = useState(lead.name || "");
  const [nickname, setNickname] = useState(lead.nickname || "");

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Prefill data for arrived leads (editing mode)
  useEffect(() => {
    if (lead.status === "arrived") {
      setSelectedStatus("arrived");
      
      // Prefill procedures
      if (lead.procedures && lead.procedures.length > 0) {
        setProcedures(
          lead.procedures.map((p: any) => ({
            name: p.name || "",
            price: String(p.price || 0),
            commissionRate: p.commissionRate || 0,
          }))
        );
      }
      
      // Prefill payment method
      if (lead.payments?.method) {
        setPaymentMethod(lead.payments.method);
      }
      
      // Prefill service charge rate
      if (lead.payments?.serviceCharge?.rate) {
        setServiceChargeRate(lead.payments.serviceCharge.rate);
      }
      
      // Prefill commission
      if (lead.payments?.commission && lead.payments.commission.totalAmount > 0) {
        setCommissionEnabled(true);
      }
      
      // Prefill receipt
      if (lead.receiptUrl) {
        setReceiptUrl(lead.receiptUrl);
        const fullUrl = lead.receiptUrl.startsWith('http')
          ? lead.receiptUrl
          : `${import.meta.env.VITE_API_URL || ''}${lead.receiptUrl}`;
        setReceiptPreview(fullUrl);
      }
    }
  }, [lead]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);

    setReceiptUploading(true);
    try {
      const formData = new FormData();
      formData.append('slip', file);
      const res = await api.post('/upload/slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReceiptUrl(res.data.data.url);
    } catch (err) {
      console.error('Upload receipt failed', err);
      setReceiptPreview(null);
    } finally {
      setReceiptUploading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptUrl(null);
    setReceiptPreview(null);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
  };


  const totalAmount = procedures.reduce(
    (sum, p) => sum + (parseFloat(p.price) || 0),
    0
  );

  const serviceChargeAmount = paymentMethod === "card"
    ? Math.round((totalAmount * serviceChargeRate) / 100 * 100) / 100
    : 0;

  const netAmount = totalAmount - serviceChargeAmount;

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
    setValidationError("");
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      if (!selectedStatus) return;

      setValidationError("");

      const validProcedures = procedures.filter(p => p.name && p.price);

      if (selectedStatus === "arrived") {
        if (validProcedures.length === 0 || !validProcedures.some(p => p.name.trim())) {
          setValidationError("กรุณากรอกข้อมูลหัตถการอย่างน้อย 1 รายการ");
          return;
        }
        if (!paymentMethod) {
          setValidationError("กรุณาเลือกช่องทางการชำระเงิน");
          return;
        }
        if (!receiptUrl) {
          setValidationError("กรุณาอัปโหลดรูปใบเสร็จ");
          return;
        }
      }

      setIsSaving(true);

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

      if (selectedStatus === "arrived") {
        payload.patient = {
          fullname: patientName || lead.name,
          nickname: nickname || undefined,
          tel: lead.phone,
          socialMedia: lead.socialMedia || undefined,
        };
        if (receiptUrl) {
          payload.receiptUrl = receiptUrl;
        }
      }

      if (selectedStatus === "scheduled") {
        payload.appointments.date =
          lead.appointmentDate && lead.appointmentTime
            ? `${lead.appointmentDate}T${lead.appointmentTime}:00+07:00`
            : new Date().toISOString();
      } else if (selectedStatus === "rescheduled") {
        if (!newAppointmentDate || !newAppointmentTime) {
          setValidationError("กรุณาเลือกวันและเวลานัดใหม่");
          return;
        }
        payload.appointments.date = `${newAppointmentDate}T${newAppointmentTime}:00+07:00`;
      } else if (selectedStatus === "cancelled") {
        payload.appointments.date = new Date().toISOString();
      }

      await api.patch(`/${lead.id}`, payload);

      if (selectedStatus === "arrived" && nextAppointmentEnabled) {
        const hasNextDate = nextAppointmentDate && nextAppointmentTime;

        const nextLeadPayload: any = {
          clinic: { branch: lead.branch },
          patient: {
            fullname: patientName || lead.name,
            nickname: nickname || undefined,
            tel: lead.phone,
            socialMedia: lead.socialMedia || undefined
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
        ...(selectedStatus === "arrived" ? {
          name: patientName || lead.name,
          nickname: nickname || undefined,
          receiptUrl: receiptUrl || undefined,
        } : {}),
      });

      const statusLabels: Record<string, string> = {
        arrived: "อัปเดตสถานะมาตามนัดสำเร็จ",
        rescheduled: "เลื่อนนัดสำเร็จ",
        cancelled: "ยกเลิกนัดสำเร็จ",
      };
      onSuccess?.(statusLabels[selectedStatus] || "อัปเดตสถานะสำเร็จ");

      onClose();
    } catch (err) {
      console.error(err);
      onError?.("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const statusButtons = [
    {
      value: "arrived",
      label: "มาตามนัด",
      icon: <UserCheck className="w-4 h-4" />,
      activeBg: "bg-green-50",
      activeBorder: "border-green-500",
      activeText: "text-green-700",
      iconBg: "bg-green-100",
    },
    {
      value: "rescheduled",
      label: "เลื่อนนัด",
      icon: <Calendar className="w-4 h-4" />,
      activeBg: "bg-amber-50",
      activeBorder: "border-amber-500",
      activeText: "text-amber-700",
      iconBg: "bg-amber-100",
    },
    {
      value: "cancelled",
      label: "ยกเลิกนัด",
      icon: <XCircle className="w-4 h-4" />,
      activeBg: "bg-red-50",
      activeBorder: "border-red-500",
      activeText: "text-red-700",
      iconBg: "bg-red-100",
    },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:w-full sm:mx-4 max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-xl overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#1479FF] shrink-0">
          <h2 className="text-base font-semibold text-white">อัปเดตสถานะ</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-6 sm:p-6 space-y-6 overscroll-contain">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              เลือกสถานะ
            </label>

            <div className="grid grid-cols-3 gap-3">
              {statusButtons.map((btn) => {
                const isActive = selectedStatus === btn.value;
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(btn.value);
                      setValidationError("");
                    }}
                    className={`
                      flex items-center gap-1.5 px-3 py-3 rounded-lg border transition-all text-sm font-medium
                      ${isActive
                        ? `${btn.activeBg} ${btn.activeBorder} ${btn.activeText}`
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedStatus === "arrived" && (
            <div className="space-y-6 pt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">ข้อมูลคนไข้</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเล่น</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="ชื่อเล่น"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">เงินมัดจำ</span>
                  </div>
                  <span className="text-lg font-bold text-blue-700">
                    {lead.deposit?.amount ? lead.deposit.amount.toLocaleString() : 0} บาท
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-700">
                ข้อมูลการทำหัตถการ
              </h3>

              {procedures.map((procedure, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200"
                >
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหัตถการ</label>
                      <input
                        type="text"
                        placeholder="ชื่อหัตถการ"
                        value={procedure.name}
                        onChange={(e) => updateProcedure(index, "name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
                      />
                    </div>

                    <div className="w-36">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={procedure.price ?? ""}
                        onChange={(e) => updateProcedure(index, "price", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-right"
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
                            className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-md text-right bg-white"
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${commissionEnabled ? "bg-[#1479FF]" : "bg-gray-200"
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
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setValidationError("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                >
                  <option value="">เลือกช่องทางชำระเงิน</option>
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
                      <span className="text-gray-600">เงินมัดจำ</span>
                      <span className={`font-medium ${(lead.deposit?.amount || 0) > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                        {(lead.deposit?.amount || 0).toLocaleString()} บาท
                      </span>
                    </div>

                    <div className="border-t border-slate-300 pt-3 mt-3">
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
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <ImageIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">ใบเสร็จ / หลักฐานการรับชำระ <span className="text-red-500">*</span></span>
                </div>

                {!receiptPreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูปใบเสร็จ</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG ไม่เกิน 5MB</p>
                    </div>
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                    />
                    {receiptUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    {!receiptUploading && (
                      <button
                        type="button"
                        onClick={removeReceipt}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">นัดหมายครั้งถัดไป</span>
                    <p className="text-xs text-gray-400 mt-0.5">สร้างข้อมูลใหม่สำหรับการนัดหมายครั้งถัดไป</p>
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${nextAppointmentEnabled ? "bg-[#1479FF]" : "bg-gray-200"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nextAppointmentEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                {nextAppointmentEnabled && (
                  <div className="space-y-4 pt-3 border-t border-gray-100">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่นัด</label>
                        <input
                          type="date"
                          value={nextAppointmentDate}
                          onChange={(e) => setNextAppointmentDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">เวลานัด</label>
                        <input
                          type="time"
                          value={nextAppointmentTime}
                          onChange={(e) => setNextAppointmentTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {nextAppointmentDate
                        ? `จะสร้างข้อมูลสถานะ "ทำนัด" ในเดือน ${new Date(nextAppointmentDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`
                        : 'ไม่ระบุวันนัดหมาย จะสร้างข้อมูลในสถานะ "รอตัดสินใจ" ของเดือนนี้'
                      }
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {selectedStatus === "rescheduled" && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    วันที่นัดใหม่
                  </label>
                  <input
                    id="new-date"
                    type="date"
                    value={newAppointmentDate || ''}
                    onChange={(e) => setNewAppointmentDate(e.target.value)}
                    className={`
                      block w-full px-4 py-3.5
                      border border-gray-300 rounded-lg
                      text-base
                      focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
                      min-h-[52px]
                      appearance-none
                    `}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="new-time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    เวลานัดใหม่
                  </label>
                  <input
                    id="new-time"
                    type="time"
                    value={newAppointmentTime || ''}
                    onChange={(e) => setNewAppointmentTime(e.target.value)}
                    className={`
                      block w-full px-4 py-3.5
                      border border-gray-300 rounded-lg
                      text-base
                      focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
                      min-h-[52px]
                      appearance-none
                    `}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 shrink-0">
          {validationError && (
            <p className="text-sm text-red-500 mb-3">* {validationError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedStatus || isSaving || receiptUploading}
              className="px-5 py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] disabled:bg-gray-300 transition-colors flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
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
    ? lead.interest.map((i) => `${i.name}`)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:w-full sm:mx-4 max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl">

        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1479FF]">
          <h2 className="text-base font-semibold text-white">รายละเอียด</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-8 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            {lead.status !== "pending" && lead.appointmentDateDisplay && !lead.appointmentDateDisplay.includes("1970") && (
              <span className="text-xs sm:text-sm text-gray-500">
                วันนัด: {lead.appointmentDateDisplay}
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
              <InfoItem label="ชื่อเล่น" value={lead.nickname || "-"} />
              <InfoItem label="เบอร์ติดต่อ" value={lead.phone} />
              <InfoItem label="Social Media" value={lead.socialMedia || "-"} />
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

                  {lead.receiptUrl && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-500 block mb-2">ใบเสร็จ / หลักฐานการรับชำระ</label>
                      <div
                        className="relative bg-white rounded-lg overflow-hidden border border-violet-200 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          const url = lead.receiptUrl?.startsWith('http')
                            ? lead.receiptUrl
                            : `${import.meta.env.VITE_API_URL || ''}${lead.receiptUrl}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <img
                          src={lead.receiptUrl.startsWith('http')
                            ? lead.receiptUrl
                            : `${import.meta.env.VITE_API_URL || ''}${lead.receiptUrl}`}
                          alt="ใบเสร็จ"
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
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-50">
          <p className="text-xs text-gray-400">
            สร้างเมื่อ: {lead.createdAtDisplay}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] transition-colors"
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