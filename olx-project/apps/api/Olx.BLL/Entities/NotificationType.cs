namespace Olx.BLL.Entities
{
    // Категорія Notification — керує іконкою/групуванням у майбутньому та дозволяє фронтенду
    // відрізняти типи повідомлень без парсингу Title/Message. General лишається значенням за
    // замовчуванням для будь-яких існуючих рядків tbl_Notifications (заповнених до цього стовпця).
    public enum NotificationType
    {
        General = 0,
        Welcome = 1,
        OrderPlaced = 2,
        PasswordChanged = 3,
        NewChat = 4,
    }
}
