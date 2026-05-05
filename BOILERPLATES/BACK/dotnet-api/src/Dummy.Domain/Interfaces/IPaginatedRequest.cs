namespace Dummy.Domain.Interfaces;

/// <summary>
/// Marker para requests paginados. Implementado por PaginatedRequest na Application.
/// Page é base 0 (página inicial = 0).
/// </summary>
public interface IPaginatedRequest
{
    int Page { get; set; }
    int Size { get; set; }
}
