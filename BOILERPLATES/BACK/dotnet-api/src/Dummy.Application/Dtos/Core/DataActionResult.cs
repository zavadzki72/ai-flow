using Microsoft.AspNetCore.Mvc;

namespace Dummy.Application.Dtos.Core;

/// <summary>
/// Wrapper padrão de resposta da API.
/// Sucesso: { data: T, messages: null }
/// Erro:    { data: null, messages: [ProblemDetails...] }
///
/// Toda resposta da API passa por este envelope (via ControllerBase.ProcessResponse).
/// </summary>
public class DataActionResult<T>
{
    public T? Data { get; set; }

    public List<ProblemDetails>? Messages { get; set; }

    public DataActionResult() { }

    public DataActionResult(List<ProblemDetails> messages)
    {
        Messages = messages;
    }

    public DataActionResult(T data, List<ProblemDetails> messages)
    {
        Data = data;
        Messages = messages;
    }
}

/// <summary>
/// Versão sem tipo de dados — usada por Commands que retornam apenas notifications.
/// </summary>
public class DataActionResult : DataActionResult<object>
{
    public DataActionResult() { }

    public DataActionResult(List<ProblemDetails> messages) : base(messages) { }
}
