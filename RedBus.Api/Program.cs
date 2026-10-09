using MassTransit;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using RedBus.Shared.Contracts;
using RedBus.Shared.Data;
using RedBus.Shared.Entities;
using RedBus.Shared.Services;

// Explicit Alias to prevent collision with MassTransit.Bus
using BusEntity = RedBus.Shared.Entities.Bus;
using RouteEntity = RedBus.Shared.Entities.Route;

var builder = WebApplication.CreateBuilder(args);

// 1. Shared PostgreSQL Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? Environment.GetEnvironmentVariable("POSTGRES_URL");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(connectionString))
    {
        options.UseNpgsql(connectionString);
    }
});

// 2. Register PDF Service inside API for instant on-demand fallback
builder.Services.AddSingleton<TicketPdfService>();

// 3. MassTransit Publisher Configuration
var rabbitMqUrl = Environment.GetEnvironmentVariable("RABBITMQ_URL") 
    ?? builder.Configuration["RABBITMQ_URL"] 
    ?? "amqps://nznmdgce:IWQkbR3LSELVQWQhGP9u7I0vZi221da0@warthog.lmq.cloudamqp.com/nznmdgce";

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        var uri = new Uri(rabbitMqUrl);
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo.Length > 0 ? userInfo[0] : "guest";
        var password = userInfo.Length > 1 ? userInfo[1] : "guest";
        var vhost = uri.AbsolutePath.TrimStart('/');
        if (string.IsNullOrEmpty(vhost)) vhost = "/";

        cfg.Host(uri.Host, (ushort)(uri.Port > 0 ? uri.Port : 5671), vhost, h =>
        {
            h.Username(username);
            h.Password(password);
            if (uri.Scheme == "amqps" || uri.Scheme == "rabbitmqs")
            {
                h.UseSsl(s =>
                {
                    s.Protocol = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13;
                });
            }
        });

        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
    });
});

// Non-blocking start for Render
builder.Services.AddOptions<MassTransitHostOptions>()
    .Configure(options =>
    {
        options.WaitUntilStarted = false;
        options.StartTimeout = TimeSpan.FromSeconds(30);
        options.StopTimeout = TimeSpan.FromSeconds(30);
    });

// 4. CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Auto-seed/ensure DB exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// ==========================================
// CLIENT CONTRACT ENDPOINTS
// ==========================================

// 1. GET: Seats for a Schedule (Deck, Pricing, Status)
app.MapGet("/api/schedules/{scheduleId:int}/seats", async (int scheduleId, AppDbContext db) =>
{
    var now = DateTime.UtcNow;

    var reservations = await db.SeatReservations
        .Include(r => r.Seat)
        .Where(r => r.ScheduleId == scheduleId)
        .ToListAsync();

    // Release any expired holds
    var expired = reservations.Where(r => r.Status == "Held" && r.HoldExpiresAt < now).ToList();
    if (expired.Any())
    {
        foreach (var r in expired)
        {
            r.Status = "Available";
            r.BookingId = null;
            r.HoldExpiresAt = null;
            r.PassengerGender = null;
        }
        await db.SaveChangesAsync();
    }

    var schedule = await db.Schedules.FindAsync(scheduleId);
    if (schedule is null) return Results.NotFound("Schedule not found.");

    var result = reservations.Select(r => new
    {
        seatId = r.SeatId,
        seatNumber = r.Seat!.SeatNumber,
        deck = r.Seat.Deck,
        seatType = r.Seat.SeatType,
        price = (int)Math.Round(schedule.BaseFare * schedule.SurgeMultiplier * r.Seat.ExtraFareMultiplier),
        status = r.Status,
        genderRestriction = r.GenderRestriction
    });

    return Results.Ok(result);
});

