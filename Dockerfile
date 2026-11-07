FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY src/ ./src/

RUN dotnet restore ./src/CpuSimulator.Api/CpuSimulator.Api.csproj

RUN dotnet publish ./src/CpuSimulator.Api/CpuSimulator.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "dotnet CpuSimulator.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
