import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Calendar, Send, RefreshCw, FileText } from 'lucide-react';
import { DiaryService, FeeService } from '../api/client';

export const Diary: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [feeGroups, setFeeGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Notice state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('circular'); // 'circular', 'homework', 'announcement'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchDiaryData = async () => {
    setLoading(true);
    try {
      const [diaryRes, grpRes] = await Promise.all([
        DiaryService.getAll(),
        FeeService.getGroups(),
      ]);
      if (diaryRes.data) {
        setEntries(Array.isArray(diaryRes.data) ? diaryRes.data : diaryRes.data.entries || []);
      }
      if (grpRes.data) setFeeGroups(grpRes.data);
    } catch (e) {
      console.error('Failed to load diary entries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiaryData();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please enter a title and description');
      return;
    }

    setPosting(true);
    try {
      await DiaryService.create({
        title: title.trim(),
        content: content.trim(),
        type: type,
        feeGroupId: selectedClassId || undefined,
        subject: subject.trim() || undefined,
        dueDate: dueDate || undefined,
        date: new Date().toISOString(),
      });

      setShowAddModal(false);
      setTitle('');
      setContent('');
      setSubject('');
      setDueDate('');
      fetchDiaryData();
    } catch (err: any) {
      alert('Failed to post announcement: ' + (err.response?.data?.message || err.message));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteEntry = async (id: string, entryTitle: string) => {
    if (window.confirm(`Delete announcement "${entryTitle}"?`)) {
      try {
        await DiaryService.delete(id);
        fetchDiaryData();
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            School Diary & Broadcast Hub
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Publish circulars, homework broadcasts, and event announcements across classes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Broadcast Announcement</span>
          </button>
          <button onClick={fetchDiaryData} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Diary Entries List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {entries.length === 0 ? (
          <div className="erp-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            {loading ? 'Loading announcements...' : 'No announcements published yet. Click + Broadcast to publish your first notice.'}
          </div>
        ) : (
          entries.map((entry) => {
            const grp = feeGroups.find((g) => g._id === entry.feeGroupId);
            const isHomework = entry.type === 'homework';
            return (
              <div
                key={entry._id}
                className="erp-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isHomework ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span className={`badge ${isHomework ? 'badge-info' : 'badge-warning'}`}>
                      {entry.type || 'Circular'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {entry.date ? new Date(entry.date).toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                    {entry.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                    {entry.content || entry.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      Class: {grp ? grp.name : 'All Classes'}
                    </span>
                    {entry.subject && (
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        Subject: {entry.subject}
                      </span>
                    )}
                    {entry.dueDate && (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        Due: {new Date(entry.dueDate).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDeleteEntry(entry._id, entry.title)}
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    title="Delete Notice"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Broadcast Announcement */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="erp-card" style={{ width: '520px', padding: '28px', backgroundColor: 'rgba(255,255,255,0.98)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              Broadcast Announcement / Homework
            </h3>

            <form onSubmit={handleCreateNotice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Notice Type
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'circular', label: 'School Circular' },
                    { id: 'homework', label: 'Daily Homework' },
                    { id: 'announcement', label: 'Event / Holiday' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`btn ${type === t.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Target Class / Section
                </label>
                <select
                  className="input-field"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Broadcast to All Classes (School-Wide)</option>
                  {feeGroups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Notice Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Science Chapter 4 Revision or Holiday Notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {type === 'homework' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Mathematics"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Submission Due Date
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Full Description / Instructions *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Write the full announcement text or homework details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={posting} className="btn btn-primary" style={{ flex: 1 }}>
                  <Send size={15} />
                  <span>{posting ? 'Publishing...' : 'Publish Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
