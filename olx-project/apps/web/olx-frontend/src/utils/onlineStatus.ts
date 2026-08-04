// Бекенд не має булевого поля "онлайн" — лише LastActivity (timestamp).
// Вважаємо користувача "онлайн", якщо остання активність була нещодавно.
const ONLINE_THRESHOLD_MINUTES = 5;

export const isUserOnline = (lastActivity: string | null | undefined): boolean => {
    if (!lastActivity) return false;
    const last = new Date(lastActivity).getTime();
    if (Number.isNaN(last)) return false;
    return (Date.now() - last) / 60000 <= ONLINE_THRESHOLD_MINUTES;
};
