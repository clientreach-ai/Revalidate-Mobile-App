'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  activeStatusUsers: number;
  inactiveUsers: number;
  freeUsers: number;
  premiumUsers: number;
  recentRegistrations7Days: number;
  recentRegistrations30Days: number;
  totalWorkHours: number;
  activeWorkSessions: number;
  usersWithWorkHours: number;
  avgWorkHoursPerUser: number;
  totalCpdHours: number;
  usersWithCpdHours: number;
  avgCpdHoursPerUser: number;
  totalFeedback: number;
  totalReflections: number;
  totalAppraisals: number;
  usersByRole: Record<string, number>;
  usersByType: Record<string, number>;
  subscriptionStatus: Record<string, number>;
  recentActivity: {
    workHours: number;
    cpdHours: number;
    feedback: number;
    reflections: number;
    appraisals: number;
  };
}

export default function StatisticsPage() {
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
    return <div className="text-center py-12">Loading statistics...</div>;
  }

  const totalUsers = stats?.totalUsers || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Detailed Statistics</h1>
        <p className="text-muted-foreground">Comprehensive analytics and breakdowns</p>
      </div>

      {/* User Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
          <CardDescription>Complete user breakdown and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.activeStatusUsers || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Active Status</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.inactiveUsers || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Inactive</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.activeUsers || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Active (30 days)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registration Statistics</CardTitle>
          <CardDescription>New user signups and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{stats?.recentRegistrations7Days || 0}</div>
              <div className="text-sm text-blue-600 mt-1">New Users (7 days)</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-900">{stats?.recentRegistrations30Days || 0}</div>
              <div className="text-sm text-green-600 mt-1">New Users (30 days)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-900">{totalUsers}</div>
              <div className="text-sm text-purple-600 mt-1">Total Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Hours Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Work Hours Statistics</CardTitle>
          <CardDescription>Detailed work hours analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold">{stats?.totalWorkHours?.toFixed(1) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Hours</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.usersWithWorkHours || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Users Logging</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.avgWorkHoursPerUser?.toFixed(1) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg per User</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.activeWorkSessions || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPD Hours Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>CPD Hours Statistics</CardTitle>
          <CardDescription>Continuing Professional Development analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold">{stats?.totalCpdHours?.toFixed(1) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Total CPD Hours</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.usersWithCpdHours || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Users Logging CPD</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.avgCpdHoursPerUser?.toFixed(1) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg CPD per User</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {stats?.usersByRole && Object.keys(stats.usersByRole).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Users by Registration Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.usersByRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium capitalize">{role || 'Unknown'}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {stats?.usersByType && Object.keys(stats.usersByType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Users by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.usersByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{type}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {stats?.subscriptionStatus && Object.keys(stats.subscriptionStatus).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.subscriptionStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium capitalize">{status}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Statistics</CardTitle>
          <CardDescription>All activity types and totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalFeedback || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Feedback Logs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalReflections || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Reflections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalAppraisals || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Appraisals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalWorkHours?.toFixed(0) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Work Hours</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalCpdHours?.toFixed(0) || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">CPD Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
