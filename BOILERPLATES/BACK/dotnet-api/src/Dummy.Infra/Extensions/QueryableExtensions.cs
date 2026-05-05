using Dummy.Domain.Models;
using Dummy.Infra.Builders;
using System.Linq.Expressions;
using System.Reflection;

namespace Dummy.Infra.Extensions;

/// <summary>
/// Extensions de IQueryable para evitar boilerplate em handlers.
///
/// WhereIf: filtra somente quando uma condição é verdadeira (ex: filtro opcional).
/// ApplyPagination / ApplySortingAndPagination: encapsulam Skip/Take e ordenação dinâmica.
/// </summary>
public static class QueryableExtensions
{
    public static IQueryable<T> WhereIf<T>(this IQueryable<T> query, bool condition, Expression<Func<T, bool>> predicate)
    {
        return condition ? query.Where(predicate) : query;
    }

    /// <summary>Page é base 0.</summary>
    public static IQueryable<T> ApplyPagination<T>(this IQueryable<T> query, int page, int size)
    {
        return query.Skip(page * size).Take(size);
    }

    /// <summary>
    /// Ordena pela string Sort (formato "Property1 ASC, Property2 DESC") + pagina.
    /// Sort vazio → ordena por CreatedAt DESC.
    /// </summary>
    public static IQueryable<T> ApplySortingAndPagination<T>(this IQueryable<T> query, string? sort, int page, int size)
        where T : EntityBase
    {
        query = !string.IsNullOrWhiteSpace(sort)
            ? ApplySorting(query, sort)
            : query.OrderByDescending(x => x.CreatedAt);

        return query.Skip(page * size).Take(size);
    }

    private static IQueryable<T> ApplySorting<T>(IQueryable<T> query, string sort)
    {
        var sorts = sort.Split(',', StringSplitOptions.RemoveEmptyEntries);
        bool first = true;

        foreach (var item in sorts)
        {
            var parts = item.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var property = parts[0];
            var direction = parts.Length > 1 ? parts[1].ToUpper() : "ASC";

            query = ApplyOrder(query, property, direction, first);
            first = false;
        }

        return query;
    }

    /// <summary>
    /// Aplica OrderBy/OrderByDescending/ThenBy/ThenByDescending dinamicamente.
    /// Suporta propriedades aninhadas (ex: "Category.Name").
    /// Para enums, ordena pelo Display Name (delegando para EnumOrderExpressionBuilder).
    /// </summary>
    private static IQueryable<T> ApplyOrder<T>(IQueryable<T> source, string propertyPath, string direction, bool first)
    {
        var parameter = Expression.Parameter(typeof(T), "x");
        Expression body = parameter;
        PropertyInfo? lastProperty = null;

        foreach (var member in propertyPath.Split('.'))
        {
            lastProperty = body.Type.GetProperty(
                member,
                BindingFlags.Instance
              | BindingFlags.Static
              | BindingFlags.Public
              | BindingFlags.IgnoreCase
              | BindingFlags.FlattenHierarchy
            )!;
            body = Expression.Property(body, lastProperty);
        }

        LambdaExpression keySelector;
        Type keyType;

        if (lastProperty!.PropertyType.IsEnum || Nullable.GetUnderlyingType(lastProperty.PropertyType)?.IsEnum == true)
        {
            keySelector = EnumOrderExpressionBuilder.BuildEnumOrderExpression<T>(lastProperty);
            keyType = typeof(string);
        }
        else
        {
            keySelector = Expression.Lambda(body, parameter);
            keyType = body.Type;
        }

        var methodName = GetOrderMethodName(first, direction);

        var method = typeof(Queryable).GetMethods()
            .First(x => x.Name == methodName && x.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(T), keyType);

        return (IQueryable<T>)method.Invoke(null, [source, keySelector])!;
    }

    private static string GetOrderMethodName(bool first, string direction)
    {
        return first
            ? (direction == "DESC" ? "OrderByDescending" : "OrderBy")
            : (direction == "DESC" ? "ThenByDescending" : "ThenBy");
    }
}
