import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FacebookOutlined, TwitterOutlined, InstagramOutlined, YoutubeOutlined } from '@ant-design/icons';
import { FOOTER_COLUMNS } from '../../data/homePageData';

const SOCIAL_LINKS = [
  { icon: FacebookOutlined, label: 'Facebook', href: 'https://facebook.com' },
  { icon: TwitterOutlined, label: 'Twitter', href: 'https://twitter.com' },
  { icon: InstagramOutlined, label: 'Instagram', href: 'https://instagram.com' },
  { icon: YoutubeOutlined, label: 'YouTube', href: 'https://youtube.com' },
];

// Every footer link routes to a real page — either a dedicated page (About, Terms,
// delivery/security) or a section on the consolidated HelpCenterPage (/info, /help,
// /services, /partners), scrolled into view via the #anchor matching that section's id.
const LINK_ROUTES: Record<string, string> = {
  // Інформація
  'Про нас': '/about',
  'Умови користування': '/terms',
  'Вакансії': '/info#vakansii',
  'Контакти': '/info#kontakty',
  'Усі категорії': '/categories',
  // Допомога
  'Доставка та оплата': '/delivery-rules',
  'Безпека доставки': '/delivery-safety',
  'Безпека угод': '/security',
  'Кредит': '/help#kredyt',
  'Гарантія': '/help#harantiya',
  'Повернення': '/help#povernennya',
  'Сервісні центри': '/help#servisni-tsentry',
  // Сервіси
  'Бонусний рахунок': '/services#bonusnyi-rakhunok',
  'Картка MultiMart': '/services#kartka-multimart',
  'Подарункові сертифікати': '/services#podarunkovi-sertyfikaty',
  'Аптека-Обмін': '/services#apteka-obmin',
  'Корпоративним клієнтам': '/services#korporatyvnym-kliientam',
  // Партнерам
  'Продавати на MultiMart': '/partners#prodavaty',
  'Реклама': '/partners#reklama',
  'Співпраця': '/partners#spivpratsya',
  'Франчайзинг': '/partners#franchyzynh',
  'Оренда': '/partners#orenda',
};

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-mm-footer text-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold mb-4 text-white">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      to={LINK_ROUTES[link] ?? '/'}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* QR code placeholder — links to the "App Coming Soon" teaser page, same destination
              as the home page's standalone app banner (UserHomePage/index.tsx). */}
          <Link
            to="/app-coming-soon"
            className="flex items-center gap-3 shrink-0 group"
            aria-label={t('footer.qrLabel')}
          >
            <div className="w-16 h-16 bg-white rounded-lg p-1.5 shrink-0 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                {/* Finder patterns (top-left, top-right, bottom-left) — standard QR-code look. */}
                <rect x="4" y="4" width="26" height="26" fill="none" stroke="#0D0F1A" strokeWidth="5" />
                <rect x="13" y="13" width="8" height="8" fill="#0D0F1A" />
                <rect x="70" y="4" width="26" height="26" fill="none" stroke="#0D0F1A" strokeWidth="5" />
                <rect x="79" y="13" width="8" height="8" fill="#0D0F1A" />
                <rect x="4" y="70" width="26" height="26" fill="none" stroke="#0D0F1A" strokeWidth="5" />
                <rect x="13" y="79" width="8" height="8" fill="#0D0F1A" />
                {/* Sparse data modules to sell the "QR code" silhouette without encoding anything real. */}
                <rect x="38" y="6" width="6" height="6" fill="#0D0F1A" />
                <rect x="50" y="6" width="6" height="6" fill="#0D0F1A" />
                <rect x="38" y="18" width="6" height="6" fill="#0D0F1A" />
                <rect x="60" y="18" width="6" height="6" fill="#0D0F1A" />
                <rect x="44" y="30" width="6" height="6" fill="#0D0F1A" />
                <rect x="56" y="30" width="6" height="6" fill="#0D0F1A" />
                <rect x="70" y="38" width="6" height="6" fill="#0D0F1A" />
                <rect x="82" y="38" width="6" height="6" fill="#0D0F1A" />
                <rect x="38" y="44" width="6" height="6" fill="#0D0F1A" />
                <rect x="6" y="44" width="6" height="6" fill="#0D0F1A" />
                <rect x="50" y="50" width="6" height="6" fill="#0D0F1A" />
                <rect x="62" y="50" width="6" height="6" fill="#0D0F1A" />
                <rect x="38" y="56" width="6" height="6" fill="#0D0F1A" />
                <rect x="74" y="56" width="6" height="6" fill="#0D0F1A" />
                <rect x="44" y="64" width="6" height="6" fill="#0D0F1A" />
                <rect x="86" y="64" width="6" height="6" fill="#0D0F1A" />
                <rect x="38" y="76" width="6" height="6" fill="#0D0F1A" />
                <rect x="50" y="82" width="6" height="6" fill="#0D0F1A" />
                <rect x="62" y="76" width="6" height="6" fill="#0D0F1A" />
                <rect x="74" y="86" width="6" height="6" fill="#0D0F1A" />
                <rect x="86" y="76" width="6" height="6" fill="#0D0F1A" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 leading-snug max-w-[110px] group-hover:text-white transition-colors">
              {t('footer.qrLabel')}
            </span>
          </Link>

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-gray-400">{t('footer.socials')}</span>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-mm-purple flex items-center justify-center transition-colors"
                >
                  <Icon className="text-white text-base" />
                </a>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center md:text-right max-w-xs">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
