import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    // Mock API call
    setTimeout(() => {
      if (values.email) {
        message.success(`Інструкції з відновлення надіслано на ${values.email}`);
        navigate('/login');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#002f34] to-[#1a4449] overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="z-10 px-12 text-center text-white">
          <Link to="/" className="text-6xl font-black tracking-tighter text-[#23e5db] hover:text-white transition-colors block mb-6 flex justify-center items-baseline gap-3">
            <span>o<span className="text-white">l</span>x</span>
            <span>c<span className="text-white">l</span>one</span>
          </Link>
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Відновлення паролю</h1>
          <p className="text-lg font-light text-[#cbf7ee] max-w-md mx-auto">
            Не хвилюйтеся, це трапляється! Введіть вашу пошту і ми надішлемо вам інструкції для безпечного відновлення.
          </p>
        </div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-[#23e5db] rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#cbf7ee] rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        <button 
          onClick={() => navigate('/login')}
          className="absolute top-8 left-8 text-gray-500 hover:text-[#002f34] flex items-center gap-2 font-semibold transition-colors"
        >
          <ArrowLeftOutlined /> Назад до входу
        </button>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#002f34] mb-2">Забули пароль?</h2>
            <p className="text-sm text-gray-600">
              Введіть електронну адресу, яку ви вказали при реєстрації, і ми надішлемо інструкції щодо скидання паролю.
            </p>
          </div>

          <Form
            name="forgot_password"
            className="forgot-form mt-8"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Будь ласка, введіть ваш Email!' },
                { type: 'email', message: 'Будь ласка, введіть дійсний Email!' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="site-form-item-icon text-gray-400" />} 
                placeholder="Email адреса" 
                className="rounded-lg py-2"
              />
            </Form.Item>

            <Form.Item className="mt-8">
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full bg-[#002f34] hover:!bg-[#002f34]/90 h-12 rounded-lg text-base font-semibold shadow-md border-0"
              >
                Відправити інструкції
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