// 2. POST: 10-Minute Hold Request (Multi-Passenger Supported)
app.MapPost("/api/bookings/hold", async (HoldSeatRequest request, AppDbContext db, IPublishEndpoint publishEndpoint) =>
{
    var now = DateTime.UtcNow;

    var schedule = await db.Schedules
        .Include(s => s.Bus)
        .Include(s => s.Route)
        .FirstOrDefaultAsync(s => s.Id == request.ScheduleId);

    if (schedule is null) return Results.BadRequest(new { message = "Invalid schedule." });

    var targetReservations = await db.SeatReservations
        .Include(r => r.Seat)
        .Where(r => r.ScheduleId == request.ScheduleId && request.SeatIds.Contains(r.SeatId))
        .ToListAsync();

    if (targetReservations.Count != request.SeatIds.Count)
        return Results.BadRequest(new { message = "One or more seats were not found." });

    var isTaken = targetReservations.Any(s => s.Status == "Booked" || (s.Status == "Held" && s.HoldExpiresAt > now));
    if (isTaken)
        return Results.Conflict(new { message = "One or more seats were just booked. Please pick another seat." });

    // Validate female-only seats
    foreach (var res in targetReservations)
    {
        var pasInfo = request.Passengers?.FirstOrDefault(p => p.SeatId == res.SeatId);
        var gender = pasInfo?.Gender ?? request.PassengerGender;

        if (res.GenderRestriction == "FemaleOnly" && string.Equals(gender, "Male", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new { message = $"Seat {res.Seat?.SeatNumber} is reserved for female passengers only." });
        }
    }

    var bookingId = Guid.NewGuid();
    var expiry = now.AddMinutes(10);

    // Update each reservation with its respective passenger details
    foreach (var res in targetReservations)
    {
        var pasInfo = request.Passengers?.FirstOrDefault(p => p.SeatId == res.SeatId);
        res.Status = "Held";
        res.BookingId = bookingId;
        res.PassengerGender = pasInfo?.Gender ?? request.PassengerGender;
        res.HoldExpiresAt = expiry;
    }

    // Exact fare calculation
    var baseTotal = targetReservations.Sum(r =>
        (decimal)Math.Round(schedule.BaseFare * schedule.SurgeMultiplier * r.Seat!.ExtraFareMultiplier));
    var discount = baseTotal > 0 ? 120m : 0m;
    var taxable = Math.Max(0, baseTotal - discount);
    var gst = Math.Round(taxable * 0.05m, 2);
    var netPayable = taxable + gst;

    var seatLabels = string.Join(", ", targetReservations.Select(s => s.Seat!.SeatNumber));

    // Consolidated Passenger names for reference
    var primaryPassengerName = !string.IsNullOrWhiteSpace(request.PassengerName)
        ? request.PassengerName
        : (request.Passengers?.FirstOrDefault()?.Name ?? "Primary Passenger");

    var booking = new Booking
    {
        Id = bookingId,
        ScheduleId = request.ScheduleId,
        UserId = request.UserId,
        PassengerName = primaryPassengerName,
        PassengerEmail = request.PassengerEmail,
        PassengerPhone = request.PassengerPhone,
        PassengerGender = request.PassengerGender,
        SeatNumbers = string.IsNullOrWhiteSpace(request.SeatNumbers) ? seatLabels : request.SeatNumbers,
        BoardingPointName = request.BoardingPointName ?? "Telibandha Bus Stand",
        BoardingLandmark = request.BoardingLandmark ?? "Near Magneto Mall Bridge",
        BoardingTime = request.BoardingTime ?? "18:30",
        DroppingPointName = request.DroppingPointName ?? "Wakad Bridge (Hinjewadi)",
        DroppingLandmark = request.DroppingLandmark ?? "Near Ginger Hotel",
        DroppingTime = request.DroppingTime ?? "07:30",
        BaseFare = baseTotal,
        DiscountAmount = discount,
        GstAmount = gst,
        TotalAmount = netPayable,
        Status = "Held",
        CreatedAt = now
    };

    db.Bookings.Add(booking);
    await db.SaveChangesAsync();

    // Non-blocking RabbitMQ publish
    _ = Task.Run(async () =>
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await publishEndpoint.Publish(new SeatHoldRequestedEvent
            {
                BookingId = bookingId,
                ScheduleId = request.ScheduleId,
                SeatIds = request.SeatIds,
                PassengerEmail = request.PassengerEmail,
                PassengerPhone = request.PassengerPhone,
                PassengerGender = request.PassengerGender,
                TotalAmount = netPayable,
                Passengers = request.Passengers ?? new List<PassengerDetailDto>(),
                CreatedAt = now
            }, cts.Token);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RabbitMQ Notice] Hold event skipped: {ex.Message}");
        }
    });

    return Results.Ok(new
    {
        bookingId = bookingId.ToString(),
        expiresAt = expiry,
        totalAmount = netPayable,
        message = "Seats held for 10 minutes."
    });
});

