using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace Dummy.Application.Utils;

/// <summary>
/// Conversão entre valores de enum e seus Display Names / Descriptions.
/// Usado em projeções de DTOs (KpiClassification.GetDisplayName())
/// e no parsing de strings vindas do frontend.
/// </summary>
public static class EnumExtensions
{
    /// <summary>
    /// Retorna o [Display(Name)] de um enum value.
    /// Fallback: ToString() se o atributo não existir.
    /// </summary>
    public static string GetDisplayName(this Enum enumValue)
    {
        var memberInfo = enumValue.GetType().GetMember(enumValue.ToString());
        if (memberInfo.Length > 0)
        {
            var displayAttribute = memberInfo[0].GetCustomAttribute<DisplayAttribute>();
            if (displayAttribute?.Name != null)
            {
                return displayAttribute.Name;
            }
        }

        return enumValue.ToString();
    }

    /// <summary>
    /// Retorna o [Description] de um enum value (texto longo descritivo).
    /// Null se o atributo não existir.
    /// </summary>
    public static string? GetDescription(this Enum enumValue)
    {
        var memberInfo = enumValue.GetType().GetMember(enumValue.ToString());
        if (memberInfo.Length > 0)
        {
            var descriptionAttribute = memberInfo[0].GetCustomAttribute<DescriptionAttribute>();
            if (descriptionAttribute != null)
            {
                return descriptionAttribute.Description;
            }
        }

        return null;
    }

    /// <summary>
    /// Inverso de GetDisplayName: dado um Display Name, retorna o enum value.
    /// Case insensitive. Retorna default(TEnum) se não encontrar.
    /// </summary>
    public static TEnum ParseFromDisplayName<TEnum>(string displayName)
        where TEnum : struct, Enum
    {
        var value = Enum.GetValues<TEnum>()
            .FirstOrDefault(x => string.Equals(((Enum)(object)x).GetDisplayName(), displayName, StringComparison.OrdinalIgnoreCase));
        return value;
    }
}
