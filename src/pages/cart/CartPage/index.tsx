import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Select } from "antd";
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
import { useCreateOrderMutation } from "../../../services/orderService";
import { useGetWarehousesBySettlementQuery } from "../../../services/newPostService";
import SettlementPicker from "../../../components/location/SettlementPicker";
import WarehouseMapPicker from "../../../components/location/WarehouseMapPicker";
import { DeliveryType, PaymentMethod, type IOrder } from "../../../types/order/IOrder";

const DELIVERY_OPTIONS: { value: DeliveryType; label: string; icon: React.ComponentType }[] = [
    { value: DeliveryType.OlxDelivery, label: "OLX Доставка", icon: CarOutlined },
    { value: DeliveryType.SelfPickup, label: "Самовивіз", icon: ShopOutlined },
    { value: DeliveryType.Courier, label: "Кур'єрська доставка", icon: HomeOutlined },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
    { value: PaymentMethod.CardOnline, label: "Оплата карткою онлайн" },
    { value: PaymentMethod.CashOnDelivery, label: "Оплата при отриманні (Накладений платіж)" },
];

const DELIVERY_LABELS: Record<DeliveryType, string> = {
    [DeliveryType.OlxDelivery]: "OLX Доставка",
    [DeliveryType.SelfPickup]: "Самовивіз",
    [DeliveryType.Courier]: "Кур'єрська доставка",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    [PaymentMethod.CardOnline]: "Оплата карткою онлайн",
    [PaymentMethod.CashOnDelivery]: "Оплата при отриманні (Накладений платіж)",
};

