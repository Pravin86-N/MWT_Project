import React from 'react';
import { Timeline, TimelineItem } from 'vertical-timeline-component-for-react';
import { DeliveryStatus } from '../../types/delivery';

interface DeliveryTimelineProps {
  deliveries: DeliveryStatus[];
}

const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({ deliveries }) => {
  return (
    <div className="delivery-timeline">
      <h2 className="timeline-title">Delivery Timeline</h2>
      <Timeline>
        {deliveries.map((delivery, index) => (
          <TimelineItem
            key={index}
            dateText={delivery.date}
            style={{ color: delivery.status === 'Completed' ? 'green' : 'red' }}
          >
            <h3>{delivery.title}</h3>
            <p>{delivery.description}</p>
            <span className="status-badge">{delivery.status}</span>
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
};

export default DeliveryTimeline;