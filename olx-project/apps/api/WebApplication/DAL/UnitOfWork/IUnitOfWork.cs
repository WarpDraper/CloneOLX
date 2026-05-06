using Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TaskerDAL;

namespace DAL.UnitOfWork
{
    public interface IUnitOfWork
    {
      //  IRepository<Book> BookRepository { get; }
       // IRepository<BookUser> BookUserRepository { get; }
        void Save();
    }
}
