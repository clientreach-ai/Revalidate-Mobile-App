'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiService } from '@/src/services/api';
import { Minus, Plus, Info, X, HelpCircle, Check } from 'lucide-react';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    learningMethod: 'independent learning',
    cpdLearningType: 'work based learning',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    activityType: 'participatory',
    linkToStandard: '',
    linkToStandardProficiency: '',
  });

  // Info modal states
  const [showHCPCInfo, setShowHCPCInfo] = useState(false);
  const [showNMCInfo, setShowNMCInfo] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || !formData.date || !formData.hours) {
      alert('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.createCpdRecord({
        topic: formData.topic,
        activityDate: formData.date,
        durationMinutes: Math.round(parseFloat(formData.hours) * 60),
        activityType: formData.activityType,
        learningMethod: formData.learningMethod,
        cpdLearningType: formData.cpdLearningType,
        linkToStandard: formData.linkToStandard,
        linkToStandardProficiency: formData.linkToStandardProficiency,
      });

      setShowAddModal(false);
      resetForm();
      loadStats(); // refresh stats
    } catch (err: any) {
      alert('Failed to add CPD record: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      topic: '',
      learningMethod: 'independent learning',
      cpdLearningType: 'work based learning',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      activityType: 'participatory',
      linkToStandard: '',
      linkToStandardProficiency: '',
    });
  };

  if (loading) {
    return <div className="text-center py-12">Loading activity logs...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
          <p className="text-muted-foreground">Monitor all user activities and logs</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add CPD Entry
        </Button>
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
      {/* Add CPD Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold">Add CPD Activity</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Topic */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g. Advanced Clinical Assessment"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Learning Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Learning Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.learningMethod}
                    onChange={(e) => setFormData({ ...formData, learningMethod: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="independent learning">Independent Learning</option>
                    <option value="online learning">Online Learning</option>
                    <option value="course attendance">Course Attendance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Type of CPD Learning */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type of CPD Learning <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.cpdLearningType}
                    onChange={(e) => setFormData({ ...formData, cpdLearningType: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="work based learning">Work Based Learning</option>
                    <option value="professional activities">Professional Activities</option>
                    <option value="formal and educational">Formal and Educational</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHCPCInfo(true)}
                      className="text-blue-500 hover:text-blue-700 flex items-center text-xs font-medium"
                    >
                      <Info className="w-4 h-4 mr-1" />
                      Standards Info
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Hours <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      placeholder="e.g. 2.5"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">hours</div>
                  </div>
                </div>

                {/* Activity Type Toggle */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Activity Classification
                  </label>
                  <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, activityType: 'participatory' })}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${formData.activityType === 'participatory'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      Participatory
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, activityType: 'non-participatory' })}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${formData.activityType === 'non-participatory'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      Non-Participatory
                    </button>
                  </div>
                </div>

                {/* Links */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Link to code/standard
                  </label>
                  <input
                    type="text"
                    value={formData.linkToStandard}
                    onChange={(e) => setFormData({ ...formData, linkToStandard: e.target.value })}
                    placeholder="e.g. HCPC Standard 1"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Standard Proficiency
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNMCInfo(true)}
                      className="text-amber-600 hover:text-amber-800 flex items-center text-xs font-medium"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Add Info
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.linkToStandardProficiency}
                    onChange={(e) => setFormData({ ...formData, linkToStandardProficiency: e.target.value })}
                    placeholder="Identify parts used"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
                >
                  {submitting ? 'Adding...' : 'Add Activity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HCPC Standard Info Modal */}
      {showHCPCInfo && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl scale-in">
            <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <div className="flex items-center text-blue-800">
                <Info className="w-6 h-6 mr-3" />
                <h3 className="text-xl font-bold">HCPC Standards for CPD</h3>
              </div>
              <button
                onClick={() => setShowHCPCInfo(false)}
                className="hover:bg-blue-100 p-1 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-blue-400" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {[
                { s: 1, t: "A registrant must maintain a continuous, up-to-date and accurate record of their CPD activities." },
                { s: 2, t: "A registrant must demonstrate that their CPD activities are a mixture of learning activities relevant to current or future practice." },
                { s: 3, t: "A registrant must seek to ensure that their CPD has contributed to the quality of their practice and service delivery." },
                { s: 4, t: "A registrant must seek to ensure that their CPD benefits the service user." },
                { s: 5, t: "A registrant must present a written profile explaining how they have met the standards for CPD if requested by the HCPC." }
              ].map(st => (
                <div key={st.s} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="text-xs font-bold text-blue-600 uppercase mb-1">Standard {st.s}</div>
                  <div className="text-gray-700 leading-relaxed font-medium">{st.t}</div>
                </div>
              ))}
              <p className="text-xs italic text-gray-400 text-right mt-4">HCPC, 2024</p>
            </div>

            <div className="p-4 bg-gray-50 text-right border-t">
              <Button onClick={() => setShowHCPCInfo(false)} className="bg-blue-600">Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* NMC Info Modal */}
      {showNMCInfo && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl scale-in">
            <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
              <div className="flex items-center text-amber-800">
                <HelpCircle className="w-6 h-6 mr-3" />
                <h3 className="text-xl font-bold">Standard Proficiency</h3>
              </div>
              <button
                onClick={() => setShowNMCInfo(false)}
                className="hover:bg-amber-100 p-1 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-amber-400" />
              </button>
            </div>

            <div className="p-8">
              <p className="text-lg text-gray-700 leading-relaxed font-medium mb-6">
                Please identify the parts of the relevant standard that you used to inform your CPD.
              </p>
              <p className="text-xs italic text-gray-400 text-right">NMC, 2024</p>
            </div>

            <div className="p-4 bg-gray-50 text-right border-t">
              <Button onClick={() => setShowNMCInfo(false)} className="bg-amber-600 hover:bg-amber-700">Got it</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
