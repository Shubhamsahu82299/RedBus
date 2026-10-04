namespace RedBus.Shared.Entities;

public class Schedule
{
    public int Id { get; set; }
    public int BusId { get; set; }
    public Bus? Bus { get; set; }

    public int RouteId { get; set; }
    public Route? Route { get; set; }

    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal BaseFare { get; set; }
    public decimal SurgeMultiplier { get; set; } = 1.0m;

    public ICollection<SeatReservation> Reservations { get; set; } = new List<SeatReservation>();
}