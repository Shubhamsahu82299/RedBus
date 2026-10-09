namespace RedBus.Shared.Contracts;

// Har passenger ki individual detail
public class PassengerDetailDto
{
    public int SeatId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Gender { get; set; } = "Male";
    public int Age { get; set; } = 24;
}

// Frontend se /api/bookings/hold par aane wala payload DTO
public class HoldBookingRequest
{
    public int ScheduleId { get; set; }
    public int UserId { get; set; } = 1;
    public List<int> SeatIds { get; set; } = new();
    public string PassengerName { get; set; } = string.Empty;
    public string PassengerEmail { get; set; } = string.Empty;
    public string PassengerPhone { get; set; } = string.Empty;
    public string PassengerGender { get; set; } = "Male";
    public string SeatNumbers { get; set; } = string.Empty;
    public List<PassengerDetailDto> Passengers { get; set; } = new();
    public string BoardingPointName { get; set; } = string.Empty;
    public string BoardingLandmark { get; set; } = string.Empty;
    public string BoardingTime { get; set; } = string.Empty;
    public string DroppingPointName { get; set; } = string.Empty;
    public string DroppingLandmark { get; set; } = string.Empty;
    public string DroppingTime { get; set; } = string.Empty;
}

// Payment confirmation request DTO
public class ConfirmPaymentRequest
{
    public Guid BookingId { get; set; }
    public string? PaymentReference { get; set; }
}

// Worker message bus events
public record SeatHoldRequestedEvent
{
    public Guid BookingId { get; init; }
    public int ScheduleId { get; init; }
    public List<int> SeatIds { get; init; } = new();
    public string PassengerEmail { get; init; } = string.Empty;
    public string PassengerPhone { get; init; } = string.Empty;
    public string PassengerGender { get; init; } = "Male";
    public decimal TotalAmount { get; init; }
    public List<PassengerDetailDto> Passengers { get; init; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public record BookingConfirmedEvent
{
    public Guid BookingId { get; init; }
    public string PaymentReference { get; init; } = string.Empty;
    public DateTime ConfirmedAt { get; init; } = DateTime.UtcNow;
}