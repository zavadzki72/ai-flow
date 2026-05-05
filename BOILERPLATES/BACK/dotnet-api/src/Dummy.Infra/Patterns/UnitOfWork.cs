using Dummy.Domain.Interfaces;
using Dummy.Infra.Contexts;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;

namespace Dummy.Infra.Patterns;

/// <summary>
/// UnitOfWork acoplado ao DummyContext (write).
/// Usado por handlers que executam múltiplas operações de escrita atomicamente
/// — em particular, operações de bulk merge (SqlComplexOperations) que precisam
/// compartilhar a mesma transação ADO.NET.
///
/// Para CRUD simples (1 entidade), usar context.SaveChangesAsync() é suficiente
/// (EF Core gerencia a transação automaticamente).
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly DummyContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(DummyContext context)
    {
        _context = context;
    }

    public IDbTransaction GetDbTransaction()
    {
        _transaction ??= _context.Database.BeginTransaction();
        return _transaction.GetDbTransaction();
    }

    public async Task CommitTransaction()
    {
        _transaction ??= await _context.Database.BeginTransactionAsync();
        await _transaction.CommitAsync();
    }
}
