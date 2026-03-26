import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
    Home, Calendar as CalendarIcon, MessageSquare, User, LogOut,
    Search, Bell, ArrowLeft, ChevronLeft, ChevronRight, Clock, Send
} from 'lucide-react';
import './UserDashboard.css';
import { API_BASE_URL, SOCKET_URL, UPLOAD_URL } from '../config';
import Profile from './Profile';


const UserDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const socketRef = useRef(null);

    const [activeView, setActiveView] = useState('home'); // มุมมองปัจจุบัน: 'home', 'appointments', 'chat'
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [slots, setSlots] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [myAppointments, setMyAppointments] = useState([]);
    const [subTab, setSubTab] = useState('upcoming');

    // สถานะสำหรับระบบแชท (เก็บข้อความรายห้อง)
    const [chatMessages, setChatMessages] = useState({}); // { roomId: [msgs] }
    const [inputMsg, setInputMsg] = useState('');
    const scrollRef = useRef(null);

    // สถานะสำหรับระบบแจ้งเตือน
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [profileData, setProfileData] = useState(null);

    const fetchUserProfile = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/profile`, config);
            setProfileData(res.data);
        } catch (err) {
            console.error("Fetch profile failed", err);
        }
    };


    const fetchDoctors = async () => {
        try {
            const drs = await axios.get(`${API_BASE_URL}/doctors`);
            setDoctors(drs.data);
        } catch (err) {
            console.error("Fetch doctors failed", err);
        }
    };

    const fetchSlots = async () => {
        if (!selectedDoctor || !selectedDate) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/doctor-slots?doctorId=${selectedDoctor.Id}&date=${selectedDate}`);
            setSlots(res.data);
        } catch (err) {
            console.error("Fetch slots failed", err);
        }
    };

    const fetchMyAppointments = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/my-appointments`, config);
            setMyAppointments(res.data);
        } catch (err) {
            console.error("Fetch appointments failed", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/notifications`, config);
            setNotifications(res.data);
        } catch (err) {
            console.error("Fetch notifications failed", err);
        }
    };

    const markNotificationsRead = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`${API_BASE_URL}/notifications/read`, {}, config);
            fetchNotifications();
        } catch (err) {
            console.error("Mark read failed", err);
        }
    };

    const fetchChatHistory = async () => {
        const room = getChatRoomId();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/messages/${room}`, config);
            const formatted = res.data.map(m => ({
                text: m.Message,
                sender: m.Sender,
                timestamp: m.Timestamp
            }));
            setChatMessages(prev => ({ ...prev, [room]: formatted }));
        } catch (err) {
            console.error("Fetch chat history failed", err);
        }
    };

    useEffect(() => {
        fetchDoctors();
        fetchMyAppointments();
        fetchNotifications();
        fetchUserProfile();

        socketRef.current = io(SOCKET_URL);


        socketRef.current.on('scheduleUpdated', () => {
            fetchSlots();
            fetchMyAppointments();
        });

        socketRef.current.on('notification', (data) => {
            // ในการใช้งานจริง ควรเช็ค data.userId ให้ตรงกับผู้ใช้ที่ล็อกอินอยู่ด้วย
            fetchNotifications();
        });

        socketRef.current.on('receive-message', (data) => {
            const { room, text, sender, timestamp } = data;
            setChatMessages(prev => ({
                ...prev,
                [room]: [...(prev[room] || []), { text, sender, timestamp }]
            }));
        });

        return () => socketRef.current.disconnect();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages, activeView]);

    useEffect(() => {
        fetchSlots();
    }, [selectedDoctor, selectedDate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleBook = async () => {
        if (!selectedSlot) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.post(`${API_BASE_URL}/book`, {
                doctorId: selectedDoctor.Id,
                date: selectedDate,
                time: selectedSlot.time
            }, config);
            alert(res.data.message);
            setSelectedSlot(null);
            fetchMyAppointments();
            fetchNotifications();
            setActiveView('appointments');
        } catch (err) {
            alert(err.response?.data?.message || 'Booking failed');
        }
    };

    const getChatRoomId = () => {
        return `room_admin_${username}`;
    };

    const handleJoinAdminChat = () => {
        const room = getChatRoomId();
        socketRef.current.emit('join-chat', { room });
        fetchChatHistory();
    };

    useEffect(() => {
        if (activeView === 'chat' && socketRef.current) {
            handleJoinAdminChat();
        }
    }, [activeView]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;

        const room = getChatRoomId();
        socketRef.current.emit('send-message', {
            room,
            message: inputMsg,
            sender: username
        });
        setInputMsg('');
    };

    // ตรรกะสำหรับการสร้างปฏิทินในแต่ละเดือน
    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();

        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push({ day: null });
        for (let i = 1; i <= days; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            arr.push({ day: i, date: dateStr });
        }
        return arr;
    }, [currentMonth]);

    const changeMonth = (offset) => {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() + offset);
        setCurrentMonth(new Date(d));
    };

    const getApptDiff = (dateStr) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apptDate = new Date(dateStr);
        apptDate.setHours(0, 0, 0, 0);
        const diffTime = apptDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const renderHome = () => {
        if (!selectedDoctor) {
            return (
                <div className="flex flex-col gap-10 w-full max-w-[900px] mx-auto mt-4">
                    {/* Welcome Banner */}
                    <div className="bg-[#eef4ff] rounded-[20px] p-8 flex justify-between items-center border border-[#d8e5fe]">
                        <div>
                            <h2 className="text-2xl font-extrabold text-[#111827] mb-2 tracking-tight">Welcome back, {username}!</h2>
                            <p className="text-slate-600 text-sm font-medium">How are you feeling today?</p>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-[120px] h-[120px] bg-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <img src="https://images.unsplash.com/photo-1612349317150-e410f624c427?q=80&w=250&h=250&auto=format&fit=crop" alt="Doctor" className="w-full h-full object-cover object-top" />
                            </div>
                        </div>
                    </div>

                    {/* Doctors List */}
                    <div className="flex flex-col gap-6 items-center">
                        {doctors.map(doc => (
                            <div 
                                key={doc.Id} 
                                className="w-full max-w-[780px] bg-white border border-[#e2e8f0] rounded-2xl p-[18px] flex flex-col md:flex-row items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer"
                                onClick={() => setSelectedDoctor(doc)}
                            >
                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    {/* Avatar */}
                                    <div className="w-16 h-16 bg-[#e6f0ff] rounded-full border border-[#abc8ff] flex items-center justify-center shrink-0">
                                        <User size={30} strokeWidth={2.5} className="text-[#2f66ee]" fill="currentColor" />
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex flex-col justify-center text-left">
                                        <h4 className="text-[15px] font-extrabold text-gray-900 mb-1 leading-tight">{doc.FullName}</h4>
                                        <div className="self-start bg-[#2f66ee] text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3 shadow-sm tracking-wide">
                                            {doc.Specialty || "General"}
                                        </div>
                                        <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6084e6" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                                                <span>{doc.Hospital || "Wattanapat Hospital"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6084e6" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                                                <span>{doc.Cases || 0} case</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="flex flex-col items-center md:items-end justify-center w-full md:w-auto mt-5 md:mt-0">
                                    <div className="text-right mb-6">
                                        <div className="text-[#10b981] font-bold text-[13px]">{doc.Price || '800'} Baht</div>
                                        <div className="text-slate-500 text-[11px] font-bold flex items-center justify-center md:justify-end gap-1 mt-1">
                                            <Clock size={12} strokeWidth={3} className="text-slate-400" /> {doc.Duration || '30'} minute
                                        </div>
                                    </div>
                                    <button className="bg-[#2f66ee] hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-lg transition-all text-xs w-full md:w-auto shadow-sm tracking-wide">
                                        Book Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="back-btn" onClick={() => setSelectedDoctor(null)}><ArrowLeft size={18} /> Back</div>
                <div className="doctor-info-card">
                    <div className="doctor-avatar" style={{ border: '3px solid #10b981' }}><User size={40} color="#94a3b8" /></div>
                    <div>
                        <h4 className="doc-name">{selectedDoctor.FullName}</h4>
                        <span className="doc-specialty">{selectedDoctor.Specialty}</span>
                        <p className="hospital-name">Wattanapat Hospital</p>
                    </div>
                </div>
                <div className="booking-section">
                    <div className="section-title">
                        <h3>Select Date</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => changeMonth(-1)} />
                            <span style={{ fontWeight: 700 }}>{currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
                            <ChevronRight size={20} style={{ cursor: 'pointer' }} onClick={() => changeMonth(1)} />
                        </div>
                    </div>
                    <div className="calendar-grid">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="calendar-day-label">{d}</div>)}
                        {daysInMonth.map((d, i) => (
                            <div key={i} className={`calendar-day ${!d.day ? 'muted' : ''} ${selectedDate === d.date ? 'selected' : ''}`} onClick={() => d.day && setSelectedDate(d.date)}>
                                {d.day}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="booking-section">
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Select Time</h3>
                    <div className="time-grid">
                        {slots.map(slot => (
                            <div key={slot.time} className={`time-slot ${slot.status !== 'available' ? 'booked' : ''} ${selectedSlot?.time === slot.time ? 'selected' : ''}`} onClick={() => slot.status === 'available' && setSelectedSlot(slot)}>
                                {slot.time}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="book-btn-wrapper">
                    <button className="confirm-booking-btn" disabled={!selectedSlot} onClick={handleBook}>Book an Appointment</button>
                </div>
            </>
        );
    };

    const renderAppointments = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = myAppointments.filter(a => {
            const d = new Date(a.AppointDate);
            d.setHours(0, 0, 0, 0);
            return subTab === 'upcoming' ? d >= today : d < today;
        });

        return (
            <div style={{ textAlign: 'left' }}>
                <h2 className="appointments-title">My Appointments</h2>
                <div className="tabs-container">
                    <div className={`tab-item ${subTab === 'upcoming' ? 'active' : ''}`} onClick={() => setSubTab('upcoming')}>Upcoming</div>
                    <div className={`tab-item ${subTab === 'history' ? 'active' : ''}`} onClick={() => setSubTab('history')}>History</div>
                </div>
                <div className="appointments-list">
                    {filtered.map(appt => {
                        const dl = getApptDiff(appt.AppointDate);
                        const near = dl <= 3 && dl >= 0;
                        return (
                            <div key={appt.Id} className={`appointment-card ${subTab === 'history' ? '' : (near ? 'near' : 'far')}`}>
                                <div className="doctor-avatar"><User size={30} color="#94a3b8" /></div>
                                <div className="appt-info">
                                    <h4 className="doc-name">{appt.FullName}</h4>
                                    <div className="doc-specialty" style={{ fontSize: '0.75rem' }}>{appt.Specialty}</div>
                                    <div className="appt-date-time"><CalendarIcon size={16} /> {new Date(appt.AppointDate).toLocaleDateString()} <Clock size={16} /> {appt.AppointTime.substring(0, 5)}</div>
                                </div>
                                <div className={`appt-badge ${subTab === 'history' ? '' : (near ? 'near' : 'far')}`} style={subTab === 'history' ? { background: '#94a3b8' } : {}}>{dl < 0 ? 'Past' : (dl === 0 ? 'Today' : `${dl} days`)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderChat = () => {
        const room = getChatRoomId();
        const messages = chatMessages[room] || [];

        return (
            <div className="chat-container">
                <div className="chat-main">
                    <div className="chat-header-info">
                        <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#5b89de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={24} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Admin Support</div>
                            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Online</div>
                        </div>
                    </div>
                    <div className="messages-list" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '10%' }}>
                                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>สวัสดีครับ มีอะไรให้แอดมินช่วยไหมครับ?</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`msg-bubble ${m.sender === username ? 'sent' : 'received'}`}>{m.text}</div>
                        ))}
                    </div>
                    <form className="chat-input-area" onSubmit={handleSendMessage}>
                        <input type="text" placeholder="Type a message to admin..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
                        <button type="submit" className="send-msg-btn"><Send size={18} /></button>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans">
            <aside className="fixed left-0 top-0 h-full w-[260px] bg-white border-r border-slate-100 flex flex-col z-20 shadow-sm">
                <div className="h-[80px] flex items-center px-8 border-b border-transparent shrink-0">
                    <div className="bg-[#2f66ee] p-2 rounded-xl mr-3 shadow-sm shadow-[#2f66ee]/30"><Home color="white" size={20} /></div>
                    <span className="font-extrabold text-[#2f66ee] text-lg tracking-tight">CareOnline</span>
                </div>
                <nav className="flex-1 flex flex-col gap-1.5 px-4 py-6">
                    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer font-bold transition-all ${activeView === 'home' ? 'bg-[#2f66ee] text-white shadow-md shadow-[#2f66ee]/20 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-[#2f66ee]'}`} onClick={() => setActiveView('home')}><Home size={22} className={activeView === 'home' ? 'text-white' : 'text-slate-800'} /> Home</div>
                    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer font-bold transition-all ${activeView === 'appointments' ? 'bg-[#2f66ee] text-white shadow-md shadow-[#2f66ee]/20 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-[#2f66ee]'}`} onClick={() => setActiveView('appointments')}><CalendarIcon size={22} className={activeView === 'appointments' ? 'text-white' : 'text-slate-800'} /> Appointment</div>
                    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer font-bold transition-all ${activeView === 'chat' ? 'bg-[#2f66ee] text-white shadow-md shadow-[#2f66ee]/20 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-[#2f66ee]'}`} onClick={() => setActiveView('chat')}><MessageSquare size={22} className={activeView === 'chat' ? 'text-white' : 'text-slate-800'} /> Chat</div>
                    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer font-bold transition-all ${activeView === 'profile' ? 'bg-[#2f66ee] text-white shadow-md shadow-[#2f66ee]/20 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-[#2f66ee]'}`} onClick={() => setActiveView('profile')}><User size={22} className={activeView === 'profile' ? 'text-white' : 'text-slate-800'} /> Profile</div>

                    <div className="mt-auto flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer font-bold text-red-500 hover:bg-red-50 transition-colors" onClick={handleLogout}><LogOut size={22} /> Logout</div>
                </nav>
            </aside>

            <main className="ml-[260px] flex-1 flex flex-col min-h-screen">
                <header className="h-[80px] bg-[#2f66ee] flex items-center justify-between px-8 text-white rounded-bl-[2.5rem] shadow-sm relative z-10 shrink-0">
                    <div className="flex items-center bg-white/10 rounded-full px-5 py-2.5 w-[420px] border border-white/20 shadow-inner">
                        <Search size={18} className="text-white/80" />
                        <input type="text" placeholder="search for doctor, specialities" className="bg-transparent border-none text-white outline-none w-full ml-3 placeholder-white/60 text-sm font-medium" />
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4 font-bold text-sm tracking-wide">
                            <span className="text-white cursor-pointer hover:opacity-80 transition-opacity">TH</span>
                            <span className="text-blue-200 cursor-pointer hover:opacity-100 transition-opacity">EN</span>
                        </div>

                        <div className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}>
                            <Bell size={22} fill="currentColor" className="text-white" />
                            {notifications.filter(n => !n.IsRead).length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-sm">
                                    {notifications.filter(n => !n.IsRead).length}
                                </span>
                            )}
                            {showNotifications && (
                                <div className="absolute top-[150%] right-0 w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 z-50">
                                    <div className="px-5 py-4 border-b border-slate-100 font-extrabold text-base flex justify-between items-center bg-slate-50/50">
                                        Notifications
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400 font-medium text-sm">No new notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.Id} className={`p-4 border-b border-slate-50 transition-colors hover:bg-slate-50 ${!n.IsRead ? 'bg-[#f0f5ff]' : ''}`}>
                                                    <p className="text-sm font-medium text-slate-700 leading-snug">{n.Message}</p>
                                                    <span className="text-xs text-slate-400 mt-2 block font-medium">{new Date(n.CreatedAt).toLocaleString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3.5 cursor-pointer hover:bg-white/5 p-1.5 rounded-full pr-4 transition-colors" onClick={() => setActiveView('profile')}>
                            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white/20 text-[#2f66ee] shadow-sm">
                                {profileData?.ProfilePic ? <img src={`${UPLOAD_URL}${profileData.ProfilePic}`} alt="avatar" className="w-full h-full object-cover" /> : <User size={26} fill="currentColor" />}
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className="text-sm font-extrabold tracking-tight">{profileData?.FullName || username}</div>
                                <div className="text-xs text-blue-100 font-bold tracking-wide">ID: {profileData?.Id || 'card number'}</div>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-8 md:p-10 w-full overflow-y-auto bg-transparent">
                    {activeView === 'home' && renderHome()}
                    {activeView === 'appointments' && renderAppointments()}
                    {activeView === 'chat' && renderChat()}
                    {activeView === 'profile' && <Profile onBack={() => { setActiveView('home'); fetchUserProfile(); }} />}
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
