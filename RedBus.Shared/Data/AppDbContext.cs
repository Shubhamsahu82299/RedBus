using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Entities;

namespace RedBus.Shared.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Bus> Buses => Set<Bus>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<BoardingPoint> BoardingPoints => Set<BoardingPoint>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<SeatReservation> SeatReservations => Set<SeatReservation>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Buses
        modelBuilder.Entity<Bus>().HasData(
            new Bus { Id = 1, OperatorName = "Zingbus Electric SuperClass", RegistrationNumber = "MH-04-AZ-2026", BusType = "A/C Sleeper (2+1)", TotalSeats = 24, Rating = 4.8 },
            new Bus { Id = 2, OperatorName = "IntrCity SmartBus Executive", RegistrationNumber = "MH-12-EX-2026", BusType = "A/C Semi Sleeper (2+2)", TotalSeats = 20, Rating = 4.9 }
        );

        // 2. Route
        modelBuilder.Entity<Route>().HasData(
            new Route { Id = 1, SourceCity = "Raipur", DestinationCity = "Pune", DistanceKm = 850, EstimatedDurationMinutes = 840 }
        );

        // 3. Schedules
        modelBuilder.Entity<Schedule>().HasData(
            new Schedule { Id = 1, BusId = 1, RouteId = 1, DepartureTime = DateTime.UtcNow.AddHours(6), ArrivalTime = DateTime.UtcNow.AddHours(20), BaseFare = 1450m, SurgeMultiplier = 1.0m },
            new Schedule { Id = 2, BusId = 2, RouteId = 1, DepartureTime = DateTime.UtcNow.AddHours(8), ArrivalTime = DateTime.UtcNow.AddHours(21).AddMinutes(30), BaseFare = 950m, SurgeMultiplier = 1.0m }
        );

        // 4. Seats & Reservations
        var seats = new List<Seat>();
        var reservations = new List<SeatReservation>();
        int seatId = 1;
        int resId = 1;

        // Zingbus Sleeper: Lower Deck (L1 to L12)
        for (int i = 1; i <= 12; i++)
        {
            seats.Add(new Seat { Id = seatId, BusId = 1, SeatNumber = $"L{i}", Deck = "Lower", SeatType = "Sleeper", ExtraFareMultiplier = 1.0m });
            reservations.Add(new SeatReservation 
            { 
                Id = resId++, 
                ScheduleId = 1, 
                SeatId = seatId++, 
                Status = (i == 2 ? "Booked" : "Available"), 
                GenderRestriction = (i == 6 ? "FemaleOnly" : "None")
            });
        }

        // Zingbus Sleeper: Upper Deck (U1 to U12)
        for (int i = 1; i <= 12; i++)
        {
            seats.Add(new Seat { Id = seatId, BusId = 1, SeatNumber = $"U{i}", Deck = "Upper", SeatType = "Sleeper", ExtraFareMultiplier = 1.05m });
            reservations.Add(new SeatReservation 
            { 
                Id = resId++, 
                ScheduleId = 1, 
                SeatId = seatId++, 
                Status = (i == 4 ? "Booked" : "Available"), 
                GenderRestriction = "None" 
            });
        }

        // IntrCity Seater: Lower Deck (S1 to S20)
        for (int i = 1; i <= 20; i++)
        {
            seats.Add(new Seat { Id = seatId, BusId = 2, SeatNumber = $"S{i}", Deck = "Lower", SeatType = "Seater", ExtraFareMultiplier = 1.0m });
            reservations.Add(new SeatReservation 
            { 
                Id = resId++, 
                ScheduleId = 2, 
                SeatId = seatId++, 
                Status = (i == 2 || i == 4 || i == 13 ? "Booked" : "Available"), 
                GenderRestriction = (i == 6 || i == 17 ? "FemaleOnly" : "None")
            });
        }

        modelBuilder.Entity<Seat>().HasData(seats);
        modelBuilder.Entity<SeatReservation>().HasData(reservations);
    }
}