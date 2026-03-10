import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { axiosInstance as axios } from '../lib/axios';

export const NotificationBell = ({ userRole = 'CUSTOMER', iconColor = "text-gray-600", onNavigate }) => {
    const { data: unreadCount } = useQuery({
        queryKey: ['unreadNotifications'],
        queryFn: async () => {
            const { data } = await axios.get('/api/notifications?read=false&limit=1');
            return data.unreadCount || 0;
        },
        refetchInterval: 60000,
        initialData: 0
    });

    const handleBellClick = () => {
        // Use onNavigate callback if provided (for customer dashboard)
        if (onNavigate) {
            onNavigate('notifications');
        }
        // Fallback: could add else clause for admin navigation if needed
    };

    return (
        <button
            onClick={handleBellClick}
            className="btn btn-ghost btn-circle relative"
            title="View Notifications"
        >
            <Bell size={24} className={iconColor} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};
