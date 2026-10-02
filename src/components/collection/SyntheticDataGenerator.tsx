import React, { useState } from 'react';
import { 
  Wand2, 
  Sparkles, 
  Settings2, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  BarChart,
  Cpu
} from 'lucide-react';
import { Dataset } from '../../types';
import { generateColumnsFromData } from '../../utils/dataEngine';
import { requestAiSyntheticData } from '../../services/geminiService';
import { round } from '../../utils/statistics';

interface SyntheticDataGeneratorProps {
  onImportComplete: (dataset: Dataset) => void;
  activeDataset: Dataset | null;
  onAppendToActive: (newRows: Record<string, any>[]) => void;
}

const DOMAIN_RECIPES = [
  {
    id: 'fintech_risk',
    name: 'FinTech Credit Risk & Default Scoring',
    description: 'Borrower credit scores, debt-to-income ratio, annual income, loan amount, and default risk probability.',
    fields: [
      { name: 'loan_id', type: 'id_prefix', prefix: 'LN-' },
      { name: 'annual_income', type: 'normal', mean: 75000, stdDev: 25000, min: 20000, max: 300000 },
      { name: 'credit_score', type: 'normal', mean: 710, stdDev: 55, min: 450, max: 850 },
      { name: 'debt_to_income_ratio', type: 'uniform', min: 0.1, max: 0.55 },
      { name: 'loan_amount', type: 'pareto', scale: 15000, alpha: 1.8 },
      { name: 'loan_purpose', type: 'category', options: ['Debt Consolidation', 'Home Improvement', 'Small Business', 'Auto', 'Education'] },
      { name: 'defaulted', type: 'boolean', probTrue: 0.12 },
    ]
  },
  {
    id: 'healthcare_vitals',
    name: 'Cardiology Patient Biomarkers',
    description: 'Patient age, BMI, systolic blood pressure, resting heart rate, LDL cholesterol, and treatment outcome.',
    fields: [
      { name: 'patient_code', type: 'id_prefix', prefix: 'MED-' },
      { name: 'age', type: 'normal', mean: 58, stdDev: 14, min: 21, max: 92 },
      { name: 'bmi', type: 'normal', mean: 27.5, stdDev: 4.2, min: 18.5, max: 45.0 },
      { name: 'systolic_bp', type: 'normal', mean: 135, stdDev: 18, min: 95, max: 200 },
      { name: 'cholesterol_ldl', type: 'normal', mean: 155, stdDev: 30, min: 80, max: 280 },
      { name: 'treatment_response', type: 'category', options: ['High Response', 'Moderate Response', 'Minimal Response', 'Non-Responder'] },
    ]
  },
  {
    id: 'ecommerce_conversion',
    name: 'Digital Marketing & Conversion Funnel',
    description: 'Traffic channel, session duration, pages viewed, bounce rate, cart value, and converted sale.',
    fields: [
      { name: 'session_id', type: 'id_prefix', prefix: 'SESS-' },
      { name: 'acquisition_channel', type: 'category', options: ['Organic Search', 'Google Ads', 'Meta Social', 'Direct', 'Email Campaign', 'Affiliate'] },
      { name: 'pages_viewed', type: 'poisson', lambda: 4.5 },
      { name: 'session_duration_sec', type: 'exponential', mean: 180 },
      { name: 'cart_value_usd', type: 'pareto', scale: 45, alpha: 1.5 },
      { name: 'device_type', type: 'category', options: ['Mobile iOS', 'Mobile Android', 'Desktop Chrome', 'Desktop Safari'] },
      { name: 'converted', type: 'boolean', probTrue: 0.08 },
    ]
  }
];

