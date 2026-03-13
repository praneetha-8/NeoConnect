import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, CaseCategory, Severity } from '../types';
import { Send, Paperclip, CheckCircle2 } from 'lucide-react';

interface Props {
  user: UserProfile;
}

export default function SubmissionForm({ user }: Props) {
  const [category, setCategory] = useState<CaseCategory>('Other');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let fileUrl = '';
      if (file) {
        const fileRef = ref(storage, `cases/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
      }

      const year = new Date().getFullYear();
      const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const trackingId = `NEO-${year}-${count}`;

      await addDoc(collection(db, 'cases'), {
        id: trackingId,
        category,
        department,
        location,
        severity,
        description,
        anonymous,
        fileUrl,
        submitterUid: user.uid,
        submitterName: anonymous ? 'Anonymous' : user.name,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cases');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-stone-200 shadow-sm text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Feedback Submitted Successfully</h2>
        <p className="text-stone-500 mb-8">Thank you for your feedback. Your case has been logged and will be reviewed by the Secretariat.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-stone-900">Submit Feedback</h2>
        <p className="text-stone-500">Your voice matters. Help us improve our workplace.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            >
              <option value="Safety">Safety</option>
              <option value="Policy">Policy</option>
              <option value="Facilities">Facilities</option>
              <option value="HR">HR</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Severity</label>
            <select 
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Department</label>
            <input 
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Operations"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Location</label>
            <input 
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Office"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-stone-700">Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe your feedback or complaint in detail..."
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[150px]"
            required
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-y border-stone-100">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox"
              id="anonymous"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-5 h-5 accent-emerald-600"
            />
            <label htmlFor="anonymous" className="text-sm text-stone-600 cursor-pointer">
              Submit anonymously
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 text-sm transition-colors">
              <Paperclip className="w-4 h-4" />
              <span>{file ? file.name : 'Attach File (PDF/Image)'}</span>
              <input 
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf"
              />
            </label>
          </div>
        </div>

        <button 
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting...' : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Feedback</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
