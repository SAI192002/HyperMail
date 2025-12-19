import { supabase } from './supabaseClient';
import { 
    DBEmailInsert, 
    DBThreadInsert, 
    DBUserTokenInsert, 
    DBProfileInsert,
    DBResponseInsert,
    DBContactInsert,
    GmailMessage, 
    GmailHeader, 
    Email, 
    Json 
} from '../types';

/**
 * Decodes base64url strings from Gmail API
 */
const decodeBase64 = (data: string) => {
    if (!data) return '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
        atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
};

/**
 * Recursively extracts body content from message parts
 */
const extractBody = (payload: any): string => {
    let html = '';
    let text = '';

    if (!payload) return '';

    // If simple plain text or html
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        text = decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
        html = decodeBase64(payload.body.data);
    }

    // If multipart, recurse
    if (payload.parts) {
        for (const part of payload.parts) {
            const content = extractBody(part);
            // Heuristic: Prefer HTML if available in parts, otherwise text
            if (part.mimeType === 'text/html') html += content;
            else if (part.mimeType === 'text/plain') text += content;
            else if (!html && !text) text += content; // Nested multipart
        }
    }

    return html || text;
};

/**
 * Parse "From" header
 */
const parseFromHeader = (value: string) => {
    const match = value.match(/(.*)<(.*)>/);
    if (match) {
        return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
    }
    return { name: value, email: value };
};

/**
 * Generate a consistent avatar color based on string
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

/**
 * Determine Folder from Labels
 */
const getFolderFromLabels = (labelIds: string[]): string => {
    if (labelIds.includes('TRASH')) return 'trash';
    if (labelIds.includes('DRAFT')) return 'drafts';
    if (labelIds.includes('SENT')) return 'sent';
    if (labelIds.includes('INBOX')) return 'inbox';
    if (labelIds.includes('SPAM')) return 'spam';
    return 'archive'; // Default if not in inbox/sent/trash/drafts
};

/**
 * Parse headers into JSON
 */
const parseHeaders = (headers: GmailHeader[]): Json => {
    const obj: Record<string, string> = {};
    headers.forEach(h => {
        obj[h.name] = h.value;
    });
    return obj;
};

/**
 * Convert Gmail API message to frontend Email type
 */
const convertToEmail = (msg: GmailMessage): Email => {
    const headers = msg.payload.headers;
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    const subject = getHeader('Subject') || '(No Subject)';
    const fromRaw = getHeader('From');
    const { name, email: fromEmailAddr } = parseFromHeader(fromRaw);
    const messageIdHeader = getHeader('Message-ID');
    
    const isRead = !msg.labelIds.includes('UNREAD');
    const isStarred = msg.labelIds.includes('STARRED');
    const body = extractBody(msg.payload);
    const date = new Date(parseInt(msg.internalDate)).toISOString();
    const folder = getFolderFromLabels(msg.labelIds);
    const snippet = msg.snippet || body.replace(/<[^>]*>?/gm, '').substring(0, 100);

    return {
        id: msg.id,
        threadId: msg.threadId,
        messageIdHeader: messageIdHeader,
        fromName: name || fromEmailAddr,
        fromEmail: fromEmailAddr,
        subject: subject,
        preview: snippet,
        body: body,
        date: date,
        isRead: isRead,
        isStarred: isStarred,
        avatarColor: getAvatarColor(fromEmailAddr),
        folder: folder
    };
};

/**
 * Save User Token to Supabase
 */
export const saveUserToken = async (
    email: string, 
    accessToken: string, 
    googleId?: string, 
    refreshToken?: string,
    expiresAt?: number
) => {
    if (!supabase || !googleId) return;
    
    // Cast to any to bypass strict typing issues
    const { data: profile } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('id', googleId)
        .maybeSingle();

    if (!profile) {
        await (supabase.from('profiles') as any).insert({
            id: googleId,
            email: email,
            name: email.split('@')[0] 
        });
    }

    const tokenData: any = {
        email,
        access_token: accessToken,
        updated_at: new Date().toISOString(),
        google_id: googleId
    };

    if (refreshToken) {
        tokenData.refresh_token = refreshToken;
    }
    
    if (expiresAt) {
        tokenData.expires_at = expiresAt;
    }

    const { error } = await (supabase.from('user_tokens') as any)
        .upsert(tokenData, { onConflict: 'email' });

    if (error) console.error("Error saving user token:", error);
};

/**
 * Restore User Session from Supabase
 */
export const restoreUserSession = async (email: string) => {
    if (!supabase) return null;
    
    const { data, error } = await (supabase.from('user_tokens') as any)
        .select('access_token, refresh_token, expires_at')
        .eq('email', email)
        .maybeSingle();
        
    if (error || !data) {
        return null;
    }
    
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at
    };
};

/**
 * Fetch a full thread (conversation)
 */
export const fetchThread = async (accessToken: string, threadId: string): Promise<Email[]> => {
    try {
        const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            console.error("Failed to fetch thread", res.statusText);
            return [];
        }

        const data = await res.json();
        // The messages in a thread are usually chronological
        const messages: GmailMessage[] = data.messages || [];
        
        return messages.map(msg => convertToEmail(msg));
    } catch (e) {
        console.error("Error fetching thread:", e);
        return [];
    }
};

/**
 * Send an email via Gmail API
 * Supports Reply if threadId and inReplyTo are provided
 * Logs the sent message to Supabase 'responses' table
 */
export const sendGmailMessage = async (
    accessToken: string, 
    userId: string,
    to: string, 
    subject: string, 
    body: string, 
    threadId?: string, 
    inReplyTo?: string
) => {
    // Construct the MIME message
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    
    let messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
    ];

    // If Replying, add specific headers
    if (threadId && inReplyTo) {
        messageParts.push(`In-Reply-To: ${inReplyTo}`);
        messageParts.push(`References: ${inReplyTo}`); // Ideally this should be the full chain, but parent ID is minimal requirement
    }

    messageParts.push(''); // Empty line before body
    messageParts.push(body);

    const message = messageParts.join('\r\n');

    // Base64URL encode the message
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const payload: any = {
        raw: encodedMessage
    };

    // If replying, payload must include threadId to group it in UI
    if (threadId) {
        payload.threadId = threadId;
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        const error = new Error(`Gmail API Error: ${err.error?.message || res.statusText}`);
        (error as any).status = res.status;
        throw error;
    }

    const result = await res.json();

    // Log response to Supabase
    if (supabase && userId) {
        try {
            const dbResponse: DBResponseInsert = {
                user_id: userId,
                message_id: result.id,
                thread_id: result.threadId,
                to_address: to,
                subject: subject,
                body: body,
                sent_at: new Date().toISOString()
            };

            await (supabase.from('responses') as any).insert(dbResponse);
        } catch (dbErr) {
            console.error("Failed to log response to Supabase:", dbErr);
            // Don't throw here, as the email was successfully sent
        }
    }

    return result;
};

/**
 * Trash a message (Move to Trash)
 */
export const trashMessage = async (accessToken: string, messageId: string) => {
    try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return res.ok;
    } catch (e) {
        console.error("Error trashing message:", e);
        return false;
    }
};

/**
 * Untrash a message (Restore from Trash)
 */
export const untrashMessage = async (accessToken: string, messageId: string) => {
    try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return res.ok;
    } catch (e) {
        console.error("Error untrashing message:", e);
        return false;
    }
};

/**
 * Permanently Delete a message
 */
export const deleteMessage = async (accessToken: string, messageId: string) => {
    try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return res.ok;
    } catch (e) {
        console.error("Error deleting message:", e);
        return false;
    }
};

/**
 * Delete message record from Supabase
 */
export const deleteEmailRecord = async (userId: string, messageId: string) => {
    if (!supabase) return;
    const { error } = await (supabase.from('emails') as any)
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId);
    if (error) console.error("Error deleting email record:", error);
};

/**
 * Update AI Metadata (Summary, Intent, Priority, Snooze) in Supabase
 */
