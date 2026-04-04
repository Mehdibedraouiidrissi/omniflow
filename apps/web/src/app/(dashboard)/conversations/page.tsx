'use client';

import { useState } from 'react';
import {
  Mail, MessageSquare, Phone, Search, Send,
  User, ChevronDown, MoreHorizontal, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useApiQuery } from '@/hooks/use-api';

interface Message {
  id: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
  status: string;
}

interface ConversationItem {
  id: string;
  contactName: string;
  contactEmail: string;
  channel: string;
  status: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  assignee: string | null;
  messages: Message[];
}

const fallbackConversations: ConversationItem[] = [
  {
    id: '1', contactName: 'Sarah Johnson', contactEmail: 'sarah@acme.com', channel: 'EMAIL', status: 'OPEN',
    lastMessage: 'Thanks for the follow-up! I\'d love to schedule a demo this week.', updatedAt: new Date(Date.now() - 1800000).toISOString(),
    unreadCount: 2, assignee: 'John Doe',
    messages: [
      { id: 'm1', content: 'Hi Sarah, just following up on our conversation. Would you like to schedule a demo?', direction: 'OUTBOUND', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'DELIVERED' },
      { id: 'm2', content: 'Thanks for the follow-up! I\'d love to schedule a demo this week.', direction: 'INBOUND', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'READ' },
      { id: 'm3', content: 'Is Thursday at 2pm good for you?', direction: 'INBOUND', createdAt: new Date(Date.now() - 1800000).toISOString(), status: 'READ' },
    ],
  },
  {
    id: '2', contactName: 'Mike Chen', contactEmail: 'mike@startup.io', channel: 'SMS', status: 'OPEN',
    lastMessage: 'Can you send me the pricing details?', updatedAt: new Date(Date.now() - 5400000).toISOString(),
    unreadCount: 1, assignee: 'Jane Smith',
    messages: [
      { id: 'm4', content: 'Hey Mike! We have a special offer for startups this month.', direction: 'OUTBOUND', createdAt: new Date(Date.now() - 10800000).toISOString(), status: 'DELIVERED' },
      { id: 'm5', content: 'Can you send me the pricing details?', direction: 'INBOUND', createdAt: new Date(Date.now() - 5400000).toISOString(), status: 'READ' },
    ],
  },
  {
    id: '3', contactName: 'Lisa Park', contactEmail: 'lisa@enterprise.com', channel: 'WHATSAPP', status: 'OPEN',
    lastMessage: 'The proposal looks great, let\'s move forward.', updatedAt: new Date(Date.now() - 9000000).toISOString(),
    unreadCount: 0, assignee: 'John Doe',
    messages: [
      { id: 'm6', content: 'Hi Lisa, I\'ve attached the proposal as discussed.', direction: 'OUTBOUND', createdAt: new Date(Date.now() - 18000000).toISOString(), status: 'DELIVERED' },
      { id: 'm7', content: 'The proposal looks great, let\'s move forward.', direction: 'INBOUND', createdAt: new Date(Date.now() - 9000000).toISOString(), status: 'READ' },
    ],
  },
  {
    id: '4', contactName: 'Tom Wilson', contactEmail: 'tom@agency.co', channel: 'LIVE_CHAT', status: 'CLOSED',
    lastMessage: 'Perfect, talk to you next week then!', updatedAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0, assignee: null,
    messages: [
      { id: 'm8', content: 'Perfect, talk to you next week then!', direction: 'INBOUND', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'READ' },
    ],
  },
];

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'EMAIL': return <Mail className="h-3.5 w-3.5" />;
    case 'SMS': return <MessageSquare className="h-3.5 w-3.5" />;
    case 'WHATSAPP': return <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />;
    case 'LIVE_CHAT': return <MessageSquare className="h-3.5 w-3.5 text-blue-600" />;
    default: return <MessageSquare className="h-3.5 w-3.5" />;
  }
}

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: apiConversations } = useApiQuery<ConversationItem[]>(
    ['conversations'],
    '/conversations',
    { placeholderData: fallbackConversations },
  );

  const conversations = apiConversations || fallbackConversations;

  const filtered = conversations.filter((c) => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery && !c.contactName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-lg border">
      {/* Left Panel - Conversation List */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex h-9 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="LIVE_CHAT">Live Chat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={cn(
                'flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-muted/50',
                selectedId === conv.id && 'bg-muted',
              )}
            >
              <div className="relative">
                <UserAvatar name={conv.contactName} className="h-10 w-10" />
                {conv.unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm', conv.unreadCount > 0 && 'font-semibold')}>
                    {conv.contactName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(conv.updatedAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {getChannelIcon(conv.channel)}
                  <span className="text-xs text-muted-foreground">{conv.channel.replace('_', ' ')}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations found
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Conversation Thread */}
      {selected ? (
        <div className="flex flex-1 flex-col">
          {/* Conversation Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={selected.contactName} className="h-9 w-9" />
              <div>
                <p className="text-sm font-medium">{selected.contactName}</p>
                <p className="text-xs text-muted-foreground">{selected.contactEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={selected.status === 'OPEN' ? 'success' : 'secondary'}>
                {selected.status.toLowerCase()}
              </Badge>
              {selected.assignee && (
                <Badge variant="outline">{selected.assignee}</Badge>
              )}
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {selected.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2.5',
                      msg.direction === 'OUTBOUND'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={cn(
                        'mt-1 text-right text-xs',
                        msg.direction === 'OUTBOUND' ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      )}
                    >
                      {formatRelativeTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply Box */}
          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                size="icon"
                disabled={!replyText.trim()}
                onClick={() => setReplyText('')}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the list to view messages</p>
          </div>
        </div>
      )}
    </div>
  );
}
