import React, { useState } from "react";
import { Users, Star, Store, Radio, Plus, Trash2, ChevronDown } from "lucide-react";

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

export default function SettingsPage() {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    admins: {
      title: "แอดมิน",
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      iconBg: "bg-indigo-100",
      items: [
        { id: 1, name: "หมอ A" },
        { id: 2, name: "หมอ B" },
        { id: 3, name: "หมอ C" }
      ]
    },
    interests: {
      title: "ความสนใจ (หัตถกรรม)",
      icon: <Star className="w-5 h-5 text-green-600" />,
      iconBg: "bg-green-100",
      items: [
        { id: 1, name: "การรักษาคิ้วหน้า" },
        { id: 2, name: "การฉีดโบท็อกซ์" },
        { id: 3, name: "การดูดไขมัน" },
        { id: 4, name: "การเสริมจมูก" },
        { id: 5, name: "การตรวจสุขภาพ" }
      ]
    },
    branches: {
      title: "สาขา",
      icon: <Store className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-100",
      items: [
        { id: 1, name: "สาขาหลัก" },
        { id: 2, name: "สาขา 2" },
        { id: 3, name: "สาขา 3" }
      ]
    },
    channels: {
      title: "ช่องทางที่รู้จักคลินิก",
      icon: <Radio className="w-5 h-5 text-purple-600" />,
      iconBg: "bg-purple-100",
      items: [
        { id: 1, name: "Facebook" },
        { id: 2, name: "Instagram" },
        { id: 3, name: "Google" },
        { id: 4, name: "Line" },
        { id: 5, name: "เพื่อนแนะนำ" }
      ]
    }
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  const addItem = (sectionKey: string) => {
    const input = newItemInputs[sectionKey]?.trim();
    if (!input) return;

    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: [
          ...prev[sectionKey].items,
          { id: Date.now(), name: input }
        ]
      }
    }));

    setNewItemInputs(prev => ({ ...prev, [sectionKey]: "" }));
  };

  const removeItem = (sectionKey: string, itemId: number) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: prev[sectionKey].items.filter(item => item.id !== itemId)
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
            <p className="text-gray-600 mt-1">จัดการตัวเลือกต่างๆ ที่แสดงใน dropdown</p>
          </div>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            บันทึกการตั้งค่า
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              {/* Header */}
              <button
                onClick={() => setOpenDropdown(prev => (prev === key ? null : key))}
                className="w-full p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`${section.iconBg} p-3 rounded-full flex-shrink-0`}>
                  {section.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {section.items.length} รายการ
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    openDropdown === key ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Content */}
              {openDropdown === key && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {/* Add New Item */}
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder={`เพิ่ม${section.title}ใหม่`}
                      value={newItemInputs[key] || ""}
                      onChange={(e) => setNewItemInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      onKeyPress={(e) => e.key === "Enter" && addItem(key)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => addItem(key)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      เพิ่ม
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                      >
                        <span className="text-gray-900">{item.name}</span>
                        <button
                          onClick={() => removeItem(key, item.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {section.items.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        ยังไม่มีรายการ
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}