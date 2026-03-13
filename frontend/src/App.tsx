import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole } from './types';
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  Inbox, 
  Globe, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  ShieldAlert,
  Vote,
  AlertTriangle
} from 'lucide-react';
import SubmissionForm from './components/SubmissionForm';
import CaseList from './components/CaseList';
import PublicHub from './components/PublicHub';
import Polling from './components/Polling';
import Analytics from './components/Analytics';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';

function MainApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [demoRole, setDemoRole] = useState<UserRole>('staff');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: UserProfile;
          if (userDoc.exists()) {
            userData = userDoc.data() as UserProfile;
            // For demo purposes: Update role if it differs from the selection on the login screen
            if (userData.role !== demoRole) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: demoRole });
              userData.role = demoRole;
            }
            setUser(userData);
          } else {
            // New user setup
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Anonymous',
              role: demoRole, // Use the selected demo role
              department: 'General'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            setUser(userData);
          }

          // Escalation Check for Secretariat/Admin
          if (userData.role === 'secretariat' || userData.role === 'admin') {
            const q = query(
              collection(db, 'cases'), 
              where('status', 'in', ['assigned', 'in_progress', 'pending'])
            );
            const snapshot = await getDocs(q);
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            snapshot.docs.forEach(async (d) => {
              const data = d.data();
              const lastUpdate = new Date(data.updatedAt || data.createdAt);
              if (lastUpdate < sevenDaysAgo && data.status !== 'escalated') {
                try {
                  await updateDoc(doc(db, 'cases', d.id), {
                    status: 'escalated',
                    updatedAt: now.toISOString(),
                    notes: (data.notes || '') + '\n[System] Automatically escalated due to 7-day inactivity.'
                  });
                } catch (e) {
                  handleFirestoreError(e, OperationType.UPDATE, `cases/${d.id}`);
                }
              }
            });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoRole]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">NeoConnect</h1>
          <p className="text-stone-500 mb-8">Staff Feedback & Complaint Management Platform</p>
          
          <div className="mb-6 text-left">
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Select Demo Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['staff', 'secretariat', 'case_manager', 'admin'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => setDemoRole(role)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    demoRole === role 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {role.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
          <p className="mt-4 text-xs text-stone-400">New accounts will be created with the selected role for this demo.</p>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['staff', 'secretariat', 'case_manager', 'admin'] },
    { id: 'submit', label: 'Submit Feedback', icon: MessageSquarePlus, roles: ['staff', 'secretariat', 'case_manager', 'admin'] },
    { id: 'cases', label: user.role === 'secretariat' ? 'Case Inbox' : 'My Assigned Cases', icon: Inbox, roles: ['secretariat', 'case_manager', 'admin'] },
    { id: 'hub', label: 'Public Hub', icon: Globe, roles: ['staff', 'secretariat', 'case_manager', 'admin'] },
    { id: 'polls', label: 'Polling', icon: Vote, roles: ['staff', 'secretariat', 'case_manager', 'admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['secretariat', 'admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-bottom border-stone-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-stone-900">NeoConnect</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl mb-6">
            <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center overflow-hidden">
              <UserIcon className="text-stone-500 w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-stone-900 truncate">{user.name}</p>
              <p className="text-xs text-stone-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {filteredNav.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-50 text-emerald-700 font-medium' 
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-3xl font-bold text-stone-900">Welcome back, {user.name.split(' ')[0]}</h2>
                  <p className="text-stone-500">Here's what's happening in NeoConnect today.</p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium uppercase tracking-wider mb-2">My Active Cases</h3>
                    <p className="text-4xl font-bold text-stone-900">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium uppercase tracking-wider mb-2">Company Resolved</h3>
                    <p className="text-4xl font-bold text-stone-900">12</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium uppercase tracking-wider mb-2">Active Polls</h3>
                    <p className="text-4xl font-bold text-stone-900">2</p>
                  </div>
                </div>

                {/* 7-Day Rule Reminder for Case Managers */}
                {user.role === 'case_manager' && (
                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-amber-900">7-Day Response Rule</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Please ensure all assigned cases have a response or update within 7 working days. 
                        Inactive cases will be automatically escalated to management.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'submit' && <SubmissionForm user={user} />}
            {activeTab === 'cases' && <CaseList user={user} />}
            {activeTab === 'hub' && <PublicHub user={user} />}
            {activeTab === 'polls' && <Polling user={user} />}
            {activeTab === 'analytics' && <Analytics user={user} />}
            {user.role === 'admin' && activeTab === 'dashboard' && (
              <div className="mt-12 pt-8 border-t border-stone-200">
                <h3 className="text-xl font-bold text-stone-900 mb-4">Admin Management</h3>
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <p className="text-sm text-stone-500 mb-6">As an Admin, you can manage user roles and system data. Use the button below to populate the app with demo data for testing.</p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={async () => {
                        const confirm = window.confirm('This will add several dummy cases and hub items. Continue?');
                        if (!confirm) return;
                        
                        try {
                          // 1. Add Dummy Cases
                          const caseData = [
                            { id: 'NEO-2024-001', category: 'Safety', department: 'Operations', location: 'Warehouse A', severity: 'High', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'new', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), description: 'Exposed wiring near the main conveyor belt. This is a fire hazard.' },
                            { id: 'NEO-2024-002', category: 'Policy', department: 'HR', location: 'Head Office', severity: 'Medium', anonymous: true, submitterUid: user.uid, submitterName: 'Anonymous', status: 'assigned', caseManagerUid: user.uid, createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), description: 'The new remote work policy is unclear about Friday hours.' },
                            { id: 'NEO-2024-003', category: 'Facilities', department: 'Operations', location: 'Staff Lounge', severity: 'Low', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'resolved', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'The coffee machine has been leaking for three days.', notes: '[Admin] Fixed by maintenance team on March 11.' },
                            { id: 'NEO-2024-004', category: 'Safety', department: 'Operations', location: 'Warehouse B', severity: 'High', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'new', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Forklift brakes seem unresponsive.' },
                            { id: 'NEO-2024-005', category: 'Safety', department: 'Operations', location: 'Warehouse A', severity: 'Medium', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'new', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Slippery floor near entrance.' },
                            { id: 'NEO-2024-006', category: 'Safety', department: 'Operations', location: 'Warehouse A', severity: 'Medium', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'new', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Emergency exit blocked by pallets.' },
                            { id: 'NEO-2024-007', category: 'Safety', department: 'Operations', location: 'Warehouse A', severity: 'High', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'new', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Racking system looks unstable in aisle 4.' },
                            { id: 'NEO-2024-008', category: 'Equipment', department: 'IT', location: 'Server Room', severity: 'High', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'in_progress', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'AC unit in server room is making loud grinding noises.' },
                            { id: 'NEO-2024-009', category: 'Hygiene', department: 'Facilities', location: 'Restroom 2F', severity: 'Medium', anonymous: false, submitterUid: user.uid, submitterName: user.name, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Soap dispensers are all empty.' },
                          ];

                          for (const c of caseData) {
                            await setDoc(doc(collection(db, 'cases')), c);
                          }

                          // 2. Add Hub Content
                          await addDoc(collection(db, 'digests'), { title: 'Q1 2024 Transparency Report', content: 'In the first quarter of 2024, we received 45 feedback submissions. 85% were resolved within the 7-day target. Key focus areas included Warehouse Safety and HR Policy clarity.', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() });
                          await addDoc(collection(db, 'digests'), { title: 'Annual Safety Review 2023', content: 'Our annual review showed a 15% decrease in workplace incidents compared to 2022. We are investing $50k in new safety gear for the operations team.', createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() });
                          
                          await addDoc(collection(db, 'impacts'), { raised: 'Inadequate lighting in parking lot', action: 'Installed 15 new LED floodlights', change: 'Improved staff safety during night shifts', createdAt: new Date().toISOString() });
                          await addDoc(collection(db, 'impacts'), { raised: 'Outdated microwave in lounge', action: 'Purchased 2 new high-power units', change: 'Reduced wait times during lunch breaks', createdAt: new Date().toISOString() });
                          await addDoc(collection(db, 'impacts'), { raised: 'Slow guest Wi-Fi', action: 'Upgraded router and bandwidth', change: 'Better connectivity for visitors and contractors', createdAt: new Date().toISOString() });
                          
                          await addDoc(collection(db, 'minutes'), { title: 'March 2024 Secretariat Meeting', fileUrl: '#', createdAt: new Date().toISOString() });
                          await addDoc(collection(db, 'minutes'), { title: 'February 2024 Town Hall', fileUrl: '#', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() });

                          // 3. Add Dummy Polls
                          const poll1 = await addDoc(collection(db, 'polls'), {
                            question: 'Which new benefit would you prefer for the next fiscal year?',
                            options: ['Extra 2 days PTO', 'Gym Membership Subsidy', 'Commuter Stipend', 'Learning Budget'],
                            createdAt: new Date().toISOString(),
                            createdBy: user.uid
                          });

                          const poll2 = await addDoc(collection(db, 'polls'), {
                            question: 'How satisfied are you with the new cafeteria menu?',
                            options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied'],
                            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                            createdBy: user.uid
                          });

                          // Add some dummy votes for poll 1
                          const dummyUids = ['user1', 'user2', 'user3', 'user4', 'user5'];
                          for (let i = 0; i < dummyUids.length; i++) {
                            await addDoc(collection(db, 'votes'), {
                              pollId: poll1.id,
                              userUid: dummyUids[i],
                              optionIndex: i % 4,
                              createdAt: new Date().toISOString()
                            });
                          }

                          alert('Demo data seeded successfully! Refresh the page to see changes.');
                        } catch (e) {
                          console.error(e);
                          alert('Error seeding data.');
                        }
                      }}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                    >
                      Seed Demo Data
                    </button>
                    <button className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold">View User List</button>
                    <button className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold">Audit Logs</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
