
namespace CpuSimulator.Core;

public enum InstructionType
{
    LOAD,
    ADD,
    SUB,
    STORE,
    JMP,
    JZ,
    HALT
}

public sealed class Instruction
{
    public InstructionType Type { get; set; }

    public int DestinationRegister { get; set; }

    public int? SourceRegister { get; set; }

    public ushort? Value { get; set; }

    public int? MemoryAddress { get; set; }

    public int? TargetAddress { get; set; }

    public bool IsImmediate { get; set; }
}
