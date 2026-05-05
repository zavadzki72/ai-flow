using System.Data;

namespace Dummy.Domain.Interfaces;

/// <summary>
/// Abstração de transação para handlers que precisam coordenar múltiplas operações
/// de escrita atomicamente. A implementação concreta vive em Dummy.Infra.
/// </summary>
public interface IUnitOfWork
{
    IDbTransaction GetDbTransaction();
    Task CommitTransaction();
}
