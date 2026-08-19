import React, { useRef, useState } from "react";
import { Upload, Image, message } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import ImgCrop from "antd-img-crop";
import { useTranslation } from "react-i18next";
import type { UploadFile, UploadProps, GetProp } from "antd";
import ImageCropModal from "./ImageCropModal";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

// Дзеркалить Olx.BLL.Helpers.FileTypes.AllowedImageFileTypes (без "image/existing", яке сервер
// використовує лише під час редагування для позначення вже завантажених файлів).
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE_MB = 10; // mirrors Olx.BLL.Helpers.FileTypes.MaxImageFileSizeBytes
const MAX_COUNT = 8;
// Matches the 4:3 aspect AdvertCard/AdvertListItem/AdvertGallery already display these photos
// at — cropping to the same ratio up front means object-cover never has to re-crop/re-center
// what the seller framed.
const ADVERT_PHOTO_ASPECT = 4 / 3;

interface AdvertImageDropzoneProps {
    fileList: UploadFile[];
    setFileList: (files: UploadFile[]) => void;
    error?: string;
}

interface RecropState {
    uid: string;
    /** Always the pristine, never-before-cropped source file, so re-cropping never compounds
     *  quality loss from a previous crop's JPEG re-encode. */
    source: File;
    url: string;
}

