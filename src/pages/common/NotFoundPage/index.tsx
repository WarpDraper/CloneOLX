import React from 'react';
import { Button } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#002f34]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-96 h-96 bg-[#23e5db] rounded-full blur-3xl mix-blend-overlay absolute -right-20 top-20"></div>
                <div className="w-[30rem] h-[30rem] bg-[#cbf7ee] rounded-full blur-3xl mix-blend-overlay absolute -left-40 -bottom-20"></div>
                <div className="w-80 h-80 bg-blue-300 rounded-full blur-3xl mix-blend-overlay absolute left-1/3 top-10"></div>
            </div>

            <div className="z-10 text-center max-w-2xl px-6 py-12 bg-[#002f34]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10">
                <div className="relative">
                    <h1 className="text-9xl font-extrabold text-[#cbf7ee] tracking-tighter drop-shadow-sm mb-4">
                        404
                    </h1>
                    <div className="absolute -top-4 -right-10 text-6xl opacity-70 animate-bounce delay-150">
                        ✨
                    </div>
                    <div className="absolute top-1/2 -left-12 text-5xl opacity-70 animate-pulse">
                        🛸
                    </div>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 font-sans">
                    Oops! Page not found
                </h2>

                <p className="text-lg text-teal-100 mb-10 max-w-lg mx-auto font-light">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                        type="primary"
                        size="large"
                        icon={<HomeOutlined />}
                        onClick={() => navigate('/')}
                        className="w-full sm:w-auto bg-[#cbf7ee] hover:!bg-[#23e5db] hover:!text-[#002f34] text-[#002f34] h-12 px-8 rounded-xl font-bold shadow-md border-0"
                    >
                        Back to Home
                    </Button>
                    <Button
                        size="large"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold border-white/50 text-white bg-transparent hover:!text-[#23e5db] hover:!border-[#23e5db]"
                    >
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;