import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, Users, LogOut, LayoutDashboard, Settings, User } from 'lucide-react';
import './SuperAdminDashboard.css';

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
            const res = await axios.post('http://192.168.1.150:5001/api/create-staff', {
                username: newUsername,
                password: newPassword,
                role: newRole
            }, config);
            
            setMessage(res.data.message);
            setNewUsername('');
            setNewPassword('');
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
                    <div className="menu-item"><Users size={20} /> รายชื่อผู้ใช้</div>
                    <div className="menu-item"><Settings size={20} /> ตั้งค่าระบบ</div>
                    <div className="menu-item logout-item" onClick={handleLogout} style={{ marginTop: 'auto' }}>
                        <LogOut size={20} /> ออกจากระบบ
                    </div>
                </nav>
            </aside>

            <main className="super-admin-main">
                <div className="super-admin-content">
                    <header className="header-section">
                        <h1>ยินดีต้อนรับ, {username} 👋</h1>
                        <p>คุณมีสิทธิ์เข้าถึงระบบสูงสุด สามารถจัดการบัญชีแอดมินและดูแลความเรียบร้อยของระบบ</p>
                    </header>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="label">จำนวนแอดมิน</span>
                            <span className="value">12</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">ผู้ใช้ทั้งหมด</span>
                            <span className="value">1,240</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">รายงานวันนี้</span>
                            <span className="value">45</span>
                        </div>
                    </div>

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
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;

