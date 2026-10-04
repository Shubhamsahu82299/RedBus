using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Data;

namespace RedBus.Worker.Services;

public class ExpiredHoldCleanupWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpiredHoldCleanupWorker> _logger;

    public ExpiredHoldCleanupWorker(IServiceProvider serviceProvider, ILogger<ExpiredHoldCleanupWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var now = DateTime.UtcNow;

                var expiredHolds = await db.SeatReservations
                    .Where(r => r.Status == "Held" && r.HoldExpiresAt < now)
                    .ToListAsync(stoppingToken);

                if (expiredHolds.Any())
                {
                    _logger.LogInformation("Found {Count} expired seat holds. Reverting to Available...", expiredHolds.Count);

                    foreach (var seat in expiredHolds)
                    {
                        var booking = await db.Bookings.FindAsync(new object[] { seat.BookingId! }, stoppingToken);
                        if (booking is { Status: "Held" })
                        {
                            booking.Status = "Expired_Cancelled";
                        }

                        seat.Status = "Available";
                        seat.BookingId = null;
                        seat.HoldExpiresAt = null;
                        seat.PassengerGender = null;
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while running expired seat cleanup loop.");
            }

            // Runs cleanup check every 15 seconds
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}