// Кошик + оформлення замовлення в один потік: список позицій, вибір доставки/оплати,
// підтвердження замовлення. Кошик — лише для авторизованих (додати товар без входу неможливо,
// AdvertCard/RecommendationCard ведуть на /login), тому сторінка гейтиться так само як обране.
const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const items = useSelector((state: RootState) => state.cart.items);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.OlxDelivery);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CardOnline);
    const [settlementRef, setSettlementRef] = useState("");
    const [settlementDescription, setSettlementDescription] = useState("");
    const [warehouseRef, setWarehouseRef] = useState("");
    const [address, setAddress] = useState("");
    const [recipientName, setRecipientName] = useState(user?.name ?? "");
    const [recipientPhone, setRecipientPhone] = useState(user?.phoneNumber ?? "");
    const [formError, setFormError] = useState<string | null>(null);
    const [completedOrder, setCompletedOrder] = useState<IOrder | null>(null);
    const [warehousePickerMode, setWarehousePickerMode] = useState<"list" | "map">("list");

    const { data: warehouses = [], isLoading: isWarehousesLoading } = useGetWarehousesBySettlementQuery(settlementRef, {
        skip: !settlementRef || deliveryType !== DeliveryType.OlxDelivery,
    });
    const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();

    if (!isAuth) return null;

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const handleSettlementChange = (ref: string, description: string) => {
        setSettlementRef(ref);
        setSettlementDescription(description);
        setWarehouseRef("");
    };

    const handleSubmit = async () => {
        setFormError(null);

        if (!recipientName.trim() || !recipientPhone.trim()) {
            setFormError("Вкажіть ім'я та телефон отримувача.");
            return;
        }
        if (deliveryType === DeliveryType.OlxDelivery && (!settlementRef || !warehouseRef)) {
            setFormError("Оберіть населений пункт і відділення для доставки.");
            return;
        }
        if (deliveryType === DeliveryType.Courier && !address.trim()) {
            setFormError("Вкажіть адресу для кур'єрської доставки.");
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
                recipientName: recipientName.trim(),
                recipientPhone: recipientPhone.trim(),
                items: items.map((i) => ({ advertId: i.advertId, quantity: i.quantity })),
            }).unwrap();

            setCompletedOrder(order);
            dispatch(clearCart());
        } catch (err: any) {
            setFormError(err?.data?.message || "Не вдалося оформити замовлення. Спробуйте ще раз.");
        }
    };

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">Кошик</h1>

            {items.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                    <ShoppingCartOutlined className="text-3xl mb-3 block" />
                    Кошик порожній.{" "}
                    <Link to="/" className="text-mm-purple font-semibold hover:underline">
                        Перейти до каталогу
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-3">
                        {items.map((item) => (
                            <div key={item.advertId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                                <Link to={`/advert/${item.advertId}`} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">Немає фото</div>
                                    )}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/advert/${item.advertId}`} className="text-sm font-semibold text-mm-navy hover:text-mm-purple line-clamp-2">
                                        {item.title}
                                    </Link>
                                    <p className="text-sm font-bold text-mm-navy mt-1">{item.price.toLocaleString("uk-UA")} грн.</p>
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
                                    aria-label="Видалити з кошика"
                                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
                                >
                                    <DeleteOutlined />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-5 bg-white border border-gray-100 rounded-xl p-5 h-fit">
                        <div>
                            <h3 className="text-sm font-bold text-mm-navy mb-3">Спосіб доставки</h3>
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
                                        label="Населений пункт"
                                    />
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-mm-navy">Відділення</label>
                                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setWarehousePickerMode("list")}
                                                    aria-pressed={warehousePickerMode === "list"}
                                                    aria-label="Список відділень"
                                                    className={`w-7 h-7 flex items-center justify-center text-xs transition-colors ${warehousePickerMode === "list" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                                >
                                                    <UnorderedListOutlined />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWarehousePickerMode("map")}
                                                    aria-pressed={warehousePickerMode === "map"}
                                                    aria-label="Карта відділень"
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
                                                placeholder="Оберіть відділення Нової пошти / Укрпошти"
                                                loading={isWarehousesLoading}
                                                disabled={!settlementRef}
                                                value={warehouseRef || undefined}
                                                optionFilterProp="label"
                                                onChange={(ref) => setWarehouseRef(ref)}
                                                options={warehouses.map((w) => ({ value: w.ref, label: w.description }))}
                                            />
                                        ) : (
                                            <>
                                                <WarehouseMapPicker
                                                    warehouses={warehouses}
                                                    value={warehouseRef}
                                                    onChange={setWarehouseRef}
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Натисніть на мітку, щоб обрати відділення.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {deliveryType === DeliveryType.SelfPickup && (
                                <p className="mt-3 text-xs text-gray-500">Самовивіз з магазину продавця — адресу узгодите з продавцем після оформлення.</p>
                            )}

                            {deliveryType === DeliveryType.Courier && (
                                <div className="mt-3">
                                    <label className="text-sm font-medium text-mm-navy">Адреса доставки</label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        rows={2}
                                        placeholder="Місто, вулиця, будинок, квартира"
                                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-mm-navy mb-3">Спосіб оплати</h3>
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
                            <h3 className="text-sm font-bold text-mm-navy">Отримувач</h3>
                            <input
                                type="text"
                                placeholder="Ім'я та прізвище"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                            <input
                                type="tel"
                                placeholder="Номер телефону"
                                value={recipientPhone}
                                onChange={(e) => setRecipientPhone(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <span className="text-sm text-gray-500">Разом</span>
                            <span className="text-lg font-black text-mm-navy">{total.toLocaleString("uk-UA")} грн.</span>
                        </div>

                        {formError && <p className="text-red-500 text-xs">{formError}</p>}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? "Оформлення..." : "Оформити замовлення"}
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
                        <h2 className="text-lg font-bold text-mm-navy">Замовлення оформлено!</h2>
                        <p className="text-sm text-gray-500">Номер замовлення №{completedOrder.id}</p>

                        <div className="w-full text-left border-t border-gray-100 mt-2 pt-3 flex flex-col gap-1.5">
                            {completedOrder.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600 truncate pr-2">{item.title} × {item.quantity}</span>
                                    <span className="text-mm-navy font-medium shrink-0">{(item.price * item.quantity).toLocaleString("uk-UA")} грн.</span>
                                </div>
                            ))}
                        </div>

                        <div className="w-full flex justify-between border-t border-gray-100 pt-3 text-sm">
                            <span className="text-gray-500">{DELIVERY_LABELS[completedOrder.deliveryType]}</span>
                            <span className="text-gray-500">{PAYMENT_LABELS[completedOrder.paymentMethod]}</span>
                        </div>

                        <div className="w-full flex justify-between pt-1">
                            <span className="text-sm font-semibold text-mm-navy">Разом</span>
                            <span className="text-lg font-black text-mm-navy">{completedOrder.totalPrice.toLocaleString("uk-UA")} грн.</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-full mt-2 bg-mm-navy hover:bg-mm-navy/90 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                        >
                            На головну
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CartPage;
