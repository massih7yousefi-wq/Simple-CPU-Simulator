
using CpuSimulator.Core;

namespace CpuSimulator.Api.Services;

public sealed class CpuSessionService
{
    private readonly ProgramParser _parser = new();

    private CpuState _state = new();
    private IReadOnlyList<Instruction> _program =
        Array.Empty<Instruction>();

    private CpuEngine? _engine;

    public CpuState State => _state;

    public IReadOnlyList<Instruction> Program => _program;

    public string ProgramText { get; private set; } = "";

    public void LoadProgram(string source)
    {
        IReadOnlyList<Instruction> parsed = _parser.Parse(source);

        _state = new CpuState();
        _program = parsed;
        ProgramText = source;
        _engine = new CpuEngine(_state, _program);
    }

    public bool Step()
    {
        EnsureProgramLoaded();
        return _engine!.Step();
    }

    public CpuState Run()
    {
        EnsureProgramLoaded();

        int executed = 0;

        while (_state.Status is not CpuStatus.Halted
               and not CpuStatus.Error
               && executed < 1000)
        {
            bool success = _engine!.Step();
            executed++;

            if (!success)
                break;
        }

        return _state;
    }

    public void Reset()
    {
        EnsureProgramLoaded();

        _state = new CpuState();
        _engine = new CpuEngine(_state, _program);
    }

    private void EnsureProgramLoaded()
    {
        if (_engine is null)
        {
            throw new InvalidOperationException(
                "No program has been loaded.");
        }
    }
}
