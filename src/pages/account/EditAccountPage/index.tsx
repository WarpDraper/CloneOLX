import React, { useEffect, useState } from 'react';
import { Form, Input, Switch, Button, Card, message, Row, Col, Avatar, Upload } from 'antd';
import { PhoneOutlined, EnvironmentOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';

import { useUpdateProfileMutation, useUploadAvatarMutation } from '../../../services/accountService.ts';
import { useSelector } from 'react-redux';

interface UpdateProfileFormValues {
    phoneNumber?: string;
    city?: string;
    avatarUrl?: string;
    isPhoneNumberPrivate: boolean;
    isLocationPrivate: boolean;
}

const EditProfilePage: React.FC = () => {
    const [form] = Form.useForm();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [uploadAvatar, { isLoading: isUploading }] = useUploadAvatarMutation();

    // Локальний стейт для відображення прев'ю (Base64 або URL з бекенду)
    const [previewUrl, setPreviewUrl] = useState<string>('');

    const currentUser = useSelector((state: any) => state.auth?.user);

    useEffect(() => {
        if (currentUser) {
            form.setFieldsValue({
                phoneNumber: currentUser.phoneNumber,
                city: currentUser.city,
                avatarUrl: currentUser.avatarUrl,
                isPhoneNumberPrivate: currentUser.isPhoneNumberPrivate ?? false,
                isLocationPrivate: currentUser.isLocationPrivate ?? false,
            });
            if (currentUser.avatarUrl) {
                setPreviewUrl(currentUser.avatarUrl);
            }
        }
    }, [currentUser, form]);

    // Кастомна функція завантаження файлу
    const handleCustomUpload = async (options: any) => {
        const { file, onSuccess, onError } = options;

        const formData = new FormData();
        formData.append('file', file); // Ключ 'file' має збігатися з назвою параметра в C# (IFormFile file)

        try {
            // 1. Відправляємо файл на сервер
            const response = await uploadAvatar(formData).unwrap();

            // 2. Бекенд повернув { url: "шлях_до_картинки" }. Записуємо його в приховане поле форми
            form.setFieldValue('avatarUrl', response.url);
            setPreviewUrl(response.url);

            onSuccess("OK");
            message.success('Фото успішно завантажено!');
        } catch (error) {
            onError(error);
            message.error('Не вдалося завантажити фото на сервер.');
        }
    };

    // Валідація файлу перед завантаженням (розмір та формат)
    const beforeUpload = (file: RcFile) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('Ви можете завантажити тільки JPG/PNG файли!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Розмір фото не може перевищувати 2MB!');
        }
        return isJpgOrPng && isLt2M;
    };

    const onFinish = async (values: UpdateProfileFormValues) => {
        try {
            await updateProfile(values).unwrap();
            message.success('Профіль успішно оновлено!');
        } catch (error: any) {
            message.error(error?.data?.Message || 'Помилка оновлення профілю.');
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold text-[#002f34] mb-6">Редагування профілю</h1>

            <Form form={form} layout="vertical" onFinish={onFinish}>
                {/* Приховане поле, яке зберігає URL для DTO */}
                <Form.Item name="avatarUrl" hidden>
                    <Input />
                </Form.Item>

                <Row gutter={24}>
                    <Col xs={24} md={16}>
                        <Card className="shadow-sm mb-6" title="Контактна інформація">
                            <Form.Item
                                name="phoneNumber"
                                label="Номер телефону"
                                rules={[{ pattern: /^\+?[1-9]\d{1,14}$/, message: 'Невірний формат номера' }]}
                            >
                                <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="+380XXXXXXXXX" size="large" />
                            </Form.Item>

                            <Form.Item
                                name="city"
                                label="Місто"
                                rules={[{ max: 100, message: 'Максимум 100 символів' }]}
                            >
                                <Input prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="Київ" size="large" />
                            </Form.Item>
                        </Card>

                        <Card className="shadow-sm mb-6" title="Конфіденційність">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <div>
                                    <div className="font-semibold text-[#002f34]">Приховати номер телефону</div>
                                </div>
                                <Form.Item name="isPhoneNumberPrivate" valuePropName="checked" className="mb-0">
                                    <Switch checkedChildren="Так" unCheckedChildren="Ні" />
                                </Form.Item>
                            </div>

                            <div className="flex justify-between items-center py-3">
                                <div>
                                    <div className="font-semibold text-[#002f34]">Приховати місцезнаходження</div>
                                </div>
                                <Form.Item name="isLocationPrivate" valuePropName="checked" className="mb-0">
                                    <Switch checkedChildren="Так" unCheckedChildren="Ні" />
                                </Form.Item>
                            </div>
                        </Card>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={isUpdating} size="large" className="bg-[#002f34] hover:!bg-[#004f56] px-8 h-12">
                                Зберегти зміни
                            </Button>
                        </Form.Item>
                    </Col>

                    {/* Права колонка з інтерактивним завантаженням файлу */}
                    <Col xs={24} md={8}>
                        <Card className="shadow-sm text-center bg-gray-50">
                            <div className="mb-4 text-sm font-semibold text-gray-500">Фото профілю</div>
                            <div className="flex justify-center mb-4 relative group">
                                <Avatar
                                    size={140}
                                    src={previewUrl}
                                    icon={<UserOutlined />}
                                    className="shadow-inner border border-gray-200 bg-white"
                                />
                            </div>

                            {/* Компонент завантаження */}
                            <Upload
                                name="avatar"
                                listType="picture"
                                showUploadList={false} // Приховуємо стандартний список файлів AntD
                                beforeUpload={beforeUpload}
                                customRequest={handleCustomUpload}
                            >
                                <Button icon={<UploadOutlined />} loading={isUploading} size="middle">
                                    Обрати файл
                                </Button>
                            </Upload>
                            <div className="text-[11px] text-gray-400 mt-2">JPG або PNG, до 2MB</div>
                        </Card>
                    </Col>
                </Row>
            </Form>
        </div>
    );
};

export default EditProfilePage;