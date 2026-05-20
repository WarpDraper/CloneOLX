import React from 'react';
import { Link } from 'react-router-dom';
import {
    MessageOutlined,
    HeartOutlined,
    BellOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Button, Badge, Popover, List, Typography } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import type { NotificationItem } from '../../store/notificationSlice';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/macro';
import { dynamicActivate } from '../../i18n';

const Header: React.FC = () => {
    const dispatch = useDispatch();

  const { items } = useSelector((state: RootState) => state.notifications);
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const { i18n } = useLingui();

  const unreadCount = items.filter((n: NotificationItem) => !n.read).length;




  const notificationContent = (
    <div className="w-80 max-h-96 flex flex-col">
      <div className="flex justify-between items-center mb-2 px-4 shadow-sm pb-2">
        <span className="font-bold text-[#002f34]"><Trans>Сповіщення</Trans></span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={() => dispatch(markAllAsRead())}>
            Прочитано всі
          </Button>
        )}
      </div>
      <div className="overflow-y-auto overflow-x-hidden flex-1">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-8"><Trans>Немає нових сповіщень</Trans></div>
        ) : (
          <List
            size="small"
            dataSource={items}
            renderItem={(item: NotificationItem) => (
              <List.Item
                className={`cursor-pointer hover:bg-gray-50 transition-colors px-4 ${!item.read ? 'bg-blue-50/50' : ''}`}
                onClick={() => {
                  if (!item.read) dispatch(markAsRead(item.id));
                }}
              >
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-start">
                    <Typography.Text strong className="text-[#002f34] text-sm">{item.title}</Typography.Text>
                    {!item.read && <div className="w-2 h-2 rounded-full bg-[#23e5db] mt-1 flex-shrink-0"></div>}
                  </div>
                  <Typography.Text type="secondary" className="text-xs mt-1 leading-tight">{item.message}</Typography.Text>
                  <Typography.Text type="secondary" className="text-[10px] mt-2 opacity-70">
                    {new Date(item.createdAt).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </Typography.Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <header className="bg-[#002f34] text-white py-4 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <Link to="/" className="text-4xl font-black tracking-tighter text-[#23e5db] hover:text-white transition-colors flex items-baseline gap-2">
          <span>o<span className="text-white">l</span>x</span>
          <span>c<span className="text-white">l</span>one</span>
        </Link>
      </div>

      <div className="flex items-center gap-6 text-sm font-semibold">
        <div className="hidden md:flex items-center gap-2 cursor-pointer hover:text-[#23e5db] transition-colors">
          <MessageOutlined className="text-xl" />
          <span><Trans>Чат</Trans></span>
        </div>
        <div className="hidden lg:flex items-center gap-2 border-l border-r border-[#1a4449] px-4">
          <span 
            className={`cursor-pointer hover:text-[#23e5db] transition-colors ${i18n.locale === 'ua' ? 'text-white' : 'text-gray-400'}`}
            onClick={() => dynamicActivate('ua')}
          >Укр</span>
          <span className="text-gray-400">|</span>
          <span 
            className={`cursor-pointer hover:text-[#23e5db] transition-colors ${i18n.locale === 'en' ? 'text-white' : 'text-gray-400'}`}
            onClick={() => dynamicActivate('en')}
          >Eng</span>
        </div>
        <HeartOutlined className="text-xl px-2 cursor-pointer hover:text-[#23e5db] transition-colors hidden sm:block" />

        <Popover content={notificationContent} trigger="click" placement="bottomRight" overlayInnerStyle={{ padding: '12px 0 0 0' }}>
          <Badge count={unreadCount} size="small" offset={[-4, 4]}>
            <BellOutlined className="text-xl px-2 cursor-pointer hover:text-[#23e5db] transition-colors hidden sm:block text-white" />
          </Badge>
        </Popover>

        <Link to={isAuth ? "/profile" : "/login"} className="flex items-center gap-2 cursor-pointer hover:text-[#23e5db] transition-colors text-white">
          <UserOutlined className="text-xl" />
          <span>{isAuth ? (user?.name || <Trans>Профіль</Trans>) : <Trans>Увійти</Trans>}</span>
        </Link>
        <Button className="bg-white text-[#002f34] border-0 font-bold px-6 h-10 rounded shadow-md hover:bg-gray-100 transition-colors ml-2">
          <Trans>Додати оголошення</Trans>
        </Button>
      </div>
    </header>
  );
};

export default Header;
