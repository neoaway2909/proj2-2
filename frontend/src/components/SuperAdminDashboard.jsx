import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');

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
            const res = await axios.post('http://localhost:5001/api/create-staff', {
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
        <div className="container dashboard" style={{ maxWidth: '500px' }}>
            <span className="role-badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>Super Admin</span>
            <h2>Super Admin Panel</h2>
            <p style={{ color: 'var(--text-muted)' }}>Hello {username}, you have full administrative access. You can create Admins.</p>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginTop: '2rem', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Create New Staff</h3>
                {message && <p style={{ color: '#4ade80', fontSize: '0.875rem' }}>{message}</p>}
                {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
                
                <form onSubmit={handleCreateStaff}>
                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" style={{ background: '#eab308' }}>Create Account</button>
                </form>
            </div>

            <button onClick={handleLogout} style={{ background: '#334155', marginTop: '2rem' }}>Logout</button>
        </div>
    );
};

export default SuperAdminDashboard;
