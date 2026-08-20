import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Select } from "antd";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
    ShoppingCartOutlined,
    MinusOutlined,
    PlusOutlined,
    DeleteOutlined,
    CheckCircleFilled,
    CreditCardOutlined,
    ShopOutlined,
    CarOutlined,
    HomeOutlined,
    UnorderedListOutlined,
    EnvironmentOutlined,
} from "@ant-design/icons";
import type { RootState } from "../../../store";
import { setQuantity, removeFromCart, clearCart } from "../../../store/cartSlice";
import FallbackImage from "../../../components/common/FallbackImage";
import { useCreateOrderMutation } from "../../../services/orderService";
import { useGetWarehousesBySettlementQuery } from "../../../services/newPostService";
import SettlementPicker from "../../../components/location/SettlementPicker";
import WarehouseMapPicker from "../../../components/location/WarehouseMapPicker";
import { DeliveryType, PaymentMethod, type IOrder } from "../../../types/order/IOrder";
import { useOwnProfile } from "../../../hooks/useOwnProfile";
import PhoneInput from "../../../components/inputs/PhoneInput";
import { extractSubscriberDigits, ukrainianPhoneErrorMessage } from "../../../utils/phone";
import { branchLabel } from "../../../utils/warehouseLabel";

type RecipientMode = "self" | "other";

const getDeliveryOptions = (t: TFunction): { value: DeliveryType; label: string; icon: React.ComponentType }[] => [
    { value: DeliveryType.OlxDelivery, label: t("cart.delivery.novaPoshta"), icon: CarOutlined },
    { value: DeliveryType.SelfPickup, label: t("cart.delivery.selfPickup"), icon: ShopOutlined },
    { value: DeliveryType.Courier, label: t("cart.delivery.courier"), icon: HomeOutlined },
];

const getPaymentOptions = (t: TFunction): { value: PaymentMethod; label: string }[] => [
    { value: PaymentMethod.CardOnline, label: t("cart.payment.cardOnline") },
    { value: PaymentMethod.CashOnDelivery, label: t("cart.payment.cashOnDelivery") },
];

const getDeliveryLabels = (t: TFunction): Record<DeliveryType, string> => ({
    [DeliveryType.OlxDelivery]: t("cart.delivery.novaPoshta"),
    [DeliveryType.SelfPickup]: t("cart.delivery.selfPickup"),
    [DeliveryType.Courier]: t("cart.delivery.courier"),
});

const getPaymentLabels = (t: TFunction): Record<PaymentMethod, string> => ({
    [PaymentMethod.CardOnline]: t("cart.payment.cardOnline"),
    [PaymentMethod.CashOnDelivery]: t("cart.payment.cashOnDelivery"),
});

