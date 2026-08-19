import React, { useRef, useState } from 'react';
import { Table, Empty, Modal, Upload, Button, message } from 'antd';
import { UploadOutlined, DeleteOutlined, AppstoreOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload/interface';
import { useTranslation } from 'react-i18next';
import { useGetCategoriesQuery } from '../../../services/categoryService';
import { useUpdateCategoryImageMutation } from '../../../services/adminService';
import type { ICategory } from '../../../types/category/ICategory';
import { buildImageUrl, IMAGE_SIZES } from '../../../utils/buildImageUrl';
import FallbackImage from '../../../components/common/FallbackImage';
import ImageCropModal from '../../../components/uploaders/ImageCropModal';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_MB = 10;

const CategoriesPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: categories = [], isLoading } = useGetCategoriesQuery();
    const [updateCategoryImage, { isLoading: isSaving }] = useUpdateCategoryImageMutation();

    // The category currently open in the "change image" modal, plus the pending local edits
    // (new file / explicit removal) that haven't been submitted yet.
    const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState(false);
    // The file mid-crop (freshly selected, or re-opened via the "edit crop" button) — feeds
    // ImageCropModal below. Kept separate from pendingFile/pendingPreview, which only ever hold
    // the *cropped* result that's actually submitted.
    const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
    // The pristine, never-cropped original behind the current pendingFile — re-cropping always
    // starts from this (not from the already-cropped pendingFile) so repeated adjustments never
    // compound quality loss from prior JPEG re-encodes.
    const originalPendingFileRef = useRef<File | null>(null);

    const openImageModal = (category: ICategory) => {
        setEditingCategory(category);
        setPendingFile(null);
        setPendingPreview(null);
        setPendingRemove(false);
        originalPendingFileRef.current = null;
    };

    const closeImageModal = () => {
        setEditingCategory(null);
        setPendingFile(null);
        setPendingPreview(null);
        setPendingRemove(false);
        originalPendingFileRef.current = null;
    };

    // Selecting a file no longer sets it as pending directly — it's staged into the crop modal
    // first (1:1, circular preview matching how the category avatar actually renders), and only
    // becomes the pending upload once the admin confirms a crop.
    const beforeUpload = (file: RcFile) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            message.error(t('admin.categories.image.invalidType'));
            return Upload.LIST_IGNORE;
        }
        if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
            message.error(t('admin.categories.image.tooLarge', { size: MAX_SIZE_MB }));
            return Upload.LIST_IGNORE;
        }
        setCropSource({ file, url: URL.createObjectURL(file) });
        return false;
    };

    const handleCropConfirm = (blob: Blob) => {
        if (!cropSource) return;
        const croppedFile = new File([blob], cropSource.file.name, { type: blob.type });
        originalPendingFileRef.current = cropSource.file;
        setPendingFile(croppedFile);
        setPendingPreview(URL.createObjectURL(croppedFile));
        setPendingRemove(false);
        URL.revokeObjectURL(cropSource.url);
        setCropSource(null);
    };

    const handleCropCancel = () => {
        if (cropSource) URL.revokeObjectURL(cropSource.url);
        setCropSource(null);
    };

    // Re-opens the crop modal against the original (pre-crop) file so the admin can re-center /
    // re-zoom without picking a new photo. Only offered while there's a freshly-selected local
    // file to work from — the already-saved backend image can't safely be re-cropped client-side
    // (canvas export would be tainted by cross-origin restrictions if the API is on another
    // origin, and the original pre-crop upload isn't retained server-side anyway), so re-editing
    // that requires choosing the file again via "Change image".
    const handleReEditCrop = () => {
        const source = originalPendingFileRef.current ?? pendingFile;
        if (!source) return;
        setCropSource({ file: source, url: URL.createObjectURL(source) });
    };

    const handleSave = async () => {
        if (!editingCategory) return;
        try {
            await updateCategoryImage({
                id: editingCategory.id,
                category: editingCategory,
                imageFile: pendingFile,
                removeImage: pendingRemove,
            }).unwrap();
            message.success(t('admin.categories.image.saved'));
            closeImageModal();
        } catch {
            // Error already logged + toasted by createBaseQuery's shared error handling.
        }
    };

    const modalPreviewSrc = pendingRemove
        ? null
        : pendingPreview ?? (editingCategory ? buildImageUrl(editingCategory.image, IMAGE_SIZES.thumbnail) : null);

    const columns: ColumnsType<ICategory> = [
        { title: t('admin.categories.table.id'), dataIndex: 'id', key: 'id', width: 80 },
        {
            title: t('admin.categories.table.image'),
            dataIndex: 'image',
            key: 'image',
            width: 90,
            render: (_: string | null, category) => (
                <div className="relative w-12 h-12 aspect-square rounded-full overflow-hidden bg-mm-navy flex items-center justify-center shrink-0">
                    <FallbackImage
                        src={buildImageUrl(category.image, IMAGE_SIZES.thumbnail)}
                        alt={category.name}
                        className="w-full h-full object-cover object-center scale-125"
                        placeholder={<AppstoreOutlined className="text-white/80" />}
                    />
                </div>
            ),
        },
        { title: t('admin.categories.table.name'), dataIndex: 'name', key: 'name' },
        { title: t('admin.categories.table.parent'), dataIndex: 'parentName', key: 'parentName', render: (v) => v || '—' },
        { title: t('admin.categories.table.filters'), dataIndex: 'filterNames', key: 'filterNames', render: (v: string[]) => v.join(', ') || '—' },
        {
            title: t('admin.categories.table.actions'),
            key: 'actions',
            width: 160,
            render: (_, category) => (
                <Button size="small" icon={<UploadOutlined />} onClick={() => openImageModal(category)}>
                    {t('admin.categories.image.changeButton')}
                </Button>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.categories.title')}</h1>
            <Table
                columns={columns}
                dataSource={categories}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: <Empty description={t('admin.categories.empty')} /> }}
            />

            <Modal
                title={editingCategory ? t('admin.categories.image.modalTitle', { name: editingCategory.name }) : ''}
                open={!!editingCategory}
                onCancel={closeImageModal}
                onOk={handleSave}
                okText={isSaving ? t('common.saving') : t('common.save')}
                cancelText={t('common.cancel')}
                confirmLoading={isSaving}
            >
                <div className="flex flex-col items-center gap-4 py-2">
                    <div className="relative w-28 h-28 aspect-square rounded-full overflow-hidden bg-mm-navy flex items-center justify-center">
                        <FallbackImage
                            src={modalPreviewSrc}
                            alt={editingCategory?.name ?? ''}
                            className="w-full h-full object-cover object-center scale-125"
                            placeholder={<AppstoreOutlined className="text-3xl text-white/80" />}
                        />
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center items-center w-full">
                        <Upload
                            showUploadList={false}
                            beforeUpload={beforeUpload}
                            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                            className="w-full sm:w-auto"
                        >
                            <Button icon={<UploadOutlined />} className="w-full sm:w-auto">
                                {t('admin.categories.image.uploadButton')}
                            </Button>
                        </Upload>
                        {pendingFile && (
                            <Button icon={<EditOutlined />} onClick={handleReEditCrop} className="w-full sm:w-auto">
                                {t('imageUploader.editCrop')}
                            </Button>
                        )}
                        {(modalPreviewSrc || pendingFile) && (
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    setPendingFile(null);
                                    setPendingPreview(null);
                                    setPendingRemove(true);
                                    originalPendingFileRef.current = null;
                                }}
                            >
                                {t('admin.categories.image.removeButton')}
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 text-center">{t('admin.categories.image.hint', { size: MAX_SIZE_MB })}</p>
                </div>
            </Modal>

            <ImageCropModal
                open={!!cropSource}
                imageUrl={cropSource?.url ?? null}
                aspect={1}
                shape="round"
                title={t('imageCropModal.title')}
                onCancel={handleCropCancel}
                onConfirm={handleCropConfirm}
            />
        </div>
    );
};

export default CategoriesPage;
