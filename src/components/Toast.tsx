import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

const toastConfig = {
    success: {
        icon: CheckCircle,
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        iconColor: 'text-green-500',
        progress: 'bg-green-500',
    },
    error: {
        icon: XCircle,
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        iconColor: 'text-red-500',
        progress: 'bg-red-500',
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        iconColor: 'text-amber-500',
        progress: 'bg-amber-500',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        iconColor: 'text-blue-500',
        progress: 'bg-blue-500',
    },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const [progress, setProgress] = useState(100);
    const config = toastConfig[toast.type];
    const Icon = config.icon;
    const duration = 3000;

    useEffect(() => {
        const startTime = Date.now();

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
        }, 50);

        const timer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(() => onClose(toast.id), 300);
        }, duration);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [toast.id, onClose]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => onClose(toast.id), 300);
    };

    return (
        <div
            className={`
        relative overflow-hidden
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${config.bg} ${config.border}
        transform transition-all duration-300 ease-out
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
        >
            <Icon className={`w-5 h-5 ${config.iconColor} shrink-0`} />
            <p className={`text-sm font-medium ${config.text} flex-1`}>{toast.message}</p>
            <button
                onClick={handleClose}
                className={`p-1 rounded-full hover:bg-black/10 transition-colors ${config.text}`}
            >
                <X className="w-4 h-4" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                <div
                    className={`h-full ${config.progress} transition-all duration-100 ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast toast={toast} onClose={onClose} />
                </div>
            ))}
        </div>
    );
};

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (type: ToastType, message: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const toast = {
        success: (message: string) => addToast('success', message),
        error: (message: string) => addToast('error', message),
        warning: (message: string) => addToast('warning', message),
        info: (message: string) => addToast('info', message),
    };

    return { toasts, toast, removeToast };
};

export default Toast;