import React, { useState, useMemo, useEffect } from 'react';
import {
  Building,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  Clock,
  Radio,
  Sliders,
  Send,
  CornerDownRight,
  ChevronRight,
  ChevronDown,
  FileText,
  Phone,
  Mail,
  Zap,
  Info
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Dataset, ColumnMeta } from '../../types';
import {
  KENYA_COUNTIES,
  CountySupervisor,
  CountyDispatchBatch,
  CountyCleanedRecord,
  CountySummaryStat,
  getStoredCountySupervisors,
  saveStoredCountySupervisors,
  getStoredCountyDispatches,
  saveStoredCountyDispatches,
  adminAcknowledgeBatch,
  adminIngestBatch,
  adminReturnBatchToSupervisor,
  computeCountySummaryMetrics,
  simulateFieldToSupervisorToAdminFlow,
  convertCountyCleanedRecordsToFlatData
} from '../../utils/countySupervisorEngine';
import { exportToCSV, exportToExcel } from '../../utils/dataEngine';
import { logTelemetryEvent } from '../../utils/telemetryEngine';

interface CountySupervisorCommandHubProps {
  activeDataset?: Dataset | null;
  datasets?: Dataset[];
  onAppendRowsToActive?: (newRows: Record<string, any>[]) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const CountySupervisorCommandHub: React.FC<CountySupervisorCommandHubProps> = ({
  activeDataset,
  datasets = [],
  onAppendRowsToActive,
  onCreateDataset,
  onNavigateToTab
}) => {
  const { isDark } = useTheme();

  // State
  const [supervisors, setSupervisors] = useState<CountySupervisor[]>(() => getStoredCountySupervisors());
  const [dispatches, setDispatches] = useState<CountyDispatchBatch[]>(() => getStoredCountyDispatches());
  const [metrics, setMetrics] = useState(() => computeCountySummaryMetrics());

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCounty, setSelectedCounty] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'sent_to_admin' | 'admin_ingested' | 'returned_with_notes'>('ALL');

  // Inspection Modal State
  const [inspectingBatch, setInspectingBatch] = useState<CountyDispatchBatch | null>(null);
  const [inspectRecordQuery, setInspectRecordQuery] = useState<string>('');

  // Return with Notes Modal State
  const [returnModalBatch, setReturnModalBatch] = useState<CountyDispatchBatch | null>(null);
  const [returnFeedbackNotes, setReturnFeedbackNotes] = useState<string>('');

  // Ingestion Notification State
  const [ingestionToast, setIngestionToast] = useState<{ message: string; batchId: string } | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Sync with localStorage updates
  const refreshData = () => {
    const sups = getStoredCountySupervisors();
    const disp = getStoredCountyDispatches();
    setSupervisors(sups);
    setDispatches(disp);
    setMetrics(computeCountySummaryMetrics());
  };

  useEffect(() => {
    const handleDispatchesUpdate = () => refreshData();
    const handleSupervisorsUpdate = () => refreshData();

    window.addEventListener('datahub_county_dispatches_updated', handleDispatchesUpdate);
    window.addEventListener('datahub_county_supervisors_updated', handleSupervisorsUpdate);

    return () => {
      window.removeEventListener('datahub_county_dispatches_updated', handleDispatchesUpdate);
      window.removeEventListener('datahub_county_supervisors_updated', handleSupervisorsUpdate);
    };
  }, []);

  // Filtered Counties
  const filteredCounties = useMemo(() => {
    return metrics.countyBreakdowns.filter(c => {
      const matchesSearch = c.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.countyCode.includes(searchQuery) ||
        c.capital.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === 'ALL' || c.region === selectedRegion;
      const matchesCountySelect = selectedCounty === 'ALL' || c.county === selectedCounty;
      return matchesSearch && matchesRegion && matchesCountySelect;
    });
  }, [metrics, searchQuery, selectedRegion, selectedCounty]);

