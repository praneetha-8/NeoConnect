import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  where,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Case, CaseStatus } from '../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

interface Props {
  user: UserProfile;
}

export default function CaseList({ user }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseManagers, setCaseManagers] = useState<UserProfile[]>([]);
  const [note, setNote] = useState('');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  useEffect(() => {
    let q;
    const path = 'cases';
    if (user.role === 'secretariat' || user.role === 'admin') {
      q = query(collection(db, path), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, path), where('caseManagerUid', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id } as Case & { docId: string }));
      setCases(casesData as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    // Fetch case managers
    const fetchManagers = async () => {
      try {
        const qm = query(collection(db, 'users'), where('role', '==', 'case_manager'));
        const snapshot = await getDocs(qm);
        setCaseManagers(snapshot.docs.map(doc => doc.data() as UserProfile));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };
    fetchManagers();

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (caseId: string, status: CaseStatus) => {
    try {
      const caseDoc = doc(db, 'cases', caseId);
      const updateData: any = { 
        status, 
        updatedAt: new Date().toISOString(),
        lastResponseAt: new Date().toISOString()
      };
      
      if (note.trim()) {
        const currentNotes = selectedCase?.notes || '';
        updateData.notes = currentNotes + `\n[${user.name}] ${note.trim()}`;
      }

      await updateDoc(caseDoc, updateData);
      setSelectedCase(null);
      setNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  const addNoteOnly = async (caseId: string) => {
    if (!note.trim()) return;
    try {
      const caseDoc = doc(db, 'cases', caseId);
      const currentNotes = selectedCase?.notes || '';
      await updateDoc(caseDoc, { 
        notes: currentNotes + `\n[${user.name}] ${note.trim()}`,
        updatedAt: new Date().toISOString()
      });
      setNote('');
      // Refresh local selected case
      if (selectedCase) {
        setSelectedCase({
          ...selectedCase,
          notes: currentNotes + `\n[${user.name}] ${note.trim()}`
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  const assignManager = async (caseId: string, managerUid: string) => {
    try {
      const caseDoc = doc(db, 'cases', caseId);
      await updateDoc(caseDoc, { 
        caseManagerUid: managerUid, 
        status: 'assigned',
        updatedAt: new Date().toISOString()
      });
      setSelectedCase(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${caseId}`);
    }
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'assigned': return 'bg-purple-100 text-purple-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'pending': return 'bg-stone-100 text-stone-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      case 'escalated': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const isOverdue = (c: Case) => {
    const lastUpdate = new Date(c.updatedAt || c.createdAt);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastUpdate < sevenDaysAgo && c.status !== 'resolved';
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Case Inbox</h2>
          <p className="text-stone-500">Manage and respond to staff feedback.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search cases..." 
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button className="p-2 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
            <Filter className="w-5 h-5 text-stone-600" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Case ID</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Category</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Submitter</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Created</th>
              <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {cases.map((c: any) => (
              <React.Fragment key={c.docId}>
                <tr 
                  className={`hover:bg-stone-50 transition-colors cursor-pointer ${expandedCaseId === c.docId ? 'bg-emerald-50/30' : ''}`} 
                  onClick={() => setSelectedCase(c)}
                >
                  <td className="p-4 font-mono text-sm font-medium text-stone-900 flex items-center gap-2">
                    {c.id}
                    {isOverdue(c) && <AlertTriangle className="w-4 h-4 text-red-500" title="Overdue (7+ days)" />}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-xs font-medium">{c.category}</span>
                  </td>
                  <td className="p-4 text-sm text-stone-600">{c.submitterName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-stone-500">
                    {formatDistanceToNow(new Date(c.createdAt))} ago
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCaseId(expandedCaseId === c.docId ? null : c.docId);
                        }}
                        className="px-3 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                      >
                        {expandedCaseId === c.docId ? 'Hide Details' : 'View Details'}
                      </button>
                      <button className="p-1 hover:bg-stone-200 rounded-md transition-colors">
                        <MoreVertical className="w-4 h-4 text-stone-400" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedCaseId === c.docId && (
                  <tr>
                    <td colSpan={6} className="p-0 border-none">
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-stone-50/50 border-x border-stone-100"
                      >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Description</p>
                            <p className="text-sm text-stone-700 leading-relaxed">{c.description}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Severity</p>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                c.severity === 'High' ? 'bg-red-500' : 
                                c.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              <p className="text-sm font-medium text-stone-900">{c.severity}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Location</p>
                            <p className="text-sm text-stone-700">{c.location}</p>
                          </div>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{selectedCase.id}</h3>
                <p className="text-sm text-stone-500">Submitted by {selectedCase.submitterName}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-500 uppercase font-bold mb-1">Department</p>
                  <p className="text-sm font-medium">{selectedCase.department}</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-500 uppercase font-bold mb-1">Severity</p>
                  <p className="text-sm font-medium">{selectedCase.severity}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 uppercase font-bold mb-2">Description</p>
                <div className="p-4 bg-stone-50 rounded-xl text-stone-700 text-sm leading-relaxed">
                  {selectedCase.description}
                </div>
              </div>

              {selectedCase.notes && (
                <div>
                  <p className="text-xs text-stone-500 uppercase font-bold mb-2">Case Notes</p>
                  <div className="p-4 bg-stone-50 rounded-xl text-stone-600 text-sm whitespace-pre-wrap font-mono">
                    {selectedCase.notes}
                  </div>
                </div>
              )}

              {selectedCase.fileUrl && (
                <a 
                  href={selectedCase.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-emerald-600 hover:underline text-sm font-medium"
                >
                  <AlertCircle className="w-4 h-4" />
                  View Attached File
                </a>
              )}

              {/* Secretariat Actions */}
              {(user.role === 'secretariat' || user.role === 'admin') && selectedCase.status === 'new' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500 uppercase font-bold">Assign to Case Manager</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {caseManagers.map(m => (
                      <button 
                        key={m.uid}
                        onClick={() => assignManager((selectedCase as any).docId, m.uid)}
                        className="flex-shrink-0 px-4 py-2 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl text-sm transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Case Manager Actions */}
              {(user.role === 'case_manager' || user.role === 'admin' || (user.role === 'secretariat' && selectedCase.status !== 'new')) && (
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <div>
                    <p className="text-xs text-stone-500 uppercase font-bold mb-2">Add Note / Update</p>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note or response..."
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => addNoteOnly((selectedCase as any).docId)}
                      className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
                    >
                      Add Note Only
                    </button>
                    <button 
                      onClick={() => updateStatus((selectedCase as any).docId, 'in_progress')}
                      className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors"
                    >
                      Mark In Progress
                    </button>
                    <button 
                      onClick={() => updateStatus((selectedCase as any).docId, 'pending')}
                      className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
                    >
                      Request Info
                    </button>
                    <button 
                      onClick={() => updateStatus((selectedCase as any).docId, 'resolved')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Resolve & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
