namespace Olx.BLL.Entities
{
    // Стан товару в оголошенні ("Б/в" / "Нове"). None covers both "not specified" and every
    // category where condition genuinely doesn't apply (e.g. Тварини, Робота, Послуги — see
    // DbSeeder's exclusion list for the seeded-data equivalent of that same rule).
    public enum ItemCondition
    {
        None = 0,
        Used = 1,
        New = 2
    }
}
