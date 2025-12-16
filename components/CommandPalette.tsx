import React from 'react';
import { Search, Mail, Trash2, Archive, User, Settings, LogOut, Clock, Inbox, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    compose: () => void;
    search: () => void; // Usually just focuses search bar or opens filter
    logout: () => void;
    archiveSelected: () => void;
    deleteSelected: () => void;
    snoozeSelected: (hours: number) => void;
    goToInbox: () => void;
    goToSent: () => void;
  };
  hasSelection: boolean;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions, hasSelection }) => {
  if (!isOpen) return null;

  const groups = [
    {
        name: "Actions",
        commands: [
            { icon: Mail, label: 'Compose new email', shortcut: 'C', action: actions.compose },
            { icon: Search, label: 'Search emails', shortcut: '/', action: actions.search },
            { icon: Inbox, label: 'Go to Inbox', shortcut: 'G then I', action: actions.goToInbox },
            { icon: Send, label: 'Go to Sent', shortcut: 'G then S', action: actions.goToSent },
        ]
    },
    {
        name: "Selected Email",
        show: hasSelection,
        commands: [
             { icon: Clock, label: 'Snooze for 3 hours', shortcut: 'H', action: () => actions.snoozeSelected(3) },
             { icon: Clock, label: 'Snooze until tomorrow', shortcut: 'L', action: () => actions.snoozeSelected(24) },
             { icon: Archive, label: 'Archive', shortcut: 'E', action: actions.archiveSelected },
             { icon: Trash2, label: 'Move to Trash', shortcut: 'D', action: actions.deleteSelected },
        ]
    },
    {
        name: "General",
        commands: [
            { icon: User, label: 'Profile', shortcut: '⌘P', action: () => {} },
            { icon: Settings, label: 'Settings', shortcut: '⌘S', action: () => {} },
            { icon: LogOut, label: 'Log Out', shortcut: 'Shift+Q', action: actions.logout },
        ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-popover rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 py-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <input 
                autoFocus
                placeholder="Type a command..."
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm h-5"
            />
            <kbd className="hidden sm:inline-block pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                ESC
            </kbd>
        </div>
        <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {groups.map((group, groupIdx) => {
                if (group.show === false) return null;
                return (
                    <div key={groupIdx} className="mb-2">
                        <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground/70">{group.name}</div>
                        {group.commands.map((cmd, idx) => (
                            <div key={idx} 
                                onClick={() => {
                                    cmd.action();
                                    onClose();
                                }}
                                className="mx-2 flex items-center justify-between px-2 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm text-foreground group transition-colors">
                                <div className="flex items-center space-x-2">
                                    <cmd.icon className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground" />
                                    <span className="text-sm">{cmd.label}</span>
                                </div>
                                {cmd.shortcut && <span className="text-xs text-muted-foreground group-hover:text-accent-foreground">{cmd.shortcut}</span>}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
        <div className="border-t border-border px-4 py-2 bg-muted/20 flex justify-between">
            <span className="text-[10px] text-muted-foreground">Hypermail AI v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;