import React from 'react';
import  RegisterForm  from "../../../components/form/RegisterForm";
import { Link } from "react-router-dom";

const RegisterPage: React.FC = () => {

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
            <RegisterForm />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
