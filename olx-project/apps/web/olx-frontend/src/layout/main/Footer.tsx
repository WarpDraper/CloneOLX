import React from 'react';
import { SearchOutlined, FacebookOutlined, YoutubeOutlined, TwitterOutlined } from '@ant-design/icons';

const Footer: React.FC = () => {
  return (
    <>
      <section className="bg-[#cbf7ee] py-12 px-4 flex flex-col items-center text-[#002f34]">
        <div className="flex items-center gap-3 mb-6 items-baseline">
          <span className="text-6xl font-black tracking-tighter text-[#002f34]">olx</span>
          <span className="text-6xl font-black tracking-tighter text-[#002f34]">clone</span>
        </div>
        <p className="max-w-[800px] text-center text-sm leading-relaxed mb-6 font-medium">
          Усі онлайн-оголошення України на OLX - тут ви знайдете те, що шукали! Натиснувши на кнопку Подати оголошення, ви зможете розмістити оголошення на будь-яку тематику легко й швидко. 
          За допомогою сервісу OLX ви зможете купити чи продати з рук у руки практично все, що завгодно.
        </p>
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-semibold">Спільноти OLX в соціальних мережах:</span>
          <div className="flex gap-4">
            <a href="/" className="w-10 h-10 rounded-full bg-[#002f34] text-white flex items-center justify-center hover:bg-[#002f34]/80 transition-colors">
              <FacebookOutlined className="text-lg" />
            </a>
            <a href="/" className="w-10 h-10 rounded-full bg-[#002f34] text-white flex items-center justify-center hover:bg-[#002f34]/80 transition-colors">
              <YoutubeOutlined className="text-lg" />
            </a>
            <a href="/" className="w-10 h-10 rounded-full bg-[#002f34] text-white flex items-center justify-center hover:bg-[#002f34]/80 transition-colors">
              <TwitterOutlined className="text-lg" />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-gray-200 py-10 px-4">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex gap-4">
            <div className="min-w-12 h-12 bg-yellow-200 rounded flex flex-col justify-center items-center shadow-sm -rotate-12">
               <div className="w-6 h-[2px] bg-gray-800 mb-1"></div>
               <div className="w-6 h-[2px] bg-gray-800 mb-1"></div>
               <div className="w-4 h-[2px] bg-gray-800"></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                <span className="text-[#002f34] font-bold">Розділи на сервісі OLX:</span> Дитячий світ, Нерухомість, Авто, Запчастини, Робота, Тварини, Дім і сад, Електроніка, Бізнес та послуги, Оренда та прокат, Мода і стиль, Хобі, відпочинок і спорт, Віддам безкоштовно...
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="min-w-12 h-12 bg-teal-200 rounded-full flex justify-center items-center shadow-sm relative">
                <SearchOutlined className="text-[#002f34] text-xl" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                <span className="text-[#002f34] font-bold">Популярні запити:</span> шифер, автоелектрик, ремонт холодильників, оренда, дельта, tekken 250, запаска кондинціонера, аїф 150, установка кондинціонера...
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#f2f4f5] py-12 px-4 text-[#002f34] text-sm">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 font-semibold w-full md:w-3/5">
            <a href="/" className="hover:underline">Мобільні додатки</a>
            <a href="/" className="hover:underline">Допомога та Зворотній зв'язок</a>
            <a href="/" className="hover:underline">Платні послуги</a>
            <a href="/" className="hover:underline">Бізнес на OLX</a>
            <a href="/" className="hover:underline">Блог OLX</a>
            <a href="/" className="hover:underline">Умови користування</a>
            <a href="/" className="hover:underline">Політика конфіденційності</a>
            <a href="/" className="hover:underline">Реклама на сайті</a>
            <a href="/" className="hover:underline">Правила безпеки</a>
            <a href="/" className="hover:underline">Карта сайту</a>
            <a href="/" className="hover:underline">Карта регіонів</a>
            <a href="/" className="hover:underline">Популярні запити</a>
            <a href="/" className="hover:underline">Робота в OLX</a>
          </div>
          <div className="flex flex-col items-start gap-4 w-full md:w-2/5">
            <div className="flex gap-3">
              <a href="/" className="block h-10 w-32 bg-black rounded-lg relative overflow-hidden flex items-center justify-center">
                 <span className="text-white text-xs font-bold">Google Play</span>
              </a>
              <a href="/" className="block h-10 w-32 bg-black rounded-lg relative overflow-hidden flex items-center justify-center">
                 <span className="text-white text-xs font-bold">App Store</span>
              </a>
            </div>
            <p className="text-xs text-gray-400 font-semibold mt-2">Безкоштовний застосунок на твій телефон</p>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-10 text-xs font-semibold text-gray-400 flex flex-wrap gap-4">
          <span className="flex items-center gap-1 hover:text-gray-600 cursor-pointer">
            <span className="w-4 h-3 bg-red-600 inline-block border border-gray-300"></span> olx.bg
          </span>
          <span className="flex items-center gap-1 hover:text-gray-600 cursor-pointer">
            <span className="w-4 h-3 bg-white inline-block border-t border-b border-gray-300 relative"><span className="absolute bottom-0 w-full h-1/2 bg-red-600"></span></span> olx.pl
          </span>
          <span className="flex items-center gap-1 hover:text-gray-600 cursor-pointer">
            <span className="w-4 h-3 bg-blue-800 inline-block border-l-2 border-yellow-400 border-r-2 border-red-600"></span> olx.ro
          </span>
          <span className="flex items-center gap-1 hover:text-gray-600 cursor-pointer">
            <span className="w-4 h-3 bg-red-600 inline-block border border-gray-300 relative"><span className="absolute left-0 w-1/3 bg-green-600 h-full"></span></span> olx.pt
          </span>
        </div>
      </footer>
    </>
  );
};

export default Footer;
