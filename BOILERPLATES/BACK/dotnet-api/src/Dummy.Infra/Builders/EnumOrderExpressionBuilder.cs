using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using System.Reflection;

namespace Dummy.Infra.Builders;

/// <summary>
/// Constrói uma expressão Lambda que ordena enums pelo Display Name (string)
/// em vez do valor INT subjacente. Sem isso, "Active=1, Archived=3, Inactive=2" ordenaria
/// como 1, 2, 3 (numericamente) em vez de A-Z (alfabético do label).
///
/// Usado pelo QueryableExtensions.ApplySortingAndPagination quando detecta uma propriedade enum.
/// </summary>
public static class EnumOrderExpressionBuilder
{
    public static LambdaExpression BuildEnumOrderExpression<TEntity>(PropertyInfo enumProperty)
    {
        var propertyType = enumProperty.PropertyType;
        var enumType = Nullable.GetUnderlyingType(propertyType) ?? propertyType;
        var isNullable = Nullable.GetUnderlyingType(propertyType) != null;

        var parameter = Expression.Parameter(typeof(TEntity), "x");
        var propertyAccess = Expression.Property(parameter, enumProperty);

        Expression? body = null;

        foreach (var value in Enum.GetValues(enumType))
        {
            var member = enumType.GetMember(value!.ToString()!)[0];
            var display =
                member.GetCustomAttribute<DisplayAttribute>()?.Name
                ?? value.ToString();

            Expression constant = Expression.Constant(value, enumType);

            if (isNullable)
            {
                constant = Expression.Convert(constant, propertyType);
            }

            var condition = Expression.Equal(propertyAccess, constant);
            var result = Expression.Constant(display);

            body = body == null
                ? result
                : Expression.Condition(condition, result, body);
        }

        body ??= Expression.Constant(string.Empty);

        return Expression.Lambda(body, parameter);
    }
}
