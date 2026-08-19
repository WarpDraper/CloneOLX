import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FacebookOutlined, TwitterOutlined, InstagramOutlined, YoutubeOutlined } from '@ant-design/icons';
import { FOOTER_COLUMNS } from '../../data/homePageData';
import SiteQrCode from '../../components/common/SiteQrCode';
import { useGetQrCodeUrlQuery } from '../../services/settingsService';

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
  const { data: qrCodeData } = useGetQrCodeUrlQuery();
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
          {/* Auto-generated QR code pointing at the backend-configured QrCodeTargetUrl
              (appsettings.json) — real, scannable code (see SiteQrCode), not a static
              placeholder graphic. */}
          <a
            href={qrCodeData?.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 shrink-0 group"
            aria-label={t('footer.qrLabel')}
          >
            <div className="w-16 h-16 bg-white rounded-lg p-1.5 shrink-0 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <SiteQrCode size={56} className="w-full h-full" />
            </div>
            <span className="text-xs text-gray-400 leading-snug max-w-[110px] group-hover:text-white transition-colors">
              {t('footer.qrLabel')}
            </span>
          </a>

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
