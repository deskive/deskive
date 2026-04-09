/**
 * Admin Layout Component
 * Layout wrapper for admin panel with navigation and sidebar
 */

import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useIntl } from 'react-intl';
import {
  BarChart3,
  Building2,
  FileText,
  Users,
  Settings,
  Activity,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Search,
  Home,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn } from '../lib/utils';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  children?: NavigationItem[];
}

const AdminLayout: React.FC = () => {
  const intl = useIntl();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation: NavigationItem[] = [
    {
      label: intl.formatMessage({ id: 'admin.dashboard' }),
      href: '/admin',
      icon: BarChart3,
    },
    {
      label: intl.formatMessage({ id: 'admin.userManagement' }),
      href: '/admin/users',
      icon: Users,
    },
    {
      label: intl.formatMessage({ id: 'admin.organizations' }),
      href: '/admin/organizations',
      icon: Building2,
    },
    {
      label: intl.formatMessage({ id: 'admin.blogManagement' }),
      href: '/admin/blog',
      icon: FileText,
      children: [
        {
          label: intl.formatMessage({ id: 'admin.blog.allPosts' }),
          href: '/admin/blog',
          icon: FileText,
        },
        {
          label: intl.formatMessage({ id: 'admin.blog.createPost' }),
          href: '/admin/blog/create',
          icon: FileText,
        },
        {
          label: intl.formatMessage({ id: 'admin.blog.categories' }),
          href: '/admin/blog/categories',
          icon: FileText,
        },
        {
          label: intl.formatMessage({ id: 'admin.blog.tags' }),
          href: '/admin/blog/tags',
          icon: FileText,
        },
      ],
    },
    {
      label: intl.formatMessage({ id: 'admin.feedback', defaultMessage: 'Feedback' }),
      href: '/admin/feedback',
      icon: MessageSquare,
      children: [
        {
          label: intl.formatMessage({ id: 'admin.feedback.all', defaultMessage: 'All Feedback' }),
          href: '/admin/feedback',
          icon: MessageSquare,
        },
        {
          label: intl.formatMessage({ id: 'admin.feedback.deletion', defaultMessage: 'Deletion Feedback' }),
          href: '/admin/feedback/deletion',
          icon: MessageSquare,
        },
      ],
    },
    {
      label: intl.formatMessage({ id: 'admin.systemSettings' }),
      href: '/admin/settings',
      icon: Settings,
    },
    {
      label: intl.formatMessage({ id: 'admin.auditLogs' }),
      href: '/admin/audit-logs',
      icon: Activity,
    },
    {
      label: intl.formatMessage({ id: 'admin.security' }),
      href: '/admin/security',
      icon: Shield,
      badge: intl.formatMessage({ id: 'common.new' }),
    },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  const NavigationLink: React.FC<{
    item: NavigationItem;
    className?: string;
    onClick?: () => void;
  }> = ({ item, className, onClick }) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(item.href);

    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          className
        )}
      >
        <Icon className="mr-3 h-4 w-4" />
        {item.label}
        {item.badge && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/admin" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold">{intl.formatMessage({ id: 'admin.title' })}</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <div key={item.href}>
            <NavigationLink
              item={item}
              onClick={() => setSidebarOpen(false)}
            />
            {item.children && isActiveRoute(item.href) && (
              <div className="ml-6 mt-1 space-y-1">
                {item.children.map((child) => (
                  <NavigationLink
                    key={child.href}
                    item={child}
                    className="text-xs"
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Prevent search engines from indexing admin pages */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="h-screen flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <Link to="/admin" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">{intl.formatMessage({ id: 'admin.title' })}</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Sidebar />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 bg-background border-r">
          <Sidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-background border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <Link
              to="/"
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              <span>{intl.formatMessage({ id: 'admin.backToApp' })}</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: 'common.search' })}
                className="pl-8 w-64"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                3
              </span>
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/admin.jpg" alt="Admin" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin User</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      admin@deskive.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>{intl.formatMessage({ id: 'common.profile' })}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{intl.formatMessage({ id: 'common.settings' })}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{intl.formatMessage({ id: 'common.logOut' })}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
      </div>
    </>
  );
};

export default AdminLayout;