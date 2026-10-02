import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Radio, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Play, 
  Square, 
  Copy, 
  Database,
  Terminal,
  Clock
} from 'lucide-react';
import { Dataset } from '../../types';
import { generateColumnsFromData } from '../../utils/dataEngine';

interface ApiCollectorProps {
  onImportComplete: (dataset: Dataset) => void;
  activeDataset: Dataset | null;
  onAppendToActive: (newRows: Record<string, any>[]) => void;
}

const PRESET_APIS = [
  {
    name: 'Global Weather Forecast (Open-Meteo)',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2',
    method: 'GET',
    dataPath: 'hourly',
    description: 'Hourly temperature, humidity, and wind speed forecasts for New York City.',
  },
  {
    name: 'E-Commerce Catalog & Ratings (DummyJSON)',
    url: 'https://dummyjson.com/products?limit=15',
    method: 'GET',
    dataPath: 'products',
    description: 'E-commerce products with prices, ratings, inventory stock, and categories.',
  },
  {
    name: 'GitHub Top Trending Repositories',
    url: 'https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc&per_page=15',
    method: 'GET',
    dataPath: 'items',
    description: 'Top starred open source software repositories, stars count, and license tags.',
  },
  {
    name: 'Sample User Directory (JSONPlaceholder)',
    url: 'https://jsonplaceholder.typicode.com/users',
    method: 'GET',
    dataPath: '',
    description: 'Standard mock REST API endpoint with user profiles and company affiliations.',
  }
];

