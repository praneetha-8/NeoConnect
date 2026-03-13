import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Poll, Vote } from '../types';
import { Plus, BarChart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  user: UserProfile;
}

export default function Polling({ user }: Props) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    const qp = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const qv = query(collection(db, 'votes'));

    const unsubP = onSnapshot(qp, s => setPolls(s.docs.map(d => ({ ...d.data(), id: d.id } as Poll))), (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
    });
    const unsubV = onSnapshot(qv, s => setVotes(s.docs.map(d => d.data() as Vote)), (error) => {
      handleFirestoreError(error, OperationType.LIST, 'votes');
    });

    return () => { unsubP(); unsubV(); };
  }, []);

  const handleCreate = async () => {
    if (!question || options.some(o => !o)) return;
    try {
      await addDoc(collection(db, 'polls'), {
        question,
        options: options.filter(o => o),
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      setShowCreate(false);
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'polls');
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    const hasVoted = votes.some(v => v.pollId === pollId && v.userUid === user.uid);
    if (hasVoted) return;

    try {
      await addDoc(collection(db, 'votes'), {
        pollId,
        userUid: user.uid,
        optionIndex,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'votes');
    }
  };

  const getResults = (pollId: string) => {
    const pollVotes = votes.filter(v => v.pollId === pollId);
    const total = pollVotes.length;
    const counts = pollVotes.reduce((acc, v) => {
      acc[v.optionIndex] = (acc[v.optionIndex] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return { total, counts };
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Staff Polling</h2>
          <p className="text-stone-500">Have your say on company decisions.</p>
        </div>
        {(user.role === 'secretariat' || user.role === 'admin') && (
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Poll
          </button>
        )}
      </header>

      {showCreate && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4"
        >
          <input 
            type="text"
            placeholder="Poll Question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <input 
                key={i}
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
              />
            ))}
            <button 
              onClick={() => setOptions([...options, ''])}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              + Add Option
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Publish Poll</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {polls.map(poll => {
          const { total, counts } = getResults(poll.id);
          const userVote = votes.find(v => v.pollId === poll.id && v.userUid === user.uid);

          return (
            <div key={poll.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-stone-900">{poll.question}</h3>
              <div className="space-y-3">
                {poll.options.map((opt, i) => {
                  const count = counts[i] || 0;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  const isVoted = userVote?.optionIndex === i;

                  return (
                    <button 
                      key={i}
                      onClick={() => handleVote(poll.id, i)}
                      disabled={!!userVote}
                      className={`w-full relative p-3 rounded-xl border text-left transition-all overflow-hidden ${
                        isVoted ? 'border-emerald-500 bg-emerald-50' : 'border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div 
                        className="absolute inset-0 bg-emerald-100/50 transition-all duration-1000" 
                        style={{ width: userVote ? `${percent}%` : '0%' }}
                      />
                      <div className="relative flex justify-between items-center text-sm">
                        <span className="font-medium">{opt}</span>
                        {userVote && (
                          <span className="text-xs font-bold text-stone-500">
                            {count} votes ({percent.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>{total} total votes</span>
                {userVote && <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3 h-3" /> Voted</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
