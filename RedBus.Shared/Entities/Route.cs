namespace RedBus.Shared.Entities;

public class Route
{
    public int Id { get; set; }
    public string SourceCity { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public int DistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }

    public ICollection<BoardingPoint> BoardingPoints { get; set; } = new List<BoardingPoint>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
}

public class BoardingPoint
{
    public int Id { get; set; }
    public int RouteId { get; set; }
    public string LandmarkName { get; set; } = string.Empty;
    public int PickupOffsetMinutes { get; set; }
}