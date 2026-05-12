'use client';

import { useEffect, useState, useCallback, useRef, memo, KeyboardEvent } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout';
import { projectService } from '@/services/projectService';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { cn, formatRelativeTime, getFullName } from '@/lib/utils';
import { Message, Project, ProjectMember } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  LoadingSpinner,
  Alert,
  Avatar,
  Button,
  Input,
} from '@/components/ui';
import { Send, Reply, Edit2, Trash2, X, MessageSquare, ArrowRight } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReply: (message: Message) => void;
}

const ChatMessage = memo(function ChatMessage({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReply,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn('group flex gap-3', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar
        firstName={message.user?.firstName}
        lastName={message.user?.lastName}
        src={message.user?.avatarUrl}
        size="sm"
      />

      <div className={cn('max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {message.replyTo && (
          <div className="mb-1 ml-1 rounded border-l-2 border-slate-300 bg-slate-50 p-2 text-xs text-slate-600">
            <span className="font-medium">
              {message.replyTo.user
                ? getFullName(message.replyTo.user.firstName, message.replyTo.user.lastName)
                : 'User'}
            </span>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isOwn ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-900'
          )}
        >
          {!isOwn && (
            <p className="mb-1 text-xs font-medium opacity-75">
              {message.user
                ? getFullName(message.user.firstName, message.user.lastName)
                : 'User'}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{formatRelativeTime(message.createdAt)}</span>
          {message.isEdited && <span>(edited)</span>}
        </div>
      </div>

      {showActions && (
        <div className="flex items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onReply(message)}
            className="rounded p-1 hover:bg-slate-100"
            title="Reply"
          >
            <Reply className="h-4 w-4 text-slate-500" />
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="rounded p-1 hover:bg-slate-100"
                title="Edit"
              >
                <Edit2 className="h-4 w-4 text-slate-500" />
              </button>
              <button
                onClick={() => onDelete(message)}
                className="rounded p-1 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

interface PaginatedApiResponse<T> {
  data: T[];
}

interface ChatMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

function mapMember(member: ProjectMember): ChatMember {
  const user = member.user as any;
  return {
    id: member.userId || user?.id,
    firstName: user?.firstName || user?.first_name || '',
    lastName: user?.lastName || user?.last_name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || user?.avatar_url,
    role: member.role,
  };
}

function DirectChatPanel({ projectId }: { projectId: string }) {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingUsersByIdRef = useRef<Record<string, string>>({});
  const selectedMemberIdRef = useRef<string | null>(null);

  const selectedMember = members.find((member) => member.id === selectedMemberId) || null;

  const isDirectChatMessage = useCallback(
    (message: Message, memberId: string | null) => {
      if (!memberId || !user?.id || !message.recipientId) {
        return false;
      }

      const isIncoming = message.userId === memberId && message.recipientId === user.id;
      const isOutgoing = message.userId === user.id && message.recipientId === memberId;
      return isIncoming || isOutgoing;
    },
    [user?.id]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadDirectMessages = useCallback(
    async (memberId: string) => {
      try {
        const response = await api.get<PaginatedApiResponse<Message>>(
          `/chat/projects/${projectId}/direct/${memberId}/messages?limit=100`
        );
        setMessages(response.data.data || []);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Failed to load direct messages:', error);
        setMessages([]);
      }
    },
    [projectId, scrollToBottom]
  );

  useEffect(() => {
    selectedMemberIdRef.current = selectedMemberId;
  }, [selectedMemberId]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const projectMembers = await projectService.getProjectMembers(projectId);
        const chatMembers = projectMembers
          .map(mapMember)
          .filter((member) => member.id !== user?.id);
        setMembers(chatMembers);
        setSelectedMemberId(chatMembers[0]?.id || null);
      } catch (error) {
        console.error('Failed to load project members:', error);
        setMembers([]);
        setSelectedMemberId(null);
      }
    };

    fetchMembers();
  }, [projectId, user?.id]);

  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const handleNewMessage = (message: Message) => {
      if (!isDirectChatMessage(message, selectedMemberIdRef.current)) {
        return;
      }

      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };

    const handleMessageUpdated = (message: Message) => {
      if (!isDirectChatMessage(message, selectedMemberIdRef.current)) {
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleUserTyping = ({ userId, firstName, lastName, recipientId, projectId: typingProjectId }: any) => {
      if (userId === user?.id) return;

      const activeMemberId = selectedMemberIdRef.current;
      const isCurrentThread =
        recipientId === user?.id &&
        typingProjectId === projectId &&
        userId === activeMemberId;

      if (!isCurrentThread) {
        return;
      }

      typingUsersByIdRef.current[userId] = `${firstName} ${lastName}`.trim();
      setTypingUsers(Object.values(typingUsersByIdRef.current));
    };

    const handleUserStoppedTyping = ({ userId }: { userId: string }) => {
      if (!userId) return;
      delete typingUsersByIdRef.current[userId];
      setTypingUsers(Object.values(typingUsersByIdRef.current));
    };

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('new-message', handleNewMessage);
    socketService.on('message-updated', handleMessageUpdated);
    socketService.on('message-deleted', handleMessageDeleted);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-stopped-typing', handleUserStoppedTyping);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingUsersByIdRef.current = {};
      setTypingUsers([]);
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('new-message', handleNewMessage);
      socketService.off('message-updated', handleMessageUpdated);
      socketService.off('message-deleted', handleMessageDeleted);
      socketService.off('user-typing', handleUserTyping);
      socketService.off('user-stopped-typing', handleUserStoppedTyping);
    };
  }, [projectId, user?.id, scrollToBottom, isDirectChatMessage]);

  useEffect(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInputValue('');
    typingUsersByIdRef.current = {};
    setTypingUsers([]);

    if (selectedMemberId) {
      loadDirectMessages(selectedMemberId);
    } else {
      setMessages([]);
    }
  }, [selectedMemberId, loadDirectMessages]);

  const handleTyping = useCallback(() => {
    if (!selectedMemberId) {
      return;
    }

    socketService.startDirectTyping(projectId, selectedMemberId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopDirectTyping(projectId, selectedMemberId);
    }, 2000);
  }, [projectId, selectedMemberId]);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content || !selectedMemberId) return;

    if (editingMessage) {
      socketService.editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      socketService.sendDirectMessage(projectId, selectedMemberId, content, replyTo?.id);
      setReplyTo(null);
    }

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, editingMessage, projectId, selectedMemberId, replyTo?.id]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleCancel = useCallback(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInputValue('');
    inputRef.current?.focus();
  }, []);

  const handleEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setInputValue(message.content);
    setReplyTo(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(
    (message: Message) => {
      if (confirm('Are you sure you want to delete this message?')) {
        socketService.deleteMessage(message.id, projectId);
      }
    },
    [projectId]
  );

  const handleReply = useCallback((message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  }, []);

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-500">
          No other members available for direct chat in this project.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-260px)] rounded-lg border border-slate-200 bg-white">
      <div className="w-72 border-r border-slate-200">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Members</h3>
          <p className="text-xs text-slate-500">{members.length} available for direct chat</p>
        </div>

        <div className="h-[calc(100%-72px)] space-y-1 overflow-y-auto p-2">
          {members.map((member) => {
            const isSelected = selectedMemberId === member.id;

            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    firstName={member.firstName}
                    lastName={member.lastName}
                    src={member.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getFullName(member.firstName, member.lastName)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              {selectedMember
                ? `Chat with ${getFullName(selectedMember.firstName, selectedMember.lastName)}`
                : 'Individual Chat'}
            </h3>
            <p className="text-xs text-slate-500">
              {isConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-red-600">Disconnected</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-500">No messages yet. Start your direct conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.userId === user?.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReply={handleReply}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-xs text-slate-500">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {(replyTo || editingMessage) && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              {replyTo ? (
                <>
                  <Reply className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">
                    Replying to{' '}
                    <span className="font-medium">
                      {replyTo.user
                        ? getFullName(replyTo.user.firstName, replyTo.user.lastName)
                        : 'User'}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">Editing message</span>
                </>
              )}
            </div>
            <button onClick={handleCancel} className="rounded p-1 hover:bg-slate-200">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        )}

        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a direct message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!inputValue.trim() || !selectedMemberId}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndividualChatPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState<'group' | 'individual'>('group');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await projectService.getProjects({ limit: 100, sortBy: 'updated_at', sortOrder: 'DESC' });
        setProjects(result.data);
        setSelectedProjectId(result.data[0]?.id || '');
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chat</h1>
          <p className="mt-1 text-slate-600">Switch between group and individual chats from this page.</p>
        </div>

        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('group')}
              className={cn(
                'border-b-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'group'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              Group Chats
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={cn(
                'border-b-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'individual'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              Individual Chats
            </button>
          </nav>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-500">No projects found.</CardContent>
          </Card>
        ) : (
          activeTab === 'group' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {project.description || 'No description'}
                    </p>
                    <Link href={`/projects/${project.id}?tab=chat`}>
                      <Button className="w-full" leftIcon={<MessageSquare className="h-4 w-4" />}>
                        Open Group Chat
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    options={projects.map((project) => ({ value: project.id, label: project.name }))}
                  />
                </CardContent>
              </Card>

              {selectedProjectId ? (
                <DirectChatPanel projectId={selectedProjectId} />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-slate-500">
                    Select a project to start individual chat.
                  </CardContent>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
