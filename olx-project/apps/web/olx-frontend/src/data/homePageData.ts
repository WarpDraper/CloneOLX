export const QUICK_SEARCH_TAGS = [
  'iphone',
  'квартири',
  'авто',
  'дім',
  'собака',
  'котики',
  'запчастини',
  'велосипед',
];

// CATEGORIES та RECOMMENDATIONS раніше були статичним мок-даними — тепер отримуються
// напряму з бекенду через categoryService (GET /api/Category/get) та advertService
// (POST /api/Advert/get/page), див. UserHomePage/index.tsx.

// Minimalist dark-themed hero slides with the first 3 local product photos
// (public/images/mock1/auto_1..3.jpg — same assets seed adverts use). They rotate
// in a circular loop via HERO_AUTOPLAY_MS / setActiveSlide wrap in UserHomePage.
// No remote/Unsplash imagery (matches the no-online-fallback policy in
// buildImageUrl.ts/FallbackImage.tsx). `theme` drives title accent + gradient
// overlay so text stays readable over the photo. `to` is the CTA's target route;
// all three are auth-gated the same way (see handleHeroCta in UserHomePage) —
// signed-in users go straight there, signed-out users are sent to /login first
// and returned to `to` afterwards (saveReturnUrl/consumeReturnUrl, same flow
// AdvertCard's "add to cart"/favorite gates already use).
export const HERO_SLIDES = [
  {
    id: 1,
    title: 'Ласкаво просимо на MultiMart',
    subtitle: 'Мільйони активних оголошень від людей по всій Україні',
    cta: 'Перейти до каталогу',
    theme: 'navy' as const,
    to: '/categories',
    image: '/images/multimart/slide_1.png',
  },
  {
    id: 2,
    title: 'Знижки до -50%',
    subtitle: 'Щодня нові вигідні пропозиції — обирайте товари зі знижками просто зараз',
    cta: 'Переглянути знижки',
    theme: 'gold' as const,
    to: '/categories?discount=true',
    image: '/images/multimart/slide_2.png',
  },
  {
    id: 3,
    title: 'VIP-розміщення та послуги',
    subtitle: 'Підійміть оголошення в ТОП або скористайтеся преміум-послугами платформи',
    cta: 'Подати оголошення',
    theme: 'purple' as const,
    to: '/adverts/create',
    image: '/images/multimart/slide_3.png',
  },

];

export const FOOTER_COLUMNS = [
  {
    title: 'Інформація',
    links: [
      'Про нас',
      'Умови користування',
      'Вакансії',
      'Контакти',
      'Усі категорії',
    ],
  },
  {
    title: 'Допомога',
    links: [
      'Доставка та оплата',
      'Безпека доставки',
      'Безпека угод',
      'Кредит',
      'Гарантія',
      'Повернення',
      'Сервісні центри',
    ],
  },
  {
    title: 'Сервіси',
    links: [
      'Бонусний рахунок',
      'Картка MultiMart',
      'Подарункові сертифікати',
      'Аптека-Обмін',
      'Корпоративним клієнтам',
    ],
  },
  {
    title: 'Партнерам',
    links: [
      'Продавати на MultiMart',
      'Реклама',
      'Співпраця',
      'Франчайзинг',
      'Оренда',
    ],
  },
];
