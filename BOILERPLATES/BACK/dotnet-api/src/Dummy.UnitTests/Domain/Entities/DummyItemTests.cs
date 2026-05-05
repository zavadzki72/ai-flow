using Dummy.Domain.Enums;
using Dummy.Domain.Models;

namespace Dummy.UnitTests.Domain.Entities;

public class DummyItemTests
{
    private static DummyCategory CreateCategory() =>
        new("Beverages", "BEV-1", null, DummyStatus.Active);

    [Fact]
    public void Create_WithValidParameters_ShouldSetAllProperties()
    {
        //ARRANGE
        var category = CreateCategory();

        //ACTION
        var item = new DummyItem(category, "Beer", "BEER-1", "ice cold", DummyPriority.High, 9.50m, DummyStatus.Active);

        //ASSERT
        Assert.Equal("Beer", item.Name);
        Assert.Equal("BEER-1", item.Code);
        Assert.Equal("ice cold", item.Description);
        Assert.Equal(DummyPriority.High, item.Priority);
        Assert.Equal(9.50m, item.Price);
        Assert.Equal(DummyStatus.Active, item.Status);
        Assert.Equal(category.Id, item.CategoryId);
        Assert.Equal(category, item.Category);
    }

    [Fact]
    public void Create_ShouldBindCategoryId_FromCategoryEntity()
    {
        //ARRANGE
        var category = CreateCategory();

        //ACTION
        var item = new DummyItem(category, "X", "X-1", null, DummyPriority.Low, 1m, DummyStatus.Active);

        //ASSERT
        Assert.Equal(category.Id, item.CategoryId);
    }

    [Fact]
    public void Update_ShouldNotChangeImmutableProperties()
    {
        //ARRANGE
        var category = CreateCategory();
        var item = new DummyItem(category, "X", "X-1", null, DummyPriority.Low, 1m, DummyStatus.Active);
        var originalId = item.Id;
        var originalCode = item.Code;
        var originalCategoryId = item.CategoryId;

        //ACTION
        item.Update("Y", "new", DummyPriority.Critical, 99.99m, DummyStatus.Archived);

        //ASSERT
        Assert.Equal(originalId, item.Id);
        Assert.Equal(originalCode, item.Code);
        Assert.Equal(originalCategoryId, item.CategoryId);
        Assert.Equal("Y", item.Name);
        Assert.Equal(DummyPriority.Critical, item.Priority);
        Assert.Equal(99.99m, item.Price);
    }
}
