import React from 'react';
import { useForm } from 'react-hook-form';
import './SettingsPage.css';

const SettingsPage = () => {
    const { register, handleSubmit } = useForm();

    const onSubmit = (data) => {
        console.log(data);
        // Handle settings update logic here
    };

    return (
        <div className="settings-page">
            <h1 className="settings-title">Settings</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        {...register('username')}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        {...register('email')}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        {...register('password')}
                        className="form-input"
                    />
                </div>
                <button type="submit" className="submit-button">Save Changes</button>
            </form>
        </div>
    );
};

export default SettingsPage;