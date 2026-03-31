
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskerDAL
{
    public interface IRepository<T> where T : class
    {
        void Add(T entity);
        void Update(T newEntiry, int id);
        void Delete(int id);
        T GetById(int id);
        IEnumerable<T> GetAll();
        IQueryable<T> GetAllQ();
        void Save();
    }
}
