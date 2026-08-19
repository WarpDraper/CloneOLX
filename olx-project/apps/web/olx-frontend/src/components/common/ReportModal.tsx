import React, { useState } from "react";
import { Modal, Radio, Input, message } from "antd";
import { useTranslation } from "react-i18next";
import { useCreateReportMutation } from "../../services/reportService";

type ReportTarget =
    | { type: "advert"; id: number }
    | { type: "user"; id: number };

interface ReportModalProps {
    open: boolean;
    onClose: () => void;
    target: ReportTarget;
}

const REASON_KEYS = ["fraud", "spam", "inappropriate", "other"] as const;

// Generic "Поскаржитися" (Report) modal — used from both AdvertDetailsPage (report an advert)
// and SellerProfilePage (report a user/seller). Submits to POST /api/Report
// (ReportCreationModel: exactly one of advertId/targetUserId + reason + optional description).
const ReportModal: React.FC<ReportModalProps> = ({ open, onClose, target }) => {
    const { t } = useTranslation();
    const [createReport, { isLoading }] = useCreateReportMutation();
    const [reasonKey, setReasonKey] = useState<(typeof REASON_KEYS)[number] | null>(null);
    const [description, setDescription] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const resetAndClose = () => {
        setReasonKey(null);
        setDescription("");
        setValidationError(null);
        onClose();
    };

    const handleSubmit = async () => {
        if (!reasonKey) {
            setValidationError(t("reportModal.reasonRequired"));
            return;
        }

        try {
            await createReport({
                advertId: target.type === "advert" ? target.id : undefined,
                targetUserId: target.type === "user" ? target.id : undefined,
                reason: t(`reportModal.reasons.${reasonKey}`),
                description: description.trim() || undefined,
            }).unwrap();
            message.success(t("reportModal.success"));
            resetAndClose();
        } catch {
            message.error(t("reportModal.error"));
        }
    };

    return (
        <Modal
            title={target.type === "advert" ? t("reportModal.titleAdvert") : t("reportModal.titleUser")}
            open={open}
            onCancel={resetAndClose}
            onOk={handleSubmit}
            okText={t("reportModal.submit")}
            cancelText={t("reportModal.cancel")}
            confirmLoading={isLoading}
        >
            <div className="flex flex-col gap-4">
                <div>
                    <p className="text-sm font-medium text-mm-navy mb-2">{t("reportModal.reasonLabel")}</p>
                    <Radio.Group
                        value={reasonKey}
                        onChange={(e) => {
                            setReasonKey(e.target.value);
                            setValidationError(null);
                        }}
                        className="flex flex-col gap-2 w-full"
                    >
                        {REASON_KEYS.map((key) => (
                            <Radio key={key} value={key} className="border border-gray-200 rounded-lg px-3 py-2 w-full">
                                {t(`reportModal.reasons.${key}`)}
                            </Radio>
                        ))}
                    </Radio.Group>
                    {validationError && <p className="text-xs text-red-500 mt-1">{validationError}</p>}
                </div>

                <div>
                    <p className="text-sm font-medium text-mm-navy mb-2">{t("reportModal.descriptionLabel")}</p>
                    <Input.TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("reportModal.descriptionPlaceholder")}
                        rows={3}
                        maxLength={2000}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default ReportModal;
