import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
    Home, Calendar as CalendarIcon, MessageSquare, User, LogOut, 
    Search, Bell, ArrowLeft, ChevronLeft, ChevronRight, Clock, Send
} from 'lucide-react';
import './UserDashboard.css';

const API_BASE_URL = 'http://192.168.1.150:5001/api';

const UserDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const socketRef = useRef(null);

    const [activeView, setActiveView] = useState('home'); // 'home', 'appointments', 'chat'
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [slots, setSlots] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [myAppointments, setMyAppointments] = useState([]);
    const [subTab, setSubTab] = useState('upcoming');

    // Chat states
    const [chatMessages, setChatMessages] = useState({}); // { roomId: [msgs] }
    const [inputMsg, setInputMsg] = useState('');
    const scrollRef = useRef(null);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

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
        
        socketRef.current = io('http://192.168.1.150:5001');
        
        socketRef.current.on('scheduleUpdated', () => {
            fetchSlots();
            fetchMyAppointments();
        });

        socketRef.current.on('notification', (data) => {
            // In a real app we'd check if data.userId matches current user
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

    // Calendar logic
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
        today.setHours(0,0,0,0);
        const apptDate = new Date(dateStr);
        apptDate.setHours(0,0,0,0);
        const diffTime = apptDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const renderHome = () => {
        if (!selectedDoctor) {
            return (
                <>
                    <h2 style={{ textAlign: 'left', marginBottom: '2rem' }}>Choose your Doctor</h2>
                    <div className="doctor-list-grid">
                        {doctors.map(doc => (
                            <div key={doc.Id} className="doctor-item-card" onClick={() => setSelectedDoctor(doc)}>
                                <div className="doctor-avatar"><User size={40} color="#94a3b8" /></div>
                                <div>
                                    <h4 className="doc-name">{doc.FullName}</h4>
                                    <span className="doc-specialty">{doc.Specialty}</span>
                                    <p className="hospital-name">Wattanapat Hospital</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
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
        today.setHours(0,0,0,0);
        const filtered = myAppointments.filter(a => {
            const d = new Date(a.AppointDate);
            d.setHours(0,0,0,0);
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
                                    <div className="doc-specialty" style={{fontSize:'0.75rem'}}>{appt.Specialty}</div>
                                    <div className="appt-date-time"><CalendarIcon size={16} /> {new Date(appt.AppointDate).toLocaleDateString()} <Clock size={16} /> {appt.AppointTime.substring(0,5)}</div>
                                </div>
                                <div className={`appt-badge ${subTab === 'history' ? '' : (near ? 'near' : 'far')}`} style={subTab==='history'?{background:'#94a3b8'}:{}}>{dl<0?'Past':(dl===0?'Today':`${dl} days`)}</div>
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
        <div className="user-layout">
            <aside className="sidebar">
                <div className="sidebar-logo"><div style={{ background: '#5b89de', padding: '8px', borderRadius: '12px' }}><Home color="white" size={24} /></div><span style={{ fontWeight: 800, color: '#2d6cd1' }}>CareOnline</span></div>
                <nav className="sidebar-menu">
                    <div className={`menu-item ${activeView === 'home' ? 'active' : ''}`} onClick={() => setActiveView('home')}><Home size={20} /> Home</div>
                    <div className={`menu-item ${activeView === 'appointments' ? 'active' : ''}`} onClick={() => setActiveView('appointments')}><CalendarIcon size={20} /> Appointment</div>
                    <div className={`menu-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => setActiveView('chat')}><MessageSquare size={20} /> Chat</div>
                    <div className="menu-item"><User size={20} /> Profile</div>
                    <div className="menu-item logout-item" onClick={handleLogout} style={{ marginTop: 'auto' }}><LogOut size={20} /> Logout</div>
                </nav>
            </aside>
            <main className="main-wrapper">
                <header className="top-header">
                    <div className="search-box"><Search size={18} opacity={0.7} /><input type="text" placeholder="search..." /></div>
                    <div className="header-right">
                        <div className="notification-bell-wrapper" onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}>
                            <Bell size={20} />
                            {notifications.filter(n => !n.IsRead).length > 0 && (
                                <span className="notification-badge">{notifications.filter(n => !n.IsRead).length}</span>
                            )}
                            {showNotifications && (
                                <div className="notifications-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <div className="dropdown-header">การแจ้งเตือน</div>
                                    <div className="dropdown-body">
                                        {notifications.length === 0 ? (
                                            <div className="no-notifications">ไม่มีการแจ้งเตือน</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.Id} className={`notification-item ${!n.IsRead ? 'unread' : ''}`}>
                                                    <p>{n.Message}</p>
                                                    <span>{new Date(n.CreatedAt).toLocaleString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="user-profile-header"><div><div className="name">{username}</div><div className="id">ID: 1104400xxx</div></div><div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User color="#5b89de" size={24} /></div></div>
                    </div>
                </header>
                <div className="content-area">{activeView === 'home' ? renderHome() : activeView === 'appointments' ? renderAppointments() : renderChat()}</div>
            </main>
        </div>
    );
};

export default UserDashboard;
