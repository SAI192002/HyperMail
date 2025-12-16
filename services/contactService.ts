import { supabase } from './supabaseClient';
import { Contact, DBContactInsert, DBContact } from '../types';

/**
 * Generate a consistent avatar color
 */
const getAvatarColor = (str: string) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const fetchContacts = async (userId: string): Promise<Contact[]> => {
    if (!supabase) return [];

    // Cast to any to bypass strict typing issues where table might be inferred as 'never'
    const { data, error } = await (supabase.from('contacts') as any)
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching contacts:', error);
        return [];
    }

    if (!data) return [];

    // Explicitly cast data to DBContact[]
    const dbContacts = data as DBContact[];

    return dbContacts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company || undefined,
        role: c.role || undefined,
        notes: c.notes || undefined,
        lastContacted: c.updated_at || undefined,
        avatarColor: getAvatarColor(c.email)
    }));
};

export const createContact = async (userId: string, contact: Partial<Contact>): Promise<Contact | null> => {
    if (!supabase || !contact.email || !contact.name) return null;

    const insertPayload: DBContactInsert = {
        user_id: userId,
        name: contact.name,
        email: contact.email,
        company: contact.company || null,
        role: contact.role || null,
        notes: contact.notes || null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await (supabase.from('contacts') as any)
        .insert(insertPayload)
        .select()
        .single();

    if (error || !data) {
        console.error('Error creating contact:', error);
        return null;
    }

    const c = data as DBContact;

    return {
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company || undefined,
        role: c.role || undefined,
        notes: c.notes || undefined,
        lastContacted: c.updated_at || undefined,
        avatarColor: getAvatarColor(c.email)
    };
};

export const updateContact = async (contactId: string, updates: Partial<Contact>): Promise<boolean> => {
    if (!supabase) return false;

    const payload: any = {
        updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.company !== undefined) payload.company = updates.company;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await (supabase.from('contacts') as any)
        .update(payload)
        .eq('id', contactId);

    if (error) {
        console.error('Error updating contact:', error);
        return false;
    }
    return true;
};

export const deleteContact = async (contactId: string): Promise<boolean> => {
    if (!supabase) return false;

    const { error } = await (supabase.from('contacts') as any)
        .delete()
        .eq('id', contactId);

    if (error) {
        console.error('Error deleting contact:', error);
        return false;
    }
    return true;
};
