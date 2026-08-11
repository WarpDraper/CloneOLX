/** @jsxImportSource react */
import React, { useState } from 'react';
import { Button } from 'antd';
import {
  InfoCircleOutlined,
  ExportOutlined,
  CarOutlined
} from '@ant-design/icons';
import {useDispatch, useSelector} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../../store';
import {logout} from "../../../Slice/authSlice.ts";
import { useGetSellerProfileQuery, isRealUserId } from '../../../services/profileService';
import WalletTopUpModal from './WalletTopUpModal';
import AccountTypeModal from './AccountTypeModal';
import NovaPoshtaDeliveryPanel from './NovaPoshtaDeliveryPanel';

type TabKey = 'ads' | 'chat' | 'payments' | 'rating' | 'job' | 'profile' | 'settings' | 'delivery';

const UserProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const { isAuth } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);

    const { data: profile } = useGetSellerProfileQuery(currentUserId, { skip: !isRealUserId(currentUserId) });

    const [activeTab, setActiveTab] = useState<TabKey>('profile');
    const [walletBalance, setWalletBalance] = useState(0);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isAccountTypeOpen, setIsAccountTypeOpen] = useState(false);

    const ACCOUNT_TYPE_LABELS: Record<string, string> = {
        Individual: t('userProfile.accountTypeLabels.individual'),
        Business: t('userProfile.accountTypeLabels.business'),
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const TABS: { key: TabKey; label: string; icon?: React.ReactNode; onSelect: () => void }[] = [
        { key: 'ads', label: t('userProfile.tabs.ads'), onSelect: () => navigate(isRealUserId(currentUserId) ? `/profile/${currentUserId}` : '/profile') },
        { key: 'chat', label: t('userProfile.tabs.chat'), onSelect: () => navigate('/chat') },
        { key: 'payments', label: t('userProfile.tabs.payments'), onSelect: () => setActiveTab('payments') },
        { key: 'rating', label: t('userProfile.tabs.rating'), onSelect: () => navigate(isRealUserId(currentUserId) ? `/profile/${currentUserId}` : '/profile') },
        { key: 'job', label: t('userProfile.tabs.job'), onSelect: () => setActiveTab('job') },
        { key: 'profile', label: t('userProfile.tabs.profile'), onSelect: () => setActiveTab('profile') },
        { key: 'settings', label: t('userProfile.tabs.settings'), onSelect: () => navigate('/settings') },
        { key: 'delivery', label: t('userProfile.tabs.delivery'), icon: <CarOutlined />, onSelect: () => setActiveTab('delivery') },
    ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f4f5]">
      <div className="bg-white px-4 md:px-8 shadow-sm z-10">
        <div className="max-w-[1240px] mx-auto flex flex-col pt-6 pb-2">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-[#002f34]">{t('userProfile.title')}</h1>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-500">{t('userProfile.wallet.balanceLabel')} <span className="text-[#002f34] font-bold">{t('userProfile.amountCurrency', { amount: walletBalance })}</span></p>
                <p className="font-semibold text-gray-500 flex items-center justify-end gap-1">
                  {t('userProfile.wallet.availableBalanceLabel')} <span className="text-[#002f34] font-bold">{t('userProfile.wallet.zeroBonuses')}</span>
                  <InfoCircleOutlined className="text-gray-400" />
                </p>
              </div>
              <Button className="font-bold border-gray-300 text-[#002f34] h-10 px-6 rounded hover:border-[#002f34] hover:text-[#002f34]" onClick={() => setIsTopUpOpen(true)}>
                {t('userProfile.topUpButton')}
              </Button>
              <Button className="bg-[#002f34] border-0 text-white font-bold h-10 px-6 rounded hover:bg-[#002f34]/90 flex flex-col items-center justify-center leading-tight">
                <span>{t('userProfile.buyPackageButton')}</span>
                <span className="text-[10px] font-normal leading-none -mt-1 opacity-80">{t('userProfile.learnMore')}</span>
              </Button>
            </div>
          </div>

          <nav className="flex items-center gap-8 overflow-x-auto text-sm font-semibold text-gray-500 pb-1">
            {TABS.map((tab) => (
                <span
                    key={tab.key}
                    onClick={tab.onSelect}
                    className={`cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        activeTab === tab.key
                            ? 'text-[#002f34] border-b-2 border-[#002f34] pb-2'
                            : 'hover:text-[#002f34]'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-8 py-10">

        {activeTab === 'profile' && (
        <>
        <div className="flex items-center gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-[#cbf7ee] flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.avatarUrl ? (
                  <img
                      src={user.avatarUrl}
                      alt={t('userProfile.avatarAlt')}
                      className="w-full h-full object-cover"
                  />
              ) : (
                  <svg viewBox="0 0 100 100" className="w-20 h-20 text-[#002f34] mt-2">
                      <circle cx="50" cy="40" r="22" fill="currentColor"/>
                      <path d="M15,95 C15,65 85,65 85,95" fill="currentColor" />
                      <circle cx="42" cy="35" r="3" fill="#cbf7ee"/>
                      <circle cx="58" cy="35" r="3" fill="#cbf7ee"/>
                  </svg>
              )}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#002f34] mb-2">{t('userProfile.editProfileHeading')}</h2>
            <a href="" className="flex items-center gap-1 text-[#002f34] font-semibold hover:underline">
               <ExportOutlined /> {t('userProfile.viewAsOthers')}
            </a>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 p-8 mb-6 relative">
           <div className="absolute top-8 right-8">
             <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200" onClick={() => navigate('/settings')}>
               {t('common.edit')}
             </Button>
               <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200" onClick={isAuth ? handleLogout : undefined}>
                   {t('common.logout')}
               </Button>
           </div>

           <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-8 flex items-center gap-1 uppercase">
             {t('userProfile.mainInfoHeading')} <InfoCircleOutlined />
           </h3>

           <div className="flex flex-col gap-6 max-w-xl">
             <div>
               <p className="text-sm text-gray-500 mb-1">{t('userProfile.fields.name')}</p>
               <p className="text-base text-[#002f34] font-semibold">{user?.name || t('userProfile.fields.userFallback')}</p>
             </div>
             <div>
               <p className="text-sm text-gray-500 mb-1"> {t('userProfile.fields.location')} </p>
                 {user?.location ? (
                     <p className="text-base text-[#002f34] font-semibold">{user.location}</p>
                 ) : (
                     <p className="text-base text-[#002f34] font-semibold">{t('userProfile.fields.notSpecified')}</p>
                 )}

             </div>
             <div>
               <p className="text-sm text-gray-500 mb-1"> {t('userProfile.fields.phoneNumber')} </p>
                 {user?.phoneNumber ? (
                     <p className="text-base text-[#002f34] font-semibold">{user.phoneNumber}</p>
                 ) : (
                     <p className="text-base text-[#002f34] font-semibold">{t('userProfile.fields.notSpecified')}</p>
                 )}
             </div>
           </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 p-8">
           <h3 className="text-lg font-bold text-[#002f34] mb-4">
             {t('userProfile.accountType.heading')}
           </h3>
           <p className="text-sm text-gray-600 mb-6 font-medium">
             {t('userProfile.accountType.description')}
           </p>
           <div className="flex items-center gap-4">
               <Button className="bg-[#f2f4f5] border-0 text-[#002f34] font-bold px-6 h-10 hover:bg-gray-200" onClick={() => setIsAccountTypeOpen(true)}>
                 {t('userProfile.accountType.selectButton')}
               </Button>
               {profile?.accountType && (
                   <span className="text-sm font-semibold text-[#002f34]">
                       {t('userProfile.accountType.currentType', { type: ACCOUNT_TYPE_LABELS[profile.accountType] ?? profile.accountType })}
                   </span>
               )}
           </div>
        </div>
        </>
        )}

        {activeTab === 'payments' && (
            <div className="bg-white rounded shadow-sm border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-[#002f34] mb-4">{t('userProfile.tabs.payments')}</h3>
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <div className="flex-1 bg-[#f2f4f5] rounded-lg p-6">
                        <p className="text-sm text-gray-500 mb-1">{t('userProfile.payments.walletBalanceLabel')}</p>
                        <p className="text-3xl font-black text-[#002f34]">{t('userProfile.amountCurrency', { amount: walletBalance })}</p>
                        <Button className="mt-4 bg-[#002f34] border-0 text-white font-bold px-6 h-10 rounded hover:bg-[#002f34]/90" onClick={() => setIsTopUpOpen(true)}>
                            {t('userProfile.topUpButton')}
                        </Button>
                    </div>
                    <div className="flex-1 bg-[#f2f4f5] rounded-lg p-6">
                        <p className="text-sm text-gray-500 mb-1">{t('userProfile.payments.bonusesLabel')}</p>
                        <p className="text-3xl font-black text-[#002f34]">{t('userProfile.payments.zeroValue')}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-400">{t('userProfile.payments.historyComingSoon')}</p>
            </div>
        )}

        {activeTab === 'job' && (
            <div className="bg-white rounded shadow-sm border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-[#002f34] mb-4">{t('userProfile.tabs.job')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                    {t('userProfile.job.description')}
                </p>
                <p className="text-sm text-gray-400">{t('userProfile.job.comingSoon')}</p>
            </div>
        )}

        {activeTab === 'delivery' && <NovaPoshtaDeliveryPanel />}

      </div>

      <WalletTopUpModal
          open={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          onSuccess={(amount) => setWalletBalance((b) => b + amount)}
      />
      <AccountTypeModal
          open={isAccountTypeOpen}
          onClose={() => setIsAccountTypeOpen(false)}
          userId={currentUserId}
          profile={profile}
      />
    </div>
  );
};

export default UserProfilePage;
