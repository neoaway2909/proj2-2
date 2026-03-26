import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import './App.css';

const PrivateRoute = ({ children, role }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token) return <Navigate to="/login" />;

    // If route requires a specific role and user doesn't have it
    if (role && userRole !== role) {
        if (userRole === 'superadmin') return <Navigate to="/superadmin" />;
        if (userRole === 'admin') return <Navigate to="/admin" />;
        if (userRole === 'doctor') return <Navigate to="/doctor" />;
        return <Navigate to="/dashboard" />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute role="user">
                            <UserDashboard />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <PrivateRoute role="admin">
                            <AdminDashboard />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/superadmin"
                    element={
                        <PrivateRoute role="superadmin">
                            <SuperAdminDashboard />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/doctor"
                    element={
                        <PrivateRoute role="doctor">
                            <DoctorDashboard />
                        </PrivateRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;
