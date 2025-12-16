import { useState, useEffect } from 'react';
import { Contact, User } from '../types';
import { fetchContacts, createContact, updateContact as updateContactService, deleteContact as deleteContactService } from '../services/contactService';
import { useToast } from '../contexts/ToastContext';

export const useContacts = (user: User | null) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
      if (user?.id) {
          fetch(user.id);
      } else {
          setContacts([]);
      }
  }, [user]);

  const fetch = async (userId: string) => {
      const fetched = await fetchContacts(userId);
      setContacts(fetched);
  };

  const addContact = async () => {
      if (!user?.id) return;
      const newContact = await createContact(user.id, {
          name: 'New Contact',
          email: '',
      });
      if (newContact) {
          setContacts(prev => [...prev, newContact]);
          setSelectedContactId(newContact.id);
          addToast("Contact created", "success");
      }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      await updateContactService(id, updates);
      addToast("Contact updated", "success");
  };

  const deleteContact = async (id: string) => {
      setContacts(prev => prev.filter(c => c.id !== id));
      if (selectedContactId === id) setSelectedContactId(null);
      await deleteContactService(id);
      addToast("Contact deleted", "info");
  };

  return {
    contacts,
    selectedContactId,
    setSelectedContactId,
    addContact,
    updateContact,
    deleteContact,
    reset: () => {
        setContacts([]);
        setSelectedContactId(null);
    }
  };
};
