/* --- CODE BELOW IS RESPONSIVE VERSION --- */

import React, { useState, useMemo } from "react";
import { Plus, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Clinic {
  id: string;
  nameTh: string;
  nameEn: string;
  address: string;
  phone: string;
  avatar: string | null;
  expireDate: Array<string>;
}

export default function AdminManagement() {
  const navigate = useNavigate();

  const [clinics, setClinics] = useState<Clinic[]>(
    Array.from({ length: 3 }).map((_, i) => ({
      id: (i + 1).toString(),
      nameTh: `คลินิกทำฟัน ${i + 1}`,
      nameEn: `Dental Clinic ${i + 1}`,
      address: ["กรุงเทพฯ", "เชียงใหม่", "ขอนแก่น", "ชลบุรี", "ภูเก็ต"][i % 5],
      phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
      avatar: null,
      expireDate: [
        "การรักษาคิ้วหน้า",
        "การฉีดโบท็อกซ์",
        "การดูดไขมัน",
        "การเสริมจมูก",
        "การตรวจสุขภาพ",
      ],
    }))
  );

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [newClinic, setNewClinic] = useState({
    nameTh: "",
    nameEn: "",
    expireDate: "",
    avatar: null as string | null,
  });

  const filteredClinics = useMemo(() => {
    return clinics.filter(
      (c) =>
        c.nameTh.toLowerCase().includes(search.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, clinics]);

  const totalPages = Math.ceil(filteredClinics.length / pageSize);
  const paginatedClinics = filteredClinics.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewClinic((prev) => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClinic = () => {
    const newItem: Clinic = {
      id: (clinics.length + 1).toString(),
      nameTh: newClinic.nameTh,
      nameEn: newClinic.nameEn,
      address: "ยังไม่ระบุ",
      phone: "ยังไม่ระบุ",
      avatar: newClinic.avatar,
      expireDate: [
        "การรักษาคิ้วหน้า",
        "การฉีดโบท็อกซ์",
        "การดูดไขมัน",
        "การเสริมจมูก",
        "การตรวจสุขภาพ",
      ],
    };

    setClinics([newItem, ...clinics]);
    setShowModal(false);

    setNewClinic({
      nameTh: "",
      nameEn: "",
      expireDate: "",
      avatar: null,
    });

    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Admin Management
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              จัดการรายชื่อคลีนิคภายในระบบ
            </p>
          </div>

          {/* SEARCH + ADD BUTTON */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาคลีนิค..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-xl shadow-sm"
              />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              เพิ่มคลีนิค
            </button>
          </div>
        </div>

        {/* GRID — RESPONSIVE */}
        <div
          className="
            grid 
            grid-cols-1 
            sm:grid-cols-2 
            md:grid-cols-3 
            lg:grid-cols-4 
            xl:grid-cols-5 
            gap-6
          "
        >
          {paginatedClinics.map((clinic) => (
            <div
              key={clinic.id}
              className="cursor-pointer bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
              onClick={() => navigate(`/adminmanagement/${clinic.id}`)}
            >
              {clinic.avatar ? (
                <img
                  src={clinic.avatar}
                  alt=""
                  className="w-full h-32 md:h-36 object-cover rounded-xl mb-3"
                />
              ) : (
                <div className="w-full h-32 md:h-36 bg-gray-200 rounded-xl mb-3" />
              )}

              <h2 className="text-lg font-semibold">{clinic.nameTh}</h2>
              <p className="text-gray-500">{clinic.nameEn}</p>

              <p className="text-gray-600 text-sm mt-2">
                หัตถการ: {clinic.expireDate.join(", ")}
              </p>
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center items-center gap-4 mt-10 text-sm md:text-base">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            ก่อนหน้า
          </button>

          <span>
            หน้า {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* MODAL — MOBILE RESPONSIVE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute right-4 top-4"
              onClick={() => setShowModal(false)}
            >
              <X className="text-gray-500" />
            </button>

            <h2 className="text-2xl font-bold mb-5">เพิ่มคลีนิค</h2>

            {/* Image */}
            <label className="block mb-4">
              <span className="font-medium">รูปโปร</span>
              <input type="file" onChange={handleImageUpload} className="mt-1" />
              {newClinic.avatar && (
                <img
                  src={newClinic.avatar}
                  className="w-32 h-32 object-cover rounded-xl mt-3"
                />
              )}
            </label>

            {/* Name TH */}
            <label className="block mb-4">
              <span className="font-medium">ชื่อ (ไทย)</span>
              <input
                type="text"
                className="w-full border mt-1 rounded-lg px-3 py-2"
                value={newClinic.nameTh}
                onChange={(e) =>
                  setNewClinic({ ...newClinic, nameTh: e.target.value })
                }
              />
            </label>

            {/* Name EN */}
            <label className="block mb-4">
              <span className="font-medium">ชื่อ (อังกฤษ)</span>
              <input
                type="text"
                className="w-full border mt-1 rounded-lg px-3 py-2"
                value={newClinic.nameEn}
                onChange={(e) =>
                  setNewClinic({ ...newClinic, nameEn: e.target.value })
                }
              />
            </label>

            {/* Date */}
            <label className="block mb-4">
              <span className="font-medium">วันที่หมดอายุ</span>
              <input
                type="date"
                className="w-full border mt-1 rounded-lg px-3 py-2"
                value={newClinic.expireDate}
                onChange={(e) =>
                  setNewClinic({ ...newClinic, expireDate: e.target.value })
                }
              />
            </label>

            <button
              onClick={handleSaveClinic}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl mt-4"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
