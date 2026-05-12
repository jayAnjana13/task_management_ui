'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/stores/authStore';
import { Message } from '@/types';
import { cn, formatRelativeTime, getFullName } from '@/lib/utils';
import { Avatar, Button, Input } from '@/components/ui';
import { Send, Reply, Edit2, Trash2, X } from 'lucide-react';

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
      className={cn(
        'group flex gap-3',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
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
            isOwn
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-900'
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

interface ChatUIProps {
  projectId: string;
}

export function ChatUI({ projectId }: ChatUIProps) {
  const { user } = useAuthStore();
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const handleInitialMessages = (msgs: Message[]) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    };

    const handleNewMessage = (message: Message) => {
      if (message.recipientId) {
        return;
      }

      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.recipientId) {
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleUserTyping = ({ userId, firstName, lastName, recipientId }: any) => {
      if (userId !== user?.id && !recipientId) {
        typingUsersByIdRef.current[userId] = `${firstName} ${lastName}`.trim();
        setTypingUsers(Object.values(typingUsersByIdRef.current));
      }
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
    socketService.on('initial-messages', handleInitialMessages);
    socketService.on('new-message', handleNewMessage);
    socketService.on('message-updated', handleMessageUpdated);
    socketService.on('message-deleted', handleMessageDeleted);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-stopped-typing', handleUserStoppedTyping);

    socketService.joinProject(projectId);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingUsersByIdRef.current = {};
      setTypingUsers([]);
      socketService.leaveProject(projectId);
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('initial-messages', handleInitialMessages);
      socketService.off('new-message', handleNewMessage);
      socketService.off('message-updated', handleMessageUpdated);
      socketService.off('message-deleted', handleMessageDeleted);
      socketService.off('user-typing', handleUserTyping);
      socketService.off('user-stopped-typing', handleUserStoppedTyping);
    };
  }, [projectId, user?.id, scrollToBottom]);

  const handleTyping = useCallback(() => {
    socketService.startTyping(projectId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(projectId);
    }, 2000);
  }, [projectId]);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;

    if (editingMessage) {
      socketService.editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      socketService.sendMessage(projectId, content, replyTo?.id);
      setReplyTo(null);
    }

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, editingMessage, projectId, replyTo?.id]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
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

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h3 className="font-semibold text-slate-900">Project Chat</h3>
          <p className="text-xs text-slate-500">
            {isConnected ? (
              <span className="text-green-600">Connected</span>
            ) : (
              <span className="text-red-600">Disconnected</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500">No messages yet. Start the conversation!</p>
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
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
