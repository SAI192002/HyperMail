import React from 'react';
import { Email, FolderType } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  activeFolder?: FolderType;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getIntentBadgeColor = (intent?: string) => {
    switch (intent) {
        case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'Action': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'Meeting': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'Newsletter': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        case 'Spam': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'FYI': return 'bg-green-500/10 text-green-500 border-green-500/20';
        default: return null;
    }
};

const EmailList: React.FC<EmailListProps> = ({ emails, selectedEmailId, onSelectEmail, activeFolder }) => {
  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-border bg-background/50 flex flex-col">
       {/* Sticky Header */}
       <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur z-10 sticky top-0 shrink-0 h-14">
            <h2 className="font-semibold text-sm capitalize">{activeFolder ? activeFolder.toLowerCase() : 'Inbox'}</h2>
        </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {emails.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No emails here.
            </div>
        ) : (
            <div className="flex flex-col p-2 space-y-1">
                {emails.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const badgeClass = getIntentBadgeColor(email.intent);

                return (
                    <div
                    key={email.id}
                    onClick={() => onSelectEmail(email.id)}
                    className={cn(
                        "relative px-3 py-3 cursor-pointer rounded-lg transition-all duration-200 border border-transparent group",
                        isSelected 
                            ? "bg-accent text-accent-foreground shadow-sm border-border/50" 
                            : "hover:bg-muted/50 text-card-foreground"
                    )}
                    >
                    <div className="flex justify-between items-baseline mb-1">
                        <span className={cn(
                            "text-sm truncate pr-2 font-medium",
                            email.isRead ? "text-muted-foreground" : "text-foreground font-semibold"
                        )}>
                            {email.fromName}
                        </span>
                        <span className={cn("text-[10px]", isSelected ? "text-accent-foreground/70" : "text-muted-foreground")}>
                            {formatDate(email.date)}
                        </span>
                    </div>
                    
                    <div className="mb-0.5 flex items-center gap-2">
                        <h3 className={cn(
                            "text-xs truncate flex-1", 
                            email.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                        )}>
                            {email.subject}
                        </h3>
                        {badgeClass && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0", badgeClass)}>
                                {email.intent}
                            </span>
                        )}
                    </div>
                    
                    <p className={cn(
                        "text-xs truncate line-clamp-2",
                        isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                    )}>
                        {email.preview}
                    </p>
                    
                    {email.isStarred && !isSelected && (
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
                    )}
                    </div>
                );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;