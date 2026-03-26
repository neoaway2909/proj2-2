import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const Auth = () => {
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
    const [error, setError] = useState('');

    return (
        <div className="min-h-screen bg-[#f8fafc] relative flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background shape */}
            <div className="absolute top-0 left-0 w-full h-[40vh] bg-[#5c85fd] rounded-b-[45%] md:rounded-b-[50%] z-0"></div>
            
            <div className="z-10 w-full px-4 flex flex-col items-center mt-[-8vh]">
                {/* Headers */}
                <div className="text-center text-white mb-10">
                    <h1 className="text-4xl md:text-[2.75rem] font-bold tracking-normal mb-1">Care yoursafe</h1>
                    <p className="text-lg md:text-xl font-normal text-blue-100 opacity-90 tracking-wide">online</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-[1.5rem] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.08)] p-8 w-full max-w-[420px]">
                    
                    {/* Toggle Switch */}
                    <div className="flex bg-[#f1f5f9] p-1.5 rounded-full mb-8 relative h-[3.25rem] items-center">
                        <div 
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-[#5c85fd] shadow-sm transition-all duration-300 ease-in-out ${isLogin ? 'left-1.5' : 'left-[calc(50%+4.5px)]'}`}
                        ></div>
                        <button
                            type="button"
                            className={`flex-1 py-1 text-sm font-semibold rounded-full relative z-10 transition-colors duration-300 ${isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => { setIsLogin(true); setError(''); }}
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1 text-sm font-semibold rounded-full relative z-10 transition-colors duration-300 ${!isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => { setIsLogin(false); setError(''); }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && (
                        <div className="mb-5 p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    {isLogin ? (
                        <Login onError={setError} />
                    ) : (
                        <Register onError={setError} onSuccess={() => { setIsLogin(true); setError(''); }} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
