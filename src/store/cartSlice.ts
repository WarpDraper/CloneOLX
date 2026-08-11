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
    // Id of the user the persisted `items` belong to (or null for a signed-out/guest cart).
    // Lets us detect "a different account is now using this browser" and drop the stale
    // cart instead of leaking one user's items into another user's freshly created/logged-in
    // session (see syncCartOwner below).
    ownerId: string | null;
}

const CART_STORAGE_KEY = "cart";

const getInitialState = (): CartState => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { items: parsed.items ?? [], ownerId: parsed.ownerId ?? null };
        } catch {
            return { items: [], ownerId: null };
        }
    }
    return { items: [], ownerId: null };
};

const persist = (state: CartState) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
};

const cartSlice = createSlice({
    name: "cart",
    initialState: getInitialState(),
    reducers: {
        // Called whenever the active account changes (login, register, logout). If the cart
        // in storage belonged to a different user (or no one), it's stale/foreign data —
        // reset to an empty cart for the new owner instead of showing it. This is what
        // guarantees a newly registered or newly logged-in user always starts from [].
        syncCartOwner: (state, action: PayloadAction<string | null>) => {
            if (state.ownerId !== action.payload) {
                state.items = [];
                state.ownerId = action.payload;
                persist(state);
            }
        },
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

export const { syncCartOwner, addToCart, setQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