// Мультизавантаження фото оголошення (Frame 331) — AdvertCreationModel.ImageFiles: ICollection<IFormFile>.
// Кожне вибране фото проходить через ImgCrop (center/zoom, 4:3) одразу при виборі; додатково
// кожна вже додана мініатюра має кнопку "Редагувати кадрування", яка відкриває той самий
// crop-інструмент (ImageCropModal) для повторного налаштування центру/масштабу без
// перезавантаження файлу. Кроп повністю клієнтський — на бекенд, як і раніше, йде звичайний
// File у полі ImageFiles, тож API не змінюється.
const AdvertImageDropzone: React.FC<AdvertImageDropzoneProps> = ({ fileList, setFileList, error }) => {
    const { t } = useTranslation();
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState("");
    const [recrop, setRecrop] = useState<RecropState | null>(null);

    // Bridges ImgCrop's two-step pipeline (beforeCrop validates+opens the modal on the RAW
    // selected file, beforeUpload receives the CROPPED result afterwards) so the pristine
    // original can be recovered later for the "edit crop" button — keyed by the cropped File
    // object itself (a WeakMap avoids ever needing to clean these up manually).
    const lastOriginalRef = useRef<File | null>(null);
    const originalFileMap = useRef(new WeakMap<File, File>());
    // Set by beforeCrop when validation fails. ImgCrop's `beforeCrop` contract only recognizes
    // a literal `false` return to skip opening the crop modal — it can't also carry "and reject
    // the file outright" (returning Upload.LIST_IGNORE there gets treated as image data, not a
    // rejection). So on a validation failure, beforeCrop shows the error + sets this flag, then
    // ImgCrop falls through to calling `beforeUpload` with the raw file, which reads the flag
    // and is what actually excludes it via Upload.LIST_IGNORE — without validating (and
    // re-toasting) twice.
    const rejectedRef = useRef(false);

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

    // Runs before ImgCrop opens its crop modal — same format/size validation as before, just
    // moved one step earlier so an invalid file never gets a pointless crop dialog.
    const beforeCrop = (file: FileType) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            message.error(t("imageUploader.errors.allowedFormats"));
            rejectedRef.current = true;
            return false;
        }
        if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
            message.error(t("imageUploader.errors.maxSize", { size: MAX_SIZE_MB }));
            rejectedRef.current = true;
            return false;
        }
        rejectedRef.current = false;
        lastOriginalRef.current = file as unknown as File;
        return true;
    };

    // Runs after ImgCrop has produced the cropped file (the normal path) — never auto-uploads
    // (files ride along in FormData at form submit, same as before ImgCrop was introduced), and
    // records the original→cropped pairing for the re-edit button. Also doubles as the fallback
    // beforeCrop routes to when validation failed (see rejectedRef above), where it excludes the
    // file from the list entirely instead of silently keeping an invalid one.
    const beforeUpload = (file: FileType) => {
        if (rejectedRef.current) {
            rejectedRef.current = false;
            return Upload.LIST_IGNORE;
        }
        if (lastOriginalRef.current) {
            originalFileMap.current.set(file as unknown as File, lastOriginalRef.current);
            lastOriginalRef.current = null;
        }
        return false;
    };

    const openRecrop = (uploadFile: UploadFile) => {
        const current = uploadFile.originFileObj as File | undefined;
        if (!current || !uploadFile.uid) return;
        const source = originalFileMap.current.get(current) ?? current;
        setRecrop({ uid: uploadFile.uid, source, url: URL.createObjectURL(source) });
    };

    const closeRecrop = () => {
        if (recrop) URL.revokeObjectURL(recrop.url);
        setRecrop(null);
    };

    const handleRecropConfirm = (blob: Blob) => {
        if (!recrop) return;
        const newFile = new File([blob], recrop.source.name, { type: blob.type });
        originalFileMap.current.set(newFile, recrop.source);
        const thumbUrl = URL.createObjectURL(newFile);
        setFileList(
            fileList.map((f) =>
                f.uid === recrop.uid
                    ? {
                          ...f,
                          // antd's UploadFile["originFileObj"] is typed as RcFile (File + uid) —
                          // nothing in this app ever reads that uid off originFileObj (the
                          // upload flow reads `f.uid` on the UploadFile wrapper instead), so a
                          // plain re-cropped File is safe to assign here with a type-only cast.
                          originFileObj: newFile as unknown as UploadFile["originFileObj"],
                          thumbUrl,
                          url: undefined,
                          preview: undefined,
                      }
                    : f
            )
        );
        URL.revokeObjectURL(recrop.url);
        setRecrop(null);
    };

    const itemRender: UploadProps["itemRender"] = (originNode, file) => (
        <div className="relative">
            {originNode}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    openRecrop(file);
                }}
                title={t("imageUploader.editCrop")}
                aria-label={t("imageUploader.editCrop")}
                className="absolute bottom-1 left-1 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-xs"
            >
                <EditOutlined />
            </button>
        </div>
    );

    return (
        <div>
            <ImgCrop
                aspect={ADVERT_PHOTO_ASPECT}
                quality={0.9}
                showGrid
                zoomSlider
                cropShape="rect"
                fillColor="transparent"
                beforeCrop={beforeCrop}
                modalTitle={t("imageCropModal.title")}
                modalOk={t("imageCropModal.apply")}
                modalCancel={t("common.cancel")}
            >
                <Upload
                    listType="picture-card"
                    fileList={fileList}
                    multiple
                    maxCount={MAX_COUNT}
                    beforeUpload={beforeUpload}
                    onChange={({ fileList: next }) => setFileList(next)}
                    onPreview={handlePreview}
                    itemRender={itemRender}
                    customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
                >
                    {fileList.length < MAX_COUNT && (
                        <div>
                            <PlusOutlined />
                            <div className="mt-1 text-xs">{t("imageUploader.addPhoto")}</div>
                        </div>
                    )}
                </Upload>
            </ImgCrop>
            <p className="text-xs text-gray-400 mt-1">{t("imageUploader.hint", { maxCount: MAX_COUNT, maxSize: MAX_SIZE_MB })}</p>
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

            <ImageCropModal
                open={!!recrop}
                imageUrl={recrop?.url ?? null}
                aspect={ADVERT_PHOTO_ASPECT}
                shape="rect"
                title={t("imageUploader.editCrop")}
                onCancel={closeRecrop}
                onConfirm={handleRecropConfirm}
            />
        </div>
    );
};

export default AdvertImageDropzone;
