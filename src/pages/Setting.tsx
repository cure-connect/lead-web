import React, { useState, useEffect } from "react";
import {
  Users,
  Star,
  Store,
  Radio,
  Plus,
  Trash2,
  Pencil
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

export default function SettingsPage() {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    admins: { title: "แอดมิน", type: "admin", icon: <Users className="w-5 h-5 text-indigo-600" />, iconBg: "bg-indigo-100", items: [] },
    interests: { title: "หัตถการ", type: "interest", icon: <Star className="w-5 h-5 text-green-600" />, iconBg: "bg-green-100", items: [] },
    branches: { title: "สาขา", type: "branch", icon: <Store className="w-5 h-5 text-blue-600" />, iconBg: "bg-blue-100", items: [] },
    channels: { title: "ช่องทางที่รู้จัก", type: "channel", icon: <Radio className="w-5 h-5 text-purple-600" />, iconBg: "bg-purple-100", items: [] }
  });

  const [inputs, setInputs] = useState<Record<string, { name: string; }>>({});
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
        console.log("fetchData", res)
        setSections(prev => ({
          ...prev,
          admins: { ...prev.admins, items: res.data.admins ?? [] },
          interests: { ...prev.interests, items: res.data.interests ?? [] },
          branches: { ...prev.branches, items: res.data.branches ?? [] },
          channels: { ...prev.channels, items: res.data.channels ?? [] },
        }));
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchData();
  }, []);


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


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} className="bg-white shadow rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`${section.iconBg} p-3 rounded-full`}>{section.icon}</div>
                <div>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.items.length} รายการ</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-1">
                {key === "interests" ? (
                  <>
                    <input
                      value={inputs[key]?.name || ""}
                      onChange={e => {
                        setInputs(prev => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }));
                        if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
                      }}
                      placeholder="ชื่อหัตถการ"
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors[key] ? "border-red-400" : "border-gray-200"}`}
                    />
                    <button
                      onClick={() => createItem(key)}
                      disabled={!inputs[key]?.name?.trim()}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex justify-center items-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {errors[key] && (
                <p className="text-xs text-red-500 mb-3 px-1">* {errors[key]}</p>
              )}

              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item._id} className="flex justify-between items-center px-3 py-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100">
                    <span>
                      {item.name}
                    </span>
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