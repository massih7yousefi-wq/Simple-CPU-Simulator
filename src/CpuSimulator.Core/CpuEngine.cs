
namespace CpuSimulator.Core;
//Constructor----------------------------------------------
public sealed class CpuEngine
{
    private readonly CpuState _state;
    private readonly IReadOnlyList<Instruction> _program;

    public CpuEngine(CpuState state, IReadOnlyList<Instruction> program)
    {
        _state = state;
        _program = program;
    }
    //Step---------------------------------------------
    public bool Step()
    {
        if (_state.Status is CpuStatus.Halted or CpuStatus.Error)
            return false;

        if (_state.PC < 0 || _state.PC >= _program.Count)
        {
            SetError($"Invalid program counter: {_state.PC}");
            return false;
        }

        Instruction instruction = _program[_state.PC];

        try
        {
            _state.LastError = null;
            _state.LastOperation = instruction.Type.ToString();

            switch (instruction.Type)
            {
                case InstructionType.LOAD:
                    ExecuteLoad(instruction);
                    _state.PC++;
                    break;

                case InstructionType.ADD:
                    ExecuteArithmetic(instruction, true);
                    _state.PC++;
                    break;

                case InstructionType.SUB:
                    ExecuteArithmetic(instruction, false);
                    _state.PC++;
                    break;

                case InstructionType.STORE:
                    ExecuteStore(instruction);
                    _state.PC++;
                    break;

                case InstructionType.JMP:
                    _state.PC = GetTargetAddress(instruction);
                    break;

                case InstructionType.JZ:
                    if (_state.ZeroFlag)
                        _state.PC = GetTargetAddress(instruction);
                    else
                        _state.PC++;
                    break;

                case InstructionType.HALT:
                    _state.Status = CpuStatus.Halted;
                    return true;

                default:
                    throw new InvalidOperationException(
                        $"Unsupported instruction: {instruction.Type}");
            }

            _state.Status = CpuStatus.Running;
            return true;
        }
        catch (Exception ex)
        {
            SetError(ex.Message);
            return false;
        }
    }
    //ExecuteLoad------------------------------------
    private void ExecuteLoad(Instruction instruction)
    {
        int destination = GetRegisterIndex(
            instruction.DestinationRegister);

        ushort value;

        if (instruction.IsImmediate)
        {
            value = instruction.Value
                ?? throw new InvalidOperationException(
                    "LOAD requires an immediate value.");
        }
        else
        {
            int address = GetMemoryAddress(instruction);
            value = _state.Memory[address];
        }

        _state.Registers[destination] = value;
    }

    //ExecuteArithmetic-----------------------------
    private void ExecuteArithmetic(
        Instruction instruction,
        bool isAddition)
    {
        int destination = GetRegisterIndex(
            instruction.DestinationRegister);

        ushort operand;

        if (instruction.IsImmediate)
        {
            operand = instruction.Value
                ?? throw new InvalidOperationException(
                    "Arithmetic instruction requires a value.");
        }
        else
        {
            int source = instruction.SourceRegister
                ?? throw new InvalidOperationException(
                    "Arithmetic instruction requires a source register.");

            operand = _state.Registers[GetRegisterIndex(source)];
        }

        ushort current = _state.Registers[destination];

        ushort result = isAddition
            ? unchecked((ushort)(current + operand))
            : unchecked((ushort)(current - operand));

        _state.Registers[destination] = result;
        _state.ZeroFlag = result == 0;
    }

    //ExecuteStore-------------------------------------
    private void ExecuteStore(Instruction instruction)
    {
        int source = GetRegisterIndex(
            instruction.DestinationRegister);

        int address = GetMemoryAddress(instruction);

        _state.Memory[address] = _state.Registers[source];
    }

    //GetRegisterIndex------------------------------------
    private int GetRegisterIndex(int index)
    {
        if (index < 0 || index >= _state.Registers.Length)
            throw new InvalidOperationException(
                $"Invalid register: R{index}");

        return index;
    }

    //GetMemoryAddress--------------------------------------
    private int GetMemoryAddress(Instruction instruction)
    {
        int address = instruction.MemoryAddress
            ?? throw new InvalidOperationException(
                "Instruction requires a memory address.");

        if (address < 0 || address >= _state.Memory.Length)
            throw new InvalidOperationException(
                $"Invalid memory address: {address}");

        return address;
    }
    //GetTargetAddress------------------------------------
    private int GetTargetAddress(Instruction instruction)
    {
        int target = instruction.TargetAddress
            ?? throw new InvalidOperationException(
                "Jump instruction requires a target address.");

        if (target < 0 || target >= _program.Count)
            throw new InvalidOperationException(
                $"Invalid jump target: {target}");

        return target;
    }
    //SetError--------------------------------------
    private void SetError(string message)
    {
        _state.Status = CpuStatus.Error;
        _state.LastError = message;
    }
}
