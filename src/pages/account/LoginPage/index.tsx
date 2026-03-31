import React from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../../../store/authSlice';
import { useLoginMutation } from '../../../services/api';
import type { RootState } from '../../../store';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);
  const [login, { isLoading }] = useLoginMutation();

  const onFinish = async (values: any) => {
    dispatch(loginStart());
    try {
      const response = await login(values).unwrap();
      dispatch(loginSuccess({
        user: response.user,
        token: response.token
      }));
      message.success('Login successful!');
      navigate('/');
    } catch (error: any) {
      dispatch(loginFailure(error?.data?.message || 'Invalid credentials'));
      message.error(error?.data?.message || 'Invalid credentials');
    }
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
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Welcome Back</h1>
          <p className="text-lg font-light text-[#cbf7ee] max-w-md mx-auto">
            Log in to access your dashboard, connect with others, and discover new opportunities on our platform.
          </p>
        </div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-[#23e5db] rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#cbf7ee] rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#002f34] mb-2">Sign in to your account</h2>
            <p className="text-sm text-gray-600">
              Or{' '}
              <Link to="/register" className="font-bold text-[#002f34] hover:text-[#23e5db] transition-colors">
                create a new account
              </Link>
            </p>
          </div>

          <Form
            name="normal_login"
            className="login-form mt-8"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your Email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input 
                prefix={<UserOutlined className="site-form-item-icon text-gray-400" />} 
                placeholder="Email Address" 
                className="rounded-lg py-2"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon text-gray-400" />}
                placeholder="Password"
                className="rounded-lg py-2"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="text-gray-600">Remember me</Checkbox>
              </Form.Item>
              <Link to="/forgot-password" className="text-sm font-bold text-[#002f34] hover:text-[#23e5db]">
                Forgot password?
              </Link>
            </div>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading || isLoading}
                className="w-full bg-[#002f34] hover:!bg-[#002f34]/90 h-12 rounded-lg text-base font-semibold shadow-md border-0"
              >
                Log in
              </Button>
            </Form.Item>
            
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button className="w-full h-11 flex items-center justify-center gap-2 rounded-lg text-gray-700 border-gray-300 hover:bg-gray-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                     fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
