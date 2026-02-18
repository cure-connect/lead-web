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

const steps = [
  { label: 'ข้อมูลลูกค้า' },
  { label: 'รายละเอียดนัดหมาย' },
];

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onClose }) => {

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{ _id: string, name: string }[]>([]);
  const [formData, setFormData] = useState<LeadFormState>({
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

  useEffect(() => {
    if (lead?.deposit) {
      setDepositEnabled(true);
      setDepositAmount(String(lead.deposit.amount || ''));
      if ((lead.deposit.slipUrls?.length ?? 0) > 0) {
        setSlipUrls(lead.deposit.slipUrls!);
      } else if (lead.deposit.slipUrl) {
        setSlipUrls([lead.deposit.slipUrl]);
      }
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

  const validateStep2 = (): string | null => {
    if (depositEnabled) {
      if (!depositAmount.trim() || Number(depositAmount) <= 0) {
        return "กรุณากรอกจำนวนเงินมัดจำ";
      }
      if (slipUrls.length === 0) {
        return "กรุณาอัปโหลดรูปสลิปการโอนเงิน";
      }
    }
    return null;
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

    const error = validateStep2();
    if (error) {
      setDepositError(error);
      return;
    }

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
        phone: normalizePhone(formData.phone), // ลบ "-" ออก
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ชื่อนามสกุล *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearError('name');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">เบอร์ติดต่อ *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  clearError('phone');
                }}
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-md text-base sm:text-sm focus:ring-[#1479FF] focus:border-[#1479FF] ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
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
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-[#1479FF] text-white rounded-lg text-sm font-medium hover:bg-[#0066E6] transition-colors"
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
                <input
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  className={`
                      block w-full px-4 py-3.5
                      border border-gray-300 rounded-lg
                      text-base leading-tight
                      focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
                      min-h-[52px]
                      appearance-none
                    `}
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">เวลานัด</label>
                <input
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  className={`
                      block w-full px-4 py-3.5
                      border border-gray-300 rounded-lg
                      text-base leading-tight
                      focus:ring-2 focus:ring-[#1479FF] focus:border-[#1479FF] focus:outline-none
                      min-h-[52px]
                      appearance-none
                    `}
                />
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