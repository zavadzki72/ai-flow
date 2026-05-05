namespace Dummy.Application.Dtos.Core;

/// <summary>
/// Base abstrata de resposta paginada. Campos protegidos para subclasses preencherem.
/// </summary>
public abstract record PaginatedResponse
{
    public int CurrentPage { get; protected set; }
    public int TotalItems { get; protected set; }
    public int TotalPages { get; protected set; }
}

/// <summary>
/// Resposta paginada genérica. TotalPages é calculado no construtor (lógica encapsulada
/// no DTO em vez do handler — ver docs/architecture/dtos-patterns.md).
/// </summary>
public record PaginatedResponse<TData> : PaginatedResponse
    where TData : class
{
    public PaginatedResponse(List<TData> data, int currentPage, int totalItems, int sizePage)
    {
        Data = data;
        CurrentPage = currentPage;
        TotalItems = totalItems;
        TotalPages = sizePage > 0 ? (int)Math.Ceiling((double)totalItems / sizePage) : 0;
    }

    public List<TData> Data { get; private set; }
}
