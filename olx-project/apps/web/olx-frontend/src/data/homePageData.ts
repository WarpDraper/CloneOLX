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

// Minimalist dark-themed hero slides — no remote/Unsplash imagery (matches the
// no-online-fallback policy in buildImageUrl.ts/FallbackImage.tsx); each slide renders as a
// CSS gradient + inline decorative graphic keyed off `theme`, see UserHomePage/index.tsx.
export const HERO_SLIDES = [
  {
    id: 1,
    title: 'Ласкаво просимо на MultiMart',
    subtitle: 'Мільйони активних оголошень від людей по всій Україні',
    cta: 'Почати зараз',
    theme: 'navy' as const,
  },
  {
    id: 2,
    title: 'Продавайте швидко та вигідно',
    subtitle: 'Розмістіть оголошення за кілька хвилин і знайдіть покупця вже сьогодні',
    cta: 'Подати оголошення',
    theme: 'purple' as const,
  },
  {
    id: 3,
    title: 'MultiMart завжди під рукою',
    subtitle: 'Слідкуйте за новими пропозиціями та повідомленнями у зручному форматі',
    cta: 'Дізнатися більше',
    theme: 'orange' as const,
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
