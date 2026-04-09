/**
 * Calendar Page
 * Calendar and events interface with sidebars matching the original design
 */

import React from 'react';
import { CalendarView } from '../../components/calendar';

const CalendarPage: React.FC = () => {
  return (
    <div className="h-full bg-background">
      <CalendarView />
    </div>
  );
};

export default CalendarPage;