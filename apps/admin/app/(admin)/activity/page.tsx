'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';

interface DashboardStats {
  totalFeedback: number;
  totalReflections: number;
  totalAppraisals: number;
  recentActivity: {
    workHours: number;
    cpdHours: number;
    feedback: number;
    reflections: number;
    appraisals: number;
  };
}

export default function ActivityPage() {
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
    return <div className="text-center py-12">Loading activity logs...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p className="text-muted-foreground">Monitor all user activities and logs</p>
      </div>

      {/* Recent Activity (24h) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Activity (Last 24 Hours)</CardTitle>
          <CardDescription>New entries created in the past 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{stats?.recentActivity?.workHours || 0}</div>
              <div className="text-sm text-blue-600 mt-1">Work Hours</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-900">{stats?.recentActivity?.cpdHours || 0}</div>
              <div className="text-sm text-orange-600 mt-1">CPD Hours</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-900">{stats?.recentActivity?.feedback || 0}</div>
              <div className="text-sm text-green-600 mt-1">Feedback</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-900">{stats?.recentActivity?.reflections || 0}</div>
              <div className="text-sm text-purple-600 mt-1">Reflections</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-3xl font-bold text-pink-900">{stats?.recentActivity?.appraisals || 0}</div>
              <div className="text-sm text-pink-600 mt-1">Appraisals</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Feedback Logs</CardTitle>
            <CardDescription>Total feedback entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats?.totalFeedback || 0}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Patient and colleague feedback recorded
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reflections</CardTitle>
            <CardDescription>Total reflective accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats?.totalReflections || 0}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Reflective practice entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appraisals</CardTitle>
            <CardDescription>Total appraisal records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats?.totalAppraisals || 0}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Appraisal records created
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Complete overview of all activity types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Work Hours</div>
                <div className="text-sm text-muted-foreground">Time tracking entries</div>
              </div>
              <div className="text-2xl font-bold">{stats?.recentActivity?.workHours || 0}</div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">CPD Hours</div>
                <div className="text-sm text-muted-foreground">Continuing professional development</div>
              </div>
              <div className="text-2xl font-bold">{stats?.recentActivity?.cpdHours || 0}</div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Feedback Logs</div>
                <div className="text-sm text-muted-foreground">Patient and colleague feedback</div>
              </div>
              <div className="text-2xl font-bold">{stats?.totalFeedback || 0}</div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Reflections</div>
                <div className="text-sm text-muted-foreground">Reflective practice accounts</div>
              </div>
              <div className="text-2xl font-bold">{stats?.totalReflections || 0}</div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Appraisals</div>
                <div className="text-sm text-muted-foreground">Appraisal records</div>
              </div>
              <div className="text-2xl font-bold">{stats?.totalAppraisals || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
