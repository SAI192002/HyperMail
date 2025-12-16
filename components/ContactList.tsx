import React, { useState } from 'react';
import { Contact } from '../types';
import { Search, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ContactListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  onAddContact: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ContactList: React.FC<ContactListProps> = ({ contacts, selectedContactId, onSelectContact, onAddContact }) => {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c => {
    const s = search.toLowerCase();
    // Safety check: ensure properties exist before calling toLowerCase
    return (
        (c.name && c.name.toLowerCase().includes(s)) || 
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.company && c.company.toLowerCase().includes(s))
    );
  });

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-border bg-background/50 flex flex-col">
       {/* Sticky Header */}
       <div className="flex flex-col border-b border-border bg-background/95 backdrop-blur z-10 sticky top-0 shrink-0">
            <div className="flex items-center justify-between px-4 py-3 h-14">
                <h2 className="font-semibold text-sm">Contacts</h2>
                <button 
                    onClick={onAddContact}
                    className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="px-4 pb-3">
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search people..."
                        className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
                    />
                </div>
            </div>
        </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {contacts.length === 0 ? (
             <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm p-6 text-center">
                <p>No contacts yet.</p>
                <button onClick={onAddContact} className="mt-2 text-primary hover:underline text-xs">Create your first contact</button>
            </div>
        ) : filteredContacts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No matches found.
            </div>
        ) : (
            <div className="flex flex-col p-2 space-y-1">
                {filteredContacts.map((contact) => {
                const isSelected = selectedContactId === contact.id;

                return (
                    <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact.id)}
                    className={cn(
                        "flex items-center space-x-3 px-3 py-2 cursor-pointer rounded-lg transition-all duration-200 border border-transparent group",
                        isSelected 
                            ? "bg-accent text-accent-foreground shadow-sm border-border/50" 
                            : "hover:bg-muted/50 text-card-foreground"
                    )}
                    >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0", contact.avatarColor)}>
                            {contact.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline">
                                <span className={cn(
                                    "text-sm truncate font-medium",
                                    isSelected ? "text-foreground" : "text-foreground"
                                )}>
                                    {contact.name}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <p className={cn(
                                    "text-xs truncate",
                                    isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                                )}>
                                    {contact.email}
                                </p>
                            </div>
                        </div>
                    </div>
                );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default ContactList;
