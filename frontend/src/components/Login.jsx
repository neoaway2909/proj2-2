import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Login = ({ onError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        onError('');
        
        try {
            const res = await axios.post(`${API_BASE_URL}/login`, { username, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.role);
            localStorage.setItem('username', res.data.username);

            if (res.data.role === 'superadmin') {
                navigate('/superadmin');
            } else if (res.data.role === 'admin') {
                navigate('/admin');
            } else if (res.data.role === 'doctor') {
                navigate('/doctor');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            onError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-4">
            {/* Email / Username */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-[0.9rem] placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="p@gmail.com"
                    required
                />
            </div>

            {/* Password */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-lg tracking-widest placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none placeholder:text-[0.9rem] placeholder:tracking-normal"
                    placeholder="........."
                    required
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className="w-full mt-3 bg-[#5c85fd] hover:bg-blue-600 text-white font-medium py-[0.85rem] px-4 rounded-[0.85rem] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5c85fd]"
            >
                เข้าสู่ระบบ
            </button>
        </form>
    );
};

export default Login;
