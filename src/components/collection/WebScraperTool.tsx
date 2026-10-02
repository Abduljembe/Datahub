import React, { useState } from 'react';
import { 
  FileCode2, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Database,
  Code2
} from 'lucide-react';
import { Dataset } from '../../types';
import { generateColumnsFromData } from '../../utils/dataEngine';

interface WebScraperToolProps {
  onImportComplete: (dataset: Dataset) => void;
  activeDataset: Dataset | null;
  onAppendToActive: (newRows: Record<string, any>[]) => void;
}

export const WebScraperTool: React.FC<WebScraperToolProps> = ({
  onImportComplete,
  activeDataset,
  onAppendToActive,
}) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [extractedRows, setExtractedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'paste' | 'url'>('paste');

  const parseHtmlTable = (html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (!table) throw new Error('No <table> element found in HTML snippet.');

      const headers: string[] = [];
      const ths = table.querySelectorAll('th');
      if (ths.length > 0) {
        ths.forEach((th, idx) => {
          const text = th.textContent?.trim() || `col_${idx + 1}`;
          headers.push(text.replace(/[^a-zA-Z0-9_ ]/g, '').trim().replace(/\s+/g, '_').toLowerCase() || `col_${idx + 1}`);
        });
      }

      const rows: Record<string, any>[] = [];
      const trs = table.querySelectorAll('tr');

      trs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length === 0) return; // probably header row

        const row: Record<string, any> = {};
        tds.forEach((td, idx) => {
          const colName = headers[idx] || `col_${idx + 1}`;
          const rawText = td.textContent?.trim() || '';
          // Clean numbers with commas or dollar signs
          const cleanNum = rawText.replace(/[\$,]/g, '');
          const num = Number(cleanNum);
          row[colName] = !isNaN(num) && cleanNum !== '' ? num : rawText;
        });

        if (Object.keys(row).length > 0) {
          rows.push(row);
        }
      });

      if (rows.length === 0) throw new Error('No valid row records extracted from table.');

      setExtractedRows(rows);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse HTML table.');
      setExtractedRows(null);
    }
  };

  const handleFetchUrlTable = async () => {
    if (!targetUrl.trim()) return;
    setLoadingUrl(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/proxy-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim(), method: 'GET' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch webpage');
      
      const html = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
      parseHtmlTable(html);
    } catch (err: any) {
      setErrorMsg(err.message || 'Scraper failed to retrieve table from URL. Try copying HTML source manually into the paste box.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleSaveAsDataset = (createAsNew: boolean) => {
    if (!extractedRows || extractedRows.length === 0) return;

    if (!createAsNew && activeDataset) {
      onAppendToActive(extractedRows);
      setExtractedRows(null);
      return;
    }

    const columns = generateColumnsFromData(extractedRows);
    const newDs: Dataset = {
      id: 'ds_scrape_' + Date.now(),
      name: 'Web Extracted Table',
      description: `Extracted ${extractedRows.length} rows from HTML table.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'manual',
      columns,
      data: extractedRows,
    };
    onImportComplete(newDs);
    setExtractedRows(null);
  };

  const sampleHtmlSnippet = `<table>
  <thead>
    <tr>
      <th>Country</th>
      <th>GDP_Nominal_Billions</th>
      <th>Region</th>
      <th>Growth_Rate</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>United States</td><td>26854</td><td>Americas</td><td>2.1</td></tr>
    <tr><td>China</td><td>19373</td><td>Asia</td><td>4.5</td></tr>
    <tr><td>Germany</td><td>4430</td><td>Europe</td><td>0.3</td></tr>
    <tr><td>Japan</td><td>4230</td><td>Asia</td><td>1.2</td></tr>
    <tr><td>India</td><td>3750</td><td>Asia</td><td>6.8</td></tr>
  </tbody>
</table>`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-amber-400" />
          Web Table Scraper & HTML Extractor
        </h2>
        <p className="text-xs text-slate-400">Extract structured data tables from website HTML, Wikipedia pages, or inspect elements into clean datasets.</p>
      </div>

      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setMode('paste')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            mode === 'paste'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Paste HTML Table Markup</span>
        </button>

        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            mode === 'url'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Fetch Public Webpage URL</span>
        </button>
      </div>

      {mode === 'paste' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">Paste HTML &lt;table&gt; Code Snippet</label>
            <button
              onClick={() => setHtmlInput(sampleHtmlSnippet)}
              className="text-[11px] text-amber-400 hover:underline"
            >
              Insert Sample HTML Table
            </button>
          </div>

          <textarea
            rows={8}
            value={htmlInput}
            onChange={e => setHtmlInput(e.target.value)}
            placeholder="<table>\n  <tr><th>Header 1</th><th>Header 2</th></tr>\n  <tr><td>Value 1</td><td>Value 2</td></tr>\n</table>"
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
          />

          <button
            onClick={() => parseHtmlTable(htmlInput)}
            disabled={!htmlInput.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Extract & Parse HTML Table</span>
          </button>
        </div>
      )}

      {mode === 'url' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">Webpage URL with Table</label>
            <input
              type="text"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://example.com/data-table"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleFetchUrlTable}
            disabled={loadingUrl || !targetUrl.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>{loadingUrl ? 'Scraping Webpage Table...' : 'Fetch & Extract Table'}</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {extractedRows && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Extracted {extractedRows.length} Rows from Web Table
              </h3>
              <p className="text-xs text-slate-400">Headers and cells sanitized for statistical computation.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAsDataset(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Save as New Dataset</span>
              </button>

              {activeDataset && (
                <button
                  onClick={() => handleSaveAsDataset(false)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Append to Active ({activeDataset.name})</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-64">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2.5 w-8 text-slate-600">#</th>
                  {Object.keys(extractedRows[0]).map(key => (
                    <th key={key} className="p-2.5 font-semibold text-slate-200">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {extractedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-slate-600 text-[10px]">{idx + 1}</td>
                    {Object.keys(extractedRows[0]).map(key => (
                      <td key={key} className="p-2.5 text-slate-300 truncate max-w-xs text-[11px]">
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
  );
};