// Кошик + оформлення замовлення в один потік: список позицій, вибір доставки/оплати,
// підтвердження замовлення. Кошик — лише для авторизованих (додати товар без входу неможливо,
// AdvertCard/RecommendationCard ведуть на /login), тому сторінка гейтиться так само як обране.
const CartPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const items = useSelector((state: RootState) => state.cart.items);
    const currentUserId = Number(user?.id);
    // Own profile — source of truth for the "Я отримувач" autofill (firstName/lastName/phoneNumber),
    // same query SettingsPage uses (see useOwnProfile.ts). A 404 here just clears the cached profile
    // piece of auth state; it never forces logout, so recipientMode can safely fall back to the
    // JWT-decoded `user` while the profile is loading/unavailable.
    const { data: profile } = useOwnProfile(currentUserId);
    const DELIVERY_OPTIONS = getDeliveryOptions(t);
    const PAYMENT_OPTIONS = getPaymentOptions(t);
    const DELIVERY_LABELS = getDeliveryLabels(t);
    const PAYMENT_LABELS = getPaymentLabels(t);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.OlxDelivery);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CardOnline);
    const [settlementRef, setSettlementRef] = useState("");
    const [settlementDescription, setSettlementDescription] = useState("");
    const [warehouseRef, setWarehouseRef] = useState("");
    const [address, setAddress] = useState("");
    // "Я отримувач" (default for an authenticated user) vs "Інший отримувач" — see effect below
    // for the autofill/reset logic that keeps recipient fields in sync with this toggle.
    const [recipientMode, setRecipientMode] = useState<RecipientMode>("self");
    const [recipientFirstName, setRecipientFirstName] = useState("");
    const [recipientLastName, setRecipientLastName] = useState("");
    // Backend phone format ("+38 (0XX) XXX-XX-XX") — same shape PhoneInput/phone.ts use everywhere
    // else (SettingsPage), so the exact same mask/validation applies here.
    const [recipientPhone, setRecipientPhone] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [completedOrder, setCompletedOrder] = useState<IOrder | null>(null);
    const [warehousePickerMode, setWarehousePickerMode] = useState<"list" | "map">("list");

    const { data: warehouses = [], isLoading: isWarehousesLoading } = useGetWarehousesBySettlementQuery(settlementRef, {
        skip: !settlementRef || deliveryType !== DeliveryType.OlxDelivery,
    });
    const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();

    // "Я отримувач": pull firstName/lastName/phoneNumber straight from the profile (falling back to
    // the JWT-decoded auth user while the profile query is still in flight). "Інший отримувач":
    // wipe every recipient field so the user starts from a blank, fully-editable form. Re-runs
    // whenever the toggle flips or the profile finishes loading, so switching to "self" before the
    // profile has arrived still gets backfilled the moment it does.
    useEffect(() => {
        if (recipientMode === "self") {
            if (profile) {
                setRecipientFirstName(profile.firstName ?? "");
                setRecipientLastName(profile.lastName ?? "");
                setRecipientPhone(profile.phoneNumber ?? "");
            } else if (user) {
                const [fallbackFirst, ...fallbackRest] = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
                setRecipientFirstName(fallbackFirst ?? "");
                setRecipientLastName(fallbackRest.join(" "));
                setRecipientPhone(user.phoneNumber ?? "");
            }
        } else {
            setRecipientFirstName("");
            setRecipientLastName("");
            setRecipientPhone("");
        }
        setFieldErrors({});
    }, [recipientMode, profile, user]);

    if (!isAuth) return null;

    const isRecipientSelf = recipientMode === "self";
    // Names come straight from the profile in "self" mode — lock them here rather than let the
    // form silently diverge from what's saved on the account; SettingsPage is the one place that's
    // allowed to edit them.
    const recipientNameLocked = isRecipientSelf && !!profile;
    const recipientPhoneMissingFromProfile = isRecipientSelf && !profile?.phoneNumber;

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const handleSettlementChange = (ref: string, description: string) => {
        setSettlementRef(ref);
        setSettlementDescription(description);
        setWarehouseRef("");
    };

    const handleSubmit = async () => {
        setFormError(null);

        const nextFieldErrors: Record<string, string> = {};
        const trimmedFirstName = recipientFirstName.trim();
        const trimmedLastName = recipientLastName.trim();
        if (!trimmedFirstName || !trimmedLastName) {
            nextFieldErrors.recipientName = t("cart.errors.recipientRequired");
        }

        // Same phone validation/mask as SettingsPage (utils/phone.ts) — required here regardless of
        // recipient mode, since ukrainianPhoneErrorMessage() alone treats an empty phone as "valid"
        // (it's optional on the profile, but never optional for delivery).
        const subscriberDigits = extractSubscriberDigits(recipientPhone);
        if (subscriberDigits.length === 0) {
            nextFieldErrors.recipientPhone = t("checkout.recipient.phonePrompt");
        } else {
            const phoneError = ukrainianPhoneErrorMessage(subscriberDigits);
            if (phoneError) nextFieldErrors.recipientPhone = phoneError;
        }

        if (deliveryType === DeliveryType.OlxDelivery && (!settlementRef || !warehouseRef)) {
            nextFieldErrors.delivery = t("cart.errors.deliveryLocationRequired");
        }
        if (deliveryType === DeliveryType.Courier && !address.trim()) {
            nextFieldErrors.address = t("cart.errors.courierAddressRequired");
        }

        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length > 0) {
            setFormError(
                nextFieldErrors.recipientName ??
                    nextFieldErrors.recipientPhone ??
                    nextFieldErrors.delivery ??
                    nextFieldErrors.address ??
                    null
            );
            return;
        }

        const warehouse = warehouses.find((w) => w.ref === warehouseRef);

        try {
            const order = await createOrder({
                deliveryType,
                paymentMethod,
                settlementRef: deliveryType === DeliveryType.OlxDelivery ? settlementRef : undefined,
                settlementDescription: deliveryType === DeliveryType.OlxDelivery ? settlementDescription : undefined,
                warehouseRef: deliveryType === DeliveryType.OlxDelivery ? warehouseRef : undefined,
                warehouseDescription: deliveryType === DeliveryType.OlxDelivery ? warehouse?.description : undefined,
                address: deliveryType === DeliveryType.Courier ? address.trim() : undefined,
                // IOrderCreationModel only carries a single recipientName field (no firstName/
                // lastName split, no email) — combine here regardless of which recipient mode was
                // active so the payload shape stays identical either way.
                recipientName: `${trimmedFirstName} ${trimmedLastName}`.trim(),
                recipientPhone: recipientPhone.trim(),
                items: items.map((i) => ({ advertId: i.advertId, quantity: i.quantity })),
            }).unwrap();

            setCompletedOrder(order);
            dispatch(clearCart());
        } catch (err: any) {
            setFormError(err?.data?.message || t("cart.errors.orderFailed"));
        }
    };

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">{t("cart.title")}</h1>

            {items.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                    <ShoppingCartOutlined className="text-3xl mb-3 block" />
                    {t("cart.empty")}{" "}
                    <Link to="/" className="text-mm-purple font-semibold hover:underline">
                        {t("cart.goToCatalog")}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-3">
                        {items.map((item) => (
                            <div key={item.advertId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                                <Link to={`/advert/${item.advertId}`} className="relative shrink-0 w-20 h-20 aspect-square overflow-hidden rounded-lg bg-gray-100">
                                    <FallbackImage
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover object-center scale-110"
                                        placeholder={
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">{t("cart.noPhoto")}</div>
                                        }
                                    />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/advert/${item.advertId}`} className="text-sm font-semibold text-mm-navy hover:text-mm-purple line-clamp-2">
                                        {item.title}
                                    </Link>
                                    <p className="text-sm font-bold text-mm-navy mt-1">{item.price.toLocaleString("uk-UA")} {t("cart.currency")}</p>
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setQuantity({ advertId: item.advertId, quantity: item.quantity - 1 }))}
                                        className="w-8 h-8 flex items-center justify-center text-mm-navy hover:bg-gray-50"
                                    >
                                        <MinusOutlined />
                                    </button>
                                    <span className="w-8 text-center text-sm font-semibold text-mm-navy">{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setQuantity({ advertId: item.advertId, quantity: item.quantity + 1 }))}
                                        className="w-8 h-8 flex items-center justify-center text-mm-navy hover:bg-gray-50"
                                    >
                                        <PlusOutlined />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => dispatch(removeFromCart(item.advertId))}
                                    aria-label={t("cart.removeFromCart")}
                                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
                                >
                                    <DeleteOutlined />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-5 bg-white border border-gray-100 rounded-xl p-5 h-fit">
                        <div>
                            <h3 className="text-sm font-bold text-mm-navy mb-3">{t("cart.deliveryMethod")}</h3>
                            <div className="flex flex-col gap-2">
                                {DELIVERY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setDeliveryType(option.value)}
                                        className={`flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-lg border transition-colors text-left ${
                                            deliveryType === option.value
                                                ? "border-mm-purple bg-mm-lavender text-mm-purple"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                    >
                                        <option.icon /> {option.label}
                                    </button>
                                ))}
                            </div>

                            {deliveryType === DeliveryType.OlxDelivery && (
                                <div className="mt-3 flex flex-col gap-2">
                                    <SettlementPicker
                                        value={settlementRef}
                                        displayValue={settlementDescription || null}
                                        onChange={handleSettlementChange}
                                        label={t("cart.settlement")}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-mm-navy">{t("cart.warehouse")}</label>
                                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setWarehousePickerMode("list")}
                                                    aria-pressed={warehousePickerMode === "list"}
                                                    aria-label={t("cart.warehouseListView")}
                                                    className={`w-7 h-7 flex items-center justify-center text-xs transition-colors ${warehousePickerMode === "list" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                                >
                                                    <UnorderedListOutlined />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWarehousePickerMode("map")}
                                                    aria-pressed={warehousePickerMode === "map"}
                                                    aria-label={t("cart.warehouseMapView")}
                                                    disabled={!settlementRef}
                                                    className={`w-7 h-7 flex items-center justify-center text-xs border-l border-gray-200 transition-colors disabled:opacity-40 ${warehousePickerMode === "map" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                                >
                                                    <EnvironmentOutlined />
                                                </button>
                                            </div>
                                        </div>

                                        {warehousePickerMode === "list" ? (
                                            <Select
                                                showSearch
                                                placeholder={t("cart.warehousePlaceholder")}
                                                loading={isWarehousesLoading}
                                                disabled={!settlementRef}
                                                value={warehouseRef || undefined}
                                                optionFilterProp="label"
                                                onChange={(ref) => setWarehouseRef(ref)}
                                                options={warehouses.map((w) => ({ value: w.ref, label: `${branchLabel(w, t)} — ${w.description}` }))}
                                            />
                                        ) : (
                                            <>
                                                <WarehouseMapPicker
                                                    warehouses={warehouses}
                                                    value={warehouseRef}
                                                    onChange={setWarehouseRef}
                                                />
                                                <p className="text-xs text-gray-400 mt-1">{t("cart.mapHint")}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {deliveryType === DeliveryType.SelfPickup && (
                                <p className="mt-3 text-xs text-gray-500">{t("cart.selfPickupHint")}</p>
                            )}

                            {deliveryType === DeliveryType.Courier && (
                                <div className="mt-3">
                                    <label className="text-sm font-medium text-mm-navy">{t("cart.deliveryAddress")}</label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        rows={2}
                                        placeholder={t("cart.deliveryAddressPlaceholder")}
                                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-mm-navy mb-3">{t("cart.paymentMethod")}</h3>
                            <div className="flex flex-col gap-2">
                                {PAYMENT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(option.value)}
                                        className={`flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-lg border transition-colors text-left ${
                                            paymentMethod === option.value
                                                ? "border-mm-purple bg-mm-lavender text-mm-purple"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                    >
                                        <CreditCardOutlined /> {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="text-sm font-bold text-mm-navy">{t("cart.recipient")}</h3>

                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setRecipientMode("self")}
                                    aria-pressed={isRecipientSelf}
                                    className={`flex-1 text-sm font-medium px-3 py-2 transition-colors ${
                                        isRecipientSelf ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {t("checkout.recipient.self")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecipientMode("other")}
                                    aria-pressed={!isRecipientSelf}
                                    className={`flex-1 text-sm font-medium px-3 py-2 border-l border-gray-200 transition-colors ${
                                        !isRecipientSelf ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {t("checkout.recipient.other")}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder={t("settings.firstName")}
                                    value={recipientFirstName}
                                    onChange={(e) => setRecipientFirstName(e.target.value)}
                                    readOnly={recipientNameLocked}
                                    aria-invalid={!!fieldErrors.recipientName}
                                    className={`border rounded-lg px-3 py-2 text-sm outline-none ${
                                        recipientNameLocked
                                            ? "bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                                            : "border-gray-200 focus:border-mm-purple"
                                    }`}
                                />
                                <input
                                    type="text"
                                    placeholder={t("settings.lastName")}
                                    value={recipientLastName}
                                    onChange={(e) => setRecipientLastName(e.target.value)}
                                    readOnly={recipientNameLocked}
                                    aria-invalid={!!fieldErrors.recipientName}
                                    className={`border rounded-lg px-3 py-2 text-sm outline-none ${
                                        recipientNameLocked
                                            ? "bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                                            : "border-gray-200 focus:border-mm-purple"
                                    }`}
                                />
                            </div>
                            {recipientNameLocked && (
                                <p className="text-xs text-gray-400">{t("checkout.recipient.editHint")}</p>
                            )}
                            {fieldErrors.recipientName && <p className="text-red-500 text-xs">{fieldErrors.recipientName}</p>}

                            <PhoneInput
                                value={recipientPhone}
                                onChange={setRecipientPhone}
                                placeholder={t("cart.recipientPhonePlaceholder")}
                                aria-invalid={!!fieldErrors.recipientPhone}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                            {fieldErrors.recipientPhone ? (
                                <p className="text-red-500 text-xs">{fieldErrors.recipientPhone}</p>
                            ) : recipientPhoneMissingFromProfile ? (
                                <p className="text-xs text-gray-400">{t("checkout.recipient.phonePrompt")}</p>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <span className="text-sm text-gray-500">{t("cart.total")}</span>
                            <span className="text-lg font-black text-mm-navy">{total.toLocaleString("uk-UA")} {t("cart.currency")}</span>
                        </div>

                        {formError && <p className="text-red-500 text-xs">{formError}</p>}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? t("cart.submitting") : t("cart.placeOrder")}
                        </button>
                    </div>
                </div>
            )}

            <Modal
                open={!!completedOrder}
                onCancel={() => navigate("/")}
                footer={null}
                centered
                closable={false}
            >
                {completedOrder && (
                    <div className="flex flex-col items-center text-center gap-3 py-2">
                        <CheckCircleFilled className="text-4xl text-green-500" />
                        <h2 className="text-lg font-bold text-mm-navy">{t("cart.orderPlaced")}</h2>
                        <p className="text-sm text-gray-500">{t("cart.orderNumber", { id: completedOrder.id })}</p>

                        <div className="w-full text-left border-t border-gray-100 mt-2 pt-3 flex flex-col gap-1.5">
                            {completedOrder.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600 truncate pr-2">{item.title} × {item.quantity}</span>
                                    <span className="text-mm-navy font-medium shrink-0">{(item.price * item.quantity).toLocaleString("uk-UA")} {t("cart.currency")}</span>
                                </div>
                            ))}
                        </div>

                        <div className="w-full flex justify-between border-t border-gray-100 pt-3 text-sm">
                            <span className="text-gray-500">{DELIVERY_LABELS[completedOrder.deliveryType]}</span>
                            <span className="text-gray-500">{PAYMENT_LABELS[completedOrder.paymentMethod]}</span>
                        </div>

                        <div className="w-full flex justify-between pt-1">
                            <span className="text-sm font-semibold text-mm-navy">{t("cart.total")}</span>
                            <span className="text-lg font-black text-mm-navy">{completedOrder.totalPrice.toLocaleString("uk-UA")} {t("cart.currency")}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-full mt-2 bg-mm-navy hover:bg-mm-navy/90 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                        >
                            {t("cart.backToHome")}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CartPage;
