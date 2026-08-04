import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { SearchOutlined, EnvironmentOutlined, LeftOutlined, RightOutlined, AppstoreOutlined } from '@ant-design/icons';
import { QUICK_SEARCH_TAGS, HERO_SLIDES } from '../../../data/homePageData';
import { UA_CITIES } from '../../../data/ukrainianCities';
import { useGetCategoriesQuery } from '../../../services/categoryService';
import { useGetAdvertsPageQuery } from '../../../services/advertService';
import RecommendationCard from '../../../components/advert/RecommendationCard';
import MegaMenu from '../../../components/catalog/MegaMenu';
import CategoryAvatar from '../../../components/catalog/CategoryAvatar';
import SellerWidget from '../../../components/advert/SellerWidget';
import { getSeedAdverts, getSeedSellers, getSeedTopLevelCategories } from '../../../utils/seedHydration';

const UserHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [city, setCity] = useState<string | undefined>(undefined);
  const slide = HERO_SLIDES[activeSlide];

  const goToSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed && !city) return;
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  // Категорії верхнього рівня — GET /api/Category/get (публічний).
  const { data: categories, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  const apiTopLevelCategories = (categories ?? []).filter((c) => c.parentId === null);
  // Фолбек на локальні seed-дані (Categories.json), якщо бекенд ще не засіяний/недоступний.
  const topLevelCategories = !isCategoriesLoading && apiTopLevelCategories.length === 0
    ? getSeedTopLevelCategories()
    : apiTopLevelCategories;

  // Рекомендації для головної — POST /api/Advert/get/page (публічний), останні підтверджені оголошення.
  const { data: advertsPage, isLoading: isAdvertsLoading } = useGetAdvertsPageQuery({
    size: 12,
    page: 1,
    sortKey: 'date',
    isDescending: true,
    approved: true,
  });
  // Фолбек на локальні seed-дані (Adverts.json), якщо бекенд не повернув оголошень.
  const recommendations = !isAdvertsLoading && (advertsPage?.items?.length ?? 0) === 0
    ? getSeedAdverts()
    : advertsPage?.items ?? [];

  // Продавці для стрічки "Популярні продавці" — публічного списку продавців ще немає,
  // тож секція завжди живиться з seed-даних (Users.json).
  const featuredSellers = useMemo(() => getSeedSellers(), []);

  return (
    <div className="bg-white">
      <section className="bg-mm-navy relative">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col lg:flex-row items-stretch gap-0 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCatalogOpen((prev) => !prev)}
              aria-expanded={isCatalogOpen}
              className={`hidden lg:flex items-center gap-2 px-5 font-semibold text-sm text-white transition-colors shrink-0 ${isCatalogOpen ? 'bg-mm-purple-dark' : 'bg-mm-purple hover:bg-mm-purple-dark'}`}
            >
              <AppstoreOutlined className="text-base" />
              Каталог
            </button>
            <div className="flex-[2] flex items-center bg-white/10 border-b lg:border-b-0 lg:border-r border-white/10 px-4 py-3">
              <SearchOutlined className="text-white/70 text-lg mr-3" />
              <input
                type="text"
                placeholder="Я шукаю..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToSearch(searchText)}
                className="w-full bg-transparent text-white placeholder:text-white/60 text-sm outline-none"
              />
            </div>
            <div className="flex-1 flex items-center bg-white/10 border-b lg:border-b-0 lg:border-r border-white/10 px-4 py-3">
              <EnvironmentOutlined className="text-white/70 text-lg mr-3 shrink-0" />
              <Select
                variant="borderless"
                placeholder="Вся Україна"
                allowClear
                value={city}
                onChange={(value) => setCity(value)}
                className="w-full [&_.ant-select-selection-placeholder]:text-white/60 [&_.ant-select-selection-item]:text-white"
                popupMatchSelectWidth={false}
                options={UA_CITIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <button
              type="button"
              onClick={() => goToSearch(searchText)}
              className="bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-8 py-3.5 transition-colors"
            >
              Пошук
            </button>
          </div>

          {isCatalogOpen && (
            <MegaMenu categories={topLevelCategories} onClose={() => setIsCatalogOpen(false)} />
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pb-1 text-sm">
            <span className="text-white/60 font-medium">Топ запити:</span>
            {QUICK_SEARCH_TAGS.map((tag, index) => (
              <React.Fragment key={tag}>
                <button
                  type="button"
                  onClick={() => goToSearch(tag)}
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
          {isCategoriesLoading && (
            <p className="text-sm text-gray-400">Завантаження категорій...</p>
          )}
          {topLevelCategories.map((category) => (
            <CategoryAvatar key={category.id} category={category} className="min-w-[80px]" />
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <div className="bg-mm-navy rounded-2xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">Рекомендації для вас</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isAdvertsLoading && (
              <p className="text-sm text-white/50 col-span-full">Завантаження оголошень...</p>
            )}
            {recommendations.map((advert) => (
              <RecommendationCard key={advert.id} advert={advert} />
            ))}

            <div className="bg-mm-lavender-light rounded-xl border border-purple-100 p-4 flex flex-col items-center justify-center text-center min-h-[280px]">
              <h3 className="text-sm font-bold text-mm-navy mb-1">Додаток MultiMart</h3>
              <p className="text-xs text-gray-500 mb-4">Купуйте та продавайте зручно зі смартфона</p>
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
              <div className="flex flex-col gap-2 w-full mb-3">
                <div className="bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
                  App Store
                </div>
                <div className="bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
                  Google Play
                </div>
              </div>
              <a href="/" className="text-xs font-bold text-mm-purple hover:underline">Детальніше</a>
            </div>
          </div>
        </div>
      </section>

      {featuredSellers.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
          <h2 className="text-xl font-bold text-mm-navy mb-5">Популярні продавці</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {featuredSellers.map((seller) => (
              <SellerWidget key={seller.id} seller={seller} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default UserHomePage;
