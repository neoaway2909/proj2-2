import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="container dashboard">
            <span className="role-badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4' }}>Doctor</span>
            <h2>Doctor Panel</h2>
            <p style={{ color: 'var(--text-muted)' }}>Hello Dr. {username}, welcome to your dashboard.</p>
            <button onClick={handleLogout} style={{ background: '#334155' }}>Logout</button>
        </div>
    );
};

export default DoctorDashboard;
