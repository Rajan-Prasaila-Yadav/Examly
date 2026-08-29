// apps/web/src/app/(dashboard)/settings/roles/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Check, Save, Sparkles, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resources = [
    { key: 'batches', name: 'Batches & Academic Classes' },
    { key: 'subjects', name: 'Subjects & Curriculum' },
    { key: 'lessons', name: 'Lessons & Chapters' },
    { key: 'videos', name: 'Video Lectures & Streams' },
    { key: 'notes', name: 'PDF Notes & Handouts' },
    { key: 'tests', name: 'Live Tests & Question Bank' },
    { key: 'students', name: 'Student Records & Enrollment' },
    { key: 'teachers', name: 'Faculty Teachers Management' },
    { key: 'community', name: 'Community Feed & Polls' },
    { key: 'chat', name: '1-on-1 Doubt Solving' },
  ];

  const actions = ['create', 'read', 'update', 'delete', 'publish'];

  // Matrix State: resource -> array of granted actions
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>({
    batches: ['read'],
    subjects: ['read'],
    lessons: ['read'],
    videos: ['create', 'read', 'update'],
    notes: ['create', 'read', 'update'],
    tests: ['create', 'read', 'update', 'publish'],
    students: ['read'],
    teachers: ['read'],
    community: ['create', 'read', 'update'],
    chat: ['create', 'read', 'update'],
  });

  const fetchRoles = async () => {
    try {
      const res = await api.get('/users/roles');
      setRoles(res.data);
      if (res.data.length > 0) {
        const firstRole = res.data[0];
        setSelectedRoleId(firstRole.id);
        mapRolePermissions(firstRole);
      }
    } catch (e) {
      console.error('Failed to fetch roles', e);
    } finally {
      setIsLoading(false);
    }
  };

  const mapRolePermissions = (roleObj: any) => {
    const matrix: Record<string, string[]> = {};
    (roleObj.permissions || []).forEach((p: any) => {
      if (!matrix[p.resource]) {
        matrix[p.resource] = [];
      }
      matrix[p.resource].push(p.action);
    });
    setPermissionsMatrix(matrix);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    const roleObj = roles.find((r) => r.id === roleId);
    if (roleObj) {
      mapRolePermissions(roleObj);
    }
  };

  const handleToggle = (resource: string, action: string) => {
    setPermissionsMatrix((prev) => {
      const current = prev[resource] || [];
      const hasAction = current.includes(action);
      const updated = hasAction ? current.filter((a) => a !== action) : [...current, action];
      return { ...prev, [resource]: updated };
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    try {
      const permsArray: { resource: string; action: string }[] = [];
      Object.entries(permissionsMatrix).forEach(([resource, acts]) => {
        acts.forEach((action) => {
          permsArray.push({ resource, action });
        });
      });

      await api.put(`/users/roles/${selectedRoleId}/matrix`, {
        permissions: permsArray,
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      fetchRoles();
    } catch (e) {
      alert('Failed to save permissions matrix');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Dynamic RBAC & Role Permission Matrix
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
              SCR-ADM-23
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic resource action grants with instant session invalidation and database synchronization.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {isSaved ? 'Matrix Saved to Database!' : 'Save Dynamic Matrix'}
        </button>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        {roles.length > 0 ? (
          roles.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRoleChange(r.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedRoleId === r.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{r.code === 'TEACHER' ? '👨‍🏫' : r.code === 'ADMIN' ? '👔' : '🎓'}</span>
              <span>{r.name}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-xs font-semibold text-slate-500">Loading roles...</div>
        )}
      </div>

      {/* Matrix Table (SCR-ADM-23) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            Permissions Matrix: {roles.find((r) => r.id === selectedRoleId)?.name || 'Faculty Role'}
          </h2>
          <span className="text-xs text-slate-400 font-mono">Resource × Action Grants</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">System Resource</th>
                {actions.map((act) => (
                  <th key={act} className="py-3.5 px-4 text-center capitalize">
                    {act}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {resources.map((res) => {
                const currentActions = permissionsMatrix[res.key] || [];

                return (
                  <tr key={res.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{res.name}</td>

                    {actions.map((act) => {
                      const isGranted = currentActions.includes(act);

                      return (
                        <td key={act} className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => handleToggle(res.key, act)}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-all cursor-pointer"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
