using System.Text.Json.Serialization;
using CpuSimulator.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter());
    });

// Allow requests from the deployed frontend.
builder.Services.AddCors(options =>
{
    options.AddPolicy("VercelFrontend", policy =>
    {
        policy.WithOrigins("https://simple-cpu-simulator.vercel.app")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Register the CPU session service.
builder.Services.AddSingleton<CpuSessionService>();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseCors("VercelFrontend");

app.MapControllers();

app.Run();
