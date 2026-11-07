
using System.Text.Json.Serialization;
using CpuSimulator.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter());
    });

// Register the CPU session service.
builder.Services.AddSingleton<CpuSessionService>();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.MapControllers();

app.Run();
