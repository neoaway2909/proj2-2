import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
    LayoutDashboard, Users, Calendar as CalendarIcon, Settings, LogOut,
    ChevronLeft, ChevronRight, UserPlus, MessageSquare, Send, User
} from 'lucide-react';
import './AdminDashboard.css';

const API_BASE_URL = 'http://192.168.1.150:5001/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const socketRef = useRef(null);

    const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'doctors', 'chat'

    // Doctor Registration States
    const [fullName, setFullName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    
    // Schedule States
    const [doctors, setDoctors] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [doctorId, setDoctorId] = useState('');
    const [availableDate, setAvailableDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Chat States
    const [chatMessages, setChatMessages] = useState({}); // { room: [msgs] }
    const [chatUsers, setChatUsers] = useState([]); // List of user names chatting
    const [selectedUser, setSelectedUser] = useState(null);
    const [inputMsg, setInputMsg] = useState('');
    const scrollRef = useRef(null);

    const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const fetchInitialChatUsers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/chat-users`, config);
            setChatUsers(res.data);
        } catch (err) {
            console.error("Fetch chat users failed", err);
        }
    };

    const fetchAllData = async () => {
        try {
            const drs = await axios.get(`${API_BASE_URL}/doctors`);
            setDoctors(drs.data);
            if (drs.data.length > 0 && !doctorId) {
                setDoctorId(drs.data[0].Id);
            }
            if (doctorId) {
                const dots = await axios.get(`${API_BASE_URL}/blocked-dates?doctorId=${doctorId}`);
                setBlockedDates(dots.data.map(d => new Date(d).toISOString().split('T')[0]));
            }
            fetchInitialChatUsers();
        } catch (err) {
            console.error("Fetch failed", err);
        }
    };

    const fetchChatHistory = async (u) => {
        const room = `room_admin_${u}`;
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
        fetchAllData();
        socketRef.current = io('http://192.168.1.150:5001');
        
        socketRef.current.on('scheduleUpdated', fetchAllData);

        socketRef.current.on('receive-message', (data) => {
            const { room, text, sender, timestamp } = data;
            // Extract username from room name 'room_admin_username'
            const senderUser = room.replace('room_admin_', '');
            
            setChatUsers(prev => prev.includes(senderUser) ? prev : [...prev, senderUser]);
            setChatMessages(prev => ({
                ...prev,
                [room]: [...(prev[room] || []), { text, sender, timestamp }]
            }));
        });

        return () => socketRef.current.disconnect();
    }, [doctorId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages, selectedUser]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleAddDoctor = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`${API_BASE_URL}/add-doctor`, {
                fullName, specialty, phoneNumber
            }, config);
            alert("บันทึกข้อมูลหมอสำเร็จ");
            setFullName(''); setSpecialty(''); setPhoneNumber('');
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add doctor');
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`${API_BASE_URL}/unavailable`, {
                doctorId, date: availableDate, startTime, endTime: endTime || startTime
            }, config);
            alert("บันทึกเวลาที่ไม่ว่างเรียบร้อย");
            setStartTime(''); setEndTime('');
            fetchAllData(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save unavailable time');
        }
    };

    const handleSelectChatUser = (u) => {
        setSelectedUser(u);
        const room = `room_admin_${u}`;
        socketRef.current.emit('join-chat', { room });
        fetchChatHistory(u);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || !selectedUser) return;
        
        const room = `room_admin_${selectedUser}`;
        socketRef.current.emit('send-message', {
            room,
            message: inputMsg,
            sender: 'admin'
        });
        setInputMsg('');
    };

    // Calendar logic
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        const prevLastDate = new Date(year, month, 0).getDate();
        
        const arr = [];
        for (let i = firstDay - 1; i >= 0; i--) {
            arr.push({ day: prevLastDate - i, muted: true });
        }
        for (let i = 1; i <= lastDate; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const hasSlot = blockedDates.includes(dateStr);
            arr.push({ day: i, date: dateStr, hasSlot });
        }
        const remaining = 42 - arr.length;
        for (let i = 1; i <= remaining; i++) {
            arr.push({ day: i, muted: true });
        }
        return arr;
    }, [currentMonth, blockedDates]);

    const changeMonth = (offset) => {
        setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + offset)));
    };

    const renderChat = () => {
        const room = selectedUser ? `room_admin_${selectedUser}` : null;
        const messages = room ? (chatMessages[room] || []) : [];

        return (
            <div className="chat-container">
                <div className="chat-sidebar">
                    <div style={{ padding: '1.5rem', fontWeight: 800, borderBottom: '1px solid #e2e8f0' }}>User Chats</div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {chatUsers.map(u => (
                            <div key={u} className={`chat-user-item ${selectedUser === u ? 'active' : ''}`} onClick={() => handleSelectChatUser(u)}>
                                <div className="doctor-avatar" style={{ width: 40, height: 40 }}><User size={20} color="#94a3b8" /></div>
                                <div className="doc-details">
                                    <div className="name">{u} (Patient)</div>
                                    <div className="special">Chatting now</div>
                                </div>
                            </div>
                        ))}
                        {chatUsers.length === 0 && <p style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>No active chats</p>}
                    </div>
                </div>
                <div className="chat-main">
                    {selectedUser ? (
                        <>
                            <div className="chat-header-info">
                                <div className="doctor-avatar" style={{ width: 40, height: 40 }}><User size={20} color="#94a3b8" /></div>
                                <div><div style={{ fontWeight: 700 }}>{selectedUser}</div><div style={{ fontSize: '0.75rem', color: '#10b981' }}>User</div></div>
                            </div>
                            <div className="messages-list" ref={scrollRef}>
                                {messages.map((m, i) => (
                                    <div key={i} className={`msg-bubble ${m.sender === 'admin' ? 'sent' : 'received'}`}>{m.text}</div>
                                ))}
                            </div>
                            <form className="chat-input-area" onSubmit={handleSendMessage}>
                                <input type="text" placeholder="Reply to user..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
                                <button type="submit" className="send-msg-btn"><Send size={18} /></button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select a user to reply</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="admin-layout">
            <aside className="sidebar">
                <div style={{ padding: '0 2rem', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#5b89de', padding: '8px', borderRadius: '12px' }}>
                        <LayoutDashboard color="white" size={24} />
                    </div>
                    <span style={{ fontWeight: 800, color: '#2d6cd1' }}>AdminPanel</span>
                </div>
                
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 1rem' }}>
                    <div className={`menu-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                        <CalendarIcon size={20} /> จัดการตารางเวลา
                    </div>
                    <div className={`menu-item ${activeTab === 'doctors' ? 'active' : ''}`} onClick={() => setActiveTab('doctors')}>
                        <UserPlus size={20} /> เพิ่มข้อมูลหมอ
                    </div>
                    <div className={`menu-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                        <MessageSquare size={20} /> แชทกับลูกค้า
                    </div>
                    <div className="menu-item"><Settings size={20} /> ตั้งค่า</div>
                    <div className="menu-item logout-item" onClick={handleLogout} style={{ marginTop: 'auto' }}>
                        <LogOut size={20} /> ออกจากระบบ
                    </div>
                </nav>
            </aside>

            <main className="admin-main">
                {activeTab === 'schedule' ? (
                    <div className="schedule-container">
                        <div className="schedule-form-side">
                            <h2>จัดการตารางเวลา</h2>
                            <p>เพิ่มเวลาที่ไม่ว่าง</p>
                            <form onSubmit={handleSaveSchedule}>
                                <div className="form-field">
                                    <label>เลือกคุณหมอ</label>
                                    <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                                        {doctors.map(d => <option key={d.Id} value={d.Id}>{d.FullName}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>วันที่</label>
                                    <input type="date" value={availableDate} onChange={(e) => setAvailableDate(e.target.value)} required />
                                </div>
                                <div className="form-field">
                                    <label>เวลาเริ่มต้น</label>
                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                                </div>
                                <div className="form-field">
                                    <label>เวลาสิ้นสุด</label>
                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                                </div>
                                <button type="submit" className="save-schedule-btn">บันทึกเวลาที่ไม่ว่าง</button>
                            </form>
                        </div>
                        <div className="calendar-side">
                            <div className="cal-grid">
                                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
                                {calendarDays.map((d, i) => (
                                    <div key={i} className={`cal-cell ${d.muted ? 'muted' : ''}`} onClick={() => d.date && setAvailableDate(d.date)}>
                                        <div className={availableDate === d.date ? 'selected' : 'today'}>{d.day}</div>
                                        {d.hasSlot && !d.muted && <div className="occupy-dot"></div>}
                                    </div>
                                ))}
                            </div>
                            <div className="cal-header" style={{ marginTop: '20px' }}>
                                <div className="cal-nav-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{thaiMonths[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}</div>
                                <div className="cal-nav-btn" onClick={() => changeMonth(1)}><ChevronRight size={20} /></div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'doctors' ? (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            <h2 style={{ color: '#1e293b', textAlign: 'left', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial' }}>ลงทะเบียนคุณหมอใหม่</h2>
                            <form onSubmit={handleAddDoctor}>
                                <div className="form-field">
                                    <label>ชื่อ-นามสกุล</label>
                                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="เช่น ดร. สมชาย ใจดี" />
                                </div>
                                <div className="form-field">
                                    <label>ความเชี่ยวชาญ</label>
                                    <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required placeholder="เช่น อายุรกรรม" />
                                </div>
                                <div className="form-field">
                                    <label>เบอร์โทรศัพท์ติดต่อ</label>
                                    <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required placeholder="08x-xxx-xxxx" />
                                </div>
                                <button type="submit" className="save-schedule-btn" style={{ background: '#3b82f6' }}>บันทึกข้อมูล</button>
                            </form>
                        </div>
                    </div>
                ) : renderChat()}
            </main>
        </div>
    );
};

export default AdminDashboard;
