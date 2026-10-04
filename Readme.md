# 🚍 RedBus-Pulse Distributed Bus Booking & Fleet Management Engine

 A high-concurrency, enterprise-grade distributed bus reservation and fleet management system built with .NET 10 Minimal APIs, MassTransit & RabbitMQ, and Modern React. Architected to solve real-world distributed challenges race conditions, temporary seat locks (TTL), gender-based seating constraints, automated PDF ticket generation, and dynamic surge pricing.

---

## 📌 Architectural Blueprint

```
                            [ React Frontend (Vite + Tailwind) ]
                                            │
                                            ▼
                               [ API Gateway  Producer (.NET 10) ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [ JWT Auth & RBAC ]         [ Seat Layout & Engine ]     [ Route & Schedule DB ]
                                            │
                                ┌───────────┴───────────┐
                                │ 10-Min Temporary Hold │
                                │ (Atomic DB Condition) │
                                └───────────┬───────────┘
                                            │
                                            ▼
                           [ RabbitMQ Bus (MassTransit) ]
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        [ Booking Consumer Worker ]                 [ Notification  Reminder Worker ]
                     │                                             │
      ┌──────────────┴──────────────┐                              ▼
      │ - Atomic Seat Decrement     │                    - Delayed Trip Alerts (T-2h)
      │ - Idempotency Validation    │                    - Email  SMS Dispatch
      │ - PDF & QR Pass Generation  │
      └──────────────┬──────────────┘
                     ▼
        [ Relational Persistence ]
        (SQLite  PostgreSQL  EF Core)

```

---

## 🚀 Key Features & Deliverables

### 1. 🎟️ Intelligent Passenger & Seating Experience

 Interactive Double-Deck Seat Selector Real-time visual canvasgrid supporting Lower Deck (Seater 2+2) and Upper Deck (Sleeper 1+2  Single Window Sleeper).
 Gender-Aware Seat Privacy Protection When a single female passenger reserves a seat, the adjacent seat dynamically transitions to a locked For Female Only status to prevent male bookings.
 Granular Multi-Stop Routing Selection of exact boarding and dropping landmarks with timed arrival estimates.
 Personal Passenger Directory Auto-fill frequent co-passenger profiles (Name, Age, Gender, ID).

### 2. ⚡ High-Concurrency & Distributed Systems Engineering

 10-Minute TTL Seat Hold Selected seats are locked with a real-time countdown timer. If checkout is abandoned or payment expires, background cleanup workers auto-release seats back to the public pool.
 Double-Booking & Race Condition Immunity Uses atomic conditional updates (`WHERE AvailableSeats = Requested AND Status = 'Available'`) ensuring two simultaneous sub-millisecond clicks never oversell inventory.
 Idempotent Queue Consumer Worker rejects duplicate messages via unique `BookingId` transaction verification.
 Asynchronous Offloading Payment webhook instantly returns `202 Accepted`, delegating ticket compilation, receipt issuance, and QR encryption to MassTransit background consumers.

### 3. 💳 Checkout, Ticketing & Notifications

 Simulated Webhook Payment Gateway Realistic checkout modal supporting Success, Failure, and Insufficient Funds test vectors.
 Cryptographic PDF E-Ticket & Dynamic QR Pass Auto-generated PDF boarding pass embedding a signed verification hash (`BookingId` + `SeatNumber` + `Timestamp`).
 Automated Trip Reminders Delayed queue exchanges schedule SMS and email reminders 2 hours prior to bus departure.
 Tiered Cancellation & Refund Policy Automated penalty calculation engine (e.g., 12h 80% refund; 2h 0% refund) that auto-reopens seats on cancellation.

### 4. 🛠️ Operator & Admin Command Center

 Fleet & Route Scheduler Manage buses, assign registered drivers, link multi-point route legs, and configure maintenance downtime.
 Dynamic Surge Pricing Rule Engine Automated fare multipliers triggered by high-occupancy thresholds (80% capacity) and peak departure windows (FridaySunday surcharge).
 Live Occupancy Heatmap & Revenue Metrics Real-time analytics tracking revenue per route, top-performing bus models, and daily seat fill rates.

---

