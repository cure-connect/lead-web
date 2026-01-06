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

interface Item {
  id: number;
  name: string;
}

interface SectionData {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  items: Item[];
}

const BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const API_MAP = {
  admins: {
    type: "admin",
    get: "/setting/getadmin",
    edit: (id: number) => `/setting/editadmin/${id}`,
    delete: (id: number) => `/setting/deleteadmin/${id}`
  },
  interests: {
    type: "interest",
    get: "/setting/getinterest",
    edit: (id: number) => `/setting/editinterest/${id}`,
    delete: (id: number) => `/setting/deleteinterest/${id}`
  },
  branches: {
    type: "branch",
    get: "/setting/getbranch",
    edit: (id: number) => `/setting/editbranch/${id}`,
    delete: (id: number) => `/setting/deletebranch/${id}`
  },
  channels: {
    type: "channel",
    get: "/setting/getchannel",
    edit: (id: number) => `/setting/editchannel/${id}`,
    delete: (id: number) => `/setting/deletechannel/${id}`
  }
};

export default function SettingsPage() {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    admins: { title: "แอดมิน", icon: <Users className="w-5 h-5 text-indigo-600" />, iconBg: "bg-indigo-100", items: [] },
    interests: { title: "หัตถการ", icon: <Star className="w-5 h-5 text-green-600" />, iconBg: "bg-green-100", items: [] },
    branches: { title: "สาขา", icon: <Store className="w-5 h-5 text-blue-600" />, iconBg: "bg-blue-100", items: [] },
    channels: { title: "ช่องทางที่รู้จัก", icon: <Radio className="w-5 h-5 text-purple-600" />, iconBg: "bg-purple-100", items: [] }
  });

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    Object.entries(API_MAP).forEach(async ([key, api]) => {
      try {
        const res = await fetch(`${BASE_URL}${api.get}`, {
          headers: { "x-api-key": API_KEY }
        });
        const json = await res.json();
        setSections(prev => ({
          ...prev,
          [key]: { ...prev[key], items: json.data ?? json }
        }));
      } catch (err) {
        console.error("Failed to load", key, err);
      }
    });
  }, []);

  const openCreateModal = (sectionKey: string) => {
    if (!inputs[sectionKey]?.trim()) return;
    setCurrentSection(sectionKey);
    setCreateOpen(true);
  };

  const confirmCreate = async () => {
    if (!currentSection) return;
    const api = API_MAP[currentSection as keyof typeof API_MAP];

    try {
      const res = await fetch(`${BASE_URL}/setting/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ type: api.type, name: inputs[currentSection] })
      });
      const json = await res.json();

      setSections(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], items: [...prev[currentSection].items, json.data] }
      }));

      setInputs(prev => ({ ...prev, [currentSection]: "" }));
      setCreateOpen(false);
    } catch (err) {
      console.error("Failed to create", currentSection, err);
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
    const api = API_MAP[currentSection as keyof typeof API_MAP];

    try {
      await fetch(`${BASE_URL}${api.edit(currentItem.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ name: editValue })
      });

      setSections(prev => ({
        ...prev,
        [currentSection]: {
          ...prev[currentSection],
          items: prev[currentSection].items.map(i =>
            i.id === currentItem.id ? { ...i, name: editValue } : i
          )
        }
      }));

      setEditOpen(false);
    } catch (err) {
      console.error("Failed to edit", currentSection, err);
    }
  };

  const openDeleteModal = (sectionKey: string, item: Item) => {
    setCurrentSection(sectionKey);
    setCurrentItem(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentSection || !currentItem) return;
    const api = API_MAP[currentSection as keyof typeof API_MAP];

    try {
      await fetch(`${BASE_URL}${api.delete(currentItem.id)}`, {
        method: "DELETE",
        headers: { "x-api-key": API_KEY }
      });
      setSections(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], items: prev[currentSection].items.filter(i => i.id !== currentItem.id) }
      }));
      setDeleteOpen(false);
    } catch (err) {
      console.error("Failed to delete", currentSection, err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-6">ตั้งค่าระบบ</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} className="bg-white border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`${section.iconBg} p-3 rounded-full`}>{section.icon}</div>
                <div>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.items.length} รายการ</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  value={inputs[key] || ""}
                  onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`เพิ่ม${section.title}`}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => openCreateModal(key)}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full sm:w-auto flex justify-center items-center"
                >
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center px-3 py-3 border rounded-lg text-sm hover:bg-gray-50">
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
      </div>

      {createOpen && (
        <Modal title="ยืนยันการสร้าง" onClose={() => setCreateOpen(false)} onConfirm={confirmCreate}>
          ต้องการเพิ่ม <b>{inputs[currentSection!]}</b> ใช่หรือไม่?
        </Modal>
      )}

      {editOpen && (
        <Modal title="แก้ไขชื่อ" onClose={() => setEditOpen(false)} onConfirm={confirmEdit}>
          <input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
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

// ---------- Modal Component ----------
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
            className={`px-4 py-2 rounded-lg text-sm text-white w-full sm:w-auto ${danger ? "bg-red-600" : "bg-indigo-600"}`}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
