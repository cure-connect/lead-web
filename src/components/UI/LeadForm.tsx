import React, { useState } from 'react';
import { type Lead } from '../../types/index';

interface LeadFormProps {
  lead: Lead | null;
  onSave: (lead: Lead) => void;
  onClose: () => void;
}

const steps = [
  { label: 'ข้อมูลลูกค้า' },
  { label: 'รายละเอียดนัดหมาย' },
];

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    interest: lead?.interest || '',
    referralChannel: lead?.referralChannel || '',
    lineId: lead?.lineId || '',
    admin: lead?.admin || '',
    branch: lead?.branch || '',
    status: lead?.status || 'รอตัดสินใจ',
    appointmentDate: lead?.appointmentDate || '',
    appointmentTime: lead?.appointmentTime || '',
    notes: lead?.note || ''
  });

  const handleSubmit = () => {
    const now = new Date();
    const gregorianYear = now.getFullYear();
    const buddhistYear = gregorianYear + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const createdAt = lead?.createdAt || `${buddhistYear}-${month}-${day}`;
    const backendStatus =
      formData.status === 'ทำนัด' ? 'Scheduled' : 'Pending';

    onSave({
      ...(lead || {}),
      ...formData,
      id: lead?.id || Date.now().toString(),
      status: backendStatus,
      appointmentDate:
        backendStatus === 'Scheduled' ? formData.appointmentDate : undefined,
      appointmentTime:
        backendStatus === 'Scheduled' ? formData.appointmentTime : undefined,
      createdAt
    } as Lead);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 relative">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center relative">
            {i !== 0 && (
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10" style={{ marginLeft: '-50%', width: '100%' }} />
            )}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
                ${step > i ? 'bg-indigo-600' : step === i + 1 ? 'bg-indigo-500' : 'bg-gray-300'}
              `}
            >
              {i + 1}
            </div>
            <div className="text-xs mt-2 text-center">{s.label}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อนามสกุล *</label>
              <input
                type="text"
                value={`${formData.name}`}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์ติดต่อ *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ความสนใจ(หัตถกรรม) *</label>
              <select
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">เลือกความสนใจ</option>
                <option value="การรักษาคิ้วหน้า">การรักษาคิ้วหน้า</option>
                <option value="การฉีดโบท็อกซ์">การฉีดโบท็อกซ์</option>
                <option value="การดูดไขมัน">การดูดไขมัน</option>
                <option value="การเสริมจมูก">การเสริมจมูก</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ช่องทางที่รู้จักคลินิก *</label>
              <select
                value={formData.referralChannel}
                onChange={(e) => setFormData({ ...formData, referralChannel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">เลือกช่องทาง</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Line">Line</option>
                <option value="Instagram">Instagram</option>
                <option value="เพื่อนแนะนำ">เพื่อนแนะนำ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Line ID</label>
              <input
                type="text"
                value={formData.lineId}
                onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">แอดมิน *</label>
              <select
                value={formData.admin}
                onChange={(e) => setFormData({ ...formData, admin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">เลือกแอดมิน</option>
                <option value="Admin 1">Admin 1</option>
                <option value="Admin 2">Admin 2</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สาขา *</label>
            <select
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">เลือกสาขา</option>
              <option value="สาขา 1">สาขา 1</option>
              <option value="สาขา 2">สาขา 2</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="รอตัดสินใจ">รอตัดสินใจ</option>
              <option value="ทำนัด">ทำนัด</option>
            </select>
          </div>

          {formData.status === 'ทำนัด' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">วันที่นัด</label>
                <input
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เวลานัด</label>
                <input
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text	sm font-medium text-gray-700 mb-2">รายละเอียดเพิ่มเติม</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-between gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadForm;
