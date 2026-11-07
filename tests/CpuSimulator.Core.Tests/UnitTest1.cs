
using CpuSimulator.Core;
using Xunit;

namespace CpuSimulator.Core.Tests;

public class CpuEngineTests
{
    [Fact]
    public void Program_ShouldAddAndStoreResult()
    {
        var state = new CpuState();

        var program = new List<Instruction>
        {
            new()
            {
                Type = InstructionType.LOAD,
                DestinationRegister = 0,
                Value = 5,
                IsImmediate = true
            },
            new()
            {
                Type = InstructionType.ADD,
                DestinationRegister = 0,
                Value = 3,
                IsImmediate = true
            },
            new()
            {
                Type = InstructionType.STORE,
                DestinationRegister = 0,
                MemoryAddress = 10
            },
            new()
            {
                Type = InstructionType.HALT
            }
        };

        var engine = new CpuEngine(state, program);

        Assert.True(engine.Step());
        Assert.Equal((ushort)5, state.Registers[0]);
        Assert.Equal(1, state.PC);

        Assert.True(engine.Step());
        Assert.Equal((ushort)8, state.Registers[0]);
        Assert.False(state.ZeroFlag);
        Assert.Equal(2, state.PC);

        Assert.True(engine.Step());
        Assert.Equal((ushort)8, state.Memory[10]);
        Assert.Equal(3, state.PC);

        Assert.True(engine.Step());
        Assert.Equal(CpuStatus.Halted, state.Status);
        Assert.Equal(3, state.PC);
    }
}
