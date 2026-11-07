
using CpuSimulator.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CpuSimulator.Api.Controllers;

[ApiController]
[Route("api/cpu")]
public sealed class CpuController : ControllerBase
{
    private readonly CpuSessionService _session;

    public CpuController(CpuSessionService session)
    {
        _session = session;
    }

    [HttpPost("load")]
    public IActionResult LoadProgram([FromBody] LoadProgramRequest request)
    {
        try
        {
            _session.LoadProgram(request.Program);
            return Ok(_session.State);
        }
        catch (FormatException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("state")]
    public IActionResult GetState()
    {
        return Ok(new
        {
            state = _session.State,
            program = _session.Program,
            programText = _session.ProgramText
        });
    }

    [HttpPost("step")]
    public IActionResult Step()
    {
        try
        {
            bool success = _session.Step();

            if (!success)
                return Conflict(new
                {
                    error = _session.State.LastError
                        ?? "CPU cannot execute another instruction.",
                    state = _session.State
                });

            return Ok(_session.State);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("run")]
    public IActionResult Run()
    {
        try
        {
            return Ok(_session.Run());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("reset")]
    public IActionResult Reset()
    {
        try
        {
            _session.Reset();
            return Ok(_session.State);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public sealed record LoadProgramRequest(string Program);