export const SyntheticDataGenerator: React.FC<SyntheticDataGeneratorProps> = ({
  onImportComplete,
  activeDataset,
  onAppendToActive,
}) => {
  const [method, setMethod] = useState<'parametric' | 'ai'>('parametric');
  const [selectedRecipeId, setSelectedRecipeId] = useState('fintech_risk');
  const [rowCount, setRowCount] = useState(100);
  
  // AI Prompt State
  const [aiDomain, setAiDomain] = useState('Real Estate Housing & Property Valuation');
  const [aiSchemaPrompt, setAiSchemaPrompt] = useState('Include square_footage, bedrooms, bathrooms, neighborhood_rating (1-10), year_built, hoa_fee, distance_to_metro_km, and sale_price_usd.');
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generated preview
  const [generatedData, setGeneratedData] = useState<Record<string, any>[] | null>(null);

  const selectedRecipe = DOMAIN_RECIPES.find(r => r.id === selectedRecipeId) || DOMAIN_RECIPES[0];

  const handleGenerateParametric = () => {
    setErrorMsg(null);
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {};
      
      selectedRecipe.fields.forEach(field => {
        if (field.type === 'id_prefix') {
          row[field.name] = `${field.prefix}${1000 + i}`;
        } else if (field.type === 'normal') {
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
          let val = field.mean! + z0 * field.stdDev!;
          if (field.min !== undefined) val = Math.max(field.min, val);
          if (field.max !== undefined) val = Math.min(field.max, val);
          row[field.name] = round(val, 2);
        } else if (field.type === 'uniform') {
          const val = field.min! + Math.random() * (field.max! - field.min!);
          row[field.name] = round(val, 2);
        } else if (field.type === 'category') {
          const opts = field.options || [];
          row[field.name] = opts[Math.floor(Math.random() * opts.length)];
        } else if (field.type === 'boolean') {
          row[field.name] = Math.random() < (field.probTrue || 0.5);
        } else if (field.type === 'pareto') {
          const u = Math.random();
          const val = field.scale! / Math.pow(1 - u, 1 / (field.alpha || 1.5));
          row[field.name] = round(Math.min(val, field.scale! * 20), 2);
        } else if (field.type === 'poisson') {
          const l = Math.exp(-(field.lambda || 3));
          let k = 0;
          let p = 1;
          do {
            k++;
            p *= Math.random();
          } while (p > l);
          row[field.name] = Math.max(1, k - 1);
        } else if (field.type === 'exponential') {
          const val = -Math.log(1 - Math.random()) * (field.mean || 100);
          row[field.name] = round(val, 1);
        }
      });

      rows.push(row);
    }

    setGeneratedData(rows);
  };

  const handleGenerateAi = async () => {
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const data = await requestAiSyntheticData(aiDomain, aiSchemaPrompt, Math.min(rowCount, 60));
      if (!data || data.length === 0) {
        throw new Error('AI generator returned no records. Please refine prompt or check GEMINI_API_KEY.');
      }
      setGeneratedData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation failed. Use the parametric generator instead.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSaveAsDataset = (createAsNew: boolean) => {
    if (!generatedData || generatedData.length === 0) return;

    if (!createAsNew && activeDataset) {
      onAppendToActive(generatedData);
      setGeneratedData(null);
      return;
    }

    const name = method === 'parametric' ? selectedRecipe.name : aiDomain;
    const columns = generateColumnsFromData(generatedData);
    const newDs: Dataset = {
      id: 'ds_synth_' + Date.now(),
      name: `${name} (Synthetic)`,
      description: `Generated synthetic dataset with ${generatedData.length} samples.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'synthetic',
      columns,
      data: generatedData,
    };
    onImportComplete(newDs);
    setGeneratedData(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          Synthetic Data Generator (Parametric & AI)
        </h2>
        <p className="text-xs text-slate-400">Synthesize realistic benchmark datasets modeled after standard statistical distributions (Gaussian, Uniform, Pareto, Poisson) or natural language prompts.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setMethod('parametric')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            method === 'parametric'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart className="w-4 h-4" />
          <span>Parametric Statistical Model (Instant / High Volume)</span>
        </button>

        <button
          onClick={() => setMethod('ai')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            method === 'ai'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Generative Synthesis (Natural Language)</span>
        </button>
      </div>

      {/* METHOD 1: PARAMETRIC STATISTICAL MODEL */}
      {method === 'parametric' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Domain Recipe</span>
            <div className="space-y-2">
              {DOMAIN_RECIPES.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    selectedRecipeId === recipe.id
                      ? 'bg-purple-950/30 border-purple-500/50 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-semibold text-xs text-white">{recipe.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{recipe.description}</p>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-400 block mb-1">Number of Rows to Generate</label>
              <select
                value={rowCount}
                onChange={e => setRowCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
              >
                <option value={50}>50 rows (Quick Test)</option>
                <option value={100}>100 rows (Standard)</option>
                <option value={500}>500 rows (Balanced)</option>
                <option value={1000}>1,000 rows (Rich Stats)</option>
                <option value={5000}>5,000 rows (High-Volume)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateParametric}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Wand2 className="w-4 h-4" />
              <span>Generate {rowCount.toLocaleString()} Rows</span>
            </button>
          </div>

          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Schema Definition & Statistical Distributions ({selectedRecipe.fields.length} columns)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedRecipe.fields.map(f => (
                <div key={f.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{f.name}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 font-mono">
                      {f.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {f.type === 'normal' && `μ = ${f.mean}, σ = ${f.stdDev}`}
                    {f.type === 'uniform' && `Range [${f.min}, ${f.max}]`}
                    {f.type === 'category' && `${f.options?.length} categories`}
                    {f.type === 'pareto' && `Power-law (scale: ${f.scale}, α: ${f.alpha})`}
                    {f.type === 'poisson' && `Poisson (λ = ${f.lambda})`}
                    {f.type === 'exponential' && `Exponential (mean: ${f.mean})`}
                    {f.type === 'boolean' && `P(True) = ${f.probTrue}`}
                    {f.type === 'id_prefix' && `Prefix: ${f.prefix}####`}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* METHOD 2: AI GENERATIVE SYNTHESIS */}
      {method === 'ai' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Generate with Gemini 3.7 Flash</h3>
            <p className="text-xs text-slate-400">Describe any domain and target schema in natural language.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Domain / Scenario</label>
              <input
                type="text"
                value={aiDomain}
                onChange={e => setAiDomain(e.target.value)}
                placeholder="e.g. Airline Flight Delays and Passenger Bookings"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Specific Columns / Metrics Instructions</label>
              <textarea
                rows={3}
                value={aiSchemaPrompt}
                onChange={e => setAiSchemaPrompt(e.target.value)}
                placeholder="e.g. Include flight_number, origin, destination, delay_minutes, weather_condition, ticket_price, and cancellation_status."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleGenerateAi}
              disabled={loadingAi || !aiDomain.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loadingAi ? 'AI Synthesizing Structured Dataset...' : 'Generate with AI'}</span>
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GENERATED DATA PREVIEW & CONFIRMATION */}
      {generatedData && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Synthesized {generatedData.length} Records
              </h3>
              <p className="text-xs text-slate-400">Dataset ready for statistical modeling and analysis.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAsDataset(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Save as New Dataset</span>
              </button>

              {activeDataset && (
                <button
                  onClick={() => handleSaveAsDataset(false)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                  {Object.keys(generatedData[0]).map(key => (
                    <th key={key} className="p-2.5 font-semibold text-slate-200">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {generatedData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-slate-600 text-[10px]">{idx + 1}</td>
                    {Object.keys(generatedData[0]).map(key => (
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
