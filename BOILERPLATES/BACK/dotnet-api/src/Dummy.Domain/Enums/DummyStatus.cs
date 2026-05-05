using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Dummy.Domain.Enums;

/// <summary>
/// Status do ciclo de vida de uma entidade Dummy.
/// Armazenado como INT no banco, exposto na API como Display Name.
/// [Display(Name)] = label curto exibido na UI.
/// [Description] = nome completo descritivo (endpoint :list-all).
/// </summary>
public enum DummyStatus
{
    [Display(Name = "Active")]
    [Description("Active and available for use")]
    Active = 1,

    [Display(Name = "Inactive")]
    [Description("Inactive but preserved")]
    Inactive = 2,

    [Display(Name = "Archived")]
    [Description("Archived and no longer visible by default")]
    Archived = 3
}
