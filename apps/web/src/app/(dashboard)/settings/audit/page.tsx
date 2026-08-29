// apps/web/src/app/(dashboard)/settings/audit/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, Search, Filter, Clock, User, Building2, Activity, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit', {
        params: {
          action: filterAction || undefined,
          resourceType: filterResource || undefined,
          limit: 100,
        },
      });
      setLogs(res.data.logs);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/audit/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to fetch summary', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [filterAction, filterResource]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.resourceType?.toLowerCase().includes(term) ||
      log.user?.fullName?.toLowerCase().includes(term) ||
      log.user?.email?.toLowerCase().includes(term)
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Audit Logs
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
              SYS-AUD-01
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track all system actions, user activities, and resource changes
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Total Logs</p>
                <p className="text-2xl font-extrabold text-slate-900">{summary.totalLogs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Top Action</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {summary.topActions?.[0]?.action || 'N/A'}
                </p>
                <p className="text-[10px] text-slate-500">{summary.topActions?.[0]?.count || 0} events</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Top Resource</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {summary.topResources?.[0]?.resourceType || 'N/A'}
                </p>
                <p className="text-[10px] text-slate-500">{summary.topResources?.[0]?.count || 0} events</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Recent Activity</p>
                <p className="text-sm font-bold text-slate-900">
                  {summary.recentActivity?.[0]?.action || 'N/A'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {summary.recentActivity?.[0]?.user?.fullName || 'System'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs by action, resource, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">All Resources</option>
            <option value="Batch">Batch</option>
            <option value="Test">Test</option>
            <option value="User">User</option>
            <option value="Subject">Subject</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-[10px] flex items-center justify-center">
                          {log.user?.fullName?.[0] || 'S'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {log.user?.fullName || 'System'}
                          </span>
                          <span className="text-[10px] text-slate-400">{log.user?.email || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {log.resourceType}
                      {log.resourceId && (
                        <span className="text-slate-400 ml-1">#{log.resourceId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
