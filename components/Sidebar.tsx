import React from 'react';
import { FolderType, ViewMode } from '../types';
import { Inbox, Star, Send, File, CheckCircle, Trash2, LogOut, Users, AlertTriangle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  activeFolder: FolderType;
  currentView: ViewMode;
  onSelectFolder: (folder: FolderType) => void;
  onSelectView: (view: ViewMode) => void;
  unreadCount: number;
  onLogout?: () => void;
  onEmptyTrash?: () => void;
}

// Utility for merging tailwind classes similar to shadcn 'cn' utility
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Sidebar: React.FC<SidebarProps> = ({ activeFolder, currentView, onSelectFolder, onSelectView, unreadCount, onLogout, onEmptyTrash }) => {
  const items = [
    { type: FolderType.INBOX, icon: Inbox, label: 'Inbox', count: unreadCount },
    { type: FolderType.STARRED, icon: Star, label: 'Starred' },
    { type: FolderType.SNOOZED, icon: Clock, label: 'Snoozed' },
    { type: FolderType.SENT, icon: Send, label: 'Sent' },
    { type: FolderType.DRAFTS, icon: File, label: 'Drafts' },
    { type: FolderType.DONE, icon: CheckCircle, label: 'Archive' },
    { type: FolderType.TRASH, icon: Trash2, label: 'Trash' },
  ];

  const handleFolderClick = (folder: FolderType) => {
      onSelectFolder(folder);
      onSelectView('mail');
  };

  return (
    <div className="w-16 md:w-56 h-full bg-card border-r border-border flex flex-col pt-4">
        <div className="px-4 mb-6 flex items-center space-x-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background font-bold shadow-sm">
                H
            </div>
            <span className="text-foreground font-semibold text-lg hidden md:block tracking-tight">Hypermail</span>
        </div>

      <nav className="flex-1 space-y-1 px-2">
        {items.map((item) => {
            // Active if we are in mail view and folder matches
            const isActive = currentView === 'mail' && activeFolder === item.type;
            return (
                <button
                    key={item.type}
                    onClick={() => handleFolderClick(item.type)}
                    className={cn(
                        "w-full flex items-center justify-center md:justify-start px-2 md:px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive 
                            ? "bg-secondary text-secondary-foreground" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-foreground" : "text-muted-foreground")} />
                    <span className="ml-3 hidden md:block">{item.label}</span>
                    {item.count ? (
                        <span className={cn(
                            "ml-auto hidden md:block py-0.5 px-2 rounded-full text-[10px]",
                             isActive ? "bg-background text-foreground" : "bg-muted text-foreground"
                        )}>
                        {item.count}
                        </span>
                    ) : null}
                </button>
            )
        })}
        
        {/* Conditional Empty Trash Button */}
        {activeFolder === FolderType.TRASH && currentView === 'mail' && onEmptyTrash && (
             <button
                onClick={onEmptyTrash}
                className="w-full flex items-center justify-center md:justify-start px-2 md:px-3 py-2 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors mt-2"
            >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="ml-3 hidden md:block">Empty Trash</span>
            </button>
        )}

        <div className="pt-4 mt-2 border-t border-border/50">
             <button
                type="button"
                onClick={() => onSelectView('contacts')}
                className={cn(
                    "w-full flex items-center justify-center md:justify-start px-2 md:px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    currentView === 'contacts'
                        ? "bg-secondary text-secondary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
            >
                <Users className={cn("h-4 w-4 flex-shrink-0", currentView === 'contacts' ? "text-foreground" : "text-muted-foreground")} />
                <span className="ml-3 hidden md:block">Contacts</span>
            </button>
        </div>
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-center md:justify-start text-muted-foreground text-xs space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
            <span className="hidden md:inline font-medium">Online</span>
        </div>
        
        {onLogout && (
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center md:justify-start px-0 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors group py-2"
                title="Log Out"
            >
                <LogOut className="h-4 w-4 flex-shrink-0 md:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden md:block">Log Out</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;