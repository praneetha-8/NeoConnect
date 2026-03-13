import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Case, UserProfile } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  user: UserProfile;
}

export default function Analytics({ user }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'cases'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCases(snapshot.docs.map(doc => doc.data() as Case));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
    });
    return () => unsubscribe();
  }, []);

  const deptData = cases.reduce((acc, c) => {
    acc[c.department] = (acc[c.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(deptData)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const statusData = cases.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  const categoryData = cases.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const catChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const hotspots = Object.entries(
    cases.reduce((acc, c) => {
      const key = `${c.department}|${c.category}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).filter(([_, count]) => (count as number) >= 5);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-stone-900">Analytics Dashboard</h2>
        <p className="text-stone-500">Real-time insights into staff feedback and departmental health.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs text-stone-500 font-bold uppercase mb-1">Total Cases</p>
          <p className="text-3xl font-bold text-stone-900">{cases.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs text-emerald-500 font-bold uppercase mb-1">Resolved</p>
          <p className="text-3xl font-bold text-stone-900">{cases.filter(c => c.status === 'resolved').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs text-amber-500 font-bold uppercase mb-1">In Progress</p>
          <p className="text-3xl font-bold text-stone-900">{cases.filter(c => ['assigned', 'in_progress'].includes(c.status)).length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs text-red-500 font-bold uppercase mb-1">Escalated</p>
          <p className="text-3xl font-bold text-stone-900">{cases.filter(c => c.status === 'escalated').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-stone-400" />
            Cases by Department
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-stone-400" />
            Cases by Category
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6">Status Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Hotspot Flagging
          </h3>
          <div className="space-y-4">
            {hotspots.length > 0 ? (
              hotspots.map(([key, count]) => {
                const [dept, cat] = key.split('|');
                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <p className="text-xs text-red-600 font-bold uppercase">{cat}</p>
                      <p className="font-bold text-stone-900">{dept}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{count}</p>
                      <p className="text-xs text-red-500">Recurring Issues</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-stone-400">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                <p>No hotspots currently flagged.</p>
                <p className="text-xs mt-1">Hotspots appear when 5+ cases share a category and department.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
