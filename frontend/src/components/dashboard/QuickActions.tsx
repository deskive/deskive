import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Upload, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: {
    icon: string;
    bg: string;
    hover: string;
  };
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-project',
    title: 'New Project',
    description: 'Create a new project and start collaborating',
    icon: Plus,
    path: '/projects/new',
    color: {
      icon: 'text-blue-600',
      bg: 'bg-blue-50',
      hover: 'hover:bg-blue-100',
    },
  },
  {
    id: 'send-message',
    title: 'Send Message',
    description: 'Send a message to team members',
    icon: MessageSquare,
    path: '/messages/new',
    color: {
      icon: 'text-green-600',
      bg: 'bg-green-50',
      hover: 'hover:bg-green-100',
    },
  },
  {
    id: 'upload-files',
    title: 'Upload Files',
    description: 'Upload and share files with your team',
    icon: Upload,
    path: '/files/upload',
    color: {
      icon: 'text-purple-600',
      bg: 'bg-purple-50',
      hover: 'hover:bg-purple-100',
    },
  },
  {
    id: 'schedule-meeting',
    title: 'Schedule Meeting',
    description: 'Schedule a meeting with team members',
    icon: Calendar,
    path: '/meetings/new',
    color: {
      icon: 'text-orange-600',
      bg: 'bg-orange-50',
      hover: 'hover:bg-orange-100',
    },
  },
];

export interface QuickActionsProps {
  actions?: QuickAction[];
  className?: string;
  title?: string;
  showTitle?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
  className = '',
  title = 'Quick Actions',
  showTitle = true,
}) => {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickAction) => {
    navigate(action.path);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">Get started with these common tasks</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          
          return (
            <Card
              key={action.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${action.color.hover} border-gray-200`}
              onClick={() => handleActionClick(action)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${action.color.bg}`}>
                      <IconComponent className={`w-6 h-6 ${action.color.icon}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Alternative button layout can be added by importing Button component */}
    </div>
  );
};

export default QuickActions;