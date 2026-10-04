using MassTransit;
using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Contracts;
using RedBus.Shared.Data;
using RedBus.Shared.Services;
using RedBus.Worker.Services;

namespace RedBus.Worker.Consumers;

public class BookingConfirmedConsumer : IConsumer<BookingConfirmedEvent>
{
    private readonly AppDbContext _db;
    private readonly TicketPdfService _pdfService;
    private readonly ILogger<BookingConfirmedConsumer> _logger;

    public BookingConfirmedConsumer(
        AppDbContext db, 
        TicketPdfService pdfService, 
        ILogger<BookingConfirmedConsumer> logger)
    {
        _db = db;
        _pdfService = pdfService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<BookingConfirmedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing confirmed payment for Booking ID: {BookingId}", msg.BookingId);

        var booking = await _db.Bookings
            .Include(b => b.Schedule)
                .ThenInclude(s => s!.Bus)
            .Include(b => b.Schedule)
                .ThenInclude(s => s!.Route)
            .FirstOrDefaultAsync(b => b.Id == msg.BookingId);

        if (booking is null)
        {
            _logger.LogError("Booking not found: {BookingId}", msg.BookingId);
            return;
        }

        // 1. Mark confirmed
        booking.Status = "Confirmed";
        booking.PaymentReference = msg.PaymentReference;

        // 2. Lock reserved seats permanently
        var seats = await _db.SeatReservations
            .Where(r => r.BookingId == msg.BookingId)
            .ToListAsync();

        foreach (var seat in seats)
        {
            seat.Status = "Booked";
            seat.HoldExpiresAt = null;

            // Apply FemaleOnly rule to adjacent berth
            if (string.Equals(seat.PassengerGender, "Female", StringComparison.OrdinalIgnoreCase))
            {
                var adjacentSeatId = (seat.SeatId % 2 != 0) ? seat.SeatId + 1 : seat.SeatId - 1;
                var adjacentReservation = await _db.SeatReservations
                    .FirstOrDefaultAsync(r => r.ScheduleId == seat.ScheduleId && r.SeatId == adjacentSeatId);

                if (adjacentReservation is { Status: "Available" })
                {
                    adjacentReservation.GenderRestriction = "FemaleOnly";
                    _logger.LogInformation("Marked adjacent Seat ID {SeatId} as FemaleOnly", adjacentSeatId);
                }
            }
        }

        await _db.SaveChangesAsync();

        // 3. Generate Digital PDF Boarding Pass & save locally
        try
        {
            var pdfBytes = _pdfService.GenerateBoardingPass(booking, booking.Schedule!);
            var ticketsDir = Path.Combine(Directory.GetCurrentDirectory(), "../GeneratedTickets");
            Directory.CreateDirectory(ticketsDir);

            var pdfPath = Path.Combine(ticketsDir, $"Ticket_{booking.Id}.pdf");
            await File.WriteAllBytesAsync(pdfPath, pdfBytes);

            _logger.LogInformation("PDF E-Ticket generated successfully at: {Path}", pdfPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compile PDF Ticket for booking {BookingId}", booking.Id);
        }
    }
}