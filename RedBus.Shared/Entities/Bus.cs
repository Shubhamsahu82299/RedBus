namespace RedBus.Shared.Entities;

public class Bus
{
    public int Id { get; set; }
    public string OperatorName { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string BusType { get; set; } = "AC Sleeper 2+1";
    public int TotalSeats { get; set; }
    public double Rating { get; set; } = 4.8;

    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
}