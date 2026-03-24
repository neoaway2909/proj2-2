import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Camera, Edit, Save, X, ArrowLeft } from 'lucide-react';
import { API_BASE_URL, UPLOAD_URL } from '../config';
import './Profile.css';

const Profile = ({ onBack }) => {
    const token = localStorage.getItem('token');
    const [profile, setProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // สถานะสำหรับฟอร์มแก้ไข
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const fetchProfile = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_BASE_URL}/profile`, config);
            setProfile(res.data);
            setFormData({
                fullName: res.data.FullName || '',
                email: res.data.Email || '',
                phoneNumber: res.data.PhoneNumber || '',
            });
            setLoading(false);
        } catch (err) {
            setError('Failed to load profile');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('email', formData.email);
        data.append('phoneNumber', formData.phoneNumber);
        if (selectedFile) {
            data.append('profilePic', selectedFile);
        }

        try {
            const config = { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                } 
            };
            await axios.put(`${API_BASE_URL}/profile`, data, config);
            setIsEditing(false);
            fetchProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed');
            setLoading(false);
        }
    };

    if (loading && !profile) return <div className="profile-loading">Loading...</div>;
    if (error && !profile) return <div className="profile-error">{error}</div>;

    const currentProfilePic = previewUrl || (profile?.ProfilePic ? `${UPLOAD_URL}${profile.ProfilePic}` : null);

    return (
        <div className="profile-container glass-effect">
            <div className="profile-header">
                <button className="back-btn-profile" onClick={onBack}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h2>My Profile</h2>
            </div>

            <div className="profile-content">
                <form onSubmit={handleSubmit}>
                    <div className="profile-avatar-section">
                        <div className="avatar-wrapper">
                            {currentProfilePic ? (
                                <img src={currentProfilePic} alt="Profile" className="profile-img" />
                            ) : (
                                <div className="avatar-placeholder">
                                    <User size={60} color="#cbd5e1" />
                                </div>
                            )}
                            {isEditing && (
                                <label className="camera-btn">
                                    <Camera size={20} color="white" />
                                    <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                                </label>
                            )}
                        </div>
                        {!isEditing && (
                            <div className="profile-badge">{profile?.Role?.toUpperCase()}</div>
                        )}
                    </div>

                    <div className="profile-info-grid">
                        <div className="info-item">
                            <label><User size={18} /> Full Name</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    name="fullName" 
                                    value={formData.fullName} 
                                    onChange={handleChange} 
                                    placeholder="Enter your full name"
                                    required
                                />
                            ) : (
                                <p>{profile?.FullName || 'Not set'}</p>
                            )}
                        </div>

                        <div className="info-item">
                            <label><Mail size={18} /> Email Address</label>
                            {isEditing ? (
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    placeholder="Enter your email"
                                />
                            ) : (
                                <p>{profile?.Email || 'Not set'}</p>
                            )}
                        </div>

                        <div className="info-item">
                            <label><Phone size={18} /> Phone Number</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    name="phoneNumber" 
                                    value={formData.phoneNumber} 
                                    onChange={handleChange} 
                                    placeholder="Enter your phone number"
                                />
                            ) : (
                                <p>{profile?.PhoneNumber || 'Not set'}</p>
                            )}
                        </div>

                        <div className="info-item">
                            <label><User size={18} /> Username</label>
                            <p className="readonly-field">{profile?.Username} <span className="id-tag">ID: #{profile?.Id}</span></p>
                        </div>
                    </div>

                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button type="button" className="cancel-btn" onClick={() => { setIsEditing(false); setPreviewUrl(null); }} disabled={loading}>
                                    <X size={18} /> Cancel
                                </button>
                                <button type="submit" className="save-btn" disabled={loading}>
                                    <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button type="button" className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                                <Edit size={18} /> Edit Profile
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
