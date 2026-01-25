'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';

interface DashboardStats {
  totalCpdHours: number;
  usersWithCpdHours: number;
  avgCpdHoursPerUser: number;
  recentActivity: {
    cpdHours: number;
  };
}

export default function CpdHoursPage() {
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
    return <div className="text-center py-12">Loading CPD hours data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CPD Hours Management</h1>
        <p className="text-muted-foreground">Track Continuing Professional Development hours</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-700">Total CPD Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-900">{stats?.totalCpdHours?.toFixed(1) || 0}</div>
            <div className="text-xs text-orange-600 mt-1">Hours logged</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-purple-700">Users Logging CPD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-900">{stats?.usersWithCpdHours || 0}</div>
            <div className="text-xs text-purple-600 mt-1">Users with CPD hours</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-700">Avg CPD per User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">{stats?.avgCpdHoursPerUser?.toFixed(1) || 0}</div>
            <div className="text-xs text-green-600 mt-1">Average hours</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>CPD hours logged in the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-5xl font-bold">{stats?.recentActivity?.cpdHours || 0}</div>
            <div className="text-muted-foreground mt-2">New CPD hour entries in last 24 hours</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