## 🏗️ Technology Stack

 Layer  Technology  Purpose 
 ---  ---  --- 
 Backend Framework  .NET 10 (C#)  Minimal APIs, high-throughput asynchronous request handling 
 Message Broker  RabbitMQ  Distributed message queue for background job processing 
 Bus Abstraction  MassTransit 8.3+  Retries, message scheduling, error queues, and consumer lifecycle 
 Data Layer  EF Core 10  SQLite  Postgres  Code-First migrations, atomic query execution, and relational mapping 
 Documentation & API Testing  OpenAPI + Scalar UI  Modern, interactive API contract exploration 
 Frontend Platform  React (Vite) + Tailwind CSS  Component architecture, responsive seat map, and booking lifecycle 
 Containerization  Docker  Local multi-service orchestration (RabbitMQ, DB) 

---

## 📂 Solution Structure

```text
EventTicketSystem
├── EventTicketSystem.sln
├── docker-compose.yml                  # RabbitMQ & optional database containers
├── README.md
│
├── TicketSystem.Api                   # Web API & Ingress Producer
│   ├── Controllers  Endpoints        # Auth, Search, SeatMap, Booking & Admin endpoints
│   ├── Middleware                     # Global exception handling & CORS policies
│   └── Program.cs                      # Dependency injection & HTTP pipeline configuration
│
├── TicketSystem.Worker                # Asynchronous Background Processor
│   ├── Consumers                      # TicketBookedConsumer, SeatReleaseConsumer, ReminderConsumer
│   └── Program.cs                      # MassTransit endpoint and DB registration
│
├── TicketSystem.Shared                # Shared Contracts & Domain Model
│   ├── Contracts                      # Message records (TicketBookedEvent, SeatHoldExpiredEvent)
│   ├── Entities                       # Bus, Route, Schedule, Seat, Booking, User
│   └── Data                           # AppDbContext, Seed Data, and Entity Configurations
│
└── TicketSystem.Frontend              # Client Application
    ├── src
    │   ├── components                 # SeatLayout, BusCard, BookingModal, AdminDrawer
    │   ├── context                    # AuthContext, BookingContext
    │   └── services                   # Axios API clients
    └── package.json

```

---

## 🗄️ Core Database Schema

 `Users` `Id`, `FullName`, `Email`, `PasswordHash`, `Role` (Customer, Admin), `CreatedAt`
 `Buses` `Id`, `OperatorName`, `RegistrationNumber`, `BusType` (AC Sleeper 2+1, Seater 2+2), `TotalSeats`
 `Routes` `Id`, `SourceCity`, `DestinationCity`, `DistanceKm`, `EstimatedDurationMinutes`
 `BoardingPoints` `Id`, `RouteId`, `LandmarkName`, `PickupTimeOffsetMinutes`
 `Schedules` `Id`, `BusId`, `RouteId`, `DepartureTime`, `ArrivalTime`, `BaseFare`, `SurgeMultiplier`
 `Seats` `Id`, `BusId`, `SeatNumber`, `Deck` (Lower, Upper), `SeatType` (Sleeper, Seater), `GenderRestriction` (None, FemaleOnly)
 `Bookings` `Id`, `ScheduleId`, `UserId`, `SeatNumbers`, `TotalAmount`, `Status` (Held, Confirmed, Cancelled), `HoldExpiresAt`, `CreatedAt`

---

## ⚡ Getting Started

### 1. Prerequisites

 [.NET 10 SDK](httpsdotnet.microsoft.com)
 [Node.js (v18+)](httpsnodejs.org)
 [Docker Desktop](httpswww.docker.com)

### 2. Start Message Broker

```bash
docker run -d --name rabbitmq -p 56725672 -p 1567215672 rabbitmq3-management

```

RabbitMQ Dashboard `httplocalhost15672` (guest  guest)

### 3. Run Backend Services

Start Background Worker

```bash
cd TicketSystem.Worker
dotnet run

```

Start Web API

```bash
cd TicketSystem.Api
dotnet run

```

Interactive API Documentation `httplocalhostPORTscalarv1`

### 4. Run Frontend Client

```bash
cd TicketSystem.Frontend
npm install
npm run dev

```

---

## 🎯 Verification Scenarios

1. Race Condition Stress Test Fire concurrent POST requests for the same seat using tools like `k6` or `wrk` to verify only a single user is granted the hold.
2. TTL Lock Invalidation Reserve a seat, avoid completing checkout, and confirm the worker frees the seat after 10 minutes.
3. Gender Isolation Book an adjacent female-tagged berth with a male user account and verify the request is blocked by API domain policies.