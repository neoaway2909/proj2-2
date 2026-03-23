import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, Users, LogOut, LayoutDashboard, Settings, User } from 'lucide-react';
import './SuperAdminDashboard.css';
import { API_BASE_URL } from '../config';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');

    const [activeTab, setActiveTab] = useState('manage');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [adminCount, setAdminCount] = useState(0);
    const [admins, setAdmins] = useState([]);

    const fetchAdminCount = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/superadmin/admin-count`, config);
            setAdminCount(res.data.count);
        } catch (err) {
            console.error("Fetch admin count failed", err);
        }
    };

    const fetchAdmins = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/superadmin/admins`, config);
            setAdmins(res.data);
        } catch (err) {
            console.error("Fetch admins failed", err);
        }
    };

    useEffect(() => {
        fetchAdminCount();
        if (activeTab === 'admins') {
            fetchAdmins();
        }
    }, [activeTab]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.post(`${API_BASE_URL}/superadmin/create-staff`, {
                username: newUsername,
                password: newPassword,
                role: newRole
            }, config);
            
            setMessage(res.data.message);
            setNewUsername('');
            setNewPassword('');
            fetchAdminCount();
            if (activeTab === 'admins') fetchAdmins();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create staff');
        }
    };

    return (
        <div className="super-admin-layout">
            <aside className="super-admin-sidebar">
                <div style={{ padding: '0 2rem', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#eab308', padding: '8px', borderRadius: '12px' }}>
                        <ShieldCheck color="white" size={24} />
                    </div>
                    <span style={{ fontWeight: 800, color: '#ca8a04', fontSize: '1.25rem' }}>SuperPanel</span>
                </div>
                <nav className="sidebar-menu">
                    <div className={`menu-item ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>
                        <UserPlus size={20} /> จัดการเจ้าหน้าที่
                    </div>
                    <div className={`menu-item ${activeTab === 'admins' ? 'active' : ''}`} onClick={() => setActiveTab('admins')}>
                        <Users size={20} /> รายชื่อแอดมิน
                    </div>
                    <div className="menu-item logout-item" onClick={handleLogout} style={{ marginTop: 'auto' }}>
                        <LogOut size={20} /> ออกจากระบบ
                    </div>
                </nav>
            </aside>

            <main className="super-admin-main">
                <div className="super-admin-content">
                    <header className="header-section">
                        <h1>ยินดีต้อนรับ, {username} 👋</h1>
                        <p>คุณมีสิทธิ์เข้าถึงระบบสูงสุด สามารถดูแลความเรียบร้อยของระบบ</p>
                    </header>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="label">จำนวนแอดมิน</span>
                            <span className="value">{adminCount}</span>
                        </div>
                    </div>

                    {activeTab === 'manage' ? (
                        <div className="create-staff-card">
                            <h2>สร้างบัญชีเจ้าหน้าที่ใหม่ (Admin)</h2>
                            {message && <div className="alert alert-success">{message}</div>}
                            {error && <div className="alert alert-error">{error}</div>}
                            
                            <form onSubmit={handleCreateStaff}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>ชื่อผู้ใช้งาน (Username)</label>
                                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="ระบุชื่อผู้ใช้งาน" />
                                    </div>
                                    <div className="form-group">
                                        <label>รหัสผ่าน (Password)</label>
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="ระบุรหัสผ่าน" />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>บทบาท (Role)</label>
                                        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled>
                                            <option value="admin">Admin (เจ้าหน้าที่จัดการตารางเวลา)</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="create-btn">สร้างบัญชีผู้ใช้งาน</button>
                            </form>
                        </div>
                    ) : (
                        <div className="user-list-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0 }}>รายชื่อแอดมินทั้งหมดในระบบ</h2>
                                <button className="cal-nav-btn" onClick={fetchAdmins} title="โหลดข้อมูลใหม่"><Users size={16} /></button>
                            </div>
                            <table className="user-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>ชื่อผู้ใช้งาน</th>
                                        <th>บทบาท</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(u => (
                                        <tr key={u.Id}>
                                            <td>{u.Id}</td>
                                            <td style={{ fontWeight: 600 }}>{u.Username}</td>
                                            <td>
                                                <span className={`role-badge role-${u.Role}`}>
                                                    {u.Role}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {admins.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>ไม่พบข้อมูลแอดมิน</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;

