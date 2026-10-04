FROM mcr.microsoft.com/dotnet/runtime:10.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["RedBus.Shared/RedBus.Shared.csproj", "RedBus.Shared/"]
COPY ["RedBus.Worker/RedBus.Worker.csproj", "RedBus.Worker/"]
RUN dotnet restore "RedBus.Worker/RedBus.Worker.csproj"
COPY . .
WORKDIR "/src/RedBus.Worker"
RUN dotnet publish "RedBus.Worker.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RedBus.Worker.dll"]