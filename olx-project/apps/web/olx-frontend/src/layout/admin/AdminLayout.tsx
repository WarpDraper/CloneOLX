import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  TeamOutlined,
  WarningOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout className="h-screen w-full overflow-hidden">
      <Sider trigger={null} collapsible collapsed={collapsed} width={250} theme="dark" className="bg-black relative" style={{ background: '#000' }}>
        <div className="h-16 flex items-center justify-center border-b border-gray-700 mx-4">
          <Link to="/" className="text-2xl font-black tracking-tighter text-[#23e5db] hover:text-white transition-colors flex items-center justify-center">
            {!collapsed ? (
              <>o<span className="text-white">l</span>x <span className="font-normal text-xl text-white ml-2">admin</span></>
            ) : "olx"}
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          className="bg-black mt-6 border-r-0"
          style={{ background: '#000' }}
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/admin/users',
              icon: <TeamOutlined />,
              label: <Link to="/admin/users">Користувачі</Link>,
            },
            {
              key: '/admin/reports',
              icon: <WarningOutlined />,
              label: <Link to="/admin/reports">Скарги</Link>,
            },
          ]}
        />
        <div className="absolute bottom-4 left-0 w-full px-4 text-center">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            className="w-full text-white hover:text-white hover:bg-white/10 text-left"
            style={{ color: '#ffffff' }}
            onClick={() => navigate('/')}
          >
            {!collapsed && "Вийти на сайт"}
          </Button>
        </div>
      </Sider>
      <Layout className="bg-[#f2f4f5] flex flex-col h-screen">
        <Header className="bg-black px-4 flex items-center shadow-md z-10 sticky top-0 border-b border-gray-800" style={{ background: '#000', flexShrink: 0 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg w-10 h-10 hover:bg-gray-800 flex items-center justify-center"
            style={{ color: '#ffffff' }}
          />
          <h2 className="ml-4 m-0 text-xl font-bold text-white">Панель модератора</h2>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm overflow-y-auto flex-1">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
