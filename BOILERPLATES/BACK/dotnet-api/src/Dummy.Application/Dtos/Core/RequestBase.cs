using FluentValidation.Results;
using MediatR;
using System.Text.Json.Serialization;

namespace Dummy.Application.Dtos.Core;

/// <summary>
/// Base abstrata para requests (Commands ou Queries) que retornam um resultado tipado.
/// Implementa IRequest&lt;T&gt; do MediatR e expõe IsValid() para o ValidationBehavior.
/// </summary>
public abstract record RequestBase<T> : IRequest<T>
{
    /// <summary>Resultado do FluentValidation depois que IsValid() é chamado.</summary>
    [JsonIgnore]
    public virtual ValidationResult? ValidationResult { get; protected set; }

    /// <summary>
    /// Implementado pela classe concreta para invocar seu validator específico.
    /// Chamado automaticamente pelo ValidationBehavior antes do handler.
    /// </summary>
    public abstract bool IsValid();
}

/// <summary>
/// Base abstrata para Commands que NÃO retornam dados tipados (apenas notifications).
/// Retorna Unit (MediatR) — sucesso ou notifications via INotificationService.
/// </summary>
public abstract record RequestBase : IRequest<Unit>
{
    [JsonIgnore]
    public virtual ValidationResult? ValidationResult { get; protected set; }

    public abstract bool IsValid();
}
