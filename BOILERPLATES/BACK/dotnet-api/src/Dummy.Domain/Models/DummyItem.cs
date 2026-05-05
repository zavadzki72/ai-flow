using Dummy.Domain.Enums;

namespace Dummy.Domain.Models;

/// <summary>
/// Item filho que pertence a uma DummyCategory (FK obrigatória).
/// Demonstra:
/// - Construtor que recebe entidade-pai completa (não só Id)
/// - FK derivada do objeto: CategoryId = category.Id
/// - Navigation property nullable (DummyCategory?)
/// - Mistura de propriedades init (imutáveis) e private set (mutáveis)
/// </summary>
public class DummyItem : EntityBase
{
    protected DummyItem() : base()
    {
        Name = string.Empty;
        Code = string.Empty;
    }

    public DummyItem(
        DummyCategory category,
        string name,
        string code,
        string? description,
        DummyPriority priority,
        decimal price,
        DummyStatus status) : base()
    {
        Name = name;
        Code = code;
        Description = description;
        Priority = priority;
        Price = price;
        Status = status;

        CategoryId = category.Id;
        Category = category;
    }

    public Guid CategoryId { get; init; }

    public string Name { get; private set; }

    public string Code { get; init; }

    public string? Description { get; private set; }

    public DummyPriority Priority { get; private set; }

    public decimal Price { get; private set; }

    public DummyStatus Status { get; private set; }

    public DummyCategory? Category { get; init; }

    public void Update(string name, string? description, DummyPriority priority, decimal price, DummyStatus status)
    {
        Name = name;
        Description = description;
        Priority = priority;
        Price = price;
        Status = status;

        Update();
    }
}
