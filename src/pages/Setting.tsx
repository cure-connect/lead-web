import React, { useState, useEffect } from "react";
import {
  Users,
  Star,
  Store,
  Radio,
  Plus,
  Trash2,
  Pencil,
  Stethoscope,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/api/api";

interface Item {
  _id: string;
  name: string;
}

interface SectionData {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  type: string;
  items: Item[];
}

interface ProcedureConfig {
  enabled: boolean;
  allowCustom: boolean;
}

export default function SettingsPage() {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    admins: { title: "แอดมิน", type: "admin", icon: <Users className="w-5 h-5 text-indigo-600" />, iconBg: "bg-indigo-100", items: [] },
    interests: { title: "ความสนใจ", type: "interest", icon: <Star className="w-5 h-5 text-green-600" />, iconBg: "bg-green-100", items: [] },
    branches: { title: "สาขา", type: "branch", icon: <Store className="w-5 h-5 text-blue-600" />, iconBg: "bg-blue-100", items: [] },
    channels: { title: "ช่องทางที่รู้จัก", type: "channel", icon: <Radio className="w-5 h-5 text-purple-600" />, iconBg: "bg-purple-100", items: [] },
    procedures: { title: "ขั้นตอนการรักษา", type: "procedure", icon: <Stethoscope className="w-5 h-5 text-rose-600" />, iconBg: "bg-rose-100", items: [] },
  });

  const [procedureConfig, setProcedureConfig] = useState<ProcedureConfig>({
    enabled: false,
    allowCustom: true,
  });
  const [isTogglingProcedure, setIsTogglingProcedure] = useState(false);

  const [inputs, setInputs] = useState<Record<string, { name: string }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editOpen_error, setEditOpenError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/setting/gettype");
        console.log("fetchData", res);
        setSections(prev => ({
          ...prev,
          admins: { ...prev.admins, items: res.data.admins ?? [] },
          interests: { ...prev.interests, items: res.data.interests ?? [] },
          branches: { ...prev.branches, items: res.data.branches ?? [] },
          channels: { ...prev.channels, items: res.data.channels ?? [] },
          procedures: { ...prev.procedures, items: res.data.procedures ?? [] },
        }));

        // Set procedure config
        if (res.data.config?.procedure) {
          setProcedureConfig(res.data.config.procedure);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchData();
  }, []);

  const toggleProcedure = async () => {
    setIsTogglingProcedure(true);
    try {
      const newEnabled = !procedureConfig.enabled;
      const res = await api.patch("/setting/config/toggle", {
        feature: "procedure",
        enabled: newEnabled,
        allowCustom: procedureConfig.allowCustom,
      });

      if (res.data.success) {
        setProcedureConfig(prev => ({
          ...prev,
          enabled: newEnabled,
        }));
      }
    } catch (err) {
      console.error("Failed to toggle procedure", err);
    } finally {
      setIsTogglingProcedure(false);
    }
  };

  const toggleAllowCustom = async () => {
    try {
      const newAllowCustom = !procedureConfig.allowCustom;
      const res = await api.patch("/setting/config/toggle", {
        feature: "procedure",
        enabled: procedureConfig.enabled,
        allowCustom: newAllowCustom,
      });

      if (res.data.success) {
        setProcedureConfig(prev => ({
          ...prev,
          allowCustom: newAllowCustom,
        }));
      }
    } catch (err) {
      console.error("Failed to toggle allowCustom", err);
    }
  };

  const createItem = async (sectionKey: string) => {
    const inputData = inputs[sectionKey];
    const section = sections[sectionKey];

    if (!inputData?.name?.trim()) return;

    const trimmedName = inputData.name.trim().toLowerCase();
    const isDuplicate = section.items.some(
      item => item.name.toLowerCase() === trimmedName
    );
    if (isDuplicate) {
      setErrors(prev => ({ ...prev, [sectionKey]: `"${inputData.name.trim()}" มีอยู่ในระบบแล้ว` }));
      return;
    }

    const payload: Record<string, unknown> = {
      type: section.type,
      name: inputData.name.trim(),
    };

    try {
      const res = await api.post("/setting/createsetting", payload);

      setSections(prev => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          items: [...prev[sectionKey].items, res.data.data],
        },
      }));

      setInputs(prev => ({
        ...prev,
        [sectionKey]: { name: "" },
      }));
      setErrors(prev => ({ ...prev, [sectionKey]: "" }));
    } catch (err: any) {
      console.error("Failed to create", sectionKey, err);
      if (err.response?.status === 409) {
        setErrors(prev => ({ ...prev, [sectionKey]: err.response.data.message }));
      } else {
        setErrors(prev => ({ ...prev, [sectionKey]: "เกิดข้อผิดพลาด กรุณาลองใหม่" }));
      }
    }
  };

  const openEditModal = (sectionKey: string, item: Item) => {
    setCurrentSection(sectionKey);
    setCurrentItem(item);
    setEditValue(item.name);
    setEditOpen(true);
  };

  const confirmEdit = async () => {
    if (!currentSection || !currentItem) return;
    const section = sections[currentSection];

    const payload: Record<string, unknown> = {
      type: section.type,
      name: editValue.trim(),
    };

    try {
      await api.patch(`/setting/editsetting/${currentItem._id}`, payload);

      setSections(prev => ({
        ...prev,
        [currentSection]: {
          ...prev[currentSection],
          items: prev[currentSection].items.map(i =>
            i._id === currentItem._id
              ? {
                ...i,
                name: editValue,
              }
              : i
          ),
        },
      }));

      setEditOpen(false);
      setEditOpenError("");
    } catch (err: any) {
      console.error("Failed to edit", currentSection, err);
      if (err.response?.status === 409) {
        setEditOpenError(err.response.data.message);
      } else {
        setEditOpenError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    }
  };

  const openDeleteModal = (sectionKey: string, item: Item) => {
    setCurrentSection(sectionKey);
    setCurrentItem(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentSection || !currentItem) return;

    try {
      await api.delete(`/setting/deletesetting/${currentItem._id}`);

      setSections(prev => ({
        ...prev,
        [currentSection]: {
          ...prev[currentSection],
          items: prev[currentSection].items.filter(
            i => i._id !== currentItem._id
          ),
        },
      }));

      setDeleteOpen(false);
    } catch (err) {
      console.error("Failed to delete", currentSection, err);
    }
  };

  // แยก sections ปกติกับ procedure
  const normalSections = Object.entries(sections).filter(([key]) => key !== "procedures");
  const procedureSection = sections.procedures;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Normal Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {normalSections.map(([key, section]) => (
            <div key={key} className="bg-white shadow rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`${section.iconBg} p-3 rounded-full`}>{section.icon}</div>
                <div>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.items.length} รายการ</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-1">
                <input
                  value={inputs[key]?.name || ""}
                  onChange={e => {
                    setInputs(prev => ({ ...prev, [key]: { name: e.target.value } }));
                    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
                  }}
                  placeholder={`เพิ่ม${section.title}`}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors[key] ? "border-red-400" : "border-gray-200"}`}
                />
                <button
                  onClick={() => createItem(key)}
                  disabled={!inputs[key]?.name?.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex justify-center items-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {errors[key] && (
                <p className="text-xs text-red-500 mb-3 px-1">* {errors[key]}</p>
              )}

              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item._id} className="flex justify-between items-center px-3 py-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100">
                    <span>{item.name}</span>
                    <div className="flex gap-3">
                      <button onClick={() => openEditModal(key, item)} className="text-gray-400 hover:text-indigo-600">
                        <Pencil className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => openDeleteModal(key, item)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Procedure Section with Toggle */}
        <div className="bg-white shadow rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={`${procedureSection.iconBg} p-3 rounded-full`}>
                {procedureSection.icon}
              </div>
              <div>
                <h2 className="font-semibold">{procedureSection.title}</h2>
                <p className="text-sm text-gray-500">
                  {procedureConfig.enabled
                    ? `${procedureSection.items.length} รายการ`
                    : "ปิด"}
                </p>
              </div>
            </div>

            {/* Toggle Button — Dashboard style */}
            <button
              onClick={toggleProcedure}
              disabled={isTogglingProcedure}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                procedureConfig.enabled
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {procedureConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {procedureConfig.enabled ? "เปิด" : "ปิด"}
            </button>
          </div>

          {procedureConfig.enabled && (
            <>
              {/* Allow Custom Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">อนุญาตให้เขียนเอง</p>
                  <p className="text-xs text-gray-500">เปิดให้พิมพ์ขั้นตอนที่ไม่อยู่ในรายการได้</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={procedureConfig.allowCustom}
                  onClick={toggleAllowCustom}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1479FF] focus:ring-offset-2 ${
                    procedureConfig.allowCustom ? 'bg-[#1479FF]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      procedureConfig.allowCustom ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Add Input */}
              <div className="flex flex-col sm:flex-row gap-2 mb-1">
                <input
                  value={inputs.procedures?.name || ""}
                  onChange={e => {
                    setInputs(prev => ({ ...prev, procedures: { name: e.target.value } }));
                    if (errors.procedures) setErrors(prev => ({ ...prev, procedures: "" }));
                  }}
                  placeholder="เพิ่มขั้นตอนการรักษา"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none ${errors.procedures ? "border-red-400" : "border-gray-200"}`}
                />
                <button
                  onClick={() => createItem("procedures")}
                  disabled={!inputs.procedures?.name?.trim()}
                  className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex justify-center items-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {errors.procedures && (
                <p className="text-xs text-red-500 mb-3 px-1">* {errors.procedures}</p>
              )}

              {/* Items List */}
              <div className="space-y-2">
                {procedureSection.items.map(item => (
                  <div key={item._id} className="flex justify-between items-center px-3 py-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100">
                    <span>{item.name}</span>
                    <div className="flex gap-3">
                      <button onClick={() => openEditModal("procedures", item)} className="text-gray-400 hover:text-rose-600">
                        <Pencil className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => openDeleteModal("procedures", item)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {procedureSection.items.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    ยังไม่มีขั้นตอนการรักษา
                  </p>
                )}
              </div>
            </>
          )}

          {!procedureConfig.enabled && (
            <div className="text-center py-8 text-gray-400">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">เปิดใช้งานเพื่อเพิ่มขั้นตอนการรักษา</p>
              <p className="text-xs mt-1">จะแสดงเป็น dropdown ในฟอร์มนัดหมาย</p>
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <Modal title="แก้ไขรายการ" onClose={() => { setEditOpen(false); setEditOpenError(""); }} onConfirm={confirmEdit}>
          <input
            value={editValue}
            onChange={e => { setEditValue(e.target.value); setEditOpenError(""); }}
            className={`w-full px-3 py-2 mb-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${editOpen_error ? "border-red-400" : ""}`}
            placeholder="ชื่อ"
          />
          {editOpen_error && (
            <p className="text-xs text-red-500 mt-2">* {editOpen_error}</p>
          )}
        </Modal>
      )}

      {deleteOpen && (
        <Modal title="ยืนยันการลบ" danger onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete}>
          ต้องการลบ <b>{currentItem?.name}</b> ใช่หรือไม่?
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, onConfirm, danger }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; danger?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[90%] sm:max-w-sm p-4 sm:p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="mb-6 text-sm text-gray-700">{children}</div>
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm w-full sm:w-auto">
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white w-full sm:w-auto ${danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}