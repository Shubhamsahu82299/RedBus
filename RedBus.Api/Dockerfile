FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5279
ENV ASPNETCORE_URLS=http://+:5279

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["RedBus.Shared/RedBus.Shared.csproj", "RedBus.Shared/"]
COPY ["RedBus.Api/RedBus.Api.csproj", "RedBus.Api/"]
RUN dotnet restore "RedBus.Api/RedBus.Api.csproj"
COPY . .
WORKDIR "/src/RedBus.Api"
RUN dotnet publish "RedBus.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RedBus.Api.dll"]