// 3. POST: Confirm Payment
app.MapPost("/api/payments/confirm", async (ConfirmPaymentRequest request, AppDbContext db, IPublishEndpoint publishEndpoint) =>
{
    var booking = await db.Bookings.FindAsync(request.BookingId);
    if (booking is null)
        return Results.NotFound(new { message = "Booking reference not found." });

    if (booking.Status == "Confirmed")
        return Results.Ok(new { message = "Booking already confirmed." });

    booking.Status = "Confirmed";
    booking.PaymentReference = request.PaymentReference ?? $"PAY_{Guid.NewGuid().ToString()[..8].ToUpper()}";

    var seats = await db.SeatReservations.Where(r => r.BookingId == request.BookingId).ToListAsync();
    foreach (var s in seats)
    {
        s.Status = "Booked";
        s.HoldExpiresAt = null;
    }

    await db.SaveChangesAsync();

    _ = Task.Run(async () =>
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await publishEndpoint.Publish(new BookingConfirmedEvent
            {
                BookingId = request.BookingId,
                PaymentReference = booking.PaymentReference,
                ConfirmedAt = DateTime.UtcNow
            }, cts.Token);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RabbitMQ Notice] Confirmation queue notice: {ex.Message}");
        }
    });

    return Results.Ok(new { message = "Payment confirmed. Boarding pass issued." });
});

// 4. GET: Ticket PDF Download
app.MapGet("/api/tickets/{bookingId}/download", async (
    string bookingId, 
    AppDbContext db, 
    TicketPdfService pdfService) =>
{
    var ticketsDir = Path.Combine(Directory.GetCurrentDirectory(), "../GeneratedTickets");
    Directory.CreateDirectory(ticketsDir);

    var pdfPath = Path.Combine(ticketsDir, $"Ticket_{bookingId}.pdf");

    if (File.Exists(pdfPath))
    {
        var fileBytes = await File.ReadAllBytesAsync(pdfPath);
        return Results.File(fileBytes, "application/pdf", $"BoardingPass_{bookingId[..Math.Min(8, bookingId.Length)]}.pdf");
    }

    if (!Guid.TryParse(bookingId, out var parsedGuid))
    {
        return Results.BadRequest(new { message = "Invalid booking ID format." });
    }

    var booking = await db.Bookings
        .Include(b => b.Schedule)
            .ThenInclude(s => s!.Bus)
        .Include(b => b.Schedule)
            .ThenInclude(s => s!.Route)
        .FirstOrDefaultAsync(b => b.Id == parsedGuid);

    if (booking is null)
    {
        return Results.NotFound(new { message = "Booking details not found in database." });
    }

    var schedule = booking.Schedule ?? await db.Schedules
        .Include(s => s.Bus)
        .Include(s => s.Route)
        .FirstOrDefaultAsync(s => s.Id == booking.ScheduleId);

    if (schedule is null)
    {
        return Results.NotFound(new { message = "Schedule details not found." });
    }

    var generatedBytes = pdfService.GenerateBoardingPass(booking, schedule);

    _ = Task.Run(async () =>
    {
        try { await File.WriteAllBytesAsync(pdfPath, generatedBytes); } catch { }
    });

    return Results.File(generatedBytes, "application/pdf", $"BoardingPass_{bookingId[..Math.Min(8, bookingId.Length)]}.pdf");
});

// ==========================================
// ADMIN DASHBOARD REST APIS
// ==========================================
app.MapGet("/api/buses", async (string? from, string? to, AppDbContext db) =>
{
    var query = db.Schedules
        .Include(s => s.Bus)
        .Include(s => s.Route)
        .Include(s => s.Reservations)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(from))
    {
        var src = from.Trim().ToLower();
        query = query.Where(s => s.Route != null && s.Route.SourceCity.ToLower() == src);
    }

    if (!string.IsNullOrWhiteSpace(to))
    {
        var dest = to.Trim().ToLower();
        query = query.Where(s => s.Route != null && s.Route.DestinationCity.ToLower() == dest);
    }

    var results = await query.ToListAsync();
    return Results.Ok(results);
});

app.MapGet("/buses", async (string? from, string? to, AppDbContext db) =>
{
    var query = db.Schedules
        .Include(s => s.Bus)
        .Include(s => s.Route)
        .Include(s => s.Reservations)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(from))
    {
        var src = from.Trim().ToLower();
        query = query.Where(s => s.Route != null && s.Route.SourceCity.ToLower() == src);
    }

    if (!string.IsNullOrWhiteSpace(to))
    {
        var dest = to.Trim().ToLower();
        query = query.Where(s => s.Route != null && s.Route.DestinationCity.ToLower() == dest);
    }

    var results = await query.ToListAsync();
    return Results.Ok(results);
});

