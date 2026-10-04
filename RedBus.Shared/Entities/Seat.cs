namespace RedBus.Shared.Entities;

public class Seat
{
    public int Id { get; set; }
    public int BusId { get; set; }
    public string SeatNumber { get; set; } = string.Empty; // L1, L2, U1, U2
    public string Deck { get; set; } = "Lower"; // Lower or Upper
    public string SeatType { get; set; } = "Sleeper"; // Sleeper or Seater
    public decimal ExtraFareMultiplier { get; set; } = 1.0m;
}