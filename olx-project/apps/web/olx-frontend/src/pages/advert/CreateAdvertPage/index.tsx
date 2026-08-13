import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { TreeSelect, Select, message } from "antd";
import type { UploadFile } from "antd";
import type { RootState } from "../../../store";
import { useCreateAdvertMutation } from "../../../services/advertService";
import { useGetCategoryTreeQuery } from "../../../services/categoryService";
import { useGetFiltersByRangeMutation } from "../../../services/filterService";
import { parseServerValidationErrors } from "../../../utils/parseServerValidationErrors";
import type { ICategory } from "../../../types/category/ICategory";
import SettlementPicker from "../../../components/location/SettlementPicker";
import AdvertImageDropzone from "../../../components/uploaders/AdvertImageDropzone";

const PHONE_REGEX = /^\+38\s?\(\d{3}\)\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const findCategoryById = (categories: ICategory[], id: number): ICategory | null => {
    for (const category of categories) {
        if (category.id === id) return category;
        const found = findCategoryById(category.childs, id);
        if (found) return found;
    }
    return null;
};

// Frame 331: форма створення оголошення. PUT /api/advert/create, multipart/form-data,
// точна відповідність Olx.BLL.Models.Advert.AdvertCreationModel + AdvertCreationModelValidator.
const CreateAdvertPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const { data: categoryTree = [] } = useGetCategoryTreeQuery();
    const [getFiltersByRange, { data: facetDefinitions }] = useGetFiltersByRangeMutation();
    const [createAdvert, { isLoading: isSubmitting }] = useCreateAdvertMutation();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [isContractPrice, setIsContractPrice] = useState(false);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [settlementRef, setSettlementRef] = useState("");
    const [settlementDescription, setSettlementDescription] = useState("");
    const [contactPersone, setContactPersone] = useState(user?.name && user.name !== "Користувач" ? user.name : "");
    const [contactEmail, setContactEmail] = useState(user?.email ?? "");
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
    const [filterValueIds, setFilterValueIds] = useState<Record<number, number>>({});
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const selectedCategory = useMemo(
        () => (categoryId ? findCategoryById(categoryTree, categoryId) : null),
        [categoryTree, categoryId]
    );

    useEffect(() => {
        setFilterValueIds({});
        if (selectedCategory && selectedCategory.filters.length > 0) {
            getFiltersByRange(selectedCategory.filters);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory?.id]);

    const facetNameById = new Map((selectedCategory?.filters ?? []).map((fid, i) => [fid, selectedCategory?.filterNames[i]]));

    if (!isAuth) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const errors: Record<string, string> = {};
        if (!title.trim()) errors.title = t("createAdvert.errors.required");
        else if (title.length > 256) errors.title = t("createAdvert.errors.titleMaxLength");
        if (!description.trim()) errors.description = t("createAdvert.errors.required");
        else if (description.length > 5000) errors.description = t("createAdvert.errors.descriptionMaxLength");
        if (!isContractPrice && (price.trim() === "" || Number(price) < 0)) errors.price = t("createAdvert.errors.invalidPrice");
        if (!categoryId) errors.categoryId = t("createAdvert.errors.selectCategory");
        if (!settlementRef) errors.settlementRef = t("createAdvert.errors.selectSettlement");
        if (!contactPersone.trim()) errors.contactPersone = t("createAdvert.errors.required");
        if (!contactEmail.trim() || !EMAIL_REGEX.test(contactEmail.trim())) errors.contactEmail = t("createAdvert.errors.invalidEmail");
        if (phoneNumber.trim() && !PHONE_REGEX.test(phoneNumber.trim())) errors.phoneNumber = t("createAdvert.errors.invalidPhoneFormat");
        if (fileList.length === 0) errors.images = t("createAdvert.errors.imagesRequired");

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const formData = new FormData();
        formData.append("UserId", String(currentUserId));
        formData.append("Title", title.trim());
        formData.append("Description", description.trim());
        formData.append("IsContractPrice", String(isContractPrice));
        formData.append("Price", String(isContractPrice ? 0 : Number(price)));
        formData.append("CategoryId", String(categoryId));
        formData.append("SettlementRef", settlementRef);
        formData.append("ContactPersone", contactPersone.trim());
        formData.append("ContactEmail", contactEmail.trim());
        formData.append("PhoneNumber", phoneNumber.trim());
        Object.values(filterValueIds).forEach((valueId) => formData.append("FilterValueIds", String(valueId)));
        fileList.forEach((f) => {
            if (f.originFileObj) formData.append("ImageFiles", f.originFileObj as File);
        });

        try {
            const created = await createAdvert(formData).unwrap();
            message.success(t("createAdvert.messages.publishSuccess"));
            navigate(`/advert/${created.id}`);
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors: serverErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
            } else {
                setFormError(err?.data?.message || t("createAdvert.messages.publishError"));
            }
        }
    };

    return (
        <div className="max-w-[860px] mx-auto px-4 md:px-6 py-8">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">{t("createAdvert.pageTitle")}</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-mm-navy uppercase tracking-wide">{t("createAdvert.sections.mainInfo")}</h2>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.category")}</label>
                        <TreeSelect
                            treeData={categoryTree}
                            fieldNames={{ label: "name", value: "id", children: "childs" }}
                            value={categoryId ?? undefined}
                            onChange={(id) => setCategoryId(id)}
                            placeholder={t("createAdvert.fields.categoryPlaceholder")}
                            showSearch
                            treeNodeFilterProp="name"
                            treeDefaultExpandAll
                        />
                        {fieldErrors.categoryId && <p className="text-red-500 text-xs">{fieldErrors.categoryId}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.title")}</label>
                        <input
                            type="text"
                            value={title}
                            maxLength={256}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("createAdvert.fields.titlePlaceholder")}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                        />
                        {fieldErrors.title && <p className="text-red-500 text-xs">{fieldErrors.title}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.description")}</label>
                        <textarea
                            value={description}
                            maxLength={5000}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={6}
                            placeholder={t("createAdvert.fields.descriptionPlaceholder")}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple resize-y"
                        />
                        <p className="text-xs text-gray-400 text-right">{description.length}/5000</p>
                        {fieldErrors.description && <p className="text-red-500 text-xs">{fieldErrors.description}</p>}
                    </div>

                    {facetDefinitions && facetDefinitions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {facetDefinitions.map((facet) => (
                                <div key={facet.id} className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">{facetNameById.get(facet.id) ?? facet.name}</label>
                                    <Select
                                        allowClear
                                        placeholder={t("createAdvert.fields.notSpecified")}
                                        value={filterValueIds[facet.id]}
                                        onChange={(valueId) =>
                                            setFilterValueIds((prev) => {
                                                const next = { ...prev };
                                                if (valueId === undefined) delete next[facet.id];
                                                else next[facet.id] = valueId;
                                                return next;
                                            })
                                        }
                                        options={(facet.values ?? []).map((v) => ({ value: v.id, label: v.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-mm-navy uppercase tracking-wide">{t("createAdvert.sections.priceAndLocation")}</h2>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.price")}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={0}
                                value={price}
                                disabled={isContractPrice}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isContractPrice}
                                    onChange={(e) => setIsContractPrice(e.target.checked)}
                                    className="accent-mm-purple"
                                />
                                {t("common.negotiable")}
                            </label>
                        </div>
                        {fieldErrors.price && <p className="text-red-500 text-xs">{fieldErrors.price}</p>}
                    </div>

                    <SettlementPicker
                        value={settlementRef}
                        displayValue={settlementDescription || undefined}
                        onChange={(ref, descr) => {
                            setSettlementRef(ref);
                            setSettlementDescription(descr);
                        }}
                        error={fieldErrors.settlementRef}
                    />
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-mm-navy uppercase tracking-wide">{t("createAdvert.sections.contactInfo")}</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.contactPerson")}</label>
                            <input
                                type="text"
                                value={contactPersone}
                                onChange={(e) => setContactPersone(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                            {fieldErrors.contactPersone && <p className="text-red-500 text-xs">{fieldErrors.contactPersone}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.email")}</label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                            {fieldErrors.contactEmail && <p className="text-red-500 text-xs">{fieldErrors.contactEmail}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-mm-navy">{t("createAdvert.fields.phone")}</label>
                            <input
                                type="text"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+38 (0XX) XXX-XX-XX"
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                            {fieldErrors.phoneNumber && <p className="text-red-500 text-xs">{fieldErrors.phoneNumber}</p>}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-mm-navy uppercase tracking-wide">{t("createAdvert.sections.photos")}</h2>
                    <AdvertImageDropzone fileList={fileList} setFileList={setFileList} error={fieldErrors.images} />
                </div>

                {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-mm-purple hover:bg-mm-purple-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-lg transition-colors"
                >
                    {isSubmitting ? t("createAdvert.submit.publishing") : t("createAdvert.submit.publish")}
                </button>
            </form>
        </div>
    );
};

export default CreateAdvertPage;
