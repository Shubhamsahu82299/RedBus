namespace RedBus.Shared.Entities;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer"; // Customer or Admin
    public string Gender { get; set; } = "Male"; // Male, Female, Other
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}