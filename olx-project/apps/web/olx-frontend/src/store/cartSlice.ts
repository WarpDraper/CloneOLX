import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Бекенд не має API кошика (є лише POST /api/advert/buy/{id} — разова покупка одного оголошення).
// Тому кошик реалізовано локально: кожне оголошення унікальне, "кількість" — суто UI-концепція
// (скільки одиниць товару хоче купець), реальний бекенд-запит на купівлю однаковий.
export interface CartItem {
    advertId: number;
    title: string;
    price: number;
    image: string | null;
    quantity: number;
}

interface CartState {
    items: CartItem[];
}

const CART_STORAGE_KEY = "cart";

const getInitialState = (): CartState => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return { items: [] };
        }
    }
    return { items: [] };
};

const persist = (state: CartState) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
};

const cartSlice = createSlice({
    name: "cart",
    initialState: getInitialState(),
    reducers: {
        addToCart: (state, action: PayloadAction<Omit<CartItem, "quantity"> & { quantity?: number }>) => {
            const existing = state.items.find((i) => i.advertId === action.payload.advertId);
            if (existing) {
                existing.quantity += action.payload.quantity ?? 1;
            } else {
                state.items.push({ ...action.payload, quantity: action.payload.quantity ?? 1 });
            }
            persist(state);
        },
        setQuantity: (state, action: PayloadAction<{ advertId: number; quantity: number }>) => {
            const item = state.items.find((i) => i.advertId === action.payload.advertId);
            if (item) {
                item.quantity = Math.max(1, action.payload.quantity);
                persist(state);
            }
        },
        removeFromCart: (state, action: PayloadAction<number>) => {
            state.items = state.items.filter((i) => i.advertId !== action.payload);
            persist(state);
        },
        clearCart: (state) => {
            state.items = [];
            persist(state);
        },
    },
});

export const { addToCart, setQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
