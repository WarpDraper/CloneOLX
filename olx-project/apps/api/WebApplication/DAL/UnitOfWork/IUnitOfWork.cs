using Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TaskerDAL;
using DAL.Repository;

namespace DAL.UnitOfWork
{
    public interface IUnitOfWork
    {
      //  IRepository<Book> BookRepository { get; }
       // IRepository<BookUser> BookUserRepository { get; }
        IReportRepository Reports { get; }
        
        Task SaveAsync();
        void Save();
    }
}

