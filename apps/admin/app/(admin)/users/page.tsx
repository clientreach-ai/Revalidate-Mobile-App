'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiService } from '@/src/services/api';

interface User {
  id: number;
  email: string;
  registration_number: string;
  revalidation_date: string;
  professional_role: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiService.getAllUsers({ limit: 1000 });
      console.log('API response for users:', data);
      setUsers(data);
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('403')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: number) => {
    setLoadingDetails(true);
    setError('');
    try {
      console.log('Loading user details for ID:', userId);
      const data = await apiService.getUserDetails(userId.toString());
      console.log('User details received:', data);
      setUserDetails(data);
      setSelectedUser(users.find(u => u.id === userId) || null);
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      setError(err.message || 'Failed to load user details');
      setUserDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Users Management</h1>
        <p className="text-muted-foreground">View and manage all {users.length} users</p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <input
            type="text"
            placeholder="Search by email or registration number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Click on a user to view detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => loadUserDetails(user.id)}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                >
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.professional_role || 'N/A'} • {user.subscription_tier}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {user.id} • Joined: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
              {selectedUser ? `Viewing: ${selectedUser.email}` : 'Select a user to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Error: {error}
              </div>
            )}
            {loadingDetails ? (
              <div className="text-center py-8">Loading details...</div>
            ) : userDetails ? (
              <div className="space-y-6 max-h-[700px] overflow-y-auto">
                {/* Statistics Summary */}
                {userDetails.statistics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {userDetails.statistics.workHours?.totalHours?.toFixed(1) || 0}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">Work Hours</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {userDetails.statistics.cpdHours?.totalHours?.toFixed(1) || 0}
                      </div>
                      <div className="text-xs text-green-600 mt-1">CPD Hours</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {userDetails.statistics.feedback?.total || 0}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Feedback</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-700">
                        {userDetails.statistics.reflections?.total || 0}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">Reflections</div>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-pink-700">
                        {userDetails.statistics.appraisals?.total || 0}
                      </div>
                      <div className="text-xs text-pink-600 mt-1">Appraisals</div>
                    </div>
                  </div>
                )}

                {/* User Info */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">ID:</strong> 
                        <span>{userDetails.user.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Name:</strong> 
                        <span>{userDetails.user.name || userDetails.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Email:</strong> 
                        <span className="break-all">{userDetails.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Phone:</strong> 
                        <span>{userDetails.user.phoneCode && userDetails.user.phone ? `${userDetails.user.phoneCode} ${userDetails.user.phone}` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Status:</strong> 
                        <span className={userDetails.user.status === '1' ? 'text-green-600' : 'text-red-600'}>
                          {userDetails.user.status === '1' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">User Type:</strong> 
                        <span>{userDetails.user.userType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Registration Type:</strong> 
                        <span>{userDetails.user.regType || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Professional Role:</strong> 
                        <span>{userDetails.user.professional_role || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Registration #:</strong> 
                        <span>{userDetails.user.registration_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Revalidation Date:</strong> 
                        <span>{userDetails.user.revalidation_date || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Work Setting:</strong> 
                        <span>{userDetails.user.work_setting || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Scope of Practice:</strong> 
                        <span>{userDetails.user.scope_of_practice || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Subscription:</strong> 
                        <span className="font-semibold">
                          {userDetails.user.subscription_tier} ({userDetails.user.subscription_status})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Last Login:</strong> 
                        <span>{userDetails.user.lastLogin ? new Date(userDetails.user.lastLogin).toLocaleString() : 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-muted-foreground">Joined:</strong> 
                        <span>{new Date(userDetails.user.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Work Hours */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">
                    Work Hours ({userDetails.workHours?.length || 0})
                    {userDetails.statistics?.workHours && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        • {userDetails.statistics.workHours.totalHours?.toFixed(1)}h total
                        {userDetails.statistics.workHours.activeSessions > 0 && (
                          <span className="text-green-600"> • {userDetails.statistics.workHours.activeSessions} active</span>
                        )}
                      </span>
                    )}
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
                    {userDetails.workHours?.length > 0 ? (
                      userDetails.workHours.map((wh: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                          <div className="font-medium">
                            {new Date(wh.startTime || wh.start_time).toLocaleString()}
                            {wh.endTime || wh.end_time ? ` - ${new Date(wh.endTime || wh.end_time).toLocaleString()}` : ' (Ongoing)'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                            <span>Duration: {wh.durationMinutes || wh.duration_minutes || 'N/A'} min</span>
                            {wh.isActive || wh.is_active ? (
                              <span className="text-green-600 font-semibold">● Active Session</span>
                            ) : null}
                          </div>
                          {wh.workDescription || wh.work_description && (
                            <div className="text-xs mt-2 text-gray-700">{wh.workDescription || wh.work_description}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No work hours logged</div>
                    )}
                  </div>
                </div>

                {/* CPD Hours */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">
                    CPD Hours ({userDetails.cpdHours?.length || 0})
                    {userDetails.statistics?.cpdHours && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        • {userDetails.statistics.cpdHours.totalHours?.toFixed(1)}h total
                      </span>
                    )}
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
                    {userDetails.cpdHours?.length > 0 ? (
                      userDetails.cpdHours.map((ch: any, idx: number) => {
                        const hours = ch.hours || (ch.numberHours ? parseFloat(ch.numberHours) : 0) || (ch.duration_minutes ? ch.duration_minutes / 60 : 0);
                        return (
                          <div key={idx} className="p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                            <div className="font-medium">{ch.trainingName || ch.topic || ch.method || 'Unnamed Training'}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex gap-4 flex-wrap">
                              <span>Date: {new Date(ch.date || ch.activityDate || ch.activity_date).toLocaleDateString()}</span>
                              <span>Hours: {hours.toFixed(2)}</span>
                              {ch.activityType || ch.method && <span>Type: {ch.activityType || ch.method}</span>}
                              {ch.learningType && <span>Learning: {ch.learningType}</span>}
                            </div>
                            {ch.topic && <div className="text-xs mt-2 text-gray-700">Topic: {ch.topic}</div>}
                            {ch.learning && <div className="text-xs mt-1 text-gray-600">{ch.learning}</div>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No CPD hours logged</div>
                    )}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">
                    Feedback Logs ({userDetails.feedbackLogs?.length || 0})
                    {userDetails.statistics?.feedback && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        • {userDetails.statistics.feedback.patientCount} patient, {userDetails.statistics.feedback.colleagueCount} colleague
                      </span>
                    )}
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                    {userDetails.feedbackLogs?.length > 0 ? (
                      userDetails.feedbackLogs.map((fl: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border">
                          <div className="font-medium">
                            {fl.feedbackType || fl.feedback_type} Feedback
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(fl.feedbackDate || fl.feedback_date).toLocaleDateString()}
                            </span>
                          </div>
                          {fl.feedbackText || fl.feedback_text && (
                            <div className="text-xs mt-2 text-gray-700">{fl.feedbackText || fl.feedback_text}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No feedback logs</div>
                    )}
                  </div>
                </div>

                {/* Reflections */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">Reflections ({userDetails.reflections?.length || 0})</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                    {userDetails.reflections?.length > 0 ? (
                      userDetails.reflections.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border">
                          <div className="font-medium">
                            Reflection
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(r.reflectionDate || r.reflection_date).toLocaleDateString()}
                            </span>
                          </div>
                          {r.reflectionText || r.reflection_text && (
                            <div className="text-xs mt-2 text-gray-700 line-clamp-3">
                              {r.reflectionText || r.reflection_text}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No reflections</div>
                    )}
                  </div>
                </div>

                {/* Appraisals */}
                <div>
                  <h3 className="font-semibold mb-3 text-lg border-b pb-2">Appraisals ({userDetails.appraisals?.length || 0})</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                    {userDetails.appraisals?.length > 0 ? (
                      userDetails.appraisals.map((a: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border">
                          <div className="font-medium">
                            Appraisal
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(a.appraisalDate || a.appraisal_date).toLocaleDateString()}
                            </span>
                          </div>
                          {a.notes && (
                            <div className="text-xs mt-2 text-gray-700 line-clamp-3">{a.notes}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No appraisal records</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-12">
                Select a user from the list to view their complete details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
