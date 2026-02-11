import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 safe-area-inset">
      <div className="bg-white w-full sm:max-w-2xl sm:w-full sm:mx-4 max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-xl overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#1479FF] shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-8 sm:p-6 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;