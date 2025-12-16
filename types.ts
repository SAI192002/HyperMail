
export interface Email {
  id: string;
  threadId: string; // Gmail Thread ID
  messageIdHeader?: string; // RFC 822 Message-ID (for threading)
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string; // ISO string
  isRead: boolean;
  isStarred: boolean;
  avatarColor: string;
  folder?: string;
  intent?: 'Meeting' | 'Action' | 'FYI' | 'Newsletter' | 'Urgent' | 'Spam' | string;
  priority?: number;
  summary?: string;
  snoozeUntil?: string; // ISO date string for snooze functionality
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  avatarColor: string;
  notes?: string;
  lastContacted?: string;
}

export enum FolderType {
  INBOX = 'INBOX',
  STARRED = 'STARRED',
  SENT = 'SENT',
  DRAFTS = 'DRAFTS',
  DONE = 'DONE',
  TRASH = 'TRASH',
  SNOOZED = 'SNOOZED'
}

export type ViewMode = 'mail' | 'contacts';

export interface User {
  id?: string; // Google ID (sub)
  name: string;
  email: string;
  accessToken?: string; // OAuth Access Token for Gmail API
  refreshToken?: string; // OAuth Refresh Token
  expiresAt?: number; // Timestamp when access token expires
  clientId?: string; // Store for refreshing
  clientSecret?: string; // Store for refreshing (Saved locally only)
}

export type ComposeState = {
  isOpen: boolean;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  replyToMessageId?: string;
  isMinimizing?: boolean;
};

// --- DB / Sync Types ---

// Simplify Json to any to prevent strict type recursion issues during upsert
export type Json = any;

// Row Types (Strict - returned from DB)
export interface DBUserToken {
  id: string;
  google_id?: string | null;
  email: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  updated_at?: string | null;
}

export interface DBThread {
    id: string;
    user_id: string;
    thread_id: string;
    subject?: string | null;
    updated_at?: string | null;
    message_count?: number | null;
    ai_summary?: string | null;
}

export interface DBEmail {
    id: string;
    user_id: string;
    thread_id: string;
    message_id: string;
    from_address?: string | null;
    subject?: string | null;
    snippet?: string | null;
    body?: string | null;
    received_at?: string | null;
    ai_summary?: string | null;
    is_read?: boolean | null;
    cc?: Json | null;
    raw_headers?: Json | null;
    folder?: string | null;
    intent?: string | null;
    priority_score?: number | null;
    snooze_until?: string | null;
}

export interface DBResponse {
    id: string;
    user_id: string;
    thread_id: string;
    message_id: string;
    to_address: string;
    subject: string;
    body: string;
    sent_at: string;
}

export interface DBProfile {
    id: string;
    email: string;
    name?: string | null;
    updated_at?: string | null;
}

export interface DBContact {
    id: string;
    user_id: string;
    name: string;
    email: string;
    company?: string | null;
    role?: string | null;
    notes?: string | null;
    updated_at?: string | null;
}

// Insert Types (Strictly defined for better type safety)
export interface DBUserTokenInsert {
  id?: string;
  google_id?: string | null;
  email: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  updated_at?: string | null;
}

export interface DBThreadInsert {
    id?: string;
    user_id: string;
    thread_id: string;
    subject?: string | null;
    updated_at?: string | null;
    message_count?: number | null;
    ai_summary?: string | null;
}

export interface DBEmailInsert {
    id?: string;
    user_id: string;
    thread_id: string;
    message_id: string;
    from_address?: string | null;
    subject?: string | null;
    snippet?: string | null;
    body?: string | null;
    received_at?: string | null;
    ai_summary?: string | null;
    is_read?: boolean | null;
    cc?: Json | null;
    raw_headers?: Json | null;
    folder?: string | null;
    intent?: string | null;
    priority_score?: number | null;
    snooze_until?: string | null;
}

export interface DBResponseInsert {
    id?: string;
    user_id: string;
    thread_id: string;
    message_id: string;
    to_address: string;
    subject: string;
    body: string;
    sent_at?: string;
}

export interface DBProfileInsert {
    id: string; // Required now, as we use Google ID as PK
    email: string;
    name?: string | null;
    updated_at?: string | null;
}

export interface DBContactInsert {
    id?: string;
    user_id: string;
    name: string;
    email: string;
    company?: string | null;
    role?: string | null;
    notes?: string | null;
    updated_at?: string | null;
}

export interface Database {
  public: {
    Tables: {
      emails: {
        Row: DBEmail
        Insert: DBEmailInsert
        Update: Partial<DBEmailInsert>
        Relationships: []
      }
      threads: {
        Row: DBThread
        Insert: DBThreadInsert
        Update: Partial<DBThreadInsert>
        Relationships: []
      }
      responses: {
        Row: DBResponse
        Insert: DBResponseInsert
        Update: Partial<DBResponseInsert>
        Relationships: []
      }
      user_tokens: {
        Row: DBUserToken
        Insert: DBUserTokenInsert
        Update: Partial<DBUserTokenInsert>
        Relationships: []
      }
      profiles: {
        Row: DBProfile
        Insert: DBProfileInsert
        Update: Partial<DBProfileInsert>
        Relationships: []
      }
      contacts: {
        Row: DBContact
        Insert: DBContactInsert
        Update: Partial<DBContactInsert>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// --- Gmail API Types ---

export interface GmailHeader {
    name: string;
    value: string;
}

export interface GmailMessagePart {
    mimeType: string;
    body?: {
        data?: string;
    };
    parts?: GmailMessagePart[];
}

export interface GmailMessagePayload {
    headers: GmailHeader[];
    body?: {
        data?: string;
    };
    parts?: GmailMessagePart[];
}

export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    historyId: string;
    internalDate: string;
    labelIds: string[];
    payload: GmailMessagePayload;
}
