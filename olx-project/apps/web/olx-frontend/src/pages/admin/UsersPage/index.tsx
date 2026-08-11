import React, { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, message } from 'antd';
import { LockOutlined, UnlockOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { addNotification } from '../../../store/notificationSlice';
import { useGetUsersQuery, useToggleUserBlockMutation } from '../../../services/adminService.ts';

interface UserData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'blocked';
  registerDate: string;
}

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: users = [], isLoading } = useGetUsersQuery();
  const [toggleBlock] = useToggleUserBlockMutation();
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const toggleUserStatus = async (id: string, currentStatus: string, name: string) => {
    try {
      await toggleBlock(id).unwrap();
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      message.success(t('admin.users.messages.statusChanged', {
        name,
        action: newStatus === 'blocked' ? t('admin.users.actionVerb.blocked') : t('admin.users.actionVerb.unblocked'),
      }));
    } catch (e) {
      message.error(t('admin.users.messages.statusError'));
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
      title: t('admin.users.notifications.title'),
      message: `${values.subject} - ${values.message}`,
    }));
    message.success(t('admin.users.messages.sendSuccess', { name: selectedUser?.name }));
    setIsMessageModalVisible(false);
    form.resetFields();
  };

  const columns: ColumnsType<UserData> = [
    { title: t('admin.users.table.id'), dataIndex: 'id', key: 'id', width: 60 },
    { title: t('admin.users.table.name'), dataIndex: 'name', key: 'name' },
    { title: t('admin.users.table.email'), dataIndex: 'email', key: 'email' },
    { title: t('admin.users.table.registerDate'), dataIndex: 'registerDate', key: 'registerDate' },
    {
      title: t('admin.users.table.status'),
      key: 'status',
      render: (_, record) => (
        <Tag color={record.status === 'active' ? 'green' : 'red'}>
          {record.status === 'active' ? t('admin.users.status.active') : t('admin.users.status.blocked')}
        </Tag>
      )
    },
    {
      title: t('admin.users.table.actions'),
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
             {record.status === 'active' ? t('admin.users.actions.block') : t('admin.users.actions.unblock')}
          </Button>
          <Button
            type="primary"
            icon={<MailOutlined />}
            size="small"
            className="bg-[#002f34]"
            onClick={() => openMessageModal(record)}
          >
            {t('admin.users.actions.message')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#002f34]">{t('admin.users.title')}</h1>
      </div>

      <Table
        columns={columns as any}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={t('admin.users.modal.title', { name: selectedUser?.name })}
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
            label={t('admin.users.modal.subjectLabel')}
            rules={[{ required: true, message: t('admin.users.modal.subjectRequired') }]}
          >
            <Input placeholder={t('admin.users.modal.subjectPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="message"
            label={t('admin.users.modal.messageLabel')}
            rules={[{ required: true, message: t('admin.users.modal.messageRequired') }]}
          >
            <Input.TextArea rows={4} placeholder={t('admin.users.modal.messagePlaceholder')} />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setIsMessageModalVisible(false)} className="mr-2">{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" className="bg-[#002f34]">{t('admin.users.modal.send')}</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
