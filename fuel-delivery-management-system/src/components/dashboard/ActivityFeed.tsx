import React from 'react';
import { useActivityFeed } from '../../hooks/useDashboard';
import './ActivityFeed.css';

const ActivityFeed: React.FC = () => {
    const { activities } = useActivityFeed();

    return (
        <div className="activity-feed">
            <h2 className="activity-feed__title">Recent Activities</h2>
            <ul className="activity-feed__list">
                {activities.map((activity, index) => (
                    <li key={index} className="activity-feed__item">
                        <span className="activity-feed__timestamp">{activity.timestamp}</span>
                        <span className="activity-feed__description">{activity.description}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActivityFeed;