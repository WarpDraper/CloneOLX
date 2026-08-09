// Легасі-евристика для даних без реального SignalR-присутності (seed-фолбек тощо):
// вважаємо користувача "онлайн", якщо остання активність була нещодавно.
const ONLINE_THRESHOLD_MINUTES = 5;

export const isUserOnline = (lastActivity: string | null | undefined): boolean => {
    if (!lastActivity) return false;
    const last = new Date(lastActivity).getTime();
    if (Number.isNaN(last)) return false;
    return (Date.now() - last) / 60000 <= ONLINE_THRESHOLD_MINUTES;
};

/** "Був(ла) в мережі 5 хв тому" / "... вчора" / "... 12.08.2026" — компактний відносний формат. */
export const formatLastSeen = (lastSeen: string | null | undefined): string => {
    if (!lastSeen) return "Був(ла) в мережі давно";
    const date = new Date(lastSeen);
    if (Number.isNaN(date.getTime())) return "Був(ла) в мережі давно";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Був(ла) в мережі щойно";
    if (diffMinutes < 60) return `Був(ла) в мережі ${diffMinutes} хв тому`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Був(ла) в мережі ${diffHours} год тому`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Був(ла) в мережі вчора";
    if (diffDays < 7) return `Був(ла) в мережі ${diffDays} дн. тому`;

    return `Був(ла) в мережі ${date.toLocaleDateString("uk-UA")}`;
};
