namespace OLX.API.Models.Seeder
{
    public class SeederAdvertModel
    {
        public int UserId { get; init; }
        public string PhoneNumber { get; init; } = string.Empty;
        public string ContactEmail { get; init; } = string.Empty;
        public string ContactPersone { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public bool IsContractPrice { get; init; }
        public decimal Price { get; init; }
        public int CategoryId { get; init; }
        // Optional root-to-leaf category name path (e.g. ["Авто", "Легкові автомобілі"]).
        // When present, DBSeeder resolves this to the real DB-assigned CategoryId after the
        // category tree is seeded — far more robust than a hand-copied numeric id, since
        // category ids are auto-generated on insert and depend on Categories.json's shape.
        // Falls back to CategoryId above if the path can't be resolved.
        public IReadOnlyList<string>? CategoryPath { get; init; }
        public string SettlementRef { get; init; } = string.Empty;
        public ICollection<int> FilterValueIds { get; init; } = new HashSet<int>();
        public ICollection<string> ImagePaths { get; init; } = [];
    }
}
