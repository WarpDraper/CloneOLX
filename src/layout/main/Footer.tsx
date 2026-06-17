import React from 'react';
import { FacebookOutlined, TwitterOutlined, InstagramOutlined, YoutubeOutlined } from '@ant-design/icons';
import { FOOTER_COLUMNS } from '../../data/homePageData';

const SOCIAL_LINKS = [
  { icon: FacebookOutlined, label: 'Facebook' },
  { icon: TwitterOutlined, label: 'Twitter' },
  { icon: InstagramOutlined, label: 'Instagram' },
  { icon: YoutubeOutlined, label: 'YouTube' },
];

const Footer: React.FC = () => {
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
                    <a
                      href="/"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="w-16 h-16 bg-white rounded-lg p-1.5 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
              <rect x="10" y="10" width="12" height="12" fill="#0D0F1A" />
              <rect x="26" y="10" width="12" height="12" fill="#0D0F1A" />
              <rect x="42" y="10" width="12" height="12" fill="#0D0F1A" />
              <rect x="10" y="26" width="12" height="12" fill="#0D0F1A" />
              <rect x="42" y="26" width="12" height="12" fill="#0D0F1A" />
              <rect x="58" y="26" width="12" height="12" fill="#0D0F1A" />
              <rect x="74" y="26" width="12" height="12" fill="#0D0F1A" />
              <rect x="10" y="42" width="12" height="12" fill="#0D0F1A" />
              <rect x="42" y="42" width="12" height="12" fill="#0D0F1A" />
              <rect x="58" y="42" width="12" height="12" fill="#0D0F1A" />
              <rect x="10" y="58" width="12" height="12" fill="#0D0F1A" />
              <rect x="26" y="58" width="12" height="12" fill="#0D0F1A" />
              <rect x="42" y="58" width="12" height="12" fill="#0D0F1A" />
              <rect x="58" y="58" width="12" height="12" fill="#0D0F1A" />
              <rect x="74" y="58" width="12" height="12" fill="#0D0F1A" />
              <rect x="42" y="74" width="12" height="12" fill="#0D0F1A" />
              <rect x="58" y="74" width="12" height="12" fill="#0D0F1A" />
              <rect x="74" y="74" width="12" height="12" fill="#0D0F1A" />
            </svg>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-gray-400">Спільноти MultiMart в соціальних мережах:</span>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="/"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-mm-purple flex items-center justify-center transition-colors"
                >
                  <Icon className="text-white text-base" />
                </a>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center md:text-right max-w-xs">
            © 2024 Інтернет-магазин «MultiMart». Всі права захищені.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
