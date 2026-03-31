namespace WebApplication25.Configuration.Mapping
{
    public static class ServiceLocator
    {
        public static IServiceProvider ServiceProviderPublic { get;  set; }
        public static IConfiguration Configuration => ServiceProviderPublic.GetRequiredService<IConfiguration>();   
    }
}
