import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, QuarterlyDigest, Impact, Minute } from '../types';
import { 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Plus,
  Search,
  ExternalLink
} from 'lucide-react';

interface Props {
  user: UserProfile;
}

export default function PublicHub({ user }: Props) {
  const [digests, setDigests] = useState<QuarterlyDigest[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [activeTab, setActiveTab] = useState<'digests' | 'impact' | 'minutes'>('digests');

  useEffect(() => {
    const qd = query(collection(db, 'digests'), orderBy('createdAt', 'desc'));
    const qi = query(collection(db, 'impacts'), orderBy('createdAt', 'desc'));
    const qm = query(collection(db, 'minutes'), orderBy('createdAt', 'desc'));

    const unsubD = onSnapshot(qd, s => setDigests(s.docs.map(d => d.data() as QuarterlyDigest)), (error) => {
      handleFirestoreError(error, OperationType.LIST, 'digests');
    });
    const unsubI = onSnapshot(qi, s => setImpacts(s.docs.map(d => d.data() as Impact)), (error) => {
      handleFirestoreError(error, OperationType.LIST, 'impacts');
    });
    const unsubM = onSnapshot(qm, s => setMinutes(s.docs.map(d => d.data() as Minute)), (error) => {
      handleFirestoreError(error, OperationType.LIST, 'minutes');
    });

    return () => { unsubD(); unsubI(); unsubM(); };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-stone-900">Public Hub</h2>
        <p className="text-stone-500">Transparency in action. See how your feedback shapes NeoConnect.</p>
      </header>

      <div className="flex gap-4 border-b border-stone-200">
        <button 
          onClick={() => setActiveTab('digests')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'digests' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500'}`}
        >
          Quarterly Digest
        </button>
        <button 
          onClick={() => setActiveTab('impact')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'impact' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500'}`}
        >
          Impact Tracking
        </button>
        <button 
          onClick={() => setActiveTab('minutes')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'minutes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500'}`}
        >
          Minutes Archive
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'digests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {digests.length === 0 && <p className="text-stone-400 italic">No digests published yet.</p>}
            {digests.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg text-stone-900">{d.title}</h3>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed line-clamp-4 mb-4">{d.content}</p>
                <button className="text-emerald-600 text-sm font-bold hover:underline">Read Full Summary →</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="p-4 text-xs font-semibold text-stone-500 uppercase">What was raised</th>
                  <th className="p-4 text-xs font-semibold text-stone-500 uppercase">Action Taken</th>
                  <th className="p-4 text-xs font-semibold text-stone-500 uppercase">What Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {impacts.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-stone-400 italic">No impact records yet.</td></tr>}
                {impacts.map(i => (
                  <tr key={i.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-stone-900">{i.raised}</td>
                    <td className="p-4 text-sm text-stone-600">{i.action}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                        <TrendingUp className="w-4 h-4" />
                        {i.change}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'minutes' && (
          <div className="space-y-4">
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {minutes.length === 0 && <p className="text-stone-400 italic">No minutes archived yet.</p>}
              {minutes.map(m => (
                <a 
                  key={m.id}
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:border-emerald-500 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-stone-400 group-hover:text-emerald-600" />
                    <span className="text-sm font-medium text-stone-700">{m.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-300 group-hover:text-emerald-600" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {(user.role === 'secretariat' || user.role === 'admin') && (
        <div className="pt-8 border-t border-stone-200">
          <h3 className="font-bold text-stone-900 mb-4">Admin Actions</h3>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors">
              <Plus className="w-4 h-4" />
              Add Digest
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors">
              <Plus className="w-4 h-4" />
              Log Impact
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors">
              <Plus className="w-4 h-4" />
              Upload Minutes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
