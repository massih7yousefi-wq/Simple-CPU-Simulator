
namespace CpuSimulator.Core;

public sealed class CpuState
{
    public ushort[] Registers { get; } = new ushort[2];

    public ushort[] Memory { get; } = new ushort[256];

    public int PC { get; set; }

    public bool ZeroFlag { get; set; }

    public CpuStatus Status { get; set; } = CpuStatus.Ready;

    public string? LastError { get; set; }

    public string? LastOperation { get; set; }
}
