import React, { useState, useEffect } from 'react';
import { type Lead } from '../../types/index';

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


const steps = [
  { label: 'ข้อมูลลูกค้า' },
  { label: 'รายละเอียดนัดหมาย' },
];

const API_BASE = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;


const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onClose }) => {

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);
  const [formData, setFormData] = useState<LeadFormState>({
    name: lead?.name || '',
    phone: lead?.phone || '',
    interest: {
      name: lead?.interest?.[0]?.name || '',
      price: lead?.interest?.[0]?.price || '0',
    },
    referralChannel: lead?.referralChannel || '',
    lineId: lead?.lineId || '',
    admin: lead?.admin || '',
    branch: lead?.branch || '',
    status: lead?.status === 'scheduled' ? 'ทำนัด' : 'pending',
    appointmentDate: lead?.appointmentDate || '',
    appointmentTime: lead?.appointmentTime || '',
    note: lead?.note || '',
  });


  useEffect(() => {
    if (branches.length > 0 && !lead?.branch) {
      setFormData(prev => ({ ...prev, branch: branches[0].name }));
    }
  }, [branches, lead]);


  const [interests, setInterests] = useState<{ id: string, name: string, price: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string, name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'x-api-key': API_KEY };

        const [interestRes, channelRes, adminRes, branchRes] = await Promise.all([
          fetch(`${API_BASE}/setting/getinterest`, { headers }),
          fetch(`${API_BASE}/setting/getchannel`, { headers }),
          fetch(`${API_BASE}/setting/getadmin`, { headers }),
          fetch(`${API_BASE}/setting/getbranch`, { headers }),
        ]);

        const interestJson = await interestRes.json();
        setInterests(interestJson.data ?? interestJson);

        const channelJson = await channelRes.json();
        setChannels(channelJson.data ?? channelJson);

        const adminJson = await adminRes.json();
        setAdmins(adminJson.data ?? adminJson);

        const branchJson = await branchRes.json();
        setBranches(branchJson.data ?? branchJson);
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

  const handleSubmit = () => {
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const createdAt = lead?.createdAt || `${buddhistYear}-${month}-${day}`;

    const backendStatus =
      formData.status === 'ทำนัด' || formData.status === 'scheduled'
        ? 'scheduled'
        : 'pending';

    onSave({
      ...(lead || {}),
      ...formData,
      id: lead?.id || '',
      status: backendStatus,
      appointmentDate: backendStatus === 'scheduled' ? formData.appointmentDate : undefined,
      appointmentTime: backendStatus === 'scheduled' ? formData.appointmentTime : undefined,
      createdAt,
    } as unknown as Lead);
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
                    interest: {
                      name: selected.name,
                      price: selected.price
                    }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">เลือกความสนใจ</option>
                {interests.map(i => (
                  <option key={i.id} value={i.name}>
                    {i.name}  ราคา {i.price} บาท
                  </option>
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
                {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                {admins.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
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
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
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
              <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadForm;
