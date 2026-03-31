import React, { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, message } from 'antd';
import { LockOutlined, UnlockOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../../store/notificationSlice';
import { useGetUsersQuery, useToggleUserBlockMutation } from '../../../services/api';

interface UserData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'blocked';
  registerDate: string;
}

const UsersPage: React.FC = () => {
  const { data: users = [], isLoading } = useGetUsersQuery({});
  const [toggleBlock] = useToggleUserBlockMutation();
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const toggleUserStatus = async (id: string, currentStatus: string, name: string) => {
    try {
      await toggleBlock(id).unwrap();
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      message.success(`Користувача ${name} успішно ${newStatus === 'blocked' ? 'заблоковано' : 'розблоковано'}`);
    } catch (e) {
      message.error('Помилка при зміні статусу. Перевірте підключення до API.');
    }
  };

  const openMessageModal = (user: UserData) => {
    setSelectedUser(user);
    setIsMessageModalVisible(true);
  };

  const sendMessage = (values: any) => {
    // We can also trigger a notification for the system to "simulate" that the admin sent a message.
    dispatch(addNotification({
      type: 'info',
      title: `Повідомлення від модератора`,
      message: `${values.subject} - ${values.message}`,
    }));
    message.success(`Повідомлення успішно відправлено користувачу ${selectedUser?.name}`);
    setIsMessageModalVisible(false);
    form.resetFields();
  };

  const columns: ColumnsType<UserData> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Ім\'я', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Дата реєстрації', dataIndex: 'registerDate', key: 'registerDate' },
    { 
      title: 'Статус', 
      key: 'status', 
      render: (_, record) => (
        <Tag color={record.status === 'active' ? 'green' : 'red'}>
          {record.status === 'active' ? 'Активний' : 'Заблокований'}
        </Tag>
      )
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type={record.status === 'active' ? 'default' : 'primary'}
            danger={record.status === 'active'}
            icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
            size="small"
            onClick={() => toggleUserStatus(record.id, record.status, record.name)}
          >
             {record.status === 'active' ? 'Заблокувати' : 'Розблокувати'}
          </Button>
          <Button 
            type="primary"
            icon={<MailOutlined />}
            size="small"
            className="bg-[#002f34]"
            onClick={() => openMessageModal(record)}
          >
            Повідомлення
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#002f34]">Управління користувачами</h1>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="id" 
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={`Відправити повідомлення: ${selectedUser?.name}`}
        open={isMessageModalVisible}
        onCancel={() => {
          setIsMessageModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={sendMessage} className="mt-4">
          <Form.Item 
            name="subject" 
            label="Тема"
            rules={[{ required: true, message: 'Будь ласка, введіть тему' }]}
          >
            <Input placeholder="Наприклад: Попередження про порушення правил" />
          </Form.Item>
          <Form.Item 
            name="message" 
            label="Текст повідомлення"
            rules={[{ required: true, message: 'Будь ласка, введіть текст повідомлення' }]}
          >
            <Input.TextArea rows={4} placeholder="Введіть текст..." />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setIsMessageModalVisible(false)} className="mr-2">Скасувати</Button>
            <Button type="primary" htmlType="submit" className="bg-[#002f34]">Відправити</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
