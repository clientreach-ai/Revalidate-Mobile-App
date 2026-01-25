'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';

interface DashboardStats {
  freeUsers: number;
  premiumUsers: number;
  subscriptionStatus: Record<string, number>;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('403')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading subscription data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscriptions Management</h1>
        <p className="text-muted-foreground">Manage user subscriptions and tiers</p>
      </div>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700">Free Users</CardTitle>
            <CardDescription>Users on the free tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">{stats?.freeUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700">Premium Users</CardTitle>
            <CardDescription>Users on the premium tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-900">{stats?.premiumUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status */}
      {stats?.subscriptionStatus && Object.keys(stats.subscriptionStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status Breakdown</CardTitle>
            <CardDescription>Current status of all subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.subscriptionStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground mt-1 capitalize">{status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
