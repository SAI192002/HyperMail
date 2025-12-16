import React, { useState, useEffect } from 'react';
import { Contact, User } from '../types';
import { Mail, Briefcase, Save, Trash2, User as UserIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ContactDetailProps {
  contact: Contact | null;
  onUpdate: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCompose: (email: string) => void;
  isEditingNew?: boolean;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onUpdate, onDelete, onCompose, isEditingNew }) => {
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contact) {
        setFormData(contact);
    } else {
        setFormData({});
    }
    setIsDirty(false);
  }, [contact]);

  const handleChange = (field: keyof Contact, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);
  };

  const handleSave = async () => {
      if (!contact || !contact.id) return;
      setIsSaving(true);
      await onUpdate(contact.id, formData);
      setIsSaving(false);
      setIsDirty(false);
  };

  const handleDelete = async () => {
      if (!contact || !window.confirm("Are you sure you want to delete this contact?")) return;
      await onDelete(contact.id);
  };

  if (!contact) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <UserIcon className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-medium">Select a contact</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-14 border-b border-border flex items-center justify-end px-6 bg-background/95 backdrop-blur">
         <div className="flex items-center space-x-2">
            {isDirty && (
                 <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-all"
                >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
            )}
             <button 
                onClick={handleDelete}
                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors" 
                title="Delete Contact"
            >
                <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-6 mb-10">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-medium shadow-lg", formData.avatarColor || 'bg-gray-500')}>
                    {formData.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                    <input 
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Full Name"
                        className="text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/50 w-full mb-1"
                    />
                    <div className="flex items-center text-muted-foreground space-x-2">
                        <Briefcase className="w-4 h-4" />
                        <input 
                            value={formData.company || ''}
                            onChange={(e) => handleChange('company', e.target.value)}
                            placeholder="Company"
                            className="bg-transparent outline-none placeholder:text-muted-foreground/50 w-full text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 mb-10">
                <button 
                    onClick={() => formData.email && onCompose(formData.email)}
                    className="flex-1 bg-muted/50 hover:bg-muted border border-border rounded-lg p-4 flex flex-col items-center justify-center transition-all group"
                >
                    <Mail className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Send Email</span>
                    <span className="text-xs text-muted-foreground mt-1">{formData.email}</span>
                </button>
                 <div className="flex-1 bg-muted/20 border border-border rounded-lg p-4 flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Last Contacted</div>
                    <div className="text-sm font-medium">{formData.lastContacted ? new Date(formData.lastContacted).toLocaleDateString() : 'Never'}</div>
                </div>
            </div>

            {/* Fields */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <input 
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                        placeholder="name@example.com"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role / Title</label>
                    <input 
                        value={formData.role || ''}
                        onChange={(e) => handleChange('role', e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                        placeholder="e.g. CEO, Developer"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private Notes</label>
                    <textarea 
                        value={formData.notes || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary transition-all min-h-[150px] resize-none"
                        placeholder="Add private notes about this contact..."
                    />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