  // Filtered Supervisors
  const filteredSupervisors = useMemo(() => {
    return supervisors.filter(s => {
      const matchesCounty = selectedCounty === 'ALL' || s.county.toLowerCase() === selectedCounty.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.badgeId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCounty && (selectedCounty !== 'ALL' || matchesSearch);
    });
  }, [supervisors, selectedCounty, searchQuery]);

  // Filtered Dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter(d => {
      const matchesCounty = selectedCounty === 'ALL' || d.county.toLowerCase() === selectedCounty.toLowerCase();
      const matchesStatus = selectedStatusFilter === 'ALL' || d.status === selectedStatusFilter;
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.supervisorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.county.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCounty && matchesStatus && matchesSearch;
    });
  }, [dispatches, selectedCounty, selectedStatusFilter, searchQuery]);

  // Handlers for Admin Actions
  const handleAcknowledge = (batchId: string) => {
    adminAcknowledgeBatch(batchId);
    refreshData();
    logTelemetryEvent({
      module: 'SUPERVISOR',
      action: 'Admin Acknowledged County Batch',
      severity: 'INFO',
      user: 'Central Admin Office',
      userRole: 'Administrator',
      details: `Batch ${batchId} marked as received at HQ.`,
      status: 'COMPLETED'
    });
  };

  const handleIngestBatchToDataset = (batch: CountyDispatchBatch) => {
    adminIngestBatch(batch.batchId);
    const flatRows = convertCountyCleanedRecordsToFlatData(batch.records);

    if (onCreateDataset) {
      // Create a fresh master dataset for this county or append
      const firstRow = flatRows[0] || {};
      const columns: ColumnMeta[] = Object.keys(firstRow).map((key, idx) => {
        const val = firstRow[key];
        let type: any = 'string';
        if (typeof val === 'number') type = 'number';
        else if (typeof val === 'boolean') type = 'boolean';
        return {
          id: `col_${idx}`,
          name: key,
          type,
          nullable: true
        };
      });

      const newDataset: Dataset = {
        id: `ds_county_${batch.countyCode}_${Date.now()}`,
        name: `${batch.county} County Cleaned Master (${batch.records.length} records)`,
        description: `Verified and cleaned field dataset from Supervisor ${batch.supervisorName} (${batch.supervisorBadge}), dispatched to Central Admin Office on ${new Date(batch.sentAt).toLocaleDateString()}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceType: 'form',
        columns,
        data: flatRows
      };

      onCreateDataset(newDataset);
    } else if (onAppendRowsToActive && activeDataset) {
      onAppendRowsToActive(flatRows);
    }

    refreshData();

    setIngestionToast({
      message: `Successfully ingested ${batch.recordCount} verified records from ${batch.county} County into Central Master Datasets!`,
      batchId: batch.batchId
    });

    logTelemetryEvent({
      module: 'SUPERVISOR',
      action: 'County Data Ingested to Central Master',
      severity: 'SUCCESS',
      user: 'Central Admin Office',
      userRole: 'Administrator',
      details: `Ingested ${batch.recordCount} cleaned records from ${batch.supervisorName} (${batch.county} County) into active analytics repository.`,
      status: 'COMPLETED'
    });

    setTimeout(() => setIngestionToast(null), 5000);
  };

  const handleOpenReturnModal = (batch: CountyDispatchBatch) => {
    setReturnModalBatch(batch);
    setReturnFeedbackNotes('');
  };

  const handleConfirmReturn = () => {
    if (!returnModalBatch) return;
    adminReturnBatchToSupervisor(returnModalBatch.batchId, returnFeedbackNotes || 'Returned by Admin Office for re-audit.');
    refreshData();
    setReturnModalBatch(null);

    logTelemetryEvent({
      module: 'SUPERVISOR',
      action: 'Batch Returned to Field Supervisor',
      severity: 'WARNING',
      user: 'Central Admin Office',
      userRole: 'Administrator',
      details: `Returned batch ${returnModalBatch.batchId} to Supervisor ${returnModalBatch.supervisorName} with instructions: "${returnFeedbackNotes}"`,
      status: 'COMPLETED'
    });
  };

  // Run real-time simulation
  const handleSimulateFlow = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const result = simulateFieldToSupervisorToAdminFlow(selectedCounty !== 'ALL' ? selectedCounty : undefined);
      refreshData();
      setIsSimulating(false);

      setIngestionToast({
        message: `Field Simulation Complete: Supervisor ${result.supervisor.name} in ${result.supervisor.county} County received ${result.newRecordsCount} records from enumerators, cleaned them, and dispatched to Admin!`,
        batchId: result.batch.batchId
      });
      setTimeout(() => setIngestionToast(null), 6000);
    }, 700);
  };

  // Export Cleaned County Data to CSV
  const handleExportCountyCSV = (batch: CountyDispatchBatch) => {
    const flatRows = convertCountyCleanedRecordsToFlatData(batch.records);
    const firstRow = flatRows[0] || {};
    const columns: ColumnMeta[] = Object.keys(firstRow).map((key, idx) => ({
      id: `col_${idx}`,
      name: key,
      type: typeof firstRow[key] === 'number' ? 'number' : 'string',
      nullable: true
    }));
    const dataset: Dataset = {
      id: `export_${batch.batchId}`,
      name: `${batch.county}_County_Cleaned_Data_${batch.batchId}`,
      description: `Cleaned county dataset from Supervisor ${batch.supervisorName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'form',
      columns,
      data: flatRows
    };
    exportToCSV(dataset, `${batch.county}_County_Cleaned_Data_${batch.batchId}`);
  };

  const handleExportAllCountiesExcel = () => {
    const allRecords: CountyCleanedRecord[] = [];
    dispatches.forEach(d => allRecords.push(...d.records));
    const flatRows = convertCountyCleanedRecordsToFlatData(allRecords);
    const firstRow = flatRows[0] || {};
    const columns: ColumnMeta[] = Object.keys(firstRow).map((key, idx) => ({
      id: `col_${idx}`,
      name: key,
      type: typeof firstRow[key] === 'number' ? 'number' : 'string',
      nullable: true
    }));
    const dataset: Dataset = {
      id: `export_all_counties_${Date.now()}`,
      name: `All_Counties_Cleaned_Master_Export`,
      description: `Consolidated cleaned records across all Kenya counties`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'form',
      columns,
      data: flatRows
    };
    exportToExcel(dataset, `All_Counties_Cleaned_Master_Export_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Toast Notification Banner */}
      {ingestionToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-indigo-950/70 to-slate-900 border border-emerald-500/40 text-white flex items-center justify-between shadow-xl animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">{ingestionToast.message}</p>
              <p className="text-[11px] text-slate-400 font-mono">Batch Reference: {ingestionToast.batchId}</p>
            </div>
          </div>
          <button
            onClick={() => setIngestionToast(null)}
            className="text-xs text-slate-400 hover:text-white font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. OFFICE COMMAND CENTER BANNER */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950 border-slate-800 shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Central Office Command: County Field Supervisors & Cleaned Data Vault
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
                  Office Ingest Live
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Supervisors collect raw field data from enumerators across all 47 counties, apply cleaning & validation recipes, and transmit certified dossiers directly to this central Admin office console.
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleSimulateFlow}
              disabled={isSimulating}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
              title="Simulate an enumerator collecting data, supervisor cleaning it, and dispatching to Admin office"
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Transmitting Batch...' : 'Simulate Field-to-Admin Flow'}</span>
            </button>

            <button
              onClick={handleExportAllCountiesExcel}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
              title="Download consolidated Excel of all cleaned county records"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Counties Excel</span>
            </button>

            <button
              onClick={refreshData}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Refresh county dispatches and metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Metric 1: Monitored Counties */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Active Counties</span>
            <MapPin className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{metrics.totalCountiesMonitored}</span>
            <span className="text-xs text-slate-400 font-medium">/ 47 Total</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">National Field Network</p>
        </div>

        {/* Metric 2: Field Supervisors */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">County Supervisors</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{metrics.totalSupervisorsAcrossCounties}</span>
            <span className="text-xs text-slate-400 font-medium">deployed</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">{metrics.totalEnumeratorsAcrossCounties} Enumerators Reporting</p>
        </div>

        {/* Metric 3: Raw Collected */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Raw Collected</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-300 font-mono">{metrics.totalRecordsCollected.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">records</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">From Field Enumerators</p>
        </div>

        {/* Metric 4: Cleaned by Supervisors */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Cleaned by Sups</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-300 font-mono">{metrics.totalRecordsCleaned.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">verified</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Standardized & Imputed</p>
        </div>

        {/* Metric 5: Dispatched to Admin */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Sent to Office</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-300 font-mono">{metrics.totalDispatchedToAdmin.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">inbox</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">{dispatches.length} Total Batches</p>
        </div>

        {/* Metric 6: Ingested to Master */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Ingested to Master</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">{metrics.totalIngestedByAdmin.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">active</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Quality: {metrics.overallFleetQualityScore}%</p>
        </div>

      </div>

      {/* 3. COUNTY NAVIGATOR & FILTER BAR */}
      <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by County name, code (e.g. 047, Nairobi), or Supervisor name..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="ALL">All Regions (Kenya 47 Counties)</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Central">Central</option>
              <option value="Coast">Coast</option>
              <option value="Rift Valley">Rift Valley</option>
              <option value="Western">Western</option>
              <option value="Nyanza">Nyanza</option>
              <option value="Eastern">Eastern</option>
              <option value="North Eastern">North Eastern</option>
            </select>
          </div>

          {/* County Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">County:</span>
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="ALL">All Counties</option>
              {KENYA_COUNTIES.map(c => (
                <option key={c.code} value={c.name}>
                  {c.name} (Code {c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedCounty !== 'ALL' || selectedRegion !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCounty('ALL');
                setSelectedRegion('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-all shrink-0"
            >
              Reset Filters
            </button>
          )}

        </div>

        {/* Quick County Chips for Top Counties */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Select:</span>
          {['Nairobi', 'Kiambu', 'Mombasa', 'Nakuru', 'Kisumu', 'Uasin Gishu', 'Machakos', 'Kilifi'].map(cName => {
            const isSelected = selectedCounty === cName;
            return (
              <button
                key={cName}
                onClick={() => setSelectedCounty(isSelected ? 'ALL' : cName)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: TWO COLUMNS (Left: Counties & Supervisors; Right: Cleaned Data Batches Received in Office) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: COUNTY SUPERVISORS DIRECTORY (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Supervisors by County ({filteredSupervisors.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {selectedCounty === 'ALL' ? 'All Counties' : `${selectedCounty} County`}
            </span>
          </div>

          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredSupervisors.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                No supervisors matching the selected county filter. Try resetting filters or selecting a different county.
              </div>
            ) : (
              filteredSupervisors.map(sup => {
                const isSelected = selectedCounty === sup.county;
                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedCounty(sup.county)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Supervisor Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${sup.avatarGradient} text-white font-bold text-xs flex items-center justify-center shadow-md`}>
                          {sup.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">{sup.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {sup.badgeId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{sup.role}</p>
                        </div>
                      </div>

                      {/* County Pill */}
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-cyan-300 border border-slate-700">
                        {sup.county} (Code {sup.countyCode})
                      </span>
                    </div>

                    {/* Sub-counties Tagging */}
                    <div className="mt-3 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-500">Sub-Counties:</span>
                      {sup.assignedSubCounties.map(sub => (
                        <span key={sub} className="px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 text-[10px]">
                          {sub}
                        </span>
                      ))}
                    </div>

                    {/* Enumerators Reporting */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-bold flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-400" />
                          <span>Enumerators in Field ({sup.assignedEnumerators.length}):</span>
                        </span>
                        <span className="font-mono text-emerald-400 font-semibold">{sup.avgQualityScore}% Quality</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sup.assignedEnumerators.map(e => (
                          <span key={e.id} className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{e.name} ({e.collectedCount} collected)</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Supervisor Stats Row */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Collected</span>
                        <span className="text-slate-300 font-bold">{sup.totalCollected}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Cleaned</span>
                        <span className="text-purple-300 font-bold">{sup.totalCleaned}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Sent to Admin</span>
                        <span className="text-emerald-400 font-bold">{sup.totalDispatchedToAdmin}</span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CLEANED DATA DISPATCHES INBOX (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Cleaned Data Batches Received at Admin Office ({filteredDispatches.length})</span>
            </h3>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedStatusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStatusFilter('sent_to_admin')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedStatusFilter === 'sent_to_admin' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setSelectedStatusFilter('admin_ingested')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedStatusFilter === 'admin_ingested' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Ingested
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
            {filteredDispatches.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                No cleaned data batches received yet for this selection. Click "Simulate Field-to-Admin Flow" above to simulate real-time submission and dispatch!
              </div>
            ) : (
              filteredDispatches.map(batch => {
                const isPending = batch.status === 'sent_to_admin';
                const isIngested = batch.status === 'admin_ingested';
                const isReturned = batch.status === 'returned_with_notes';

                return (
                  <div
                    key={batch.batchId}
                    className={`p-5 rounded-3xl border transition-all ${
                      isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                            {batch.batchId}
                          </span>
                          <span className="font-bold text-sm text-white">{batch.title}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <span>County: <strong className="text-white">{batch.county} ({batch.countyCode})</strong></span>
                          <span>·</span>
                          <span>Supervisor: <strong className="text-white">{batch.supervisorName}</strong></span>
                          <span>·</span>
                          <span className="font-mono text-[11px]">{new Date(batch.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Received (Pending Ingestion)</span>
                          </span>
                        )}
                        {isIngested && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ingested to Master</span>
                          </span>
                        )}
                        {isReturned && (
                          <span className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Returned to Supervisor</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cleaning Metrics Strip */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono bg-slate-950/50 p-2.5 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Cleaned Rows</span>
                        <span className="text-white font-bold">{batch.recordCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Quality Score</span>
                        <span className="text-emerald-400 font-bold">{batch.avgQualityScore}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Trimmed & Casing</span>
                        <span className="text-slate-300">{batch.cleaningSummary.whitespaceTrimmed + batch.cleaningSummary.casesStandardized}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Phones Standardized</span>
                        <span className="text-cyan-300">{batch.cleaningSummary.phonesFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Outliers Capped</span>
                        <span className="text-amber-300">{batch.cleaningSummary.outliersCapped}</span>
                      </div>
                    </div>

                    {/* Supervisor Signoff Quote */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 italic flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold not-italic text-indigo-300 block text-[11px]">
                          Supervisor Signoff ({batch.supervisorName} - {batch.supervisorBadge}):
                        </span>
                        "{batch.supervisorSignoff}"
                      </div>
                    </div>

                    {/* Returned Feedback Banner if applicable */}
                    {batch.adminFeedback && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                        <strong>Admin Feedback to Supervisor:</strong> {batch.adminFeedback}
                      </div>
                    )}

                    {/* Admin Action Buttons */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        Enumerators: <span className="text-slate-300">{batch.enumeratorsInvolved.join(', ')}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Inspect Records */}
                        <button
                          onClick={() => setInspectingBatch(batch)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Inspect Records ({batch.recordCount})</span>
                        </button>

                        {/* Export CSV */}
                        <button
                          onClick={() => handleExportCountyCSV(batch)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                          title="Download cleaned CSV of this county batch"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          <span>CSV</span>
                        </button>

                        {/* Return to Supervisor */}
                        {!isIngested && (
                          <button
                            onClick={() => handleOpenReturnModal(batch)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-rose-500/30"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Return with Notes</span>
                          </button>
                        )}

                        {/* Ingest to Master Dataset */}
                        {!isIngested ? (
                          <button
                            onClick={() => handleIngestBatchToDataset(batch)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ingest to Master Dataset</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Integrated in Master</span>
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* 5. DETAILED RECORD INSPECTOR MODAL */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{inspectingBatch.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-cyan-500/30">
                      {inspectingBatch.county} County
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Batch Code: <span className="font-mono text-white">{inspectingBatch.batchId}</span> · Verified by Supervisor <span className="text-white">{inspectingBatch.supervisorName} ({inspectingBatch.supervisorBadge})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCountyCSV(inspectingBatch)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => setInspectingBatch(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inspectRecordQuery}
                  onChange={(e) => setInspectRecordQuery(e.target.value)}
                  placeholder="Search records by respondent, enumerator, sub-county..."
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {inspectingBatch.records.length} cleaned records
              </span>
            </div>

            {/* Modal Table Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {inspectingBatch.records
                .filter(r => {
                  if (!inspectRecordQuery) return true;
                  const q = inspectRecordQuery.toLowerCase();
                  return r.recordId.toLowerCase().includes(q) ||
                    r.enumeratorName.toLowerCase().includes(q) ||
                    r.subCounty.toLowerCase().includes(q) ||
                    JSON.stringify(r.cleanedData).toLowerCase().includes(q);
                })
                .map((record, index) => (
                  <div
                    key={record.recordId}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400">#{index + 1} {record.recordId}</span>
                        <span className="text-slate-400">· Captured by: <strong className="text-white">{record.enumeratorName}</strong></span>
                        <span className="text-slate-400">· Sub-County: <strong className="text-white">{record.subCounty}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400 font-mono">{new Date(record.collectedAt).toLocaleTimeString()}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          {record.qualityScore}% Quality
                        </span>
                      </div>
                    </div>

                    {/* Raw vs Cleaned Side by Side Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* Raw Data */}
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block mb-1.5 flex items-center gap-1">
                          <span>Raw Data (Captured by Enumerator)</span>
                        </span>
                        <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                          {JSON.stringify(record.rawData, null, 2)}
                        </pre>
                      </div>

                      {/* Cleaned Data */}
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                        <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Cleaned & Certified (by Supervisor {record.supervisorName})</span>
                        </span>
                        <pre className="text-[11px] font-mono text-emerald-200 whitespace-pre-wrap">
                          {JSON.stringify(record.cleanedData, null, 2)}
                        </pre>
                      </div>

                    </div>

                    {/* Cleaning Rules Applied */}
                    {record.cleaningDiffs && record.cleaningDiffs.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-indigo-300">Cleaning Rules Applied:</span>
                        {record.cleaningDiffs.map((d, dIdx) => (
                          <span key={dIdx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {d.field}: <em>{d.ruleApplied}</em>
                          </span>
                        ))}
                      </div>
                    )}

                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
              <span className="text-xs text-slate-400">
                Supervisor: <strong className="text-white">{inspectingBatch.supervisorName}</strong> ({inspectingBatch.supervisorEmail})
              </span>
              <button
                onClick={() => setInspectingBatch(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. RETURN BATCH TO SUPERVISOR MODAL */}
      {returnModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>Return Batch to Supervisor {returnModalBatch.supervisorName}</span>
              </div>
              <button onClick={() => setReturnModalBatch(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Please enter instructions or required re-cleaning remarks for Supervisor{' '}
              <strong className="text-white">{returnModalBatch.supervisorName}</strong> regarding Batch{' '}
              <span className="font-mono text-cyan-300 font-bold">{returnModalBatch.batchId}</span> ({returnModalBatch.county} County):
            </p>

            <textarea
              rows={4}
              value={returnFeedbackNotes}
              onChange={(e) => setReturnFeedbackNotes(e.target.value)}
              placeholder="e.g., Please re-verify farm acreages in Ward 2 and re-check phone numbers for household respondents."
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReturnModalBatch(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
              >
                Confirm & Return to Field
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
