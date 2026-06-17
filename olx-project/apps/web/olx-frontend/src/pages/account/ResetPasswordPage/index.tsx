import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useResetPasswordMutation } from '../../../services/accountService.ts';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const onFinish = async (values: any) => {
        if (!token || !email) {
            message.error('Посилання недійсне або пошкоджене.');
            return;
        }

        try {
            const response = await resetPassword({
                email: email,
                token: token,
                newPassword: values.password,
            }).unwrap();

            message.success(response.message || 'Пароль успішно змінено!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error: any) {
            message.error(error?.data?.message || 'Не вдалося змінити пароль. Можливо, посилання застаріло.');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-[#f2f4f5]">
            <Card className="w-full max-w-md shadow-md" title={<h2 className="text-xl font-bold text-[#002f34] text-center">Встановлення нового паролю</h2>}>
                <Form name="reset_password" layout="vertical" onFinish={onFinish}>

                    <Form.Item
                        name="password"
                        label="Новий пароль"
                        rules={[
                            { required: true, message: 'Будь ласка, введіть новий пароль!' },
                            { min: 6, message: 'Пароль має містити мінімум 6 символів!' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Мінімум 6 символів" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="confirm"
                        label="Підтвердіть новий пароль"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Будь ласка, підтвердіть пароль!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Паролі не збігаються!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Повторіть пароль" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isLoading} block size="large" className="bg-[#002f34] hover:!bg-[#004f56]">
                            Зберегти новий пароль
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ResetPasswordPage;