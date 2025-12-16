import React, { useState, useEffect, useMemo } from 'react';
import { Email, User } from '../types';
import { summarizeEmail } from '../services/geminiService';
import { fetchThread, updateEmailMetadata } from '../services/gmailSyncService';
import { Sparkles, Reply, Archive, MoreHorizontal, CornerUpLeft, Loader2, ImageOff, Shield, Trash2, RotateCcw, Clock, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';

interface EmailDetailProps {
  email: Email | null;
  onArchive: (id: string) => void;
  onReply: (email: Email) => void;
  user: User | null;
  onUpdateEmail?: (id: string, updates: Partial<Email>) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDeleteForever?: (id: string) => void;
  onSnooze?: (id: string, date: Date) => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onArchive, onReply, user, onUpdateEmail, onDelete, onRestore, onDeleteForever, onSnooze }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  
  // Thread State
  const [threadMessages, setThreadMessages] = useState<Email[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  useEffect(() => {
    // Initialize summary from the email object (persisted data)
    setSummary(email?.summary || null);
    setIsSummarizing(false);
    setThreadMessages([]);
    setShowImages(false); // Reset image blocking on new email selection
    setShowSnoozeMenu(false);

    const loadThread = async () => {
        if (!email) return;
        
        // If we have a user and token, fetch the full thread
        if (user?.accessToken && email.threadId) {
            setIsLoadingThread(true);
            const messages = await fetchThread(user.accessToken, email.threadId);
            if (messages.length > 0) {
                // Sort chronologically
                messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setThreadMessages(messages);
            } else {
                // Fallback to just showing the current email if fetch fails
                setThreadMessages([email]);
            }
            setIsLoadingThread(false);
        } else {
            // Offline or Demo mode
            setThreadMessages([email]);
        }
    };

    loadThread();

  }, [email?.id, email?.threadId, user, email?.summary]);

  const handleSummarize = async () => {
    if (!email) return;
    setIsSummarizing(true);
    
    // Use threadMessages if available, otherwise fallback to the single email prop
    const messages = threadMessages.length > 0 ? threadMessages : [email];
    
    // OPTIMIZATION: Only take the last 3 messages to avoid huge payloads and resource exhaustion
    const recentMessages = messages.slice(-3);
    
    // Format the thread for the LLM
    const threadContext = recentMessages.map(msg => {
        // Simple HTML stripping and cleanup
        const text = msg.body
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<br\s*\/?>/gi, '\n') // Replace br with newline
            .replace(/<[^>]+>/g, ' ') // Strip other tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
            
        // Truncate to 800 chars per message to keep it lightweight
        const truncatedText = text.length > 800 ? text.substring(0, 800) + '...[truncated]' : text;
        
        return `From: ${msg.fromName} (${new Date(msg.date).toLocaleDateString()})\nBody: ${truncatedText}`;
    }).join('\n\n--------------------------------\n\n');

    const result = await summarizeEmail(threadContext);
    setSummary(result.summary);
    
    // Update the email with the new classification locally and in DB
    if (onUpdateEmail) {
        onUpdateEmail(email.id, {
            intent: result.intent,
            priority: result.priority,
            summary: result.summary
        });
        
        // Persist to Supabase
        if (user?.id) {
            await updateEmailMetadata(user.id, email.id, {
                summary: result.summary,
                intent: result.intent,
                priority: result.priority
            });
        }
    }

    setIsSummarizing(false);
  };

  // Process messages to handle image blocking securely
  const { processedMessages, hasBlockedImages } = useMemo(() => {
    let blockedFound = false;
    
    const processed = threadMessages.map(msg => {
        // Base sanitization
        const raw = DOMPurify.sanitize(msg.body, { 
            USE_PROFILES: { html: true }, 
            ADD_ATTR: ['target'] 
        });

        // Check for images
        const hasImg = /<img/i.test(raw);
        
        if (hasImg && !showImages) {
            blockedFound = true;
            // Use DOMParser to safely strip src attributes
            const parser = new DOMParser();
            const doc = parser.parseFromString(raw, 'text/html');
            const imgs = doc.querySelectorAll('img');
            
            imgs.forEach(img => {
                img.removeAttribute('src');
                img.removeAttribute('srcset');
                // Hide the broken image icon
                img.style.display = 'none'; 
            });
            
            return { ...msg, bodyDisplay: doc.body.innerHTML };
        }
        
        return { ...msg, bodyDisplay: raw };
    });

    return { processedMessages: processed, hasBlockedImages: blockedFound };
  }, [threadMessages, showImages]);

  if (!email) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <div className="text-3xl">✉️</div>
        </div>
        <p className="font-medium">No conversation selected</p>
      </div>
    );
  }

  const displaySubject = email.subject;
  const latestMessage = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : email;
  const isInTrash = email.folder === 'trash';
  const isInSnoozed = email.folder === 'snoozed';

  const handleSnoozeOption = (hours: number) => {
      if(!onSnooze) return;
      const date = new Date();
      date.setHours(date.getHours() + hours);
      onSnooze(email.id, date);
      setShowSnoozeMenu(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-20">
        <div className="flex items-center space-x-1">
            {!isInTrash && (
                 <>
                    <button className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors" title="Archive (e)" onClick={() => onArchive(email.id)}>
                        <Archive className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-muted text-muted-foreground hover:text-destructive rounded-md transition-colors" title="Delete (d)" onClick={() => onDelete?.(email.id)}>
                        <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {!isInSnoozed && (
                        <div className="relative">
                            <button 
                                className={cn("p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors", showSnoozeMenu && "bg-muted text-foreground")} 
                                title="Snooze (h)" 
                                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                            {showSnoozeMenu && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Snooze until...</div>
                                    <button onClick={() => handleSnoozeOption(3)} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center space-x-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Later today (+3h)</span>
                                    </button>
                                    <button onClick={() => handleSnoozeOption(24)} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center space-x-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Tomorrow</span>
                                    </button>
                                     <button onClick={() => handleSnoozeOption(168)} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center space-x-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Next Week</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                 </>
            )}
            
            {(isInTrash || isInSnoozed) && (
                <>
                    <button className="p-2 hover:bg-muted text-muted-foreground hover:text-green-500 rounded-md transition-colors" title="Restore" onClick={() => onRestore?.(email.id)}>
                        <RotateCcw className="w-4 h-4" />
                    </button>
                     {isInTrash && (
                        <button className="p-2 hover:bg-muted text-muted-foreground hover:text-destructive rounded-md transition-colors" title="Delete Forever" onClick={() => onDeleteForever?.(email.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                     )}
                </>
            )}
            
            <div className="w-px h-4 bg-border mx-2"></div>
            
            <button className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors" title="Reply (r)" onClick={() => onReply(latestMessage)}>
                <Reply className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
                <MoreHorizontal className="w-4 h-4" />
            </button>
        </div>
        
        <div className="flex items-center space-x-3">
             <button 
                onClick={handleSummarize}
                disabled={isSummarizing || (!!summary && !isSummarizing) || isLoadingThread}
                className={cn(
                    "flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border transition-all",
                    isSummarizing 
                        ? "bg-muted text-muted-foreground border-border" 
                        : !!summary 
                            ? "bg-primary/5 border-primary/20 text-primary cursor-default"
                            : "bg-background hover:bg-muted border-border text-foreground hover:border-muted-foreground",
                    isLoadingThread && "opacity-50 cursor-not-allowed"
                )}
            >
                <Sparkles className={cn("w-3 h-3", isSummarizing && "animate-spin")} />
                <span>{isSummarizing ? 'Thinking...' : summary ? 'Summarized' : 'Summarize'}</span>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" onClick={() => setShowSnoozeMenu(false)}>
        <div className="max-w-4xl mx-auto p-8 pb-20">
            <h1 className="text-2xl font-bold text-foreground mb-6 leading-tight tracking-tight">{displaySubject}</h1>
            
            {/* Snoozed Banner */}
            {isInSnoozed && email.snoozeUntil && (
                 <div className="mb-6 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-500">
                        Snoozed until {new Date(email.snoozeUntil).toLocaleString()}
                    </span>
                 </div>
            )}

            {/* Privacy Alert / Image Blocker */}
            {hasBlockedImages && (
                <div className="mb-6 px-4 py-3 bg-secondary/50 border border-border rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center space-x-3 text-muted-foreground text-xs">
                        <Shield className="w-4 h-4 text-orange-500/80" />
                        <span>Images hidden to protect your privacy.</span>
                    </div>
                    <button 
                        onClick={() => setShowImages(true)}
                        className="text-xs font-medium text-foreground bg-background border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors shadow-sm"
                    >
                        Show Images
                    </button>
                </div>
            )}
            
            {/* AI Summary Box */}
            {summary && (
                <div className="mb-8 p-4 bg-muted/40 border border-border rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center space-x-2 text-primary mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Summary</span>
                        {email.intent && (
                            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                                {email.intent} • Priority: {email.priority}/10
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
            )}

            {isLoadingThread ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-6">
                    {processedMessages.map((msg, idx) => {
                        const isLast = idx === processedMessages.length - 1;
                        // Use the bodyDisplay from our memoized processor
                        const htmlContent = (msg as any).bodyDisplay || msg.body;
                        
                        // Check if this message is from "me" (the user)
                        const isMe = user && msg.fromEmail.toLowerCase() === user.email.toLowerCase();

                        return (
                            <div key={msg.id} className={cn("flex flex-col", !isLast && "border-b border-border pb-6 mb-6 opacity-80 hover:opacity-100 transition-opacity")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm shrink-0", msg.avatarColor)}>
                                            {msg.fromName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-semibold text-foreground truncate">{msg.fromName}</span>
                                                <span className="text-muted-foreground text-sm truncate hidden sm:inline">&lt;{msg.fromEmail}&gt;</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {isMe ? 'to ' + (threadMessages[0]?.fromName || 'Recipient') : 'to me'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium shrink-0 ml-2">
                                        {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                                
                                <div className="email-content-wrapper pl-14">
                                    <div 
                                        className="prose prose-sm prose-zinc max-w-none text-foreground/90 dark:prose-invert [&_a]:text-blue-500 [&_a]:underline break-words"
                                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="h-px bg-border my-8"></div>

            {/* Quick Reply Button */}
             <button onClick={() => onReply(latestMessage)} className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-all border border-border rounded-lg px-4 py-3 w-full text-left hover:bg-muted group">
                <CornerUpLeft className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Reply to {latestMessage.fromName}...</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDetail;