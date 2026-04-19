import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
    LayoutDashboard, Users, Calendar as CalendarIcon, Settings, LogOut,
    ChevronLeft, ChevronRight, UserPlus, MessageSquare, Send, User, ClipboardList
} from 'lucide-react';
import './AdminDashboard.css';
import { API_BASE_URL, SOCKET_URL } from '../config';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const socketRef = useRef(null);

    const [activeTab, setActiveTab] = useState('schedule'); // เมนูที่เลือก: 'schedule', 'doctors', 'chat'

    // สถานะสำหรับการลงทะเบียนแพทย์ใหม่
    const [fullName, setFullName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [hospital, setHospital] = useState('');
    const [editingDoctorId, setEditingDoctorId] = useState(null);
    
    // สถานะสำหรับการจัดการตารางเวลาของแพทย์
    const [doctors, setDoctors] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [doctorId, setDoctorId] = useState('');
    const [availableDate, setAvailableDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [allAppointments, setAllAppointments] = useState([]);

    // สถานะสำหรับระบบแชทกับลูกค้า
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
            
            // Fetch all appointments for the new tab
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const appts = await axios.get(`${API_BASE_URL}/all-appointments`, config);
            setAllAppointments(appts.data);

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
        socketRef.current = io(SOCKET_URL);
        
        socketRef.current.on('scheduleUpdated', fetchAllData);

        socketRef.current.on('receive-message', (data) => {
            const { room, text, sender, timestamp } = data;
            // แยกชื่อผู้ใช้ออกมาจากชื่อห้อง (เช่น room_admin_neo -> neo)
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
            
            if (editingDoctorId) {
                // อัปเดตข้อมูลหมอ
                await axios.put(`${API_BASE_URL}/update-doctor/${editingDoctorId}`, {
                    fullName, specialty, phoneNumber, hospital
                }, config);
                alert("แก้ไขข้อมูลหมอสำเร็จ");
                setEditingDoctorId(null);
            } else {
                // เพิ่มข้อมูลหมอใหม่
                await axios.post(`${API_BASE_URL}/add-doctor`, {
                    fullName, specialty, phoneNumber, hospital
                }, config);
                alert("บันทึกข้อมูลหมอสำเร็จ");
            }
            
            setFullName(''); setSpecialty(''); setPhoneNumber(''); setHospital('');
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const handleEditDoctor = (doc) => {
        setEditingDoctorId(doc.Id);
        setFullName(doc.FullName);
        setSpecialty(doc.Specialty);
        setPhoneNumber(doc.PhoneNumber);
        setHospital(doc.Hospital || '');
        window.scrollTo(0, 0);
    };

    const handleDeleteDoctor = async (id) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมอท่านนี้? (คำเตือน: หากหมอมีการนัดหมายจะลบไม่ได้)')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${API_BASE_URL}/delete-doctor/${id}`, config);
            alert("ลบข้อมูลหมอสำเร็จ");
            fetchAllData();
        } catch (err) {
            // บางกรณีฐานข้อมูลอาจเกิด Foreign Key constraint fail ถ้าหมอมีนัดหมายแล้ว
            alert(err.response?.data?.message || 'ไม่สามารถลบคุณหมอได้ อาจเพราะมีการนัดหมายในระบบแล้ว');
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

    // ตรรกะสำหรับการสร้างปฏิทินในหน้าจัดการตารางเวลา
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
                    <div className={`menu-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
                        <ClipboardList size={20} /> รายการนัดของลูกค้า
                    </div>
                    <div className={`menu-item ${activeTab === 'doctors' ? 'active' : ''}`} onClick={() => setActiveTab('doctors')}>
                        <UserPlus size={20} /> เพิ่มข้อมูลหมอ
                    </div>
                    <div className={`menu-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                        <MessageSquare size={20} /> แชทกับลูกค้า
                    </div>
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
                    <div className="doctors-management-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem', alignItems: 'start', paddingBottom: '2rem' }}>
                        {/* ฟอร์มเพิ่ม/แก้ไขหมอ */}
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', position: 'sticky', top: '2rem' }}>
                            <h2 style={{ color: '#1e293b', textAlign: 'left', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial' }}>
                                {editingDoctorId ? 'แก้ไขข้อมูลคุณหมอ' : 'ลงทะเบียนคุณหมอใหม่'}
                            </h2>
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
                                <div className="form-field">
                                    <label>โรงพยาบาล</label>
                                    <input type="text" value={hospital} onChange={(e) => setHospital(e.target.value)} required placeholder="ระบุชื่อโรงพยาบาล" />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="save-schedule-btn" style={{ background: '#3b82f6', flex: 1, padding: '12px' }}>
                                        {editingDoctorId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                                    </button>
                                    {editingDoctorId && (
                                        <button type="button" className="save-schedule-btn" style={{ background: '#94a3b8', width: 'auto', padding: '12px 20px' }} onClick={() => {
                                            setEditingDoctorId(null); setFullName(''); setSpecialty(''); setPhoneNumber(''); setHospital('');
                                        }}>ยกเลิก</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* รายชื่อหมอ */}
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            <h2 style={{ color: '#1e293b', textAlign: 'left', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial' }}>รายชื่อคุณหมอ ({doctors.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {doctors.map(doc => (
                                    <div key={doc.Id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: editingDoctorId === doc.Id ? '#f8fafc' : 'white' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={20} color="#94a3b8" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{doc.FullName}</div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{doc.Specialty} | {doc.PhoneNumber}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{doc.Hospital}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEditDoctor(doc)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontWeight: 600 }}>แก้ไข</button>
                                            <button onClick={() => handleDeleteDoctor(doc.Id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 600 }}>ลบ</button>
                                        </div>
                                    </div>
                                ))}
                                {doctors.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>ยังไม่มีข้อมูลคุณหมอ</p>}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'appointments' ? (
                    <div className="appointments-list-container" style={{ padding: '2rem', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ color: '#1e293b', textAlign: 'left', background: 'none', WebkitTextFillColor: 'initial', margin: 0 }}>
                                รายการนัดหมายลูกค้าทั้งหมด
                            </h2>
                            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem' }}>
                                ทั้งหมด {allAppointments.length} รายการ
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>ข้อมูลลูกค้า</th>
                                        <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>นัดพบแพทย์</th>
                                        <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>วันเวลาที่นัด</th>
                                        <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAppointments.map((appt) => (
                                        <tr key={appt.Id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{appt.CustomerName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{appt.CustomerEmail}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{appt.CustomerPhone}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#334155' }}>{appt.DoctorName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{appt.DoctorSpecialty}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    {new Date(appt.AppointDate).toLocaleDateString('th-TH', { 
                                                        year: 'numeric', 
                                                        month: 'long', 
                                                        day: 'numeric' 
                                                    })}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                                    เวลา {(() => {
                                                        const t = appt.AppointTime;
                                                        if (!t) return '--:--';
                                                        // ถ้าเป็น ISO String (เช่น 1970-01-01T09:00:00.000Z) ให้ดึงตำแหน่ง 11-16
                                                        if (typeof t === 'string' && t.includes('T')) {
                                                            return t.substring(11, 16);
                                                        }
                                                        // กรณีอื่นๆ เช่น มาเป็น HH:mm:ss เลย
                                                        return String(t).substring(0, 5);
                                                    })()} น.
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <span style={{ 
                                                    padding: '4px 12px', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 600,
                                                    background: appt.Status === 'Booked' ? '#dcfce7' : '#f1f5f9',
                                                    color: appt.Status === 'Booked' ? '#15803d' : '#475569'
                                                }}>
                                                    {appt.Status === 'Booked' ? 'ยืนยันแล้ว' : appt.Status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {allAppointments.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                ยังไม่มีรายการนัดหมายในระบบ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : renderChat()}
            </main>
        </div>
    );
};

export default AdminDashboard;
