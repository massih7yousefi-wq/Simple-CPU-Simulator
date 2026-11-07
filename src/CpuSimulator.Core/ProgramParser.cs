
using System.Globalization;
using System.Text.RegularExpressions;

namespace CpuSimulator.Core;

public sealed class ProgramParser
{
    //Parse-------------------------------------
    public IReadOnlyList<Instruction> Parse(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
            throw new FormatException("Program cannot be empty.");

        var instructions = new List<Instruction>();
        string[] lines = source.Replace("\r", "").Split('\n');

        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i].Trim();

            if (line.Length == 0)
                continue;

            try
            {
                instructions.Add(ParseLine(line));
            }
            catch (FormatException ex)
            {
                throw new FormatException(
                    $"Line {i + 1}: {ex.Message}");
            }
        }

        if (instructions.Count == 0)
            throw new FormatException("Program contains no instructions.");

        return instructions;
    }
    //ParseLine-----------------------------------
    private Instruction ParseLine(string line)
    {
        string[] parts = Regex.Split(line, @"[\s,]+");

        string opcode = parts[0].ToUpperInvariant();

        switch (opcode)
        {
            case "LOAD":
                RequireCount(parts, 3);
                int loadRegister = ParseRegister(parts[1]);

                if (parts[2].StartsWith("#"))
                {
                    return new Instruction
                    {
                        Type = InstructionType.LOAD,
                        DestinationRegister = loadRegister,
                        Value = ParseValue(parts[2][1..]),
                        IsImmediate = true
                    };
                }

                return new Instruction
                {
                    Type = InstructionType.LOAD,
                    DestinationRegister = loadRegister,
                    MemoryAddress = ParseMemoryAddress(parts[2]),
                    IsImmediate = false
                };

            case "ADD":
            case "SUB":
                RequireCount(parts, 3);
                int destination = ParseRegister(parts[1]);

                if (parts[2].StartsWith("#"))
                {
                    return new Instruction
                    {
                        Type = opcode == "ADD"
                            ? InstructionType.ADD
                            : InstructionType.SUB,
                        DestinationRegister = destination,
                        Value = ParseValue(parts[2][1..]),
                        IsImmediate = true
                    };
                }

                return new Instruction
                {
                    Type = opcode == "ADD"
                        ? InstructionType.ADD
                        : InstructionType.SUB,
                    DestinationRegister = destination,
                    SourceRegister = ParseRegister(parts[2]),
                    IsImmediate = false
                };

            case "STORE":
                RequireCount(parts, 3);

                return new Instruction
                {
                    Type = InstructionType.STORE,
                    DestinationRegister = ParseRegister(parts[1]),
                    MemoryAddress = ParseMemoryAddress(parts[2])
                };

            case "JMP":
            case "JZ":
                RequireCount(parts, 2);

                return new Instruction
                {
                    Type = opcode == "JMP"
                        ? InstructionType.JMP
                        : InstructionType.JZ,
                    TargetAddress = ParseInteger(parts[1])
                };

            case "HALT":
                RequireCount(parts, 1);

                return new Instruction
                {
                    Type = InstructionType.HALT
                };

            default:
                throw new FormatException(
                    $"Unknown instruction '{opcode}'.");
        }
    }
    //ParseRegister------------------------------------
    private static int ParseRegister(string text)
    {
        if (text.Length != 2 ||
            char.ToUpperInvariant(text[0]) != 'R' ||
            text[1] is < '0' or > '9')
        {
            throw new FormatException(
                $"Invalid register '{text}'. Use R0 or R1.");
        }

        int register = text[1] - '0';

        if (register > 1)
            throw new FormatException(
                $"Invalid register '{text}'. Use R0 or R1.");

        return register;
    }
    //ParseValue-------------------------------------
    private static ushort ParseValue(string text)
    {
        if (!ushort.TryParse(
            text,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out ushort value))
        {
            throw new FormatException(
                $"Invalid 16-bit unsigned value '{text}'.");
        }

        return value;
    }
    //ParseMemoryAddress----------------------------
    private static int ParseMemoryAddress(string text)
    {
        if (text.Length < 3 ||
            text[0] != '[' ||
            text[^1] != ']')
        {
            throw new FormatException(
                $"Invalid memory address '{text}'. Use [10].");
        }

        int address = ParseInteger(text[1..^1]);

        if (address < 0 || address > 255)
            throw new FormatException(
                $"Memory address {address} must be between 0 and 255.");

        return address;
    }
    //ParseInteger---------------------------------
    private static int ParseInteger(string text)
    {
        if (!int.TryParse(
            text,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out int value))
        {
            throw new FormatException(
                $"Invalid integer '{text}'.");
        }

        return value;
    }
    //RequireCount----------------------------------------
    private static void RequireCount(string[] parts, int expected)
    {
        if (parts.Length != expected)
            throw new FormatException(
                $"Expected {expected} parts but found {parts.Length}.");
    }
}
