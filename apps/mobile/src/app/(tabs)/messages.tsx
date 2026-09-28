import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api.service';
import { useAuthStore } from '../../store/auth.store';

interface Thread {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await apiClient.get<Thread[]>('/messages/threads');
      setThreads(res.data);
    } catch {
      // silently ignore
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      const res = await apiClient.get<Message[]>(`/messages/conversation/${partnerId}`);
      setMessages(res.data);
    } catch {
      // silently ignore
    }
  }, []);

  const openThread = useCallback(
    async (thread: Thread) => {
      setActiveThread(thread);
      setMessagesLoading(true);
      await fetchMessages(thread.partnerId);
      setMessagesLoading(false);
      try {
        await apiClient.patch('/messages/read-all', { partnerId: thread.partnerId });
        setThreads((prev) =>
          prev.map((t) => (t.partnerId === thread.partnerId ? { ...t, unreadCount: 0 } : t)),
        );
      } catch {
        // ignore
      }
    },
    [fetchMessages],
  );

  const sendMessage = async () => {
    if (!messageText.trim() || !activeThread) return;
    const content = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      await apiClient.post('/messages', { recipientId: activeThread.partnerId, content });
      await fetchMessages(activeThread.partnerId);
    } catch {
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activeThread) {
        fetchMessages(activeThread.partnerId);
      } else {
        fetchThreads();
      }
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeThread, fetchMessages, fetchThreads]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!activeThread) {
    return (
      <View style={styles.container}>
        {threadsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1D4ED8" />
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Messages from admins will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.partnerId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.threadCard}
                onPress={() => openThread(item)}
                activeOpacity={0.75}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.partnerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {item.partnerName}
                    </Text>
                    <Text style={styles.threadTime}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View style={styles.threadBottom}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.convHeader}>
        <TouchableOpacity
          onPress={() => {
            setActiveThread(null);
            setMessages([]);
            fetchThreads();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#1D4ED8" />
        </TouchableOpacity>
        <View style={styles.convHeaderInfo}>
          <Text style={styles.convHeaderName}>{activeThread.partnerName}</Text>
        </View>
      </View>

      {messagesLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
        >
          {messages.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emptySubtext}>No messages yet. Say hello!</Text>
            </View>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            return (
              <View
                key={msg.id}
                style={[styles.messageBubbleRow, isMine ? styles.myRow : styles.theirRow]}
              >
                <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  <Text style={isMine ? styles.myBubbleText : styles.theirBubbleText}>
                    {msg.content}
                  </Text>
                </View>
                <Text style={[styles.msgTime, isMine ? styles.msgTimeRight : styles.msgTimeLeft]}>
                  {formatTime(msg.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#6B7280', marginTop: 8 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  listContent: { padding: 16, gap: 10 },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  threadBody: { flex: 1 },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  threadTime: { fontSize: 12, color: '#9CA3AF' },
  threadBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13, color: '#6B7280', flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4, marginRight: 8 },
  convHeaderInfo: { flex: 1 },
  convHeaderName: { fontSize: 16, fontWeight: '700', color: '#111827' },

  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 12 },
  messageBubbleRow: { maxWidth: '80%' },
  myRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: '#1D4ED8', borderBottomRightRadius: 4 },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  myBubbleText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  theirBubbleText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  msgTimeRight: { textAlign: 'right' },
  msgTimeLeft: { textAlign: 'left' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
});
