import React, { useState, useEffect } from 'react';
import { type Lead } from '../../types/index';
import { Loader2 } from 'lucide-react';
import api from "@/api/api";
import MultiImageUpload from './MultiImageUpload';

interface LeadFormProps {
  lead: Lead | null;
  onSave: (lead: Lead) => Promise<void> | void;
  onClose: () => void;
}

type InterestFormValue = {
  name: string;
};

type LeadFormState = {
  patientId: string;
  name: string;
  nickname: string;
  phone: string;
  interest: InterestFormValue;
  referralChannel: string;
  socialMedia: string;
  admin: string;
  branch: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string;
  note: string;
};

const NO_PHONE_SENTINEL = "-";

const extractDateFromISO = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime()) || date.getFullYear() < 1971) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractTimeFromISO = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime()) || date.getFullYear() < 1971) return '';
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// ─── DatePickerInput ──────────────────────────────────────────────────────────
// Native input[type=date] ที่:
//   • บังคับ format DD/MM/YYYY ผ่าน lang="en-GB"  (ใช้ได้ทุก locale ของเครื่อง)
//   • ปีเป็น ค.ศ. เสมอ (ไม่ใช่ พ.ศ.)
//   • ห้ามพิมพ์ — keyboard ทุกปุ่มถูก block, เปิด calendar picker ได้อย่างเดียว
//   • value/onChange ยัง YYYY-MM-DD เหมือนเดิม → backend ไม่ต้องแก้
// ──────────────────────────────────────────────────────────────────────────────
interface DatePickerInputProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  className?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, className }) => {
  return (
    <input
      type="date"
      lang="en-GB"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.preventDefault()}
      onKeyPress={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      className={`block w-full px-4 py-3.5 border border-gray-300 rounded-lg text-base leading-tight
        focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
        min-h-[52px] appearance-none cursor-pointer ${className ?? ''}`}
    />
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const steps = [
  { label: 'ข้อมูลลูกค้า' },
  { label: 'รายละเอียดนัดหมาย' },
];

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onClose }) => {

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{ _id: string, name: string }[]>([]);
  const [formData, setFormData] = useState<LeadFormState>({
    patientId: lead?.patientId || '',
    name: lead?.name || '',
    nickname: lead?.nickname || '',
    phone: lead?.phone || '',
    interest: {
      name: lead?.interest?.[0]?.name || '',
    },
    referralChannel: lead?.referralChannel || '',
    socialMedia: lead?.socialMedia || '',
    admin: lead?.admin || '',
    branch: lead?.branch || '',
    status: lead?.status === 'scheduled' || lead?.status === 'rescheduled' ? 'ทำนัด' : 'รอตัดสินใจ',
    appointmentDate: extractDateFromISO(lead?.appointmentDate),
    appointmentTime: extractTimeFromISO(lead?.appointmentDate),
    note: lead?.note || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [slipUrls, setSlipUrls] = useState<string[]>([]);
  const [depositError, setDepositError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [phoneDuplicate, setPhoneDuplicate] = useState<{ fullname: string; nickname?: string } | null>(null);
  const [noPhone, setNoPhone] = useState(lead?.phone === NO_PHONE_SENTINEL);

  const checkPhoneDuplicate = async (phone: string) => {
    if (noPhone) { setPhoneDuplicate(null); return; }
    const normalized = phone.replace(/[-\s]/g, '');
    if (normalized.length < 9) { setPhoneDuplicate(null); return; }
    try {
      const patientId = (lead as any)?.patientId;
      const res = await api.get(`/patient/check-tel?tel=${normalized}${patientId ? `&excludeId=${patientId}` : ''}`);
      if (res.data?.exists) {
        setPhoneDuplicate(res.data.patient);
      } else {
        setPhoneDuplicate(null);
      }
    } catch { setPhoneDuplicate(null); }
  };

  // === Patient Autocomplete ===
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await api.get(`/patient/search?q=${encodeURIComponent(query)}&limit=5`);
      const data = res.data?.data || [];
      setPatientSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error("Patient search failed", err);
      setPatientSuggestions([]);
    }
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value, patientId: '' }));
    clearError('name');

    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => searchPatients(value), 300);
    setSearchTimeout(timeout);
  };

  const handleSelectPatient = (patient: any) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient._id,
      name: patient.fullname || prev.name,
      nickname: patient.nickname || prev.nickname,
      phone: patient.tel || prev.phone,
      socialMedia: patient.socialMedia || prev.socialMedia,
    }));
    setShowSuggestions(false);
    setPatientSuggestions([]);
    setPhoneDuplicate(null);
    setNoPhone(patient.tel === NO_PHONE_SENTINEL);
    clearError('name');
  };

  useEffect(() => {
    if (lead?.deposit?.amount && lead.deposit.amount > 0) {
      setDepositEnabled(true);
      setDepositAmount(String(lead.deposit.amount));
      if ((lead.deposit.slipUrls?.length ?? 0) > 0) {
        setSlipUrls(lead.deposit.slipUrls!);
      } else if (lead.deposit.slipUrl) {
        setSlipUrls([lead.deposit.slipUrl]);
      }
    } else {
      setDepositEnabled(false);
      setDepositAmount('');
      setSlipUrls([]);
    }
  }, [lead]);

  useEffect(() => {
    if (branches.length > 0 && !lead?.branch) {
      setFormData(prev => ({ ...prev, branch: branches[0].name }));
    }
  }, [branches, lead]);

  const [interests, setInterests] = useState<{ _id: string, name: string }[]>([]);
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

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[-\s]/g, '');
  };

  const validatePhone = (phone: string): string | null => {
    if (noPhone) return null;
    const normalized = normalizePhone(phone);

    if (!normalized) {
      return "กรุณากรอกเบอร์ติดต่อ";
    }

    if (!/^\d+$/.test(normalized)) {
      return "เบอร์โทรต้องเป็นตัวเลขเท่านั้น";
    }

    if (!normalized.startsWith('0')) {
      return "เบอร์โทรต้องขึ้นต้นด้วย 0";
    }

    if (normalized.length < 9 || normalized.length > 10) {
      return "เบอร์โทรต้องมี 9-10 หลัก";
    }

    return null;
  };

  const validateStep1 = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "กรุณากรอกชื่อนามสกุล";

    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    if (!formData.interest.name) newErrors.interest = "กรุณาเลือกความสนใจ";
    if (!formData.referralChannel) newErrors.referralChannel = "กรุณาเลือกช่องทางที่รู้จักคลินิก";
    if (!formData.admin) newErrors.admin = "กรุณาเลือกแอดมิน";
    if (!formData.branch || formData.branch === "0") newErrors.branch = "กรุณาเลือกสาขา";

    return newErrors;
  };

  const handleNextStep = () => {
    const newErrors = validateStep1();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setStep(2);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.status === 'ทำนัด') {
      if (!formData.appointmentDate) newErrors.appointmentDate = "กรุณาเลือกวันที่นัด";
      if (!formData.appointmentTime) newErrors.appointmentTime = "กรุณาเลือกเวลานัด";
    }

    if (depositEnabled) {
      if (!depositAmount.trim() || Number(depositAmount) <= 0) {
        setDepositError("กรุณากรอกจำนวนเงินมัดจำ");
        setErrors(newErrors);
        return false;
      }
      if (slipUrls.length === 0) {
        setDepositError("กรุณาอัปโหลดรูปสลิปการโอนเงิน");
        setErrors(newErrors);
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDepositToggle = () => {
    const next = !depositEnabled;
    setDepositEnabled(next);
    if (!next) {
      setDepositAmount('');
      setSlipUrls([]);
      setDepositError('');
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    const isValid = validateStep2();
    if (!isValid) return;

    setIsSaving(true);

    try {
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
        patientId: formData.patientId || undefined,
        // phone: normalizePhone(formData.phone),
        phone: noPhone ? NO_PHONE_SENTINEL : normalizePhone(formData.phone),
        id: lead?.id || '',
        status: backendStatus,
        appointmentDate: backendStatus === 'scheduled' ? formData.appointmentDate : undefined,
        appointmentTime: backendStatus === 'scheduled' ? formData.appointmentTime : undefined,
        createdAt,
      };

      if (depositEnabled && slipUrls.length > 0) {
        leadData.deposit = {
          amount: Number(depositAmount),
          slipUrls: slipUrls,
        };
      } else if (lead?.deposit && !depositEnabled) {
        leadData.deposit = null;
      }

      await onSave(leadData as Lead);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-4">
      <div className="flex justify-between items-center mb-6 sm:mb-8 relative px-4 sm:px-0">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center relative">
            {i !== 0 && (
              <div className="absolute top-4 sm:top-5 left-0 h-0.5 sm:h-1 bg-gray-200 -z-10" style={{ marginLeft: '-50%', width: '100%' }} />
            )}
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-semibold
              ${step > i ? 'bg-[#1479FF]' : step === i + 1 ? 'bg-[#1479FF]' : 'bg-gray-300'}`}
            >
              {i + 1}
            </div>
            <div className="text-xs mt-1 sm:mt-2 text-center text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ชื่อนามสกุล *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => { if (patientSuggestions.length > 0) setShowSuggestions(true); }}
                autoComplete="off"
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {showSuggestions && patientSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientSuggestions.map((p) => (
                    <li
                      key={p._id}
                      onMouseDown={() => handleSelectPatient(p)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0"
                    >
                      <span className="font-medium text-gray-800">{p.fullname}</span>
                      {p.nickname && <span className="text-gray-400 ml-1">({p.nickname})</span>}
                      {p.tel && <span className="text-gray-400 ml-2 text-xs">{p.tel}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {formData.patientId && (
                <p className="text-xs text-blue-500 mt-1">เลือกจากระบบแล้ว</p>
              )}
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ชื่อเล่น</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">เบอร์ติดต่อ *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  clearError('phone');
                  setPhoneDuplicate(null);
                }}
                onBlur={() => { if (!formData.patientId) checkPhoneDuplicate(formData.phone); }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.phone || phoneDuplicate ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              {phoneDuplicate && !errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠ เบอร์นี้ซ้ำกับ: {phoneDuplicate.fullname}{phoneDuplicate.nickname ? ` (${phoneDuplicate.nickname})` : ''}
                </p>
              )}
            </div> */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                เบอร์ติดต่อ {!noPhone && '*'}
              </label>
              <input
                type="tel"
                value={noPhone ? NO_PHONE_SENTINEL : formData.phone}
                disabled={noPhone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  clearError('phone');
                  setPhoneDuplicate(null);
                }}
                onBlur={() => { if (!formData.patientId && !noPhone) checkPhoneDuplicate(formData.phone); }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.phone || phoneDuplicate ? 'border-red-400' : 'border-gray-300'} ${noPhone ? 'bg-gray-100 text-gray-400' : ''}`}
              />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noPhone}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNoPhone(checked);
                    if (checked) {
                      setFormData({ ...formData, phone: NO_PHONE_SENTINEL });
                      clearError('phone');
                      setPhoneDuplicate(null);
                    } else {
                      setFormData({ ...formData, phone: '' });
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-[#1479FF] focus:ring-[#1479FF]"
                />
                <span className="text-xs text-gray-600">คนไข้ไม่มีเบอร์โทร</span>
              </label>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              {phoneDuplicate && !errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠ เบอร์นี้ซ้ำกับ: {phoneDuplicate.fullname}{phoneDuplicate.nickname ? ` (${phoneDuplicate.nickname})` : ''}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Social Media</label>
              <input
                type="text"
                placeholder="Line, Facebook, Instagram..."
                value={formData.socialMedia}
                onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ความสนใจ(หัตถการ) *</label>
              <select
                value={formData.interest.name}
                onChange={(e) => {
                  const selected = interests.find(i => i.name === e.target.value);
                  if (!selected) return;
                  setFormData({
                    ...formData,
                    interest: { name: selected.name }
                  });
                  clearError('interest');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.interest ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">เลือกความสนใจ</option>
                {interests.map(i => (
                  <option key={i._id} value={i.name}>{i.name}</option>
                ))}
              </select>
              {errors.interest && <p className="text-xs text-red-500 mt-1">{errors.interest}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ช่องทางที่รู้จักคลินิก *</label>
              <select
                value={formData.referralChannel}
                onChange={(e) => {
                  setFormData({ ...formData, referralChannel: e.target.value });
                  clearError('referralChannel');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.referralChannel ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">เลือกช่องทาง</option>
                {channels.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
              {errors.referralChannel && <p className="text-xs text-red-500 mt-1">{errors.referralChannel}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">แอดมิน *</label>
              <select
                value={formData.admin}
                onChange={(e) => {
                  setFormData({ ...formData, admin: e.target.value });
                  clearError('admin');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.admin ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">เลือกแอดมิน</option>
                {admins.map(a => <option key={a._id} value={a.name}>{a.name}</option>)}
              </select>
              {errors.admin && <p className="text-xs text-red-500 mt-1">{errors.admin}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">สาขา *</label>
              <select
                value={formData.branch}
                onChange={(e) => {
                  setFormData({ ...formData, branch: e.target.value });
                  clearError('branch');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.branch ? 'border-red-400' : 'border-gray-300'}`}
              >
                {branches.length === 0 && <option value="0" disabled>เลือกสาขา</option>}
                {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
              </select>
              {errors.branch && <p className="text-xs text-red-500 mt-1">{errors.branch}</p>}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 mt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleNextStep}
              disabled={!!phoneDuplicate}
              className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${phoneDuplicate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#1479FF] text-white hover:bg-[#0066E6]'}`}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">สถานะ</label>
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
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF]"
            >
              <option value="รอตัดสินใจ">รอตัดสินใจ</option>
              <option value="ทำนัด">ทำนัด</option>
            </select>
          </div>

          {formData.status === 'ทำนัด' && (
            <div className="flex gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">วันที่นัด</label>
                <DatePickerInput
                  value={formData.appointmentDate}
                  onChange={(val) => {
                    setFormData({ ...formData, appointmentDate: val });
                    clearError('appointmentDate');
                  }}
                  className={errors.appointmentDate ? 'border-red-400' : ''}
                />
                {errors.appointmentDate && <p className="text-xs text-red-500 mt-1">{errors.appointmentDate}</p>}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">เวลานัด</label>
                <input
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => {
                    setFormData({ ...formData, appointmentTime: e.target.value });
                    clearError('appointmentTime');
                  }}
                  className={`
                      block w-full px-4 py-3.5
                      border rounded-lg
                      text-base leading-tight
                      focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
                      min-h-[52px]
                      appearance-none
                      ${errors.appointmentTime ? 'border-red-400' : 'border-gray-300'}
                    `}
                />
                {errors.appointmentTime && <p className="text-xs text-red-500 mt-1">{errors.appointmentTime}</p>}
              </div>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1479FF] focus:ring-offset-2 ${depositEnabled ? 'bg-[#1479FF]' : 'bg-gray-200'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
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
                      className={`w-full px-3 py-2.5 sm:py-2 pr-12 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${depositError && (!depositAmount.trim() || Number(depositAmount) <= 0)
                        ? 'border-red-400' : 'border-gray-300'
                        }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      บาท
                    </span>
                  </div>
                </div>

                <MultiImageUpload
                  label="สลิปการโอนเงิน"
                  required
                  urls={slipUrls}
                  onUrlsChange={setSlipUrls}
                  uploadEndpoint="/upload/slip"
                  fieldName="slip"
                  maxFiles={5}
                  showIcon
                  iconBgColor="bg-blue-100"
                  iconColor="text-blue-600"
                />
              </div>
            )}

            {depositError && (
              <p className="text-xs text-red-500 px-1">* {depositError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">รายละเอียดเพิ่มเติม</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF]"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-5 mt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="order-3 sm:order-1 w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ย้อนกลับ
            </button>
            <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="order-2 sm:order-1 w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="order-1 sm:order-2 w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadForm;