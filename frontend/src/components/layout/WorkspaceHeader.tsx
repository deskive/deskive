/**
 * Workspace Header Component
 * Top navigation header with workspace selector (follows TeamAtOnce design)
 */

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { WorkspaceSwitcher } from "../workspace/WorkspaceSwitcher";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { NotificationBell } from "../notifications/NotificationBell";
import LanguageSwitcher from "../LanguageSwitcher";
import { useIntl } from "react-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceHeader() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const intl = useIntl();

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      {/* Left Side: Logo + Workspace Selector */}
      <div className="flex items-center gap-4">
        {/* Logo - Clickable link to home page */}
        <Link
          to="/home"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
          title="Go to Home"
        >
          <img
            src="https://cdn.deskive.com/deskive/logo.png"
            alt="Deskive Logo"
            className="w-8 h-8 transition-all duration-300 group-hover:scale-110"
          />
          <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Deskive
          </span>
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Workspace Selector */}
        <WorkspaceSwitcher />
      </div>

      {/* Right Side: Actions + User Menu */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {/*  <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="w-5 h-5" />
        </Button>
 */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <NotificationBell />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-xs">
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/home")}>
              {intl.formatMessage({ id: 'userMenu.homePage' })}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate(`/workspaces/${workspaceId}/settings?tab=profile`)
              }
            >
              {intl.formatMessage({ id: 'userMenu.profileSettings' })}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate(`/workspaces/${workspaceId}/settings?tab=security`)
              }
            >
              {intl.formatMessage({ id: 'userMenu.accountSecurity' })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              {intl.formatMessage({ id: 'userMenu.signOut' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
