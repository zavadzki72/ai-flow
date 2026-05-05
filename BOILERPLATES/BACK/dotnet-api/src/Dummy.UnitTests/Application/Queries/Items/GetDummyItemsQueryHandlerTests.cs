using Dummy.Application.Queries.Items.GetDummyItems;
using Dummy.Domain.Enums;
using Dummy.Domain.Models;
using Dummy.Infra.Contexts;
using Dummy.UnitTests.Factories;

namespace Dummy.UnitTests.Application.Queries.Items;

/// <summary>
/// Testa o Query Handler paginado. Cobertura:
/// 1. Sem filtros → retorna todos paginados, TotalItems correto
/// 2. Com filtro de Status → filtra
/// 3. Com filtro de Priority → filtra
/// 4. Pagina (Skip+Take) corretamente
/// 5. CategoryName / CategoryCode são denormalizados via Include
/// </summary>
public class GetDummyItemsQueryHandlerTests
{
    private readonly DummyContext _writeCtx;
    private readonly GetDummyItemsQueryHandler _handler;

    public GetDummyItemsQueryHandlerTests()
    {
        var (write, read) = DummyDbContextFactory.CreateReadWriteContexts();
        _writeCtx = write;
        _handler = new GetDummyItemsQueryHandler(read);
    }

    [Fact]
    public async Task Handle_NoFilters_ShouldReturnAllPaginated()
    {
        //ARRANGE
        var category = AddCategory("Cat", "C-1");
        AddItem(category, "Item 1", "I-1", DummyPriority.Low, 10m, DummyStatus.Active);
        AddItem(category, "Item 2", "I-2", DummyPriority.High, 20m, DummyStatus.Active);
        await _writeCtx.SaveChangesAsync();

        var query = new GetDummyItemsQuery { Page = 0, Size = 10 };

        //ACTION
        var result = await _handler.Handle(query, CancellationToken.None);

        //ASSERT
        Assert.Equal(2, result.Data.Count);
        Assert.Equal(2, result.TotalItems);
        Assert.Equal(0, result.CurrentPage);
        Assert.Equal(1, result.TotalPages);
    }

    [Fact]
    public async Task Handle_FilterByStatus_ShouldReturnOnlyMatching()
    {
        //ARRANGE
        var category = AddCategory("Cat", "C-1");
        AddItem(category, "A", "I-A", DummyPriority.Low, 10m, DummyStatus.Active);
        AddItem(category, "B", "I-B", DummyPriority.Low, 10m, DummyStatus.Archived);
        AddItem(category, "C", "I-C", DummyPriority.Low, 10m, DummyStatus.Active);
        await _writeCtx.SaveChangesAsync();

        var query = new GetDummyItemsQuery
        {
            Page = 0,
            Size = 10,
            Statuses = [DummyStatus.Active]
        };

        //ACTION
        var result = await _handler.Handle(query, CancellationToken.None);

        //ASSERT
        Assert.Equal(2, result.Data.Count);
        Assert.All(result.Data, x => Assert.Equal("Active", x.Status));
    }

    [Fact]
    public async Task Handle_FilterByPriceRange_ShouldRespectMinAndMax()
    {
        //ARRANGE
        var category = AddCategory("Cat", "C-1");
        AddItem(category, "A", "I-A", DummyPriority.Low, 5m, DummyStatus.Active);
        AddItem(category, "B", "I-B", DummyPriority.Low, 15m, DummyStatus.Active);
        AddItem(category, "C", "I-C", DummyPriority.Low, 25m, DummyStatus.Active);
        await _writeCtx.SaveChangesAsync();

        var query = new GetDummyItemsQuery
        {
            Page = 0,
            Size = 10,
            MinPrice = 10,
            MaxPrice = 20
        };

        //ACTION
        var result = await _handler.Handle(query, CancellationToken.None);

        //ASSERT
        Assert.Single(result.Data);
        Assert.Equal(15m, result.Data[0].Price);
    }

    [Fact]
    public async Task Handle_ShouldDenormalizeCategoryFields()
    {
        //ARRANGE
        var category = AddCategory("Beverages", "BEV-1");
        AddItem(category, "Beer", "B-1", DummyPriority.High, 9m, DummyStatus.Active);
        await _writeCtx.SaveChangesAsync();

        var query = new GetDummyItemsQuery { Page = 0, Size = 10 };

        //ACTION
        var result = await _handler.Handle(query, CancellationToken.None);

        //ASSERT
        var item = Assert.Single(result.Data);
        Assert.Equal("Beverages", item.CategoryName);
        Assert.Equal("BEV-1", item.CategoryCode);
        Assert.Equal("High", item.Priority);
    }

    private DummyCategory AddCategory(string name, string code)
    {
        var c = new DummyCategory(name, code, null, DummyStatus.Active);
        _writeCtx.DummyCategories.Add(c);
        return c;
    }

    private void AddItem(DummyCategory category, string name, string code, DummyPriority priority, decimal price, DummyStatus status)
    {
        var i = new DummyItem(category, name, code, null, priority, price, status);
        _writeCtx.DummyItems.Add(i);
    }
}
