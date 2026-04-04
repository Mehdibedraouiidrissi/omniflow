'use client';

import { useState } from 'react';
import {
  Plus, Image, Calendar, Send, Facebook, Instagram,
  Linkedin, Twitter, Clock, MoreHorizontal,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
  mediaUrl: string | null;
}

interface ConnectedAccount {
  id: string;
  platform: string;
  accountName: string;
  connected: boolean;
}

const fallbackPosts: ScheduledPost[] = [
  { id: '1', content: 'Excited to announce our new product launch! Stay tuned for more details.', platforms: ['facebook', 'instagram', 'linkedin'], scheduledAt: new Date(Date.now() + 86400000).toISOString(), status: 'SCHEDULED', mediaUrl: null },
  { id: '2', content: 'Check out our latest blog post on marketing automation trends for 2024.', platforms: ['twitter', 'linkedin'], scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'SCHEDULED', mediaUrl: null },
  { id: '3', content: 'Customer success story: How Acme Corp increased their revenue by 150%.', platforms: ['facebook', 'linkedin'], scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'DRAFT', mediaUrl: null },
  { id: '4', content: 'Join us for our free webinar on lead generation strategies!', platforms: ['facebook', 'instagram', 'twitter', 'linkedin'], scheduledAt: new Date(Date.now() - 86400000).toISOString(), status: 'PUBLISHED', mediaUrl: null },
];

const fallbackAccounts: ConnectedAccount[] = [
  { id: '1', platform: 'facebook', accountName: 'Omniflow', connected: true },
  { id: '2', platform: 'instagram', accountName: '@omniflow', connected: true },
  { id: '3', platform: 'linkedin', accountName: 'Omniflow Inc.', connected: true },
  { id: '4', platform: 'twitter', accountName: '@omniflow', connected: false },
];

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
};

const statusColors: Record<string, 'success' | 'warning' | 'secondary'> = {
  PUBLISHED: 'success',
  SCHEDULED: 'warning',
  DRAFT: 'secondary',
};

export default function SocialPage() {
  const [postContent, setPostContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Planner"
        description="Schedule and manage your social media content"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Post Composer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Create Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What would you like to share?"
              className="min-h-[120px]"
            />
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Image className="mr-1 h-3.5 w-3.5" />
                Add Media
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                {fallbackAccounts.filter((a) => a.connected).map((account) => {
                  const Icon = platformIcons[account.platform] || Facebook;
                  return (
                    <label key={account.id} className="flex cursor-pointer items-center gap-1.5">
                      <Checkbox
                        checked={selectedPlatforms.includes(account.platform)}
                        onCheckedChange={() => togglePlatform(account.platform)}
                      />
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{account.platform}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={!postContent.trim() || selectedPlatforms.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Post Now
              </Button>
              <Button variant="outline" disabled={!postContent.trim() || selectedPlatforms.length === 0}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fallbackAccounts.map((account) => {
                const Icon = platformIcons[account.platform] || Facebook;
                return (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium capitalize">{account.platform}</p>
                        <p className="text-xs text-muted-foreground">{account.accountName}</p>
                      </div>
                    </div>
                    <Badge variant={account.connected ? 'success' : 'secondary'} className="text-xs">
                      {account.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled & Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fallbackPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 rounded-md border p-4">
                <div className="flex-1">
                  <p className="text-sm">{post.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      {post.platforms.map((p) => {
                        const Icon = platformIcons[p] || Facebook;
                        return <Icon key={p} className="h-3.5 w-3.5 text-muted-foreground" />;
                      })}
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(post.scheduledAt, 'MMM D, YYYY h:mm A')}
                    </span>
                  </div>
                </div>
                <Badge variant={statusColors[post.status] || 'secondary'} className="text-xs">
                  {post.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
