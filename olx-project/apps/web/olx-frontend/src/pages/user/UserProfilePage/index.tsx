/** @jsxImportSource react */
import React from 'react';
import { Button } from 'antd';
import { 
  InfoCircleOutlined, 
  ExportOutlined, 
  CarOutlined 
} from '@ant-design/icons';
import {useDispatch, useSelector} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../../store';
import {logout} from "../../../Slice/authSlice.ts";

const UserProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
    };


  return (
    <div className="flex flex-col min-h-screen bg-[#f2f4f5]">
      <div className="bg-white px-4 md:px-8 shadow-sm z-10">
        <div className="max-w-[1240px] mx-auto flex flex-col pt-6 pb-2">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-[#002f34]">Профіль</h1>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-500">Ваш рахунок: <span className="text-[#002f34] font-bold">0 грн.</span></p>
                <p className="font-semibold text-gray-500 flex items-center justify-end gap-1">
                  Доступний баланс: <span className="text-[#002f34] font-bold">0 бонусів</span>
                  <InfoCircleOutlined className="text-gray-400" />
                </p>
              </div>
              <Button className="font-bold border-gray-300 text-[#002f34] h-10 px-6 rounded hover:border-[#002f34] hover:text-[#002f34]">
                Поповнити гаманець
              </Button>
              <Button className="bg-[#002f34] border-0 text-white font-bold h-10 px-6 rounded hover:bg-[#002f34]/90 flex flex-col items-center justify-center leading-tight">
                <span>Купити пакет</span>
                <span className="text-[10px] font-normal leading-none -mt-1 opacity-80">Дізнатися більше</span>
              </Button>
            </div>
          </div>

          <nav className="flex items-center gap-8 overflow-x-auto text-sm font-semibold text-gray-500 pb-1">
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Оголошення</span>
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Чат</span>
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Платежі та рахунок OLX</span>
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Рейтинг</span>
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Шукаю роботу</span>
            <span className="cursor-pointer text-[#002f34] border-b-2 border-[#002f34] pb-2 whitespace-nowrap">Профіль</span>
            <span className="cursor-pointer hover:text-[#002f34] whitespace-nowrap">Налаштування</span>
            <span className="cursor-pointer hover:text-[#002f34] flex items-center gap-1 whitespace-nowrap">
              <CarOutlined /> OLX Доставка
            </span>
          </nav>
        </div>
      </div>

      <div className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-8 py-10">
        
        <div className="flex items-center gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-[#cbf7ee] flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.avatar ? (
                  <img
                      src={user.avatar}
                      alt="User profile"
                      className="w-full h-full object-cover"
                  />
              ) : (
                  <svg viewBox="0 0 100 100" className="w-20 h-20 text-[#002f34] mt-2">
                      <circle cx="50" cy="40" r="22" fill="currentColor"/>
                      <path d="M15,95 C15,65 85,65 85,95" fill="currentColor" />
                      <circle cx="42" cy="35" r="3" fill="#cbf7ee"/>
                      <circle cx="58" cy="35" r="3" fill="#cbf7ee"/>
                  </svg>
              )}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#002f34] mb-2">Редагування профілю</h2>
            <a href="" className="flex items-center gap-1 text-[#002f34] font-semibold hover:underline">
               <ExportOutlined /> Переглянути, як інші бачать мій профіль
            </a>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 p-8 mb-6 relative">
           <div className="absolute top-8 right-8">
             <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200" onClick={() => navigate('/update-profile')}>
               Редагувати
             </Button>
               <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200" onClick={isAuth ? handleLogout : undefined}>
                   LogOut
               </Button>
           </div>
           
           <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-8 flex items-center gap-1 uppercase">
             ОСНОВНА ІНФОРМАЦІЯ <InfoCircleOutlined />
           </h3>
           
           <div className="flex flex-col gap-6 max-w-xl">
             <div>
               <p className="text-sm text-gray-500 mb-1">Ім'я</p>
               <p className="text-base text-[#002f34] font-semibold">{user?.name || 'Користувач'}</p>
             </div>
             <div>
               <p className="text-sm text-gray-500 mb-1"> Місцезнаходження </p>
                 {user?.location ? (
                     <p className="text-base text-[#002f34] font-semibold">{user.location}</p>
                 ) : (
                     <p className="text-base text-[#002f34] font-semibold">Не вказано</p>
                 )}

             </div>
             <div>
               <p className="text-sm text-gray-500 mb-1"> Номер телефону </p>
                 {user?.phoneNumber ? (
                     <p className="text-base text-[#002f34] font-semibold">{user.phoneNumber}</p>
                 ) : (
                     <p className="text-base text-[#002f34] font-semibold">Не вказано</p>
                 )}
             </div>
           </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 p-8">
           <h3 className="text-lg font-bold text-[#002f34] mb-4">
             Виберіть тип облікового запису
           </h3>
           <p className="text-sm text-gray-600 mb-6 font-medium">
             Згідно із законодавством України, ви маєте зазначити статус, використовуючи OLX як приватна особа чи компанія.
           </p>
           <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200">
             Вибрати тип облікового запису
           </Button>
        </div>

      </div>
    </div>
  );
};

export default UserProfilePage;
