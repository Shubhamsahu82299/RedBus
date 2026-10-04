using MassTransit;
using Microsoft.EntityFrameworkCore;
using RedBus.Shared.Data;
using RedBus.Worker.Consumers;
using RedBus.Worker.Services;
using RedBus.Shared.Services;
var builder = Host.CreateApplicationBuilder(args);

// 1. Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=../redbus.db"));

// 2. Register PDF Service
builder.Services.AddSingleton<TicketPdfService>();

// 3. MassTransit Broker Configuration
var rabbitMqUrl = builder.Configuration["RABBITMQ_URL"] 
    ?? "amqps://nznmdgce:IWQkbR3LSELVQWQhGP9u7I0vZi221da0@warthog.lmq.cloudamqp.com/nznmdgce";

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<BookingConfirmedConsumer>();
    x.AddConsumer<SeatHoldRequestedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(new Uri(rabbitMqUrl));

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

builder.Services.AddHostedService<ExpiredHoldCleanupWorker>();

var host = builder.Build();
host.Run();