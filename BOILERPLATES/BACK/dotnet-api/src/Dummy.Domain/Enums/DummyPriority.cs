using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Dummy.Domain.Enums;

/// <summary>
/// Nível de prioridade de uma entidade Dummy.
/// Armazenado como INT no banco, exposto na API como Display Name.
/// </summary>
public enum DummyPriority
{
    [Display(Name = "Low")]
    [Description("Low priority")]
    Low = 1,

    [Display(Name = "Medium")]
    [Description("Medium priority")]
    Medium = 2,

    [Display(Name = "High")]
    [Description("High priority")]
    High = 3,

    [Display(Name = "Critical")]
    [Description("Critical priority - immediate attention")]
    Critical = 4
}
