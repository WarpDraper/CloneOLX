import React, { useState } from 'react';
import { SearchOutlined, EnvironmentOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import {
  QUICK_SEARCH_TAGS,
  CATEGORIES,
  RECOMMENDATIONS,
  HERO_SLIDES,
} from '../../../data/homePageData';

const UserHomePage: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className="bg-white">
      <section className="bg-mm-navy">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col lg:flex-row items-stretch gap-0 rounded-xl overflow-hidden">
            <div className="flex-[2] flex items-center bg-white/10 border-b lg:border-b-0 lg:border-r border-white/10 px-4 py-3">
              <SearchOutlined className="text-white/70 text-lg mr-3" />
              <input
                type="text"
                placeholder="Я шукаю..."
                className="w-full bg-transparent text-white placeholder:text-white/60 text-sm outline-none"
              />
            </div>
            <div className="flex-1 flex items-center bg-white/10 border-b lg:border-b-0 lg:border-r border-white/10 px-4 py-3">
              <EnvironmentOutlined className="text-white/70 text-lg mr-3" />
              <input
                type="text"
                placeholder="Київська обл."
                className="w-full bg-transparent text-white placeholder:text-white/60 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              className="bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-8 py-3.5 transition-colors"
            >
              Пошук
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pb-1 text-sm">
            <span className="text-white/60 font-medium">Топ запити:</span>
            {QUICK_SEARCH_TAGS.map((tag, index) => (
              <React.Fragment key={tag}>
                <button
                  type="button"
                  className="text-white/90 hover:text-white hover:underline transition-colors"
                >
                  {tag}
                </button>
                {index < QUICK_SEARCH_TAGS.length - 1 && (
                  <span className="text-white/40 hidden sm:inline">,</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        <div className="relative bg-mm-lavender rounded-2xl overflow-hidden min-h-[220px] md:min-h-[260px]">
          <button
            type="button"
            aria-label="Попередній слайд"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-mm-purple transition-colors"
            onClick={() => setActiveSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
          >
            <LeftOutlined />
          </button>
          <button
            type="button"
            aria-label="Наступний слайд"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-mm-purple transition-colors"
            onClick={() => setActiveSlide((prev) => (prev === HERO_SLIDES.length - 1 ? 0 : prev + 1))}
          >
            <RightOutlined />
          </button>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-8 md:px-12 py-8 md:py-10">
            <div className="flex-1 z-[1]">
              <h1 className="text-2xl md:text-3xl font-bold text-mm-navy mb-3 leading-tight">
                {slide.title}
              </h1>
              <p className="text-gray-600 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                {slide.subtitle}
              </p>
              <button
                type="button"
                className="bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                {slide.cta}
              </button>
            </div>
            <div className="flex-1 flex justify-center md:justify-end z-[1]">
              <img
                src={slide.image}
                alt="MultiMart"
                className="max-h-[180px] md:max-h-[220px] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Слайд ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${index === activeSlide ? 'bg-mm-purple' : 'bg-mm-purple/30'}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-8">
        <h2 className="text-xl font-bold text-mm-navy mb-5">Категорії</h2>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className="flex flex-col items-center gap-2.5 min-w-[80px] group shrink-0"
            >
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-mm-purple transition-colors shadow-sm">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-mm-purple transition-colors max-w-[90px]">
                {category.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <h2 className="text-xl font-bold text-mm-navy mb-5">Рекомендації для вас</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {RECOMMENDATIONS.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-mm-navy line-clamp-2 mb-1 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm font-bold text-mm-navy mb-1.5">{item.price}</p>
                <p className="text-xs text-gray-500 leading-tight">
                  {item.location}
                  <br />
                  {item.time}
                </p>
              </div>
            </article>
          ))}

          <div className="bg-mm-lavender-light rounded-xl border border-purple-100 p-4 flex flex-col items-center justify-center text-center min-h-[280px]">
            <h3 className="text-sm font-bold text-mm-navy mb-4">Додаток MultiMart</h3>
            <div className="w-24 h-24 bg-white rounded-lg border border-gray-200 mb-4 flex items-center justify-center p-2">
              <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                <rect x="10" y="10" width="12" height="12" fill="#1B1B2F" />
                <rect x="26" y="10" width="12" height="12" fill="#1B1B2F" />
                <rect x="42" y="10" width="12" height="12" fill="#1B1B2F" />
                <rect x="10" y="26" width="12" height="12" fill="#1B1B2F" />
                <rect x="42" y="26" width="12" height="12" fill="#1B1B2F" />
                <rect x="58" y="26" width="12" height="12" fill="#1B1B2F" />
                <rect x="74" y="26" width="12" height="12" fill="#1B1B2F" />
                <rect x="10" y="42" width="12" height="12" fill="#1B1B2F" />
                <rect x="42" y="42" width="12" height="12" fill="#1B1B2F" />
                <rect x="58" y="42" width="12" height="12" fill="#1B1B2F" />
                <rect x="10" y="58" width="12" height="12" fill="#1B1B2F" />
                <rect x="26" y="58" width="12" height="12" fill="#1B1B2F" />
                <rect x="42" y="58" width="12" height="12" fill="#1B1B2F" />
                <rect x="58" y="58" width="12" height="12" fill="#1B1B2F" />
                <rect x="74" y="58" width="12" height="12" fill="#1B1B2F" />
                <rect x="42" y="74" width="12" height="12" fill="#1B1B2F" />
                <rect x="58" y="74" width="12" height="12" fill="#1B1B2F" />
                <rect x="74" y="74" width="12" height="12" fill="#1B1B2F" />
              </svg>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
                App Store
              </div>
              <div className="bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
                Google Play
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserHomePage;
