/**
 * Team Member Card Component
 *
 * Displays individual team member information with workload indicator
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, Edit, Trash2, Eye, Crown, Code, Shield,
  Palette, Bug, UserCog
} from 'lucide-react';
import type { TeamMember, TeamRole } from '@/types/teamMember';

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit?: (member: TeamMember) => void;
  onRemove?: (member: TeamMember) => void;
  onView?: (member: TeamMember) => void;
  onAssign?: (member: TeamMember) => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onEdit,
  onRemove,
  onView,
  onAssign,
}) => {
  const intl = useIntl();

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      case 'designer':
        return Palette;
      case 'qa':
        return Bug;
      case 'developer':
      default:
        return Code;
    }
  };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'from-emerald-600 to-teal-600';
      case 'admin':
        return 'from-emerald-500 to-teal-500';
      case 'designer':
        return 'from-teal-500 to-emerald-500';
      case 'qa':
        return 'from-green-500 to-emerald-500';
      case 'developer':
      default:
        return 'from-emerald-500 to-green-500';
    }
  };

  const getRoleLabel = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return intl.formatMessage({ id: 'roles.owner' });
      case 'admin':
        return intl.formatMessage({ id: 'roles.admin' });
      case 'designer':
        return intl.formatMessage({ id: 'roles.designer' });
      case 'qa':
        return intl.formatMessage({ id: 'roles.qaEngineer' });
      case 'developer':
      default:
        return intl.formatMessage({ id: 'roles.developer' });
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'text-red-600 bg-red-50';
    if (utilization >= 80) return 'text-yellow-600 bg-yellow-50';
    if (utilization >= 50) return 'text-emerald-600 bg-emerald-50';
    return 'text-green-600 bg-green-50';
  };

  const getWorkloadBarColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-500';
    if (utilization >= 80) return 'bg-yellow-500';
    if (utilization >= 50) return 'bg-emerald-500';
    return 'bg-green-500';
  };

  const RoleIcon = getRoleIcon(member.role);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Header with gradient */}
      <div className={`h-24 bg-gradient-to-r ${getRoleColor(member.role)} relative`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white rounded-full" />
        </div>
        {member.online_status && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold">{intl.formatMessage({ id: 'members.online' })}</span>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="p-6 -mt-12">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-white shadow-xl flex items-center justify-center text-white text-2xl font-black">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                member.name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 ${getAvailabilityColor(member.availability)} rounded-full border-4 border-white`} />
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleColor(member.role)} flex items-center justify-center`}>
            <RoleIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{member.title || getRoleLabel(member.role)}</p>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getRoleColor(member.role)} bg-gradient-to-r text-white`}>
              {getRoleLabel(member.role)}
            </span>
            {member.hourly_rate && (
              <span className="text-gray-600 text-xs">
                ${member.hourly_rate}/hr
              </span>
            )}
          </div>
        </div>

        {/* Workload indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-semibold">{intl.formatMessage({ id: 'members.workload' })}</span>
            <span className={`font-bold ${member.workload_percentage >= 100 ? 'text-red-600' : 'text-gray-900'}`}>
              {member.workload_percentage}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getWorkloadBarColor(member.workload_percentage)} transition-all duration-500`}
              style={{ width: `${Math.min(member.workload_percentage, 100)}%` }}
            />
          </div>
          {member.workload_percentage > 100 && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{intl.formatMessage({ id: 'members.overbookedBy' }, { percent: member.workload_percentage - 100 })}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded-xl p-3 ${getUtilizationColor(member.workload_percentage)}`}>
            <div className="text-xs font-semibold mb-1">{intl.formatMessage({ id: 'members.utilization' })}</div>
            <div className="text-lg font-black">{member.workload_percentage}%</div>
          </div>
          <div className="bg-teal-50 rounded-xl p-3">
            <div className="text-xs text-teal-600 font-semibold mb-1">{intl.formatMessage({ id: 'members.projects' })}</div>
            <div className="text-lg font-black text-teal-600">{member.current_projects}</div>
          </div>
        </div>

        {member.location && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{member.location}</span>
            </div>
            {member.timezone && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{member.timezone}</span>
              </div>
            )}
          </div>
        )}

        {member.current_project_names && member.current_project_names.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">{intl.formatMessage({ id: 'members.currentProjects' })}</div>
            <div className="space-y-1">
              {member.current_project_names.slice(0, 2).map((project, idx) => (
                <div key={idx} className="text-xs text-gray-700 flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="truncate">{project}</span>
                </div>
              ))}
              {member.current_project_names.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{member.current_project_names.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {member.skills && member.skills.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">{intl.formatMessage({ id: 'members.skills' })}</div>
            <div className="flex flex-wrap gap-2">
              {member.skills.slice(0, 4).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                  +{member.skills.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {!member.is_owner ? (
            <>
              {onEdit && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onEdit(member)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-2 rounded-xl font-bold transition-colors"
                  title="Edit member"
                >
                  <Edit className="w-4 h-4" />
                </motion.button>
              )}
              {onAssign && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAssign(member)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-teal-100 hover:bg-teal-200 text-teal-700 px-3 py-2 rounded-xl font-bold transition-colors"
                  title="Assign to project"
                >
                  <UserCog className="w-4 h-4" />
                </motion.button>
              )}
              {onView && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onView(member)}
                  className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-xl transition-colors"
                  title="View profile"
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
              )}
              {onRemove && member.role !== 'owner' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onRemove(member)}
                  className="flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-xl transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-bold">
              <Crown className="w-4 h-4" />
              <span className="text-sm">{intl.formatMessage({ id: 'members.you' })}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TeamMemberCard;
