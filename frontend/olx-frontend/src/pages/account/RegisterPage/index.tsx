import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../../../store/authSlice';
import { useRegisterMutation } from '../../../services/api';
import type { RootState } from '../../../store';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);
  const [register, { isLoading }] = useRegisterMutation();

  const onFinish = async (values: any) => {
    dispatch(loginStart());
    try {
      const response = await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      }).unwrap();
      
      dispatch(loginSuccess({
        user: response.user,
        token: response.token
      }));
      message.success('Registration successful!');
      navigate('/');
    } catch (error: any) {
      dispatch(loginFailure(error?.data?.message || 'Registration failed'));
      message.error(error?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1a4449] to-[#002f34] overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="z-10 px-12 text-center text-white">
          <Link to="/" className="text-6xl font-black tracking-tighter text-[#23e5db] hover:text-white transition-colors block mb-6 flex justify-center items-baseline gap-3">
            <span>o<span className="text-white">l</span>x</span>
            <span>c<span className="text-white">l</span>one</span>
          </Link>
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Join Our Community</h1>
          <p className="text-lg font-light text-teal-100 max-w-md mx-auto">
            Create an account to unlock all features, save your preferences, and start connecting today.
          </p>
        </div>
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-[#cbf7ee] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-[#23e5db] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#002f34] mb-2">Create an account</h2>
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#002f34] hover:text-[#23e5db] transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <Form
            name="register_form"
            className="register-form mt-8"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <div className="flex gap-4 mb-4">
              <Form.Item
                name="firstName"
                className="w-1/2 mb-0"
                rules={[{ required: true, message: 'First name is required!' }]}
              >
                <Input 
                  prefix={<UserOutlined className="site-form-item-icon text-gray-400" />} 
                  placeholder="First Name" 
                  className="rounded-lg py-2"
                />
              </Form.Item>
              <Form.Item
                name="lastName"
                className="w-1/2 mb-0"
                rules={[{ required: true, message: 'Last name is required!' }]}
              >
                <Input 
                  placeholder="Last Name" 
                  className="rounded-lg py-2"
                />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your Email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="site-form-item-icon text-gray-400" />} 
                placeholder="Email Address" 
                className="rounded-lg py-2"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please input your Password!' },
                { min: 6, message: 'Password must be at least 6 characters.' }
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon text-gray-400" />}
                placeholder="Password"
                className="rounded-lg py-2"
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              hasFeedback
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon text-gray-400" />}
                placeholder="Confirm Password"
                className="rounded-lg py-2"
              />
            </Form.Item>

            <Form.Item className="mt-6">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading || isLoading}
                className="w-full bg-[#002f34] hover:!bg-[#002f34]/90 h-12 rounded-lg text-base font-semibold shadow-md border-0"
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
