'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/src/services/api';
import Link from 'next/link';

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
    lastWorkHours?: string | null;
    lastCpdHours?: string | null;
    lastFeedback?: string | null;
    lastReflections?: string | null;
    lastAppraisals?: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } else {
        setError(err.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-12">{error}</div>;
  }

  const totalUsers = stats?.totalUsers || 0;
  const safePercentage = (value: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">System statistics and key metrics</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">{stats?.totalUsers || 0}</div>
            <div className="text-xs text-blue-600 mt-1">
              {stats?.activeStatusUsers || 0} active, {stats?.inactiveUsers || 0} inactive
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-700">Active Users (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">{stats?.activeUsers || 0}</div>
            <div className="text-xs text-green-600 mt-1">
              {stats?.recentRegistrations30Days || 0} new in last 30 days
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-purple-700">Total Work Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-900">{stats?.totalWorkHours?.toFixed(1) || 0}</div>
            <div className="text-xs text-purple-600 mt-1">
              {stats?.usersWithWorkHours || 0} users logged hours
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-700">Total CPD Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-900">{stats?.totalCpdHours?.toFixed(1) || 0}</div>
            <div className="text-xs text-orange-600 mt-1">
              {stats?.usersWithCpdHours || 0} users logged CPD
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👥</span> View All Users
              </CardTitle>
              <CardDescription>Browse and manage all {totalUsers} users</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/statistics">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📈</span> Detailed Statistics
              </CardTitle>
              <CardDescription>View comprehensive analytics and reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/activity">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📝</span> Activity Logs
              </CardTitle>
              <CardDescription>Monitor all user activities</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (Last 24 Hours)</CardTitle>
          <CardDescription>New entries across all activity types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.recentActivity?.workHours || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Work Hours</div>
              {stats?.recentActivity?.lastWorkHours && (
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.recentActivity.lastWorkHours).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.recentActivity?.cpdHours || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">CPD Hours</div>
              {stats?.recentActivity?.lastCpdHours && (
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.recentActivity.lastCpdHours).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.recentActivity?.feedback || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Feedback</div>
              {stats?.recentActivity?.lastFeedback && (
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.recentActivity.lastFeedback).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.recentActivity?.reflections || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Reflections</div>
              {stats?.recentActivity?.lastReflections && (
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.recentActivity.lastReflections).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.recentActivity?.appraisals || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Appraisals</div>
              {stats?.recentActivity?.lastAppraisals && (
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.recentActivity.lastAppraisals).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          {stats?.recentActivity?.workHours === 0 && 
           stats?.recentActivity?.cpdHours === 0 && 
           stats?.recentActivity?.feedback === 0 && 
           stats?.recentActivity?.reflections === 0 && 
           stats?.recentActivity?.appraisals === 0 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              No activity in the last 24 hours. Last CPD entry: {stats?.recentActivity?.lastCpdHours ? new Date(stats.recentActivity.lastCpdHours).toLocaleString() : 'Never'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
