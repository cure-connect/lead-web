import React, { useState, useEffect, useRef } from 'react';
import { type Lead } from '../../types/index';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import api from "@/api/api";

interface LeadFormProps {
  lead: Lead | null;
  onSave: (lead: Lead) => void;
  onClose: () => void;
}

type InterestFormValue = {
  name: string;
  price: string;
};

type LeadFormState = {
  name: string;
  phone: string;
  interest: InterestFormValue;
  referralChannel: string;
  lineId: string;
  admin: string;
  branch: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string;
  note: string;
};

const extractDateFromISO = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractTimeFromISO = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const steps = [
  { label: 'ข้อมูลลูกค้า' },
  { label: 'รายละเอียดนัดหมาย' },
];

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onClose }) => {

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{ _id: string, name: string }[]>([]);
  const [formData, setFormData] = useState<LeadFormState>({
    name: lead?.name || '',
    phone: lead?.phone || '',
    interest: {
      name: lead?.interest?.[0]?.name || '',
      price: String(lead?.interest?.[0]?.price) || '0',
    },
    referralChannel: lead?.referralChannel || '',
    lineId: lead?.lineId || '',
    admin: lead?.admin || '',
    branch: lead?.branch || '',
    status: lead?.status === 'scheduled' || lead?.status === 'rescheduled' ? 'ทำนัด' : 'pending',
    appointmentDate: extractDateFromISO(lead?.appointmentDate),
    appointmentTime: extractTimeFromISO(lead?.appointmentDate),
    note: lead?.note || '',
  });

  // ---- Deposit State ----
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branches.length > 0 && !lead?.branch) {
      setFormData(prev => ({ ...prev, branch: branches[0].name }));
    }
  }, [branches, lead]);

  const [interests, setInterests] = useState<{ _id: string, name: string, price: string }[]>([]);
  const [channels, setChannels] = useState<{ _id: string, name: string }[]>([]);
  const [admins, setAdmins] = useState<{ _id: string, name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/setting/gettype");
        setInterests(res.data.interests ?? []);
        setChannels(res.data.channels ?? []);
        setAdmins(res.data.admins ?? []);
        setBranches(res.data.branches ?? []);
      } catch (err) {
        console.error("Failed to load dropdown data", err);
      }
    };
    fetchData();
  }, []);

  const validateStep1 = () => {
    if (!formData.name.trim()) return "กรุณากรอกชื่อนามสกุล";
    if (!formData.phone.trim()) return "กรุณากรอกเบอร์ติดต่อ";
    if (!formData.interest) return "กรุณาเลือกความสนใจ";
    if (!formData.referralChannel) return "กรุณาเลือกช่องทางที่รู้จักคลินิก";
    if (!formData.admin) return "กรุณาเลือกแอดมิน";
    if (!formData.branch || formData.branch === "0") return "กรุณาเลือกสาขา";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (depositEnabled) {
      if (!depositAmount.trim() || Number(depositAmount) <= 0) {
        return "กรุณากรอกจำนวนเงินมัดจำ";
      }
      if (!slipUrl) {
        return "กรุณาอัปโหลดรูปสลิปการโอนเงิน";
      }
    }
    return null;
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      setDepositError('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDepositError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);

    setSlipUploading(true);
    setDepositError('');

    try {
      const formData = new FormData();
      formData.append('slip', file);

      const res = await api.post('/upload/slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSlipUrl(res.data.data.url);
    } catch (err: any) {
      console.error('Upload slip failed', err);
      setDepositError('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่');
      setSlipPreview(null);
    } finally {
      setSlipUploading(false);
    }
  };

  const removeSlip = () => {
    setSlipUrl(null);
    setSlipPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDepositToggle = () => {
    const next = !depositEnabled;
    setDepositEnabled(next);
    if (!next) {
      setDepositAmount('');
      removeSlip();
      setDepositError('');
    }
  };

  const handleSubmit = () => {
    const error = validateStep2();
    if (error) {
      setDepositError(error);
      return;
    }

    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const createdAt = lead?.createdAt || `${buddhistYear}-${month}-${day}`;

    const backendStatus =
      formData.status === 'ทำนัด' || formData.status === 'scheduled'
        ? 'scheduled'
        : 'pending';

    const leadData: any = {
      ...(lead || {}),
      ...formData,
      id: lead?.id || '',
      status: backendStatus,
      appointmentDate: backendStatus === 'scheduled' ? formData.appointmentDate : undefined,
      appointmentTime: backendStatus === 'scheduled' ? formData.appointmentTime : undefined,
      createdAt,
    };

    if (depositEnabled && slipUrl) {
      leadData.deposit = {
        amount: Number(depositAmount),
        slipUrl: slipUrl,
      };
    }

    onSave(leadData as Lead);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 relative">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center relative">
            {i !== 0 && (
              <div className="absolute top-1/2 left-0 h-1 bg-gray-200 -z-10" style={{ marginLeft: '-50%', width: '100%' }} />
            )}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
              ${step > i ? 'bg-indigo-600' : step === i + 1 ? 'bg-indigo-500' : 'bg-gray-300'}`}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">ความสนใจ(หัตถการ) *</label>
              <select
                value={formData.interest.name}
                onChange={(e) => {
                  const selected = interests.find(i => i.name === e.target.value);
                  if (!selected) return;
                  setFormData({
                    ...formData,
                    interest: { name: selected.name, price: selected.price }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">เลือกความสนใจ</option>
                {interests.map(i => (
                  <option key={i._id} value={i.name}>{i.name}</option>
                ))}
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
                {channels.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
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
                {admins.map(a => <option key={a._id} value={a.name}>{a.name}</option>)}
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
              {branches.length === 0 && <option value="0" disabled>เลือกสาขา</option>}
              {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
            <button
              onClick={() => {
                const error = validateStep1();
                if (error) { alert(error); return; }
                setStep(2);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >ถัดไป</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <select
              value={formData.status}
              onChange={(e) => {
                const newStatus = e.target.value;
                setFormData({
                  ...formData,
                  status: newStatus,
                  appointmentDate: newStatus === 'รอตัดสินใจ' ? '' : formData.appointmentDate,
                  appointmentTime: newStatus === 'รอตัดสินใจ' ? '' : formData.appointmentTime
                });
              }}
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

          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">มัดจำ</span>
                <p className="text-xs text-gray-400 mt-0.5">เปิดเพื่อบันทึกข้อมูลการมัดจำ</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={depositEnabled}
                onClick={handleDepositToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${depositEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${depositEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {depositEnabled && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนเงินมัดจำ (บาท) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''));
                        if (depositError) setDepositError('');
                      }}
                      className={`w-full px-3 py-2 pr-12 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${depositError && (!depositAmount.trim() || Number(depositAmount) <= 0)
                        ? 'border-red-400' : 'border-gray-300'
                        }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      บาท
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สลิปการโอนเงิน *
                  </label>

                  {!slipPreview ? (
                    <label
                      className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${depositError && !slipUrl
                        ? 'border-red-400 bg-red-50 hover:bg-red-100'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className={`w-8 h-8 mb-2 ${depositError && !slipUrl ? 'text-red-400' : 'text-gray-400'}`} />
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-indigo-600">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง
                        </p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (สูงสุด 5MB)</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        onChange={handleSlipUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative group">
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={slipPreview}
                          alt="สลิปการโอน"
                          className="w-full h-full object-contain"
                        />

                        {slipUploading && (
                          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-sm text-gray-600 mt-2">กำลังอัปโหลด...</span>
                          </div>
                        )}

                        {!slipUploading && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <button
                              type="button"
                              onClick={removeSlip}
                              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 px-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <ImageIcon className="w-4 h-4" />
                          {slipUploading ? (
                            <span className="text-indigo-600">กำลังอัปโหลด...</span>
                          ) : slipUrl ? (
                            <span className="text-green-600">อัปโหลดสำเร็จ ✓</span>
                          ) : null}
                        </div>
                        {!slipUploading && (
                          <button
                            type="button"
                            onClick={removeSlip}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {depositError && (
              <p className="text-xs text-red-500 px-1">* {depositError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียดเพิ่มเติม</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-between gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ย้อนกลับ</button>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
              <button
                onClick={handleSubmit}
                disabled={slipUploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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