import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, Mail, Phone } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Register = ({ onError, onSuccess }) => {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        onError('');

        if (password !== confirmPassword) {
            onError('Passwords do not match');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/register`, { 
                username, 
                password,
                fullName,
                email,
                phoneNumber
            });
            // แจ้งเตือนสั้นๆ แล้วรีเซ็ตและเปลี่ยนกลับไปหน้าล็อกอิน
            alert('Registration successful! Please login.');
            
            setUsername('');
            setFullName('');
            setEmail('');
            setPhoneNumber('');
            setPassword('');
            setConfirmPassword('');
            
            onSuccess(); // ส่งทริกเกอร์กลับไปที่ AuthLayout เพื่อสลับหน้า
        } catch (err) {
            onError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <form onSubmit={handleRegister} className="space-y-4">
            {/* Username */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-[0.9rem] placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="Username"
                    required
                />
            </div>

            {/* Full Name */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-[0.9rem] placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="Full Name"
                    required
                />
            </div>

            {/* Email */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-[0.9rem] placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="Email Address"
                    required
                />
            </div>

            {/* Phone Number */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-[0.9rem] placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="Phone Number"
                    required
                />
            </div>

            {/* Password */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-[#f1f5f9] border border-transparent rounded-[0.85rem] text-lg tracking-widest placeholder-slate-500 focus:bg-white focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none placeholder:text-[0.9rem] placeholder:tracking-normal"
                    placeholder="Password"
                    required
                />
            </div>

            {/* Confirm Password */}
            <div className="relative transform transition-all duration-300 origin-top">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-[2.75rem] pr-4 py-[0.85rem] bg-white border border-slate-200 rounded-[0.85rem] text-[0.9rem] placeholder-slate-400 focus:border-[#5c85fd] focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 outline-none"
                    placeholder="Confirm Password"
                    required
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className="w-full mt-3 bg-[#5c85fd] hover:bg-blue-600 text-white font-medium py-[0.85rem] px-4 rounded-[0.85rem] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5c85fd]"
            >
                สร้างบัญชี
            </button>
        </form>
    );
};

export default Register;
