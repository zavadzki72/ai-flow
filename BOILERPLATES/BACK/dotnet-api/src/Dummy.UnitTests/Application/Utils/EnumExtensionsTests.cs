using Dummy.Application.Utils;
using Dummy.Domain.Enums;

namespace Dummy.UnitTests.Application.Utils;

public class EnumExtensionsTests
{
    [Theory]
    [InlineData(DummyStatus.Active, "Active")]
    [InlineData(DummyStatus.Inactive, "Inactive")]
    [InlineData(DummyStatus.Archived, "Archived")]
    public void GetDisplayName_DummyStatus_ShouldReturnDisplayName(DummyStatus status, string expected)
    {
        //ACTION
        var result = status.GetDisplayName();

        //ASSERT
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(DummyPriority.Low, "Low priority")]
    [InlineData(DummyPriority.Critical, "Critical priority - immediate attention")]
    public void GetDescription_DummyPriority_ShouldReturnDescription(DummyPriority priority, string expected)
    {
        //ACTION
        var result = priority.GetDescription();

        //ASSERT
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Active", DummyStatus.Active)]
    [InlineData("active", DummyStatus.Active)]
    [InlineData("ARCHIVED", DummyStatus.Archived)]
    public void ParseFromDisplayName_IsCaseInsensitive(string input, DummyStatus expected)
    {
        //ACTION
        var result = EnumExtensions.ParseFromDisplayName<DummyStatus>(input);

        //ASSERT
        Assert.Equal(expected, result);
    }

    [Fact]
    public void ParseFromDisplayName_RoundTrip_ShouldPreserveValue()
    {
        //ARRANGE
        var values = Enum.GetValues<DummyStatus>();

        //ACTION & ASSERT
        foreach (var value in values)
        {
            var displayName = value.GetDisplayName();
            var parsed = EnumExtensions.ParseFromDisplayName<DummyStatus>(displayName);
            Assert.Equal(value, parsed);
        }
    }
}
