'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Send, MessageSquare, CheckCheck } from 'lucide-react';

interface MessageUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;
  content: string;
  isRead: boolean;
  jobId: string | null;
  createdAt: string;
  sender: MessageUser;
  recipient: MessageUser | null;
}

interface Thread {
  partnerId: string;
  lastAt: string;
  unread: number;
  partnerName?: string;
  lastMessage?: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shouldShowTimestamp(prev: Message | null, curr: Message): boolean {
  if (!prev) return true;
  const prevTime = new Date(prev.createdAt).getTime();
  const currTime = new Date(curr.createdAt).getTime();
  return currTime - prevTime > 5 * 60 * 1000; // 5 minutes
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<MessageUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const [threadsRes, inboxRes, unreadRes] = await Promise.all([
        api.get<Thread[]>('/messages/threads'),
        api.get<{ messages: Message[]; total: number }>('/messages/inbox'),
        api.get<{ count: number }>('/messages/unread'),
      ]);

      const rawThreads = threadsRes.data;
      const inboxMessages = inboxRes.data.messages;

      // Enrich threads with partner names and last message
      const enriched: Thread[] = rawThreads.map((t) => {
        // Find the partner user from inbox messages
        let partnerName = 'Unknown';
        let lastMessage = '';

        for (const msg of inboxMessages) {
          if (msg.senderId === t.partnerId) {
            partnerName = `${msg.sender.firstName} ${msg.sender.lastName}`;
            if (!lastMessage) lastMessage = msg.content;
          } else if (msg.recipientId === t.partnerId) {
            if (msg.recipient) {
              partnerName = `${msg.recipient.firstName} ${msg.recipient.lastName}`;
            }
            if (!lastMessage) lastMessage = msg.content;
          }
        }

        return {
          ...t,
          partnerName,
          lastMessage: lastMessage.length > 60 ? lastMessage.slice(0, 60) + '...' : lastMessage,
          unread: Number(t.unread),
        };
      });

      setThreads(enriched);
      setUnreadCount(unreadRes.data.count);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchConversation = useCallback(async (partnerId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get<{ messages: Message[]; total: number }>(
        `/messages/conversation/${partnerId}`,
      );
      setMessages(res.data.messages);

      // Find partner info from messages
      const msgs = res.data.messages;
      if (msgs.length > 0) {
        for (const msg of msgs) {
          if (msg.senderId === partnerId && msg.sender) {
            setActivePartner(msg.sender);
            break;
          }
          if (msg.recipientId === partnerId && msg.recipient) {
            setActivePartner(msg.recipient);
            break;
          }
        }
      }

      // Mark all as read
      await api.patch('/messages/read-all');

      // Update thread unread counts
      setThreads((prev) =>
        prev.map((t) => (t.partnerId === partnerId ? { ...t, unread: 0 } : t)),
      );
      setUnreadCount((prev) => Math.max(0, prev - (threads.find((t) => t.partnerId === partnerId)?.unread ?? 0)));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [threads]);

  const handleSelectThread = useCallback(async (partnerId: string) => {
    setActivePartnerId(partnerId);
    await fetchConversation(partnerId);
  }, [fetchConversation]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activePartnerId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await api.post<Message>('/messages', {
        content,
        recipientId: activePartnerId,
      });
      setMessages((prev) => [...prev, res.data]);

      // Update thread last message
      setThreads((prev) =>
        prev.map((t) =>
          t.partnerId === activePartnerId
            ? { ...t, lastMessage: content.length > 60 ? content.slice(0, 60) + '...' : content, lastAt: new Date().toISOString() }
            : t,
        ),
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, activePartnerId, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Initial load + auto-refresh every 10s
  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  // Refresh conversation every 10s when active
  useEffect(() => {
    if (!activePartnerId) return;
    const interval = setInterval(() => fetchConversation(activePartnerId), 10000);
    return () => clearInterval(interval);
  }, [activePartnerId, fetchConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Messages"
        subtitle="Team communication"
        actions={
          unreadCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {unreadCount} unread
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: threads */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Conversations
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg p-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No conversations yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Messages sent to you will appear here
                </p>
              </div>
            ) : (
              <div className="py-1">
                {threads.map((thread) => {
                  const isActive = activePartnerId === thread.partnerId;
                  const initials = thread.partnerName
                    ? thread.partnerName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : '?';

                  return (
                    <button
                      key={thread.partnerId}
                      onClick={() => handleSelectThread(thread.partnerId)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-slate-50 ${
                        isActive ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                          {initials}
                        </div>
                        {thread.unread > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {thread.unread > 9 ? '9+' : thread.unread}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm truncate ${
                              thread.unread > 0
                                ? 'font-semibold text-slate-900'
                                : 'font-medium text-slate-700'
                            }`}
                          >
                            {thread.partnerName}
                          </p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                            {formatDate(thread.lastAt)}
                          </span>
                        </div>
                        {thread.lastMessage && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {thread.lastMessage}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: conversation */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {!activePartnerId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-base font-semibold text-slate-700">Select a conversation</p>
                <p className="text-sm text-slate-400 mt-1">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
                {activePartner ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                      {`${activePartner.firstName[0]}${activePartner.lastName[0]}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {activePartner.firstName} {activePartner.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{activePartner.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <p className="text-sm text-slate-400">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showTimestamp = shouldShowTimestamp(prev, msg);

                    return (
                      <div key={msg.id}>
                        {showTimestamp && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                              {new Date(msg.createdAt).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Avatar (only for other person) */}
                          {!isMe && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1">
                              {msg.sender
                                ? `${msg.sender.firstName[0]}${msg.sender.lastName[0]}`.toUpperCase()
                                : '?'}
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
                            }`}
                          >
                            {msg.content}
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isMe ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <span
                                className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}
                              >
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && msg.isRead && (
                                <CheckCheck className="w-3 h-3 text-blue-200" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="px-6 py-4 bg-white border-t border-slate-200">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900
                      placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      bg-slate-50 max-h-32 overflow-y-auto"
                    style={{ lineHeight: '1.5' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center
                      hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