app.MapGet("/api/admin/bookings", async (AppDbContext db) =>
{
    var bookings = await db.Bookings
        .Include(b => b.Schedule)
            .ThenInclude(s => s!.Bus)
        .Include(b => b.Schedule)
            .ThenInclude(s => s!.Route)
        .OrderByDescending(b => b.CreatedAt)
        .ToListAsync();

    var result = bookings.Select(b => new
    {
        bookingId = b.Id.ToString(),
        pnr = $"RB{b.Id.ToString()[..8].ToUpper()}",
        passengerName = b.PassengerName,
        passengerEmail = b.PassengerEmail,
        passengerPhone = b.PassengerPhone,
        passengerGender = b.PassengerGender,
        seatNumbers = b.SeatNumbers,
        operatorName = b.Schedule?.Bus?.OperatorName ?? "N/A",
        busNumber = b.Schedule?.Bus?.RegistrationNumber ?? "N/A",
        source = b.Schedule?.Route?.SourceCity ?? "N/A",
        destination = b.Schedule?.Route?.DestinationCity ?? "N/A",
        farePaid = b.TotalAmount,
        status = b.Status,
        paymentRef = b.PaymentReference ?? "PENDING",
        bookedAt = b.CreatedAt.ToString("dd MMM yyyy, hh:mm tt")
    });

    return Results.Ok(result);
});

app.MapPost("/api/admin/schedules/create", async (CreateScheduleRequest req, AppDbContext db) =>
{
    var route = await db.Routes.FirstOrDefaultAsync(r => 
        r.SourceCity.ToLower() == req.SourceCity.ToLower() && 
        r.DestinationCity.ToLower() == req.DestinationCity.ToLower());

    if (route == null)
    {
        route = new RedBus.Shared.Entities.Route
        {
            SourceCity = req.SourceCity,
            DestinationCity = req.DestinationCity,
            DistanceKm = req.DistanceKm > 0 ? req.DistanceKm : 500,
            EstimatedDurationMinutes = 600
        };
        db.Routes.Add(route);
        await db.SaveChangesAsync();
    }

    var bus = new BusEntity
    {
        OperatorName = req.OperatorName,
        RegistrationNumber = req.RegistrationNumber,
        BusType = req.LayoutCategory == "SLEEPER" ? "A/C Sleeper (2+1)" : "A/C Seater (2+2)",
        TotalSeats = req.TotalSeats,
        Rating = 4.8
    };
    db.Buses.Add(bus);
    await db.SaveChangesAsync();

    var schedule = new Schedule
    {
        BusId = bus.Id,
        RouteId = route.Id,
        DepartureTime = DateTime.UtcNow.Date.Add(TimeSpan.Parse(req.DepartureTime)),
        ArrivalTime = DateTime.UtcNow.Date.Add(TimeSpan.Parse(req.ArrivalTime)),
        BaseFare = req.BaseFare,
        SurgeMultiplier = 1.0m
    };
    db.Schedules.Add(schedule);
    await db.SaveChangesAsync();

    var seats = new List<Seat>();
    var reservations = new List<SeatReservation>();

    if (req.LayoutCategory == "SLEEPER")
    {
        int lowerCount = req.TotalSeats / 2;
        int upperCount = req.TotalSeats - lowerCount;

        for (int i = 1; i <= lowerCount; i++)
        {
            var s = new Seat { BusId = bus.Id, SeatNumber = $"L{i}", Deck = "Lower", SeatType = "Sleeper", ExtraFareMultiplier = 1.0m };
            seats.Add(s);
        }
        for (int i = 1; i <= upperCount; i++)
        {
            var s = new Seat { BusId = bus.Id, SeatNumber = $"U{i}", Deck = "Upper", SeatType = "Sleeper", ExtraFareMultiplier = 1.05m };
            seats.Add(s);
        }
    }
    else
    {
        for (int i = 1; i <= req.TotalSeats; i++)
        {
            var s = new Seat { BusId = bus.Id, SeatNumber = $"S{i}", Deck = "Lower", SeatType = "Seater", ExtraFareMultiplier = 1.0m };
            seats.Add(s);
        }
    }

    db.Seats.AddRange(seats);
    await db.SaveChangesAsync();

    foreach (var seat in seats)
    {
        reservations.Add(new SeatReservation
        {
            ScheduleId = schedule.Id,
            SeatId = seat.Id,
            Status = "Available",
            GenderRestriction = "None"
        });
    }

    db.SeatReservations.AddRange(reservations);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Bus Schedule & Seats provisioned successfully!", scheduleId = schedule.Id });
});

app.MapPost("/api/admin/reset-database", async (AppDbContext db) =>
{
    await db.Database.EnsureDeletedAsync();
    await db.Database.EnsureCreatedAsync();
    return Results.Ok(new { message = "Database wiped and reseeded with default fleets successfully." });
});

