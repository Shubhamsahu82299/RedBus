namespace RedBus.Shared.Entities;

public class Booking
{
    public Guid Id { get; set; }
    public int ScheduleId { get; set; }
    public Schedule? Schedule { get; set; }

    public int UserId { get; set; }
    public string PassengerName { get; set; } = "Primary Passenger";
    public string PassengerEmail { get; set; } = string.Empty;
    public string PassengerPhone { get; set; } = string.Empty;
    public string PassengerGender { get; set; } = "Male";

    public string SeatNumbers { get; set; } = string.Empty;
    public string BoardingPointName { get; set; } = "Telibandha Bus Stand";
    public string BoardingLandmark { get; set; } = "Near Magneto Mall Bridge";
    public string BoardingTime { get; set; } = "18:30";

    public string DroppingPointName { get; set; } = "Wakad Bridge (Hinjewadi)";
    public string DroppingLandmark { get; set; } = "Near Ginger Hotel";
    public string DroppingTime { get; set; } = "07:30";

    public decimal BaseFare { get; set; }
    public decimal DiscountAmount { get; set; } = 120m;
    public decimal GstAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Held";
    public string? PaymentReference { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}