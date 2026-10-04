using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RedBus.Shared.Entities;

namespace RedBus.Shared.Services;

public class TicketPdfService
{
    public TicketPdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateBoardingPass(Booking booking, Schedule schedule)
    {
        var pnr = $"RB{booking.Id.ToString()[..8].ToUpper()}";
        var qrData = $"REDBUS|PNR:{pnr}|SEATS:{booking.SeatNumbers}|PASSENGER:{booking.PassengerName}|PHONE:{booking.PassengerPhone}|FARE:INR{booking.TotalAmount}";
        
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(qrData, QRCodeGenerator.ECCLevel.M);
        using var pngQr = new PngByteQRCode(qrCodeData);
        var qrBytes = pngQr.GetGraphic(20);

        var busReg = schedule.Bus?.RegistrationNumber ?? "MH-04-AZ-2026";
        var busOperator = schedule.Bus?.OperatorName ?? "Zingbus Electric SuperClass";
        var busType = schedule.Bus?.BusType ?? "A/C Sleeper (2+1) Multi-Axle";
        var sourceCity = schedule.Route?.SourceCity ?? "Raipur";
        var destCity = schedule.Route?.DestinationCity ?? "Pune";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.2f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontColor("#1F2937"));

                // 1. HEADER WITH PNR & QR
                page.Header().Column(col =>
                {
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Row(logoRow =>
                            {
                                logoRow.ConstantItem(26).Height(26).Background("#D84E55").AlignCenter().AlignMiddle().Text("r").Bold().FontSize(18).FontColor(Colors.White);
                                logoRow.RelativeItem().PaddingLeft(6).Text("redBus").Bold().FontSize(22).FontColor("#D84E55");
                            });
                            c.Item().Text("OFFICIAL E-TICKET & BOARDING PASS").FontSize(8).Bold().FontColor("#6B7280");
                        });

                        r.ConstantItem(150).Column(c =>
                        {
                            c.Item().AlignRight().Text($"PNR: {pnr}").Bold().FontSize(13).FontColor("#111827");
                            c.Item().AlignRight().Text($"Ticket No: TKT-{booking.Id.ToString()[..6].ToUpper()}").FontSize(8).FontColor("#4B5563");
                            c.Item().AlignRight().Text($"Booking Date: {booking.CreatedAt:dd MMM yyyy, hh:mm tt}").FontSize(7).FontColor("#9CA3AF");
                        });
                    });

                    col.Item().PaddingTop(6).LineHorizontal(1.5f).LineColor("#D84E55");
                });

                // 2. JOURNEY DETAILS
                page.Content().PaddingVertical(10).Column(col =>
                {
                    col.Item().Background("#F9FAFB").Border(1).BorderColor("#E5E7EB").Padding(10).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("PICK-UP & BOARDING DETAILS").FontSize(7).Bold().FontColor("#6B7280");
                            c.Item().Text(sourceCity).FontSize(14).Bold().FontColor("#111827");
                            c.Item().Text($"Departure Time: {booking.BoardingTime} hrs").FontSize(9).Bold().FontColor("#D84E55");
                            c.Item().Text("Reporting Time: 15 Mins Prior to Departure").FontSize(8).FontColor("#374151");
                            c.Item().PaddingTop(2).Text($"Boarding Point: {booking.BoardingPointName}").FontSize(8).Bold();
                            c.Item().Text($"Landmark: {booking.BoardingLandmark}").FontSize(8).FontColor("#4B5563");
                        });

                        r.ConstantItem(30).AlignCenter().AlignMiddle().Text("➔").FontSize(16).FontColor("#9CA3AF");

                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("DROPPING & ARRIVAL DETAILS").FontSize(7).Bold().FontColor("#6B7280");
                            c.Item().Text(destCity).FontSize(14).Bold().FontColor("#111827");
                            c.Item().Text($"Expected Arrival: {booking.DroppingTime} hrs").FontSize(9).Bold().FontColor("#2563EB");
                            c.Item().Text("Next Day Morning").FontSize(8).FontColor("#374151");
                            c.Item().PaddingTop(2).Text($"Dropping Point: {booking.DroppingPointName}").FontSize(8).Bold();
                            c.Item().Text($"Landmark: {booking.DroppingLandmark}").FontSize(8).FontColor("#4B5563");
                        });
                    });

                    col.Item().PaddingTop(10);

                    // 3. PASSENGER & VEHICLE DETAILS
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(7).Border(1).BorderColor("#E5E7EB").Padding(10).Column(c =>
                        {
                            c.Item().Text("PASSENGER DETAILS").FontSize(8).Bold().FontColor("#6B7280");
                            c.Item().PaddingTop(4).Row(pRow =>
                            {
                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Name:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text(booking.PassengerName).Bold();
                                });

                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Gender:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text(booking.PassengerGender).Bold();
                                });

                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Seat(s) / Berth:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text(booking.SeatNumbers).Bold().FontSize(12).FontColor("#D84E55");
                                });

                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Status:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text("CONFIRMED").Bold().FontColor("#059669");
                                });
                            });

                            c.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor("#E5E7EB");

                            c.Item().PaddingTop(6).Row(pRow =>
                            {
                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Email ID:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text(booking.PassengerEmail).FontSize(8);
                                });

                                pRow.RelativeItem().Column(pc =>
                                {
                                    pc.Item().Text("Contact Phone:").FontSize(7).FontColor("#6B7280");
                                    pc.Item().Text(booking.PassengerPhone).FontSize(8).Bold();
                                });
                            });

                            c.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor("#E5E7EB");

                            // 4. VEHICLE & OPERATOR INFO
                            c.Item().PaddingTop(6).Text("BUS & OPERATOR INFORMATION").FontSize(8).Bold().FontColor("#6B7280");
                            c.Item().Text($"{busOperator} • {busType}").Bold();
                            c.Item().Text($"Vehicle Reg No: {busReg}   |   Conductor Helpline: +91 98200 45110").FontSize(8).FontColor("#4B5563");
                        });

                        r.ConstantItem(10);

                        // QR Pass
                        r.RelativeItem(3).Border(1).BorderColor("#E5E7EB").Padding(8).Column(c =>
                        {
                            c.Item().AlignCenter().Text("BOARDING QR PASS").FontSize(7).Bold().FontColor("#6B7280");
                            c.Item().AlignCenter().PaddingTop(4).Width(95).Height(95).Image(qrBytes);
                            c.Item().AlignCenter().PaddingTop(4).Text("Scan at Bus Door").FontSize(7).Bold().FontColor("#374151");
                            c.Item().AlignCenter().Text("Verification Code: Valid").FontSize(6).FontColor("#9CA3AF");
                        });
                    });

                    col.Item().PaddingTop(10);

                    // 5. FARE BREAKDOWN
                    col.Item().Border(1).BorderColor("#E5E7EB").Background("#F9FAFB").Padding(10).Column(c =>
                    {
                        c.Item().Text("FARE BREAKDOWN & PAYMENT SUMMARY").FontSize(8).Bold().FontColor("#6B7280");

                        c.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Column(sub =>
                            {
                                sub.Item().Text($"Base Fare: INR {booking.BaseFare:N0}");
                                sub.Item().Text($"Discount / Coupon Applied: -INR {booking.DiscountAmount:N0}").FontColor("#059669");
                                sub.Item().Text($"GST & Reservation Surcharges (5%): INR {booking.GstAmount:N2}");
                            });

                            r.RelativeItem().AlignRight().Column(sub =>
                            {
                                sub.Item().Text("Total Fare Paid:").FontSize(8).FontColor("#6B7280");
                                sub.Item().Text($"INR {booking.TotalAmount:N0}").Bold().FontSize(15).FontColor("#D84E55");
                                sub.Item().Text($"Ref: {booking.PaymentReference ?? "PAY_MOCK_SUCCESS"}").FontSize(7).FontColor("#4B5563");
                            });
                        });
                    });

                    col.Item().PaddingTop(10);

                    // 6. IMPORTANT TERMS
                    col.Item().Border(1).BorderColor("#FDE68A").Background("#FFFBEB").Padding(8).Column(c =>
                    {
                        c.Item().Text("IMPORTANT TERMS & BOARDING POLICIES:").Bold().FontSize(7).FontColor("#92400E");
                        c.Item().Text("• Identification: Original Government photo ID (Aadhaar, Voter ID, Driving License) is mandatory during journey.").FontSize(7).FontColor("#78350F");
                        c.Item().Text("• Luggage Policy: Maximum 2 bags per passenger (up to 15 kg). Hazardous goods strictly prohibited.").FontSize(7).FontColor("#78350F");
                        c.Item().Text("• Cancellation Refund: Before 24 hrs = 90% refund | 12 to 24 hrs = 50% refund | Under 12 hrs = 0%.").FontSize(7).FontColor("#78350F");
                        c.Item().Text("• Reporting: Bus will not wait past scheduled departure. Please arrive 15 minutes in advance.").FontSize(7).FontColor("#78350F");
                    });
                });

                // 7. FOOTER
                page.Footer().AlignCenter().Column(c =>
                {
                    c.Item().LineHorizontal(0.5f).LineColor("#E5E7EB");
                    c.Item().PaddingTop(3).Text("redBus 24x7 Customer Support: 1800-102-8747 | help@redbus.in | Distributed Pulse Engine").FontSize(7).FontColor("#9CA3AF");
                });
            });
        }).GeneratePdf();
    }
}