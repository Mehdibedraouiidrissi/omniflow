'use client';

import { Star, Send, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  platform: string;
  createdAt: string;
  responded: boolean;
}

interface ReviewCampaign {
  id: string;
  name: string;
  sentCount: number;
  responseCount: number;
  avgRating: number;
  status: string;
}

const fallbackReviews: Review[] = [
  { id: '1', authorName: 'Sarah J.', rating: 5, text: 'Amazing service! The team went above and beyond to help us.', platform: 'Google', createdAt: new Date(Date.now() - 86400000).toISOString(), responded: true },
  { id: '2', authorName: 'Mike C.', rating: 4, text: 'Great product, very easy to use. Would recommend to others.', platform: 'Google', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), responded: false },
  { id: '3', authorName: 'Lisa P.', rating: 5, text: 'Best CRM platform we have used. Customer support is excellent.', platform: 'Trustpilot', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), responded: true },
  { id: '4', authorName: 'Tom W.', rating: 3, text: 'Good overall but some features could be improved.', platform: 'Google', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), responded: false },
];

const fallbackCampaigns: ReviewCampaign[] = [
  { id: '1', name: 'Post-Purchase Review', sentCount: 245, responseCount: 89, avgRating: 4.6, status: 'ACTIVE' },
  { id: '2', name: 'Monthly Check-in', sentCount: 120, responseCount: 34, avgRating: 4.3, status: 'ACTIVE' },
  { id: '3', name: 'Q4 Satisfaction Survey', sentCount: 500, responseCount: 187, avgRating: 4.5, status: 'COMPLETED' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function ReputationPage() {
  const overallRating = 4.5;
  const totalReviews = 342;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reputation Management"
        description="Monitor and manage your online reviews"
        actions={
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send Review Request
          </Button>
        }
      />

      {/* Overall Rating */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="sm:col-span-1">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-4xl font-bold">{overallRating}</p>
            <StarRating rating={Math.round(overallRating)} />
            <p className="mt-1 text-sm text-muted-foreground">{totalReviews} reviews</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {[5, 4, 3, 2, 1].map((stars) => {
              const pct = stars === 5 ? 65 : stars === 4 ? 20 : stars === 3 ? 10 : stars === 2 ? 3 : 2;
              return (
                <div key={stars} className="mb-2 flex items-center gap-2">
                  <span className="w-4 text-sm">{stars}</span>
                  <Star className="h-3.5 w-3.5 text-yellow-400" />
                  <div className="flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Review Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fallbackCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.responseCount}/{campaign.sentCount} responses ({Math.round(campaign.responseCount / campaign.sentCount * 100)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{campaign.avgRating}</p>
                      <StarRating rating={Math.round(campaign.avgRating)} />
                    </div>
                    <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                      {campaign.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fallbackReviews.map((review) => (
                <div key={review.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={review.authorName} className="h-7 w-7" />
                      <div>
                        <p className="text-sm font-medium">{review.authorName}</p>
                        <StarRating rating={review.rating} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{review.platform}</Badge>
                      {review.responded && (
                        <Badge variant="success" className="text-xs">Replied</Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(review.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
