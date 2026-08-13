import React, { useState } from 'react';
import { Layout, Menu, Input, Badge, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  TagsOutlined,
  TeamOutlined,
  ShopOutlined,
  MessageOutlined,
  WarningOutlined,
  BarChartOutlined,
  RocketOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  MailOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../store';
import { logout } from '../../Slice/authSlice';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const NAV_ITEMS = [
    { key: '/admin', icon: <HomeOutlined />, label: t('admin.layout.sidebar.home') },
    { key: '/admin/orders', icon: <ShoppingOutlined />, label: t('admin.layout.sidebar.orders') },
    { key: '/admin/products', icon: <AppstoreOutlined />, label: t('admin.layout.sidebar.products') },
    { key: '/admin/categories', icon: <TagsOutlined />, label: t('admin.layout.sidebar.categories') },
    { key: '/admin/users', icon: <TeamOutlined />, label: t('admin.layout.sidebar.users') },
    { key: '/admin/sellers', icon: <ShopOutlined />, label: t('admin.layout.sidebar.sellers') },
    { key: '/admin/chats', icon: <MessageOutlined />, label: t('admin.layout.sidebar.chats') },
    { key: '/admin/reports', icon: <WarningOutlined />, label: t('admin.layout.sidebar.reports') },
    { key: '/admin/analytics', icon: <BarChartOutlined />, label: t('admin.layout.sidebar.analytics') },
    { key: '/admin/marketing', icon: <RocketOutlined />, label: t('admin.layout.sidebar.marketing') },
    { key: '/admin/settings', icon: <SettingOutlined />, label: t('admin.layout.sidebar.settings') },
  ];

  const selectedKey = NAV_ITEMS
    .map((item) => item.key)
    .filter((key) => location.pathname === key || location.pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0] ?? '/admin';

  const menuItems: MenuProps['items'] = NAV_ITEMS.map(({ key, icon, label }) => ({
    key,
    icon,
    label: <Link to={key}>{label}</Link>,
  }));

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'site',
      label: t('admin.layout.profileMenu.site'),
      onClick: () => navigate('/'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      onClick: () => {
        dispatch(logout());
        navigate('/');
      },
    },
  ];

  return (
    <Layout className="h-screen w-full overflow-hidden" style={{ background: '#0b0d13' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        theme="dark"
        className="relative flex flex-col"
        style={{ background: '#0b0d13' }}
      >
        <div className="h-16 flex items-center gap-2 border-b border-white/10 mx-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img src="/images/multimart/logo.svg" alt={t('admin.layout.logoAlt')} className="w-8 h-8" />
            {!collapsed && (
              <span className="text-lg font-black tracking-tight text-white">
                MultiMart <span className="font-normal text-xs text-gray-400 align-middle">admin</span>
              </span>
            )}
          </Link>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          className="mt-4 border-r-0 flex-1"
          style={{ background: 'transparent' }}
          selectedKeys={[selectedKey]}
          items={menuItems}
        />

        <div className="p-4">
          <div className="rounded-xl bg-gradient-to-br from-mm-purple to-mm-orange p-4 text-center">
            {!collapsed ? (
              <>
                <div className="text-white font-bold text-sm">{t('admin.layout.promo.title')}</div>
                <div className="text-white/80 text-xs mt-1">{t('admin.layout.promo.subtitle')}</div>
              </>
            ) : (
              <div className="text-white text-lg">🚀</div>
            )}
          </div>
        </div>
      </Sider>

      <Layout className="flex flex-col h-screen" style={{ background: '#f2f4f5' }}>
        <Header
          className="px-4 flex items-center justify-between shadow-md z-10 sticky top-0 border-b border-white/10 gap-4"
          style={{ background: '#0b0d13', flexShrink: 0 }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg shrink-0"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder={t('admin.layout.searchPlaceholder')}
              className="max-w-sm admin-header-search"
            />
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <Badge dot>
              <BellOutlined className="text-lg text-white cursor-pointer" />
            </Badge>
            <Badge dot>
              <MailOutlined className="text-lg text-white cursor-pointer" />
            </Badge>
            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer pl-3 border-l border-white/10">
                <Avatar icon={<UserOutlined />} className="bg-mm-purple" />
                <div className="hidden sm:block leading-tight">
                  <div className="text-white text-sm font-medium">{user?.name || t('admin.layout.defaultAdminName')}</div>
                  <div className="text-gray-400 text-xs">{t('admin.layout.roleLabel')}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm overflow-y-auto flex-1">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
