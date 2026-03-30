import React from 'react';
import { 
  SearchOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { Input } from 'antd';

import { useGetCategoriesQuery } from '../../../services/api';

const UserHomePage: React.FC = () => {
  const { data: categories = [], isLoading } = useGetCategoriesQuery({});
  return (
    <>
      <section className="bg-[#f2f4f5] py-8 px-4 md:px-8 flex justify-center">
        <div className="max-w-[1200px] w-full flex flex-col md:flex-row shadow-sm rounded-md overflow-hidden bg-white">
          <div className="flex-1 flex items-center border-b md:border-b-0 md:border-r border-gray-200 p-2">
            <SearchOutlined className="text-gray-500 text-xl ml-2 mr-3" />
            <Input 
              placeholder="Що шукаєте?" 
              bordered={false} 
              className="w-full text-base h-12 shadow-none focus:ring-0" 
            />
          </div>
          <div className="flex-1 flex items-center p-2 relative">
            <EnvironmentOutlined className="text-gray-500 text-xl ml-2 mr-3" />
            <Input 
              placeholder="Уся Україна" 
              bordered={false} 
              className="w-full text-base h-12 shadow-none focus:ring-0" 
            />
          </div>
          <div className="p-2 w-full md:w-auto bg-white flex justify-center">
             <button className="bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold h-12 px-10 rounded w-full md:w-auto flex items-center justify-center gap-2 transition-colors">
               Пошук <SearchOutlined />
             </button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 max-w-[1240px] mx-auto w-full">
        <h2 className="text-center text-3xl font-bold text-[#002f34] mb-12">Розділи на сервісі OLX</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-y-10 gap-x-4">
          {isLoading ? (
            <div className="col-span-full text-center py-10 text-gray-400">Завантаження категорій...</div>
          ) : categories.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400">Категорії відсутні</div>
          ) : categories.map((cat: any) => (
            <div key={cat.id} className="flex flex-col items-center group cursor-pointer">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-105 shadow-sm ${cat.color || 'bg-gray-100'}`}>
                {cat.icon ? <span className="text-3xl" dangerouslySetInnerHTML={{ __html: cat.icon }}></span> : <span className="text-3xl">📁</span>}
              </div>
              <span className="text-xs md:text-sm font-semibold text-[#002f34] text-center px-1 leading-tight group-hover:underline">
                {cat.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#002f34] py-8 px-4 mt-auto">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-white">
            <div className="flex gap-2 items-end">
              <div className="w-3 h-8 bg-blue-500 rounded-sm"></div>
              <div className="w-4 h-14 bg-indigo-400 rounded-sm"></div>
              <div className="w-3 h-10 bg-yellow-400 rounded-sm relative">
                <div className="absolute -top-3 -right-2 w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="absolute top-2 w-full h-[2px] bg-white -rotate-45 -right-4"></div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-300 font-semibold mb-1">Виділяйтеся як компанія!</p>
              <h3 className="text-xl font-bold">Перегляньте пропозицію OLX для бізнесу</h3>
            </div>
          </div>
          <button className="bg-white text-[#002f34] font-bold py-2 px-6 rounded hover:bg-gray-100 transition-colors">
            Детальніше
          </button>
        </div>
      </section>
    </>
  );
};

export default UserHomePage;