export const ApiCollector: React.FC<ApiCollectorProps> = ({
  onImportComplete,
  activeDataset,
  onAppendToActive,
}) => {
  const [subTab, setSubTab] = useState<'rest' | 'webhook'>('rest');
  
  // REST API state
  const [apiUrl, setApiUrl] = useState('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiHeaders, setApiHeaders] = useState('');
  const [dataPath, setDataPath] = useState('hourly');
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [extractedRows, setExtractedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Live polling state
  const [pollingActive, setPollingActive] = useState(false);
  const [pollIntervalSec, setPollIntervalSec] = useState(10);
  const [pollCount, setPollCount] = useState(0);

  // Webhook state
  const [webhookChannel, setWebhookChannel] = useState('stream_' + Math.random().toString(36).substring(2, 7));
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookListening, setWebhookListening] = useState(true);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Execute REST API Fetch
  const handleFetchApi = async (isBackgroundPoll = false) => {
    if (!apiUrl.trim()) return;
    if (!isBackgroundPoll) {
      setLoading(true);
      setErrorMsg(null);
    }

    try {
      let parsedHeaders = {};
      if (apiHeaders.trim()) {
        try {
          parsedHeaders = JSON.parse(apiHeaders);
        } catch {
          // ignore
        }
      }

      const res = await fetch('/api/proxy-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: apiUrl.trim(),
          method: apiMethod,
          headers: parsedHeaders,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${json.status || 500}`);
      }

      setApiResponse(json.data);

      // Extract array based on dataPath
      let targetData = json.data;
      if (dataPath.trim()) {
        const parts = dataPath.split('.');
        for (const p of parts) {
          if (targetData && typeof targetData === 'object') {
            targetData = targetData[p];
          }
        }
      }

      // Handle hourly objects where keys contain parallel arrays (like Open-Meteo)
      if (targetData && typeof targetData === 'object' && !Array.isArray(targetData)) {
        const keys = Object.keys(targetData);
        if (keys.length > 0 && Array.isArray(targetData[keys[0]])) {
          const rowLength = targetData[keys[0]].length;
          const rows: Record<string, any>[] = [];
          for (let i = 0; i < rowLength; i++) {
            const r: Record<string, any> = {};
            for (const k of keys) {
              r[k] = targetData[k][i];
            }
            rows.push(r);
          }
          targetData = rows;
        }
      }

      if (!Array.isArray(targetData)) {
        if (typeof targetData === 'object' && targetData !== null) {
          targetData = [targetData];
        } else {
          throw new Error('Extracted data is not a valid list of records. Check your Data Path selector.');
        }
      }

      setExtractedRows(targetData);
      if (isBackgroundPoll && activeDataset && targetData.length > 0) {
        onAppendToActive(targetData);
        setPollCount(c => c + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch API endpoint');
      if (isBackgroundPoll) setPollingActive(false);
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  // Polling loop
  useEffect(() => {
    let intervalId: any = null;
    if (pollingActive) {
      intervalId = setInterval(() => {
        handleFetchApi(true);
      }, pollIntervalSec * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingActive, pollIntervalSec, apiUrl, apiMethod, dataPath, activeDataset]);

  // Webhook listener polling
  useEffect(() => {
    let timer: any = null;
    if (webhookListening && subTab === 'webhook') {
      const fetchLogs = async () => {
        try {
          const res = await fetch(`/api/webhook/logs/${webhookChannel}`);
          if (res.ok) {
            const data = await res.json();
            setWebhookLogs(data.logs || []);
          }
        } catch {
          // ignore
        }
      };

      fetchLogs();
      timer = setInterval(fetchLogs, 2000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [webhookListening, subTab, webhookChannel]);

  const handleSaveAsDataset = (name: string, rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) return;
    const columns = generateColumnsFromData(rows);
    const newDs: Dataset = {
      id: 'ds_api_' + Date.now(),
      name: name || 'API Ingested Dataset',
      description: `Collected ${rows.length} records via REST API (${apiUrl}) on ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'api',
      columns,
      data: rows,
    };
    onImportComplete(newDs);
  };

  const handleSaveWebhookLogsAsDataset = () => {
    if (webhookLogs.length === 0) return;
    const rows = webhookLogs.map(l => {
      const payloadObj = typeof l.payload === 'object' && l.payload !== null ? l.payload : { message: l.payload };
      return {
        event_id: l.id,
        received_at: l.timestamp,
        channel: l.source,
        ...payloadObj,
      };
    });

    const columns = generateColumnsFromData(rows);
    const newDs: Dataset = {
      id: 'ds_webhook_' + Date.now(),
      name: `Webhook Stream (${webhookChannel})`,
      description: `Collected ${rows.length} real-time webhook events on channel ${webhookChannel}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'api',
      columns,
      data: rows,
    };
    onImportComplete(newDs);
  };

  const fullWebhookUrl = `${window.location.origin}/api/webhook/receive/${webhookChannel}`;
  const sampleCurl = `curl -X POST "${fullWebhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"device_id": "sensor_9", "metric_val": 42.5, "status": "active"}'`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          Live REST API & Webhook Ingestion Engine
        </h2>
        <p className="text-xs text-slate-400">Stream external data into structured datasets via REST APIs, automated polling cycles, and incoming Webhook HTTP POST listeners.</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setSubTab('rest')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            subTab === 'rest'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>REST API Fetcher & Polling</span>
        </button>

        <button
          onClick={() => setSubTab('webhook')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            subTab === 'webhook'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Live Webhook Endpoint ({webhookLogs.length} events)</span>
        </button>
      </div>

      {/* SUBTAB 1: REST API */}
      {subTab === 'rest' && (
        <div className="space-y-6">
          
          {/* Preset APIs */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Preset Open APIs</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {PRESET_APIS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setApiUrl(preset.url);
                    setApiMethod(preset.method as any);
                    setDataPath(preset.dataPath);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-all text-xs"
                >
                  <p className="font-semibold text-cyan-300 truncate">{preset.name}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint Config Box */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">HTTP Method</label>
                <select
                  value={apiMethod}
                  onChange={e => setApiMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1">Target API URL Endpoint</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/data"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Data Path Selector (e.g. data, items)</label>
                <input
                  type="text"
                  value={dataPath}
                  onChange={e => setDataPath(e.target.value)}
                  placeholder="e.g. data or items"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Fetch & Polling Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleFetchApi(false)}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Fetching...' : 'Fetch Once'}</span>
                </button>

                {activeDataset && (
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-300">Live Polling:</span>
                    <select
                      value={pollIntervalSec}
                      onChange={e => setPollIntervalSec(Number(e.target.value))}
                      disabled={pollingActive}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
                    >
                      <option value={5}>Every 5s</option>
                      <option value={10}>Every 10s</option>
                      <option value={30}>Every 30s</option>
                      <option value={60}>Every 60s</option>
                    </select>

                    <button
                      onClick={() => setPollingActive(!pollingActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        pollingActive
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {pollingActive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{pollingActive ? `Stop Polling (${pollCount} added)` : 'Start Polling'}</span>
                    </button>
                  </div>
                )}
              </div>

              {extractedRows && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveAsDataset('API Stream - ' + new Date().toLocaleTimeString(), extractedRows)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Create New Dataset ({extractedRows.length} rows)</span>
                  </button>

                  {activeDataset && (
                    <button
                      onClick={() => onAppendToActive(extractedRows)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Append to Active ({activeDataset.name})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results Table */}
          {extractedRows && extractedRows.length > 0 && (
            <div className="space-y-3 p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Successfully Ingested {extractedRows.length} Records
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-64">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2 w-8 text-slate-600">#</th>
                      {Object.keys(extractedRows[0]).slice(0, 10).map(key => (
                        <th key={key} className="p-2 font-semibold text-slate-200">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {extractedRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2 text-slate-600 text-[10px]">{idx + 1}</td>
                        {Object.keys(extractedRows[0]).slice(0, 10).map(key => (
                          <td key={key} className="p-2 text-slate-300 truncate max-w-xs text-[11px]">
                            {String(row[key] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 2: WEBHOOK RECEIVER */}
      {subTab === 'webhook' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Your Dedicated Webhook Endpoint</h3>
              <p className="text-xs text-slate-400">Send JSON HTTP POST payloads to this URL from any external server, Zapier, Stripe, GitHub, or IoT device.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-cyan-300 truncate">{fullWebhookUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fullWebhookUrl);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 3000);
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shrink-0 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCurl ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>

            {/* Test with cURL */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3" /> Test in Terminal with cURL:
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all">
                {sampleCurl}
              </pre>
            </div>
          </div>

          {/* Live Ingestion Stream Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-sm font-bold text-white">Incoming Event Stream ({webhookLogs.length} events)</h3>
              </div>

              {webhookLogs.length > 0 && (
                <button
                  onClick={handleSaveWebhookLogsAsDataset}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Convert {webhookLogs.length} Events to Dataset</span>
                </button>
              )}
            </div>

            {webhookLogs.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
                <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400 font-medium">Listening for incoming HTTP POST payloads on channel "{webhookChannel}"...</p>
                <p className="text-[11px] text-slate-500">Run the cURL command above to see live events arrive here instantly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Event ID</th>
                      <th className="p-2.5">Payload Content</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {webhookLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2.5 text-cyan-300 text-[11px]">{log.id}</td>
                        <td className="p-2.5 text-emerald-300 font-mono text-[11px]">
                          {JSON.stringify(log.payload)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
