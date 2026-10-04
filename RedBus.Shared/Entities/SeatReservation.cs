namespace RedBus.Shared.Entities;

public class SeatReservation
{
    public int Id { get; set; }
    public int ScheduleId { get; set; }
    public int SeatId { get; set; }
    public Seat? Seat { get; set; }

    public Guid? BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string Status { get; set; } = "Available"; // Available, Held, Booked
    public string GenderRestriction { get; set; } = "None"; // None, FemaleOnly
    public string? PassengerGender { get; set; }
    public DateTime? HoldExpiresAt { get; set; }
}
