import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useForgotPasswordMutation } from '../../../services/accountService.ts';

const ForgotPasswordPage: React.FC = () => {
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    const onFinish = async (values: { email: string }) => {
        try {
            const response = await forgotPassword({ email: values.email }).unwrap();
            message.success(response.message || 'Лист для відновлення надіслано!');
        } catch (error: any) {
            message.error(error?.data?.message || 'Сталася помилка. Спробуйте пізніше.');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-[#f2f4f5]">
            <Card className="w-full max-w-md shadow-md" title={<h2 className="text-xl font-bold text-[#002f34] text-center">Відновлення паролю</h2>}>
                <p className="text-gray-500 mb-6 text-center">
                    Введіть ваш Email, і ми надішлемо вам посилання для зміни паролю.
                </p>

                <Form name="forgot_password" layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Будь ласка, введіть Email!' },
                            { type: 'email', message: 'Введіть коректний Email!' }
                        ]}
                    >
                        <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="Ваш Email" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isLoading} block size="large" className="bg-[#002f34] hover:!bg-[#004f56]">
                            Надіслати посилання
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;