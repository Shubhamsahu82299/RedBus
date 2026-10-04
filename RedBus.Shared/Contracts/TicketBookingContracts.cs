namespace RedBus.Shared.Contracts;

public record SeatHoldRequestedEvent
{
    public Guid BookingId { get; init; }
    public int ScheduleId { get; init; }
    public List<int> SeatIds { get; init; } = new();
    public string PassengerEmail { get; init; } = string.Empty;
    public string PassengerPhone { get; init; } = string.Empty;
    public string PassengerGender { get; init; } = "Male";
    public decimal TotalAmount { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public record BookingConfirmedEvent
{
    public Guid BookingId { get; init; }
    public string PaymentReference { get; init; } = string.Empty;
    public DateTime ConfirmedAt { get; init; } = DateTime.UtcNow;
}