app.MapPost("/api/bookings/{bookingId}/cancel", async (string bookingId, AppDbContext db) =>
{
    if (!Guid.TryParse(bookingId, out var parsedGuid))
        return Results.BadRequest(new { message = "Invalid booking ID format." });

    var booking = await db.Bookings.FindAsync(parsedGuid);
    if (booking is null)
        return Results.NotFound(new { message = "Booking not found." });

    if (booking.Status == "Cancelled")
        return Results.BadRequest(new { message = "Ticket is already cancelled." });

    booking.Status = "Cancelled";

    var reservedSeats = await db.SeatReservations
        .Where(r => r.BookingId == parsedGuid)
        .ToListAsync();

    foreach (var seat in reservedSeats)
    {
        seat.Status = "Available";
        seat.BookingId = null;
        seat.HoldExpiresAt = null;
        seat.PassengerGender = null;
    }

    await db.SaveChangesAsync();

    var refundAmount = Math.Round(booking.TotalAmount * 0.80m, 2);

    return Results.Ok(new 
    { 
        message = "Ticket cancelled successfully. Seats are now available for booking.",
        pnr = $"RB{booking.Id.ToString()[..8].ToUpper()}",
        refundAmount = refundAmount,
        seatsReleased = reservedSeats.Count
    });
});

app.MapGet("/api/schedules/search", async (string? from, string? to, AppDbContext db) =>
{
    var query = db.Schedules
        .Include(s => s.Bus)
        .Include(s => s.Route)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(from))
        query = query.Where(s => s.Route!.SourceCity.ToLower() == from.Trim().ToLower());

    if (!string.IsNullOrWhiteSpace(to))
        query = query.Where(s => s.Route!.DestinationCity.ToLower() == to.Trim().ToLower());

    var list = await query.ToListAsync();

    var result = list.Select(s => new
    {
        scheduleId = s.Id,
        @operator = s.Bus != null ? s.Bus.OperatorName : "Super Express",
        busType = s.Bus != null ? s.Bus.BusType : "A/C Sleeper (2+1)",
        busNumber = s.Bus != null ? s.Bus.RegistrationNumber : "CG-04-X-2026",
        layout = (s.Bus != null && s.Bus.BusType.Contains("Sleeper")) ? "SLEEPER" : "SEATER",
        rating = s.Bus != null ? s.Bus.Rating : 4.8,
        reviews = 1240,
        from = s.Route != null ? s.Route.SourceCity : (from ?? "Raipur"),
        to = s.Route != null ? s.Route.DestinationCity : (to ?? "Durg"),
        dep = s.DepartureTime.ToString("HH:mm"),
        arr = s.ArrivalTime.ToString("HH:mm"),
        duration = $"{(int)(s.ArrivalTime - s.DepartureTime).TotalHours}h {(s.ArrivalTime - s.DepartureTime).Minutes}m",
        @base = (int)s.BaseFare,
        ac = true,
        primo = s.Bus != null && s.Bus.Rating >= 4.8,
        amenities = new[] { "Wi-Fi", "Charging Port", "Water Bottle", "Emergency SOS" },
        bps = new[] {
            new { id = $"bp_{s.Id}_1", name = $"{(s.Route != null ? s.Route.SourceCity : "City")} Central Stand", landmark = "Platform 1", time = s.DepartureTime.ToString("HH:mm") }
        },
        dps = new[] {
            new { id = $"dp_{s.Id}_1", name = $"{(s.Route != null ? s.Route.DestinationCity : "City")} Bypass Terminal", landmark = "Main Highway", time = s.ArrivalTime.ToString("HH:mm") }
        }
    });

    return Results.Ok(result);
});

app.Run();

// ==========================================
// DTO DEFINITIONS
// ==========================================
public record CreateScheduleRequest(
    string OperatorName,
    string RegistrationNumber,
    string LayoutCategory,
    int TotalSeats,
    string SourceCity,
    string DestinationCity,
    int DistanceKm,
    string DepartureTime,
    string ArrivalTime,
    decimal BaseFare
);

public record HoldSeatRequest(
    int ScheduleId,
    int UserId,
    List<int> SeatIds,
    string PassengerName,
    string PassengerEmail,
    string PassengerPhone,
    string PassengerGender,
    string? SeatNumbers,
    List<PassengerDetailDto>? Passengers,
    string? BoardingPointName,
    string? BoardingLandmark,
    string? BoardingTime,
    string? DroppingPointName,
    string? DroppingLandmark,
    string? DroppingTime
);