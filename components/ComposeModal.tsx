import React, { useState, useEffect, useRef } from 'react';
import { ComposeState } from '../types';
import { X, Sparkles, Send, Minimize2, Loader2 } from 'lucide-react';
import { generateDraftReply, improveWriting } from '../services/geminiService';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ComposeModalProps {
  state: ComposeState;
  onClose: () => void;
  onSend: (data: ComposeState) => void;
  isSending?: boolean;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ComposeModal: React.FC<ComposeModalProps> = ({ state, onClose, onSend, isSending = false }) => {
  const [to, setTo] = useState(state.to);
  const [subject, setSubject] = useState(state.subject);
  const [body, setBody] = useState(state.body);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  // Sync state with props when the modal opens or props change
  useEffect(() => {
    setTo(state.to);
    setSubject(state.subject);
    setBody(state.body);
  }, [state]);

  // Focus management
  useEffect(() => {
    if (state.isOpen) {
        // Small timeout to allow render/animation to start
        const timer = setTimeout(() => {
            if (state.to) {
                // If replying (To is set), focus body
                bodyRef.current?.focus();
                // Move cursor to end if body has content (like newlines)
                if (bodyRef.current) {
                    bodyRef.current.setSelectionRange(bodyRef.current.value.length, bodyRef.current.value.length);
                }
            } else {
                // New email, focus To
                toRef.current?.focus();
            }
        }, 50);
        return () => clearTimeout(timer);
    }
  }, [state.isOpen, state.to]);

  if (!state.isOpen) return null;

  const handleAiDraft = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    const result = await generateDraftReply(state.subject || "General Inquiry", aiPrompt);
    setBody(result); 
    setIsAiLoading(false);
    setShowAiInput(false);
    setAiPrompt('');
  };

  const handleAiImprove = async () => {
      if(!body) return;
      setIsAiLoading(true);
      const result = await improveWriting(body);
      setBody(result);
      setIsAiLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-background/80 backdrop-blur-sm p-4 duration-200 animate-in fade-in">
      <div className="bg-card w-full max-w-2xl h-[600px] rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">
                {state.to ? 'Reply' : 'New Message'}
            </h2>
            <div className="flex space-x-1 text-muted-foreground">
                <button className="p-1 hover:bg-muted hover:text-foreground rounded transition-colors"><Minimize2 className="w-4 h-4" /></button>
                <button onClick={onClose} className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"><X className="w-4 h-4" /></button>
            </div>
        </div>

        {/* Fields */}
        <div className="px-4 py-2 border-b border-border flex items-center group focus-within:bg-muted/20">
            <span className="text-muted-foreground text-sm w-16 font-medium">To</span>
            <input 
                ref={toRef}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent flex-1 text-foreground outline-none text-sm placeholder:text-muted-foreground/50 h-7"
                placeholder="Recipient"
                disabled={isSending}
            />
        </div>
        <div className="px-4 py-2 border-b border-border flex items-center group focus-within:bg-muted/20">
            <span className="text-muted-foreground text-sm w-16 font-medium">Subject</span>
            <input 
                 value={subject}
                 onChange={(e) => setSubject(e.target.value)}
                className="bg-transparent flex-1 text-foreground outline-none text-sm placeholder:text-muted-foreground/50 h-7"
                placeholder="Subject"
                disabled={isSending}
            />
        </div>

        {/* AI Toolbar */}
        <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center space-x-2">
            <button 
                onClick={() => setShowAiInput(!showAiInput)}
                disabled={isSending}
                className={cn(
                    "flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                    showAiInput 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-background text-foreground border-border hover:bg-muted"
                )}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Writer</span>
            </button>
            
            <button 
                onClick={handleAiImprove}
                disabled={!body || isAiLoading || isSending}
                className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
                <span>Fix Grammar</span>
            </button>
        </div>

        {/* AI Input Area */}
        {showAiInput && (
             <div className="px-4 py-3 bg-muted/30 border-b border-border animate-in slide-in-from-top-2">
                <div className="flex space-x-2">
                    <input 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., Ask politely for a refund..."
                        className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiDraft()}
                    />
                    <button 
                        onClick={handleAiDraft}
                        disabled={isAiLoading}
                        className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        {isAiLoading ? '...' : 'Generate'}
                    </button>
                </div>
            </div>
        )}

        {/* Body */}
        <textarea 
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 bg-transparent p-6 outline-none text-foreground resize-none font-sans leading-relaxed text-sm disabled:opacity-50"
            placeholder="Type your message..."
            disabled={isSending}
        />

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/10">
            <div className="text-xs text-muted-foreground flex space-x-2 items-center">
               <span className="hidden sm:inline">Press</span>
               <kbd className="font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground">⌘</kbd> 
               <span>+</span>
               <kbd className="font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground">Enter</kbd> 
               <span className="hidden sm:inline">to send</span>
            </div>
            <button 
                onClick={() => onSend({ ...state, to, subject, body })}
                disabled={isSending}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSending ? (
                     <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                     </>
                ) : (
                    <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5 ml-1" />
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;