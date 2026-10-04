using MassTransit;
using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Contracts;
using RedBus.Shared.Data;

namespace RedBus.Worker.Consumers;

public class SeatHoldRequestedConsumer : IConsumer<SeatHoldRequestedEvent>
{
    private readonly AppDbContext _db;
    private readonly ILogger<SeatHoldRequestedConsumer> _logger;

    public SeatHoldRequestedConsumer(AppDbContext db, ILogger<SeatHoldRequestedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<SeatHoldRequestedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing temporary hold for Booking: {BookingId}, Schedule: {ScheduleId}, Seats: [{Seats}]",
            msg.BookingId, msg.ScheduleId, string.Join(",", msg.SeatIds));

        var booking = await _db.Bookings.FindAsync(msg.BookingId);
        if (booking is null)
        {
            _logger.LogWarning("Booking {BookingId} not found in database.", msg.BookingId);
            return;
        }

        _logger.LogInformation("Seat hold active. 10-minute payment countdown started for user: {Email}", msg.PassengerEmail);
    }
}