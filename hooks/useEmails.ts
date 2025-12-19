import { useState, useEffect, useCallback } from 'react';
import { Email, FolderType, User } from '../types';
import { syncGmailToSupabase, trashMessage, untrashMessage, deleteMessage, updateEmailMetadata, deleteEmailRecord } from '../services/gmailSyncService';
import { MOCK_EMAILS } from '../constants';
import { useToast } from '../contexts/ToastContext';

export const useEmails = (user: User | null, activeFolder: FolderType) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();

  // Initial Sync / Mock Data
  useEffect(() => {
    if (user?.accessToken) {
        sync();
    } else if (user?.email === 'elon@tesla.com') {
         setEmails(MOCK_EMAILS);
    } else {
        setEmails([]);
    }
  }, [user]);

  // Periodic Check: Wake up Snoozed Emails & Auto-Clear Trash
  useEffect(() => {
    if (!emails.length) return;

    const intervalId = setInterval(() => {
        const now = new Date();
        const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);

        // 1. Wake up Snoozed
        const snoozed = emails.filter(e => e.folder === 'snoozed' && e.snoozeUntil);
        snoozed.forEach(async (email) => {
            if (new Date(email.snoozeUntil!) <= now) {
                // Wake up!
                console.log(`Waking up email: ${email.subject}`);
                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, folder: 'inbox', snoozeUntil: undefined } : e));
                addToast(`Snoozed email "${email.subject}" returned to Inbox`, "info");
                
                // Clear snooze in DB
                if (user?.id) {
                    await updateEmailMetadata(user.id, email.id, { snoozeUntil: null });
                }
            }
        });

        // 2. Auto-Clear Trash
        if (user?.accessToken) {
            const oldTrash = emails.filter(e => e.folder === 'trash' && new Date(e.date).getTime() < oneDayAgo);
            if (oldTrash.length > 0) {
                console.log(`Auto-clearing ${oldTrash.length} old trash emails...`);
                oldTrash.forEach(async (email) => {
                    const success = await deleteMessage(user.accessToken!, email.id);
                    if (success) {
                        setEmails(prev => prev.filter(e => e.id !== email.id));
                        if (user?.id) await deleteEmailRecord(user.id, email.id);
                    }
                });
            }
        }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [emails, user?.accessToken, user?.id, addToast]);

  const sync = useCallback(async () => {
    if (!user?.accessToken || !user?.email) return;
    setIsSyncing(true);
    
    const result = await syncGmailToSupabase(user.accessToken, user.email, user.id, user.name);
    
    if (result.success && result.emails.length > 0) {
        setEmails(prev => {
            // Preserve local overrides if needed, though sync result is now the source of truth
            return result.emails;
        });
    } else if (result.error && result.error.status === 401) {
        addToast("Session expired. Please login again.", "error");
    }
    
    setIsSyncing(false);
  }, [user, addToast]);

  const updateEmail = (id: string, updates: Partial<Email>) => {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const selectEmail = (id: string | null) => {
      setSelectedEmailId(id);
      if (id) {
          updateEmail(id, { isRead: true });
      }
  };

  // Helper to select next email after an action
  const selectNextEmail = (currentId: string, currentList: Email[]) => {
      const currentIndex = currentList.findIndex(e => e.id === currentId);
      const nextEmail = currentList[currentIndex + 1] || currentList[currentIndex - 1];
      setSelectedEmailId(nextEmail ? nextEmail.id : null);
  };

  const snoozeEmail = async (id: string, until: Date, currentViewEmails: Email[]) => {
      selectNextEmail(id, currentViewEmails);
      
      const isoDate = until.toISOString();
      updateEmail(id, { folder: 'snoozed', snoozeUntil: isoDate });
      
      addToast(`Snoozed until ${until.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, "success");

      if (user?.id) {
          await updateEmailMetadata(user.id, id, { snoozeUntil: isoDate });
      }
  };

  const moveToTrash = async (id: string, currentViewEmails: Email[]) => {
      selectNextEmail(id, currentViewEmails);
      updateEmail(id, { folder: 'trash' });
      
      addToast("Moved to Trash", "info");

      if (user?.accessToken) {
          const success = await trashMessage(user.accessToken, id);
          if (!success) {
              addToast("Gmail Trash failed. Check permissions.", "error");
          }
      }
  };

  const archive = (id: string, currentViewEmails: Email[]) => {
      selectNextEmail(id, currentViewEmails);
      updateEmail(id, { folder: 'archive' });
      addToast("Archived", "success");
  };

  const restore = async (id: string) => {
      updateEmail(id, { folder: 'inbox', snoozeUntil: undefined });
      addToast("Restored to Inbox", "success");
      
      if (user?.accessToken) {
          await untrashMessage(user.accessToken, id);
      }
      if (user?.id) {
          await updateEmailMetadata(user.id, id, { snoozeUntil: null });
      }
  };

  const deleteForever = async (id: string, currentViewEmails: Email[]) => {
      selectNextEmail(id, currentViewEmails);
      // Optimistic removal
      const originalEmails = [...emails];
      setEmails(prev => prev.filter(e => e.id !== id));
      addToast("Permanently Deleted from Gmail", "info");
      
      if (user?.accessToken) {
          const success = await deleteMessage(user.accessToken, id);
          if (success) {
              if (user?.id) await deleteEmailRecord(user.id, id);
          } else {
              // Rollback or alert on failure
              setEmails(originalEmails);
              addToast("Permanent delete failed. You might need to Re-login for permission.", "error");
          }
      } else {
          // Fallback for demo mode
          if (user?.id) await deleteEmailRecord(user.id, id);
      }
  };

  const emptyTrash = async () => {
      const trashEmails = emails.filter(e => e.folder === 'trash');
      if (trashEmails.length === 0) return;

      setEmails(prev => prev.filter(e => e.folder !== 'trash'));
      setSelectedEmailId(null);
      addToast("Trash Emptied", "success");

      if (user?.accessToken) {
          for (const email of trashEmails) {
              const success = await deleteMessage(user.accessToken, email.id);
              if (success && user?.id) {
                  await deleteEmailRecord(user.id, email.id);
              }
          }
      }
  };

  return {
    emails,
    selectedEmailId,
    isSyncing,
    sync,
    selectEmail,
    updateEmail,
    snoozeEmail,
    moveToTrash,
    archive,
    restore,
    deleteForever,
    emptyTrash,
    reset: () => {
        setEmails([]);
        setSelectedEmailId(null);
    }
  };
};