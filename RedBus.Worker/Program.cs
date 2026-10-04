using MassTransit;
using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Data;
using RedBus.Worker.Consumers;
using RedBus.Worker.Services;
using RedBus.Shared.Services;

var builder = WebApplication.CreateBuilder(args);

// Render ke liye port configuration
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// 1. Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=redbus.db"));

// 2. Register PDF Service
builder.Services.AddSingleton<TicketPdfService>();

// 3. MassTransit Broker Configuration
var rabbitMqUrl = Environment.GetEnvironmentVariable("RABBITMQ_URL") 
    ?? builder.Configuration["RABBITMQ_URL"] 
    ?? "amqps://nznmdgce:IWQkbR3LSELVQWQhGP9u7I0vZi221da0@warthog.lmq.cloudamqp.com/nznmdgce";

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<BookingConfirmedConsumer>();
    x.AddConsumer<SeatHoldRequestedConsumer>();

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

        cfg.ReceiveEndpoint("booking-confirmed-queue", e =>
        {
            e.ConfigureConsumer<BookingConfirmedConsumer>(context);
        });

        cfg.ReceiveEndpoint("seat-hold-queue", e =>
        {
            e.ConfigureConsumer<SeatHoldRequestedConsumer>(context);
        });
    });
});

builder.Services.AddOptions<MassTransitHostOptions>()
    .Configure(options =>
    {
        options.WaitUntilStarted = false;
        options.StartTimeout = TimeSpan.FromSeconds(30);
        options.StopTimeout = TimeSpan.FromSeconds(30);
    });

builder.Services.AddHostedService<ExpiredHoldCleanupWorker>();

var app = builder.Build();

// Ensure Database & Tables exist
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Render Health check endpoint
app.MapGet("/", () => "RedBus Worker is running!");
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));

app.Run();