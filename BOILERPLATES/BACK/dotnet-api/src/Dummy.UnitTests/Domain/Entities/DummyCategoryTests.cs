using Dummy.Domain.Enums;
using Dummy.Domain.Models;

namespace Dummy.UnitTests.Domain.Entities;

/// <summary>
/// Testes de entidade. Foco: garantir que o construtor inicializa estado válido,
/// métodos de domínio mudam apenas o que devem, e propriedades imutáveis (init)
/// realmente não mudam após Update.
/// </summary>
public class DummyCategoryTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldSetAllProperties()
    {
        //ARRANGE
        var name = "Beverages";
        var code = "BEV-001";
        var description = "Beverages and drinks";
        var status = DummyStatus.Active;

        //ACTION
        var category = new DummyCategory(name, code, description, status);

        //ASSERT
        Assert.Equal(name, category.Name);
        Assert.Equal(code, category.Code);
        Assert.Equal(description, category.Description);
        Assert.Equal(status, category.Status);
        Assert.NotEqual(Guid.Empty, category.Id);
        Assert.Empty(category.Items);
    }

    [Fact]
    public void Create_ShouldGenerateUniqueIds()
    {
        //ARRANGE & ACTION
        var c1 = new DummyCategory("A", "CA-1", null, DummyStatus.Active);
        var c2 = new DummyCategory("B", "CB-1", null, DummyStatus.Active);

        //ASSERT
        Assert.NotEqual(c1.Id, c2.Id);
    }

    [Fact]
    public void Create_ShouldInitializeTimestamps()
    {
        //ARRANGE
        var before = DateTime.UtcNow.AddSeconds(-1);

        //ACTION
        var category = new DummyCategory("Name", "CODE", null, DummyStatus.Active);

        //ASSERT
        Assert.True(category.CreatedAt >= before);
        Assert.True(category.UpdatedAt >= before);
    }

    [Fact]
    public void Update_ShouldChangeMutableFields_ButPreserveCodeAndId()
    {
        //ARRANGE
        var category = new DummyCategory("Old", "CODE-1", "old desc", DummyStatus.Active);
        var originalId = category.Id;
        var originalCode = category.Code;

        //ACTION
        category.Update("New", "new desc", DummyStatus.Archived);

        //ASSERT
        Assert.Equal("New", category.Name);
        Assert.Equal("new desc", category.Description);
        Assert.Equal(DummyStatus.Archived, category.Status);
        Assert.Equal(originalId, category.Id);
        Assert.Equal(originalCode, category.Code);
    }

    [Fact]
    public void AddItem_ShouldAddToCollection()
    {
        //ARRANGE
        var category = new DummyCategory("Cat", "C-1", null, DummyStatus.Active);
        var item = new DummyItem(category, "Item", "I-1", null, DummyPriority.High, 10m, DummyStatus.Active);

        //ACTION
        category.AddItem(item);

        //ASSERT
        Assert.Single(category.Items);
        Assert.Contains(item, category.Items);
    }
}
