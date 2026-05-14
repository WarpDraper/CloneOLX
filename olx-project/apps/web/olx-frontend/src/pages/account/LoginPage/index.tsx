import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from "../../../components/form/LoginForm.tsx";


const LoginPage: React.FC = () => {

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

          <LoginForm/>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
