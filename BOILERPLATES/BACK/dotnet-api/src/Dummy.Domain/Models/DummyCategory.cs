using Dummy.Domain.Enums;

namespace Dummy.Domain.Models;

/// <summary>
/// Categoria parent que agrupa DummyItems.
/// Demonstra:
/// - Construtor protegido (EF) e construtor público (domínio)
/// - Propriedades imutáveis (init) vs. mutáveis (private set)
/// - Coleção navegacional inicializada
/// - Métodos de domínio que encapsulam mudança de estado
/// </summary>
public class DummyCategory : EntityBase
{
    protected DummyCategory() : base()
    {
        Name = string.Empty;
        Code = string.Empty;
    }

    public DummyCategory(string name, string code, string? description, DummyStatus status) : base()
    {
        Name = name;
        Code = code;
        Description = description;
        Status = status;
    }

    public string Name { get; private set; }

    public string Code { get; init; }

    public string? Description { get; private set; }

    public DummyStatus Status { get; private set; }

    public List<DummyItem> Items { get; init; } = [];

    public void Update(string name, string? description, DummyStatus status)
    {
        Name = name;
        Description = description;
        Status = status;

        Update();
    }

    public void AddItem(DummyItem item)
    {
        Items.Add(item);
        Update();
    }
}
