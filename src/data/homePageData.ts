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

export const HERO_SLIDES = [
  {
    id: 1,
    title: 'Ласкаво просимо на MultiMart',
    subtitle: 'Мільйони активних оголошень від людей по всій Україні',
    cta: 'Почати зараз',
    image: 'https://images.unsplash.com/photo-1496181133206-812ce9e65302?w=800&h=500&fit=crop&auto=format',
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
