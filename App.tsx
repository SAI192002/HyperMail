import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import ContactList from './components/ContactList';
import ContactDetail from './components/ContactDetail';
import ComposeModal from './components/ComposeModal';
import CommandPalette from './components/CommandPalette';
import LoginPage from './components/LoginPage';
import { KEYBOARD_SHORTCUTS } from './constants';
import { Email, FolderType, ComposeState, ViewMode } from './types';
import { sendGmailMessage } from './services/gmailSyncService';
import { RefreshCw } from 'lucide-react';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuth';
import { useEmails } from './hooks/useEmails';
import { useContacts } from './hooks/useContacts';

// Main App Logic Component
const AppContent: React.FC = () => {
  const { user, isLoadingSession, login, logout } = useAuth();
  const { addToast } = useToast();
  
  // App State
  const [currentView, setCurrentView] = useState<ViewMode>('mail');
  const [activeFolder, setActiveFolder] = useState<FolderType>(FolderType.INBOX);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false, to: '', subject: '', body: '' });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Custom Hooks for Data
  const { 
      emails, 
      selectedEmailId, 
      isSyncing, 
      sync, 
      selectEmail, 
      updateEmail, 
      moveToTrash, 
      archive, 
      restore, 
      deleteForever, 
      snoozeEmail,
      emptyTrash, 
      reset: resetEmails 
  } = useEmails(user, activeFolder);

  const { 
      contacts, 
      selectedContactId, 
      setSelectedContactId, 
      addContact, 
      updateContact, 
      deleteContact,
      reset: resetContacts
  } = useContacts(user);

  // Filter Logic
  const displayEmails = emails.filter(e => {
      if (activeFolder === FolderType.INBOX) return e.folder === 'inbox' || (!e.folder && !e.isRead);
      if (activeFolder === FolderType.STARRED) return e.isStarred;
      if (activeFolder === FolderType.SENT) return e.folder === 'sent' || e.fromEmail === user?.email;
      if (activeFolder === FolderType.TRASH) return e.folder === 'trash';
      if (activeFolder === FolderType.DRAFTS) return e.folder === 'drafts';
      if (activeFolder === FolderType.DONE) return e.folder === 'archive';
      if (activeFolder === FolderType.SNOOZED) return e.folder === 'snoozed';
      return true;
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId) || null;
  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  const handleLogout = () => {
      logout();
      resetEmails();
      resetContacts();
      setCurrentView('mail');
      addToast("Logged out successfully");
  };

  const handleEmptyTrash = async () => {
      if (!window.confirm("Permanently delete all messages in Trash?")) return;
      await emptyTrash();
  };

  const handleViewChange = (view: ViewMode) => {
      setCurrentView(view);
      if (view === 'contacts') {
          selectEmail(null);
      } else {
          setSelectedContactId(null);
      }
  };

  const handleComposeSend = async (data: ComposeState) => {
      if (!user?.accessToken) return;
      
      setIsSending(true);
      try {
        await sendGmailMessage(
            user.accessToken, 
            user.id || '', 
            data.to, 
            data.subject, 
            data.body, 
            data.threadId, 
            data.replyToMessageId
        );
        
        setComposeState(prev => ({ ...prev, isOpen: false }));
        addToast("Email sent successfully", "success");
        setTimeout(() => sync(), 1000);
        
      } catch (err: any) {
          console.error("Failed to send email:", err);
          if (err.message.includes('401')) {
             handleLogout();
             addToast("Session expired. Please log in again.", "error");
          } else {
             addToast(`Failed to send email: ${err.message}`, "error");
          }
      } finally {
          setIsSending(false);
      }
  };

  const handleComposeOpen = (initialState: Partial<ComposeState> = {}) => {
      setComposeState({
          isOpen: true,
          to: initialState.to || '',
          subject: initialState.subject || '',
          body: initialState.body || '',
          threadId: initialState.threadId,
          replyToMessageId: initialState.replyToMessageId
      });
  };

  const getReplySubject = (subject: string) => {
      if (subject.toLowerCase().startsWith('re:')) return subject;
      return `Re: ${subject}`;
  };

  const handleReply = (emailToReply: Email) => {
      handleComposeOpen({
        to: emailToReply.fromEmail,
        subject: getReplySubject(emailToReply.subject),
        body: '',
        threadId: emailToReply.threadId,
        replyToMessageId: emailToReply.messageIdHeader
     });
  };

  // --- Command Palette Actions ---
  const paletteActions = {
      compose: () => handleComposeOpen(),
      search: () => {
          addToast("Search not fully implemented yet", "info");
      },
      logout: handleLogout,
      archiveSelected: () => selectedEmailId && archive(selectedEmailId, displayEmails),
      deleteSelected: () => {
          if (!selectedEmailId) return;
          if (activeFolder === FolderType.TRASH) {
              deleteForever(selectedEmailId, displayEmails);
          } else {
              moveToTrash(selectedEmailId, displayEmails);
          }
      },
      snoozeSelected: (hours: number) => {
          if (selectedEmailId) {
             const date = new Date();
             date.setHours(date.getHours() + hours);
             snoozeEmail(selectedEmailId, date, displayEmails);
          }
      },
      goToInbox: () => { setActiveFolder(FolderType.INBOX); setCurrentView('mail'); },
      goToSent: () => { setActiveFolder(FolderType.SENT); setCurrentView('mail'); },
  };

  // Keyboard Shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!user) return; 

    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === KEYBOARD_SHORTCUTS.ESCAPE) {
        if (isPaletteOpen) setIsPaletteOpen(false);
        else if (composeState.isOpen) setComposeState(prev => ({ ...prev, isOpen: false }));
        else {
            selectEmail(null);
            setSelectedContactId(null);
        }
        return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
    }

    if (isTyping) {
        return;
    }

    if (currentView === 'mail') {
        switch (e.key) {
            case KEYBOARD_SHORTCUTS.NEXT_EMAIL: {
                e.preventDefault();
                const idx = displayEmails.findIndex(email => email.id === selectedEmailId);
                if (idx < displayEmails.length - 1) {
                    selectEmail(displayEmails[idx + 1].id);
                } else if (idx === -1 && displayEmails.length > 0) {
                    selectEmail(displayEmails[0].id);
                }
                break;
            }
            case KEYBOARD_SHORTCUTS.PREV_EMAIL: {
                e.preventDefault();
                const idx = displayEmails.findIndex(email => email.id === selectedEmailId);
                if (idx > 0) {
                    selectEmail(displayEmails[idx - 1].id);
                }
                break;
            }
            case KEYBOARD_SHORTCUTS.ARCHIVE: {
                if (selectedEmailId) {
                    e.preventDefault();
                    archive(selectedEmailId, displayEmails);
                }
                break;
            }
            case KEYBOARD_SHORTCUTS.DELETE: {
                if (selectedEmailId) {
                    e.preventDefault();
                    if (activeFolder === FolderType.TRASH) {
                        deleteForever(selectedEmailId, displayEmails);
                    } else {
                        moveToTrash(selectedEmailId, displayEmails);
                    }
                }
                break;
            }
            case KEYBOARD_SHORTCUTS.REPLY: {
                if(selectedEmailId && selectedEmail) {
                    e.preventDefault();
                    handleReply(selectedEmail);
                }
                break;
            }
        }
    }

    switch(e.key) {
        case KEYBOARD_SHORTCUTS.COMPOSE: {
            e.preventDefault();
            handleComposeOpen();
            break;
        }
         case KEYBOARD_SHORTCUTS.SEARCH: {
            e.preventDefault();
            setIsPaletteOpen(true);
            break;
        }
        case 'r': {
            if (!isTyping && e.shiftKey) {
                e.preventDefault();
                sync();
            }
            break;
        }
    }
  }, [selectedEmailId, displayEmails, isPaletteOpen, composeState, user, selectedEmail, currentView, sync, activeFolder, moveToTrash, deleteForever]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center space-y-4">
               <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce">
                  <span className="font-bold text-xl">H</span>
               </div>
               <div className="text-sm text-muted-foreground animate-pulse">Initializing...</div>
          </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20 relative">
      <Sidebar 
        activeFolder={activeFolder} 
        currentView={currentView}
        onSelectFolder={setActiveFolder} 
        onSelectView={handleViewChange}
        unreadCount={emails.filter(e => !e.isRead && (e.folder === 'inbox' || !e.folder)).length}
        onLogout={handleLogout}
        onEmptyTrash={handleEmptyTrash}
      />

      <div className="flex flex-1 overflow-hidden">
         {currentView === 'mail' ? (
             <>
                <EmailList 
                    emails={displayEmails} 
                    selectedEmailId={selectedEmailId} 
                    onSelectEmail={selectEmail}
                    activeFolder={activeFolder}
                />
                <EmailDetail 
                    email={selectedEmail} 
                    user={user}
                    onArchive={(id) => archive(id, displayEmails)}
                    onReply={handleReply}
                    onUpdateEmail={updateEmail}
                    onDelete={(id) => {
                        if (activeFolder === FolderType.TRASH) {
                            deleteForever(id, displayEmails);
                        } else {
                            moveToTrash(id, displayEmails);
                        }
                    }}
                    onRestore={restore}
                    onDeleteForever={(id) => deleteForever(id, displayEmails)}
                    onSnooze={(id, date) => snoozeEmail(id, date, displayEmails)}
                />
             </>
         ) : (
             <>
                <ContactList 
                    contacts={contacts}
                    selectedContactId={selectedContactId}
                    onSelectContact={setSelectedContactId}
                    onAddContact={addContact}
                />
                <ContactDetail 
                    contact={selectedContact}
                    onUpdate={updateContact}
                    onDelete={deleteContact}
                    onCompose={(email) => handleComposeOpen({ to: email })}
                />
             </>
         )}
      </div>

      <ComposeModal 
        state={composeState} 
        onClose={() => setComposeState(prev => ({ ...prev, isOpen: false }))} 
        onSend={handleComposeSend}
        isSending={isSending}
      />
      
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)}
        actions={paletteActions}
        hasSelection={!!selectedEmailId}
      />

      {isSyncing && (
        <div className="absolute top-4 right-4 z-50 bg-card border border-border px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-lg animate-in slide-in-from-top-2">
            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs font-medium">Syncing Gmail...</span>
        </div>
      )}
      
      {!composeState.isOpen && !isPaletteOpen && (
          <div className="fixed bottom-4 right-4 text-muted-foreground text-xs flex space-x-3 pointer-events-none select-none">
              <div className="flex items-center space-x-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-foreground">j</kbd> <span>next</span></div>
              <div className="flex items-center space-x-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-foreground">k</kbd> <span>prev</span></div>
              <div className="flex items-center space-x-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-foreground">d</kbd> <span>delete</span></div>
              <div className="flex items-center space-x-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-foreground">cmd+k</kbd> <span>search</span></div>
          </div>
      )}
    </div>
  );
};

// Main App Wrapper with Providers
function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;