import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import type { RootState } from '../../../store';
import { saveReturnUrl } from '../../../utils/returnUrl';
import {
  SearchOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
  AppstoreOutlined,
  QrcodeOutlined,
  AppleOutlined,
  AndroidOutlined,
} from '@ant-design/icons';
import { QUICK_SEARCH_TAGS, HERO_SLIDES } from '../../../data/homePageData';
import { UA_CITIES } from '../../../data/ukrainianCities';
import { useGetCategoriesQuery } from '../../../services/categoryService';
import { useGetAdvertsPageQuery } from '../../../services/advertService';
import RecommendationCard from '../../../components/advert/RecommendationCard';
import MegaMenu from '../../../components/catalog/MegaMenu';
import CategoryAvatar from '../../../components/catalog/CategoryAvatar';
import SellerWidget from '../../../components/advert/SellerWidget';
import { getSeedRecommendedAdverts, getSeedSellers, getSeedTopLevelCategories } from '../../../utils/seedHydration';
import { arrangeFeedWithTopAds } from '../../../utils/arrangeFeedWithTopAds';
import CubeLoader from '../../../components/common/CubeLoader';
import ReleaseSubscriptionWidget from '../../../components/common/ReleaseSubscriptionWidget';
import { useMinLoadingTime } from '../../../hooks/useMinLoadingTime';

// "Рекомендації для вас" always renders exactly 12 cards, laid out as a uniform 2x6 grid on
// desktop (see grid-cols below) — no expandable "Показати більше" anymore.
const RECOMMENDATIONS_COUNT = 12;
// Categories rail: at most this many real category tiles, then "Усі категорії" + "Усі товари"
// are appended and pinned last (7-10 tiles total across breakpoints).
const CATEGORY_RAIL_MAX = 8;
// Hero carousel auto-scroll interval.
const HERO_AUTOPLAY_MS = 7000;
// Popular sellers toggle: 3 cards collapsed, 6 expanded.
const SELLERS_COLLAPSED_COUNT = 3;
const SELLERS_EXPANDED_COUNT = 6;

const UserHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuth } = useSelector((state: RootState) => state.auth);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [city, setCity] = useState<string | undefined>(undefined);
  const [sellersExpanded, setSellersExpanded] = useState(false);
  const slide = HERO_SLIDES[activeSlide];

  // Auto-scroll the hero carousel every 7s; pauses/resets cleanly on unmount or slide-count
  // change. Uses a functional update so the interval doesn't need to be recreated every time
  // activeSlide changes (which would reset the 7s timer on every manual click too).
  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev === HERO_SLIDES.length - 1 ? 0 : prev + 1));
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, []);

  const goToSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed && !city) return;
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  // Hero carousel CTA — every slide's button is auth-gated the same way: signed-in users go
  // straight to the slide's target route, signed-out users are sent to /login first and
  // returned to that same target right after (saveReturnUrl/consumeReturnUrl — the same flow
  // AdvertCard already uses for its "add to cart"/favorite guest gates).
  const handleHeroCta = (to: string) => {
    if (isAuth) {
      navigate(to);
      return;
    }
    saveReturnUrl(to);
    navigate('/login');
  };

  // Категорії верхнього рівня — GET /api/Category/get (публічний).
  const { data: categories, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  // Keeps each CubeLoader overlay visible for at least 500ms so it never flashes on/off.
  const showCategoriesLoading = useMinLoadingTime(isCategoriesLoading, 500);
  const apiTopLevelCategories = (categories ?? []).filter((c) => c.parentId === null);
  // Фолбек на локальні seed-дані (Categories.json), якщо бекенд ще не засіяний/недоступний.
  const topLevelCategories = !isCategoriesLoading && apiTopLevelCategories.length === 0
    ? getSeedTopLevelCategories()
    : apiTopLevelCategories;
  // Rail always ends with the two pinned tiles ("Усі категорії" / "Усі товари"), so real
  // category tiles are capped to leave room for them within the 7-10 total tile target.
  const categoryRailTiles = topLevelCategories.slice(0, CATEGORY_RAIL_MAX);

  // Рекомендації для головної — POST /api/Advert/get/page (публічний). sortKey: 'random' —
  // бекенд (AdvertService.GetBalancedRandomPageAsync) віддає рівномірно перемішану підбірку
  // з різних категорій (не тільки авто), а не просто останні за датою. Завжди рівно 12 карток
  // (2x6 на десктопі).
  const { data: advertsPage, isLoading: isAdvertsLoading } = useGetAdvertsPageQuery({
    size: RECOMMENDATIONS_COUNT,
    page: 1,
    sortKey: 'random',
    isDescending: true,
    approved: true,
  });
  // Фолбек на локальні seed-дані (Adverts.json), якщо бекенд не повернув оголошень. Category-
  // balanced random sample (not just the first N, which are grouped by category in the
  // fixture) — memoized so it stays stable across re-renders within the same mount, but
  // re-shuffles on a fresh page load.
  const usingSeedRecommendations = !isAdvertsLoading && (advertsPage?.items?.length ?? 0) === 0;
  const seedRecommendations = useMemo(
    () => (usingSeedRecommendations ? getSeedRecommendedAdverts(RECOMMENDATIONS_COUNT) : []),
    [usingSeedRecommendations]
  );
  // Reorder so a premium ("ТОП") card lands after every 4-5 regular ones instead of wherever
  // the API's random/balanced order happened to place them.
  const recommendations = arrangeFeedWithTopAds(
    usingSeedRecommendations ? seedRecommendations : (advertsPage?.items ?? []).slice(0, RECOMMENDATIONS_COUNT)
  );
  const showAdvertsLoading = useMinLoadingTime(isAdvertsLoading, 500);

  // Продавці для стрічки "Популярні продавці" — публічного списку продавців ще немає,
  // тож секція завжди живиться з seed-даних (Users.json). Toggle "Показати ще"/"Згорнути"
  // switches the visible count between 3 and 6.
  const allFeaturedSellers = useMemo(() => getSeedSellers(), []);
  const featuredSellers = allFeaturedSellers.slice(0, sellersExpanded ? SELLERS_EXPANDED_COUNT : SELLERS_COLLAPSED_COUNT);
  const canToggleSellers = allFeaturedSellers.length > SELLERS_COLLAPSED_COUNT;

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
              {t('home.catalog')}
            </button>
            <div className="flex-[2] flex items-center bg-white/10 border-b lg:border-b-0 lg:border-r border-white/10 px-4 py-3">
              <SearchOutlined className="text-white/70 text-lg mr-3" />
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
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
                placeholder={t('home.wholeCountry')}
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
              {t('home.search')}
            </button>
          </div>

          {isCatalogOpen && (
            <MegaMenu categories={topLevelCategories} onClose={() => setIsCatalogOpen(false)} />
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pb-1 text-sm">
            <span className="text-white/60 font-medium">{t('home.topQueries')}</span>
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
        <div
          className={`relative rounded-2xl overflow-hidden min-h-[300px] md:min-h-[380px] transition-colors duration-500 ${slide.theme === 'purple'
              ? 'bg-gradient-to-br from-mm-navy to-mm-purple-dark'
              : slide.theme === 'gold'
                ? 'bg-gradient-to-br from-mm-footer via-mm-navy to-mm-footer'
                : 'bg-gradient-to-br from-mm-navy to-mm-footer'
            }`}
        >
          {/* All 3 background photos are stacked on top of each other; the active slide's
              photo is opaque while the rest fade out, so autoplay + arrows rotate them in a
              smooth circular crossfade loop (1 → 2 → 3 → 1 …). object-top keeps the models'
              heads in frame (photo looks slightly "further away"). */}
          {HERO_SLIDES.map((s, index) => (
            <img
              key={s.id}
              src={s.image}
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
                index === activeSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Dark scrim so title / subtitle / CTA stay readable over any photo. */}
          <div
            className={`absolute inset-0 pointer-events-none ${slide.theme === 'purple'
                ? 'bg-gradient-to-r from-mm-navy/80 via-mm-navy/45 to-transparent'
                : slide.theme === 'gold'
                  ? 'bg-gradient-to-r from-mm-footer/80 via-mm-navy/45 to-transparent'
                  : 'bg-gradient-to-r from-mm-navy/80 via-mm-navy/45 to-transparent'
              }`}
          />

          {/* Minimalist dark decorative glow, colored per slide theme. */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div
              className={`absolute -top-10 -right-10 w-56 h-56 rounded-full blur-3xl ${slide.theme === 'gold' ? 'bg-mm-orange' : 'bg-mm-purple'
                }`}
            />
          </div>


          <button
            type="button"
            aria-label={t('home.prevSlide')}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 shadow flex items-center justify-center text-white transition-all duration-300 hover:scale-105"
            onClick={() => setActiveSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
          >
            <LeftOutlined />
          </button>
          <button
            type="button"
            aria-label={t('home.nextSlide')}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 shadow flex items-center justify-center text-white transition-all duration-300 hover:scale-105"
            onClick={() => setActiveSlide((prev) => (prev === HERO_SLIDES.length - 1 ? 0 : prev + 1))}
          >
            <RightOutlined />
          </button>

          {/* px-12/px-16 (was px-8/px-12) — clears the absolutely-positioned left-3/right-3
              nav arrows (~48px reach) so title/description/CTA never sit flush against them. */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-12 md:px-16 py-8 md:py-10 relative">
            <div className="flex-1 z-[1]">
              <h1
                className={`text-2xl md:text-3xl font-bold mb-3 leading-tight ${slide.theme === 'gold'
                    ? 'text-amber-400'
                    : slide.theme === 'purple'
                      ? 'text-purple-300'
                      : 'text-white'
                  }`}
              >
                {slide.title}
              </h1>
              <p className="text-white/70 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                {slide.subtitle}
              </p>
              <button
                type="button"
                onClick={() => handleHeroCta(slide.to)}
                className="bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl"
              >
                {slide.cta}
              </button>
            </div>
            
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t('home.slideLabel', { number: index + 1 })}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${index === activeSlide ? 'bg-mm-orange w-6' : 'bg-white/30 w-2 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-8">
        <h2 className="text-xl font-bold text-mm-navy mb-5">{t('home.categories')}</h2>
        {/* pt-3 + overflow-y-visible: the CategoryAvatar/pinned-tile hover lift
            (hover:-translate-y-1) needs breathing room above the row and an unconstrained
            vertical axis, or the card tops get clipped at the container's top edge — setting
            only overflow-x forces overflow-y to 'auto' per the CSS overflow computed-value
            rule, which was clipping the lift.
            Centering: flex-nowrap + horizontal scroll on narrow screens (where the tiles
            overflow the viewport), but wraps and centers (flex-wrap + justify-center) from
            md up so on wide screens the row sits centered under "Категорії" instead of hugging
            the left edge with empty space on the right. mx-auto/w-full keep the row itself
            centered within the section regardless of how many tiles it holds. */}
        <div className="flex flex-nowrap md:flex-wrap justify-start md:justify-center gap-4 md:gap-6 overflow-x-auto md:overflow-visible overflow-y-visible pt-3 pb-2 scrollbar-hide mx-auto w-full">
          {showCategoriesLoading && (
            <div className="flex justify-center items-center w-full py-4">
              <CubeLoader />
            </div>
          )}
          {categoryRailTiles.map((category) => (
            <CategoryAvatar key={category.id} category={category} className="min-w-[80px]" />
          ))}
          {/* Pinned last, in this exact order, regardless of breakpoint or category count. */}
          <Link
            to="/categories"
            className="flex flex-col items-center gap-2.5 shrink-0 group min-w-[80px] transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-mm-navy border-2 border-mm-purple/40 group-hover:border-mm-orange shadow-sm group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
              <AppstoreOutlined className="text-2xl text-white/80" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-mm-purple transition-colors max-w-[90px]">
              {t('home.allCategories')}
            </span>
          </Link>
          <Link
            to="/search"
            className="flex flex-col items-center gap-2.5 shrink-0 group min-w-[80px] transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-mm-orange border-2 border-mm-orange group-hover:bg-orange-500 shadow-sm group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
              <AppstoreOutlined className="text-2xl text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-mm-purple transition-colors max-w-[90px]">
              {t('home.allProducts')}
            </span>
          </Link>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-8">
        <div className="bg-mm-navy rounded-2xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('home.recommendations')}</h2>
          {/* Exactly 12 cards, 2x6 on desktop (lg:grid-cols-6). `items-stretch` (grid default)
              plus each RecommendationCard's `h-full flex flex-col` keeps every card the same
              height per row regardless of title line-wrap. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
            {showAdvertsLoading && (
              <div className="col-span-full flex justify-center items-center py-8">
                <CubeLoader color="#ffffff" />
              </div>
            )}
            {recommendations.map((advert) => (
              <RecommendationCard key={advert.id} advert={advert} />
            ))}
          </div>
        </div>
      </section>

      {/* Standalone app banner — moved out of the recommendations grid into its own horizontal
          section directly beneath it. "Детальніше" routes to the dedicated /app-coming-soon page. */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <div className="bg-mm-lavender-light border border-purple-100 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-lg border border-gray-200 shrink-0 flex items-center justify-center p-2">
            <QrcodeOutlined className="text-5xl text-mm-navy" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base font-bold text-mm-navy mb-1">{t('home.appTitle')}</h3>
            <p className="text-xs md:text-sm text-gray-500">{t('home.appDescription')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
              <AppleOutlined /> {t('home.appStore')}
            </div>
            <div className="flex items-center gap-1.5 bg-mm-navy text-white text-xs font-bold py-2 px-3 rounded-md">
              <AndroidOutlined /> {t('home.googlePlay')}
            </div>
          </div>
          <Link
            to="/app-coming-soon"
            className="shrink-0 bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl"
          >
            {t('home.more')}
          </Link>
        </div>
      </section>

      {allFeaturedSellers.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-mm-navy">{t('home.popularSellers')}</h2>
            {canToggleSellers && (
              <button
                type="button"
                onClick={() => setSellersExpanded((prev) => !prev)}
                className="text-sm font-semibold text-mm-purple hover:underline"
              >
                {sellersExpanded ? t('home.collapse') : t('home.showMore')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredSellers.map((seller) => (
              <SellerWidget key={seller.id} seller={seller} />
            ))}
          </div>
        </section>
      )}

      <ReleaseSubscriptionWidget />
    </div>
  );
};

export default UserHomePage;
