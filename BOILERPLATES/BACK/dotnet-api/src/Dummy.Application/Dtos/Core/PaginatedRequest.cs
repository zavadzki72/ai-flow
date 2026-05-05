using Dummy.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Dummy.Application.Dtos.Core;

/// <summary>
/// Base abstrata para Queries paginadas que retornam um resultado tipado.
/// Convenção: Page começa em 0. Filtros via query string usam prefixo "_" (ex: ?_page=0&amp;_size=20).
/// </summary>
public abstract record PaginatedRequest<T> : RequestBase<T>, IPaginatedRequest
{
    [BindProperty(Name = "_page", SupportsGet = true)]
    public int Page { get; set; } = 0;

    [BindProperty(Name = "_size", SupportsGet = true)]
    public int Size { get; set; } = 10;

    /// <summary>
    /// Ordenação no formato "Property1 ASC, Property2 DESC".
    /// Suporta propriedades aninhadas (ex: "Category.Name") e ordena enums por Display Name.
    /// </summary>
    [BindProperty(Name = "_sort", SupportsGet = true)]
    public string? Sort { get; set; }
}

/// <summary>Variante para Commands paginados sem tipo de retorno (raro).</summary>
public abstract record PaginatedRequest : RequestBase, IPaginatedRequest
{
    [BindProperty(Name = "_page", SupportsGet = true)]
    public int Page { get; set; } = 0;

    [BindProperty(Name = "_size", SupportsGet = true)]
    public int Size { get; set; } = 10;

    [BindProperty(Name = "_sort", SupportsGet = true)]
    public string? Sort { get; set; }
}
