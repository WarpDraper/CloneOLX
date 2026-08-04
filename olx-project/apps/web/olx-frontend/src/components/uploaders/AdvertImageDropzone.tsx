import React, { useState } from "react";
import { Upload, Image, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps, GetProp } from "antd";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

// Дзеркалить Olx.BLL.Helpers.FileTypes.AllowedImageFileTypes (без "image/existing", яке сервер
// використовує лише під час редагування для позначення вже завантажених файлів).
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const MAX_SIZE_MB = 5;
const MAX_COUNT = 8;

interface AdvertImageDropzoneProps {
    fileList: UploadFile[];
    setFileList: (files: UploadFile[]) => void;
    error?: string;
}

// Мультизавантаження фото оголошення (Frame 331) — AdvertCreationModel.ImageFiles: ICollection<IFormFile>,
// тож на відміну від ImageUploader (аватар, 1 файл + кроп) тут дозволено декілька зображень без кропу.
const AdvertImageDropzone: React.FC<AdvertImageDropzoneProps> = ({ fileList, setFileList, error }) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState("");

    const getBase64 = (file: FileType): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
        });

    const handlePreview = async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj as FileType);
        }
        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    };

    const beforeUpload = (file: FileType) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            message.error("Дозволені формати: JPG, PNG, GIF, WEBP.");
            return Upload.LIST_IGNORE;
        }
        if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
            message.error(`Розмір фото не може перевищувати ${MAX_SIZE_MB}MB.`);
            return Upload.LIST_IGNORE;
        }
        return false; // не завантажуємо одразу — файли йдуть у FormData при сабміті форми
    };

    return (
        <div>
            <Upload
                listType="picture-card"
                fileList={fileList}
                multiple
                maxCount={MAX_COUNT}
                beforeUpload={beforeUpload}
                onChange={({ fileList: next }) => setFileList(next)}
                onPreview={handlePreview}
                customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
            >
                {fileList.length < MAX_COUNT && (
                    <div>
                        <PlusOutlined />
                        <div className="mt-1 text-xs">Додати фото</div>
                    </div>
                )}
            </Upload>
            <p className="text-xs text-gray-400 mt-1">До {MAX_COUNT} фото, JPG/PNG/GIF/WEBP, до {MAX_SIZE_MB}MB кожне.</p>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            {previewImage && (
                <Image
                    wrapperStyle={{ display: "none" }}
                    preview={{
                        visible: previewOpen,
                        onVisibleChange: (visible) => setPreviewOpen(visible),
                        afterOpenChange: (visible) => !visible && setPreviewImage(""),
                    }}
                    src={previewImage}
                />
            )}
        </div>
    );
};

export default AdvertImageDropzone;
