import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Loader2, Clipboard, ImageIcon } from 'lucide-react';
import api from '@/api/api';

interface UploadedImage {
    id: string;
    url: string;
    preview: string;
    uploading: boolean;
}

interface MultiImageUploadProps {
    label: string;
    required?: boolean;
    urls: string[];
    onUrlsChange: (urls: string[]) => void;
    uploadEndpoint: string;
    fieldName: string;
    maxFiles?: number;
    disabled?: boolean;
    showIcon?: boolean;
    iconBgColor?: string;
    iconColor?: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    label,
    required = false,
    urls,
    onUrlsChange,
    uploadEndpoint,
    fieldName,
    maxFiles = 5,
    disabled = false,
    showIcon = false,
    iconBgColor = 'bg-amber-100',
    iconColor = 'text-amber-600',
}) => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (urls.length > 0 && images.length === 0) {
            const initialImages: UploadedImage[] = urls.map((url, index) => ({
                id: `existing-${index}`,
                url,
                preview: url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`,
                uploading: false,
            }));
            setImages(initialImages);
        }
    }, [urls]);

    useEffect(() => {
        const uploadedUrls = images
            .filter(img => !img.uploading && img.url)
            .map(img => img.url);

        if (JSON.stringify(uploadedUrls) !== JSON.stringify(urls)) {
            onUrlsChange(uploadedUrls);
        }
    }, [images]);

    const validateFile = (file: File): string | null => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!allowedTypes.includes(file.type)) {
            return 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)';
        }
        if (file.size > 5 * 1024 * 1024) {
            return 'ขนาดไฟล์ต้องไม่เกิน 5MB';
        }
        return null;
    };

    const uploadFile = async (file: File, tempId: string) => {
        try {
            const formData = new FormData();
            formData.append(fieldName, file);

            const res = await api.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setImages(prev => prev.map(img =>
                img.id === tempId
                    ? { ...img, url: res.data.data.url, uploading: false }
                    : img
            ));
        } catch (err) {
            console.error('Upload failed', err);
            setImages(prev => prev.filter(img => img.id !== tempId));
            setError('อัปโหลดไม่สำเร็จ');
        }
    };

    const handleFilesSelected = async (files: FileList | File[]) => {
        setError('');

        const fileArray = Array.from(files);
        const remainingSlots = maxFiles - images.length;

        if (fileArray.length > remainingSlots) {
            setError(`สามารถอัปโหลดได้สูงสุด ${maxFiles} รูป`);
            return;
        }

        for (const file of fileArray) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                continue;
            }

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const reader = new FileReader();
            reader.onload = () => {
                setImages(prev => [...prev, {
                    id: tempId,
                    url: '',
                    preview: reader.result as string,
                    uploading: true,
                }]);

                uploadFile(file, tempId);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!containerRef.current) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0 && images.length < maxFiles && !disabled) {
            e.preventDefault();
            setError('');
            handleFilesSelected(imageFiles);
        }
    }, [images.length, maxFiles, disabled]);

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);

    const handleRemove = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const handleSelectFileClick = () => {
        fileInputRef.current?.click();
    };

    const isUploading = images.some(img => img.uploading);
    const canAddMore = images.length < maxFiles && !disabled;

    return (
        <div ref={containerRef} className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {showIcon && (
                        <div className={`p-2 ${iconBgColor} rounded-lg`}>
                            <ImageIcon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                    )}
                    <label className="block text-sm font-medium text-gray-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                </div>
                <span className="text-xs text-gray-400">
                    {images.length}/{maxFiles} รูป
                </span>
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {images.map((img) => (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <img
                                src={img.preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            {img.uploading ? (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(img.id)}
                                    disabled={disabled}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canAddMore && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={handleSelectFileClick}
                            disabled={disabled || isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">เลือกไฟล์</span>
                        </button>

                        <span className="text-gray-300">หรือ</span>

                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <Clipboard className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-blue-600">วางรูปได้เลย (Ctrl+V)</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-3">
                        PNG, JPG ไม่เกิน 5MB • สูงสุด {maxFiles} รูป
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileInputChange}
                        disabled={disabled || isUploading}
                        className="hidden"
                    />
                </div>
            )}

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
};

export default MultiImageUpload;