using DAL;
using DAL.Context;
using Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using DAL.UnitOfWork;

namespace TaskerDAL.UnitOfWork
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationContext _context;

       // private IRepository<Book>? _bookRepository;
       // private IRepository<BookUser>? _bookUserRepository;

        public UnitOfWork(ApplicationContext context)
        {
            _context = context;
        }

       /* public IRepository<Book> BookRepository
        {
            get { return _bookRepository ??= new BookRepository(_context); }
        }


        public IRepository<BookUser> BookUserRepository
        {
            get { return _bookUserRepository ??= new BookUserRepository(_context); }
        }*/

        public void Save()
        {
            _context.SaveChanges();
        }
    }
}