export const updateEmailMetadata = async (
    userId: string,
    messageId: string,
    metadata: { summary?: string; intent?: string; priority?: number; snoozeUntil?: string | null }
) => {
    if (!supabase) return;

    // Use any to allow partial updates without strict type checking issues with 'never'
    const updatePayload: any = {};
    if (metadata.summary !== undefined) updatePayload.ai_summary = metadata.summary;
    if (metadata.intent !== undefined) updatePayload.intent = metadata.intent;
    if (metadata.priority !== undefined) updatePayload.priority_score = metadata.priority;
    if (metadata.snoozeUntil !== undefined) updatePayload.snooze_until = metadata.snoozeUntil;

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await (supabase.from('emails') as any)
        .update(updatePayload)
        .eq('user_id', userId)
        .eq('message_id', messageId);
        
    if (error) {
        console.error("Error updating email metadata:", error);
    }
};

interface SyncResult {
    success: boolean;
    emails: Email[]; 
    error?: any;
}

/**
 * Main Sync Function
 */
export const syncGmailToSupabase = async (accessToken: string, email: string, googleId?: string, userName?: string): Promise<SyncResult> => {
    try {
        console.log(`Syncing for ${email}...`);
        
        // 1. Fetch Messages from Gmail
        const listRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30', // Reduced to 30 for AI speed
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!listRes.ok) {
            const error = new Error(`Gmail List API Error: ${listRes.statusText}`);
            (error as any).status = listRes.status;
            throw error;
        }

        const listData = await listRes.json();
        const messagesSummary = listData.messages || [];

        if (messagesSummary.length === 0) return { success: true, emails: [] };

        // 2. Fetch Details
        const detailPromises = messagesSummary.map(async (m: any) => {
            const res = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return res.ok ? res.json() : null;
        });

        const rawMessages = (await Promise.all(detailPromises)).filter(m => m !== null) as GmailMessage[];

        // 3. Transform to Frontend Email Type
        const frontendEmails: Email[] = rawMessages.map(convertToEmail);
        
        // 4. Async: Save to Supabase AND Fetch Metadata
        if (supabase && googleId) {
             // A. Ensure Profile Exists
             const profilePayload: any = {
                id: googleId,
                email: email,
                name: userName || email.split('@')[0],
                updated_at: new Date().toISOString()
            };

            await (supabase.from('profiles') as any).upsert(profilePayload);
            // Access token saving is handled by the caller or specialized auth flows now, 
            // but we can update updated_at if needed. 
            // We do NOT save the token here to avoid overwriting expiry info with just current time
            // However, we DO want to ensure the link exists.
            
            // B. Auto-Save Contacts
            (async () => {
                try {
                    const uniqueContacts = new Map<string, string>(); // email -> name
                    
                    frontendEmails.forEach(e => {
                         // Don't add yourself as a contact and ignore "no-reply"
                         const eLow = e.fromEmail.toLowerCase();
                         if (eLow !== email.toLowerCase() && !eLow.includes('no-reply') && eLow !== 'me') {
                             uniqueContacts.set(e.fromEmail, e.fromName);
                         }
                    });
            
                    if (uniqueContacts.size > 0) {
                        // Check which contacts already exist to avoid creating duplicates
                        const emailsToCheck = Array.from(uniqueContacts.keys());
                        
                        // Use casting to bypass strict table typing if needed
                        const { data: existing } = await (supabase.from('contacts') as any)
                            .select('email')
                            .eq('user_id', googleId)
                            .in('email', emailsToCheck);
                            
                        const existingEmails = new Set<string>(existing?.map((c: any) => c.email) || []);
                        
                        const newContacts: DBContactInsert[] = [];
                        uniqueContacts.forEach((name, contactEmail) => {
                            if (!existingEmails.has(contactEmail)) {
                                newContacts.push({
                                    user_id: googleId,
                                    name: name,
                                    email: contactEmail,
                                    updated_at: new Date().toISOString()
                                });
                            }
                        });
            
                        if (newContacts.length > 0) {
                            await (supabase.from('contacts') as any).insert(newContacts);
                            console.log(`Auto-created ${newContacts.length} new contacts`);
                        }
                    }
                } catch (contactErr) {
                    console.error("Auto-save contacts error:", contactErr);
                }
            })();

            // C. Fetch existing AI metadata and Snooze data from Supabase to populate the UI (Persistence)
            const messageIds = frontendEmails.map(e => e.id);
            const { data: dbMetadata } = await (supabase.from('emails') as any)
                .select('message_id, ai_summary, intent, priority_score, snooze_until')
                .eq('user_id', googleId)
                .in('message_id', messageIds);
                
            if (dbMetadata) {
                const metaMap = new Map(dbMetadata.map((m: any) => [m.message_id, m]));
                frontendEmails.forEach(email => {
                    const meta = metaMap.get(email.id) as any;
                    if (meta) {
                        if (meta.intent) email.intent = meta.intent;
                        if (meta.priority_score) email.priority = meta.priority_score;
                        if (meta.ai_summary) email.summary = meta.ai_summary;
                        
                        // Handle Snooze Persistence
                        if (meta.snooze_until) {
                             const snoozeDate = new Date(meta.snooze_until);
                             if (snoozeDate > new Date()) {
                                 email.snoozeUntil = meta.snooze_until;
                                 email.folder = 'snoozed';
                             }
                        }
                    }
                });
            }

            // D. Save Threads & Emails (Background)
            (async () => {
                const dbEmails: DBEmailInsert[] = [];
                const threadsMap = new Map<string, DBThreadInsert>();

                for (const msg of rawMessages) {
                    const headers = msg.payload.headers;
                    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
                    const from = getHeader('From');
                    const subject = getHeader('Subject');
                    const cc = getHeader('Cc');
                    const isRead = !msg.labelIds.includes('UNREAD');
                    const folder = getFolderFromLabels(msg.labelIds);
                    const body = extractBody(msg.payload);
                    const receivedAt = new Date(parseInt(msg.internalDate)).toISOString();

                    // Explicit casting for Json fields
                    const ccJson = cc ? { value: cc } : null;

                    // IMPORTANT: We do NOT set ai_summary, intent, or priority_score here.
                    // Supabase 'upsert' will only update the fields we provide. 
                    // This preserves existing AI tags in the DB when syncing fresh Gmail content.
                    dbEmails.push({
                        user_id: googleId, 
                        thread_id: msg.threadId,
                        message_id: msg.id,
                        from_address: from,
                        subject: subject,
                        snippet: msg.snippet,
                        body: body,
                        received_at: receivedAt,
                        is_read: isRead,
                        folder: folder,
                        cc: ccJson,
                        raw_headers: parseHeaders(headers),
                        // Explicitly omitted to preserve DB values:
                        // ai_summary, intent, priority_score, snooze_until
                    });

                    if (!threadsMap.has(msg.threadId)) {
                        threadsMap.set(msg.threadId, {
                            user_id: googleId,
                            thread_id: msg.threadId,
                            subject: subject,
                            updated_at: receivedAt,
                            message_count: 1
                            // ai_summary: null // Preserved
                        });
                    } else {
                        const existing = threadsMap.get(msg.threadId)!;
                        if (existing.updated_at && receivedAt > existing.updated_at) {
                            existing.updated_at = receivedAt;
                            existing.subject = subject;
                        }
                        existing.message_count = (existing.message_count || 0) + 1;
                    }
                }

                const { error: threadError } = await (supabase.from('threads') as any).upsert(Array.from(threadsMap.values()), { onConflict: 'thread_id' });
                if (threadError) console.error("Thread upsert error:", threadError);

                // This upsert only updates content/folder status, leaving metadata intact
                const { error: emailError } = await (supabase.from('emails') as any).upsert(dbEmails, { onConflict: 'message_id' });
                if (emailError) console.error("Email upsert error:", emailError);
            })();
        }

        return { success: true, emails: frontendEmails };

    } catch (error) {
        console.error("Sync Failed:", error);
        return { success: false, emails: [], error };
    }
};