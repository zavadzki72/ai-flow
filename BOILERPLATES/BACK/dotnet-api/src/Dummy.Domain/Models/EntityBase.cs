namespace Dummy.Domain.Models;

/// <summary>
/// Classe base para todas as entidades do domínio.
/// Garante Id, CreatedAt e UpdatedAt em estado válido desde a construção.
/// </summary>
public abstract class EntityBase
{
    public Guid Id { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; private set; }

    protected EntityBase()
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Atualiza o timestamp UpdatedAt. Chamado pelos métodos de domínio das entidades concretas.
    /// </summary>
    public void Update()
    {
        UpdatedAt = DateTime.UtcNow;
    }
}
