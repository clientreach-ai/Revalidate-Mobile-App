'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';

interface DashboardStats {
  totalWorkHours: number;
  activeWorkSessions: number;
  usersWithWorkHours: number;
  avgWorkHoursPerUser: number;
  recentActivity: {
    workHours: number;
  };
}

export default function WorkHoursPage() {
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
    return <div className="text-center py-12">Loading work hours data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Work Hours Management</h1>
        <p className="text-muted-foreground">Track and analyze work hours across all users</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-700">Total Work Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">{stats?.totalWorkHours?.toFixed(1) || 0}</div>
            <div className="text-xs text-blue-600 mt-1">Hours logged</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-700">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">{stats?.activeWorkSessions || 0}</div>
            <div className="text-xs text-green-600 mt-1">Currently tracking</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-purple-700">Users Logging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-900">{stats?.usersWithWorkHours || 0}</div>
            <div className="text-xs text-purple-600 mt-1">Users with hours</div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-700">Avg per User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-900">{stats?.avgWorkHoursPerUser?.toFixed(1) || 0}</div>
            <div className="text-xs text-orange-600 mt-1">Average hours</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Work hours logged in the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-5xl font-bold">{stats?.recentActivity?.workHours || 0}</div>
            <div className="text-muted-foreground mt-2">New work hour entries in last 24 hours</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
