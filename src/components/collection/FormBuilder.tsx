import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Send, 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  Star, 
  Calendar, 
  Hash, 
  Type, 
  ListOrdered, 
  CheckSquare, 
  Copy,
  QrCode,
  ArrowRight,
  Database
} from 'lucide-react';
import { Dataset, FormDefinition, FormField, FormFieldType } from '../../types';
import { generateColumnsFromData } from '../../utils/dataEngine';

interface FormBuilderProps {
  activeDataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

const FIELD_TYPE_OPTIONS: { type: FormFieldType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text / Feedback', icon: Type },
  { type: 'number', label: 'Number / Metric', icon: Hash },
  { type: 'rating', label: 'Star Rating (1-5)', icon: Star },
  { type: 'slider', label: 'Linear Slider / Scale', icon: Sliders },
  { type: 'select', label: 'Dropdown Select', icon: ListOrdered },
  { type: 'radio', label: 'Single Choice (Radio)', icon: CheckCircle2 },
  { type: 'checkbox', label: 'Multi-Checkbox', icon: CheckSquare },
  { type: 'date', label: 'Date / Timestamp', icon: Calendar },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ activeDataset, onUpdateDataset }) => {
  const [formConfig, setFormConfig] = useState<FormDefinition>(
    activeDataset.formConfig || {
      id: 'form_' + activeDataset.id,
      title: activeDataset.name + ' - Data Collection Form',
      description: 'Please fill out this form to record a new entry in our dataset.',
      submitButtonText: 'Submit Data Record',
      successMessage: 'Thank you! Your response has been recorded directly into the dataset.',
      allowMultipleSubmissions: true,
      createdAt: new Date().toISOString(),
      fields: [
        {
          id: 'f_1',
          name: 'participant_name',
          label: 'Participant / Subject Name',
          type: 'text',
          required: true,
          placeholder: 'Enter full name',
        },
        {
          id: 'f_2',
          name: 'satisfaction_score',
          label: 'Satisfaction / Efficiency Rating',
          type: 'rating',
          required: true,
          min: 1,
          max: 5,
        },
        {
          id: 'f_3',
          name: 'category_group',
          label: 'Category / Department',
          type: 'select',
          required: true,
          options: ['Operations', 'Engineering', 'Customer Support', 'Marketing', 'Executive'],
        },
        {
          id: 'f_4',
          name: 'metric_value',
          label: 'Observed Metric Value',
          type: 'number',
          required: false,
          placeholder: '0.00',
        },
      ],
    }
  );

  const [activeMode, setActiveMode] = useState<'builder' | 'preview' | 'share'>('builder');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Save form config changes to dataset
  const updateForm = (updated: FormDefinition) => {
    setFormConfig(updated);
    onUpdateDataset({
      ...activeDataset,
      formConfig: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddField = (type: FormFieldType) => {
    const id = 'f_' + Date.now().toString(36);
    const newField: FormField = {
      id,
      name: `field_${formConfig.fields.length + 1}`,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      type,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      min: type === 'rating' ? 1 : type === 'slider' ? 0 : undefined,
      max: type === 'rating' ? 5 : type === 'slider' ? 100 : undefined,
      step: type === 'slider' ? 1 : undefined,
    };

    updateForm({
      ...formConfig,
      fields: [...formConfig.fields, newField],
    });
  };

  const handleRemoveField = (id: string) => {
    updateForm({
      ...formConfig,
      fields: formConfig.fields.filter(f => f.id !== id),
    });
  };

  const handleFieldChange = (id: string, updates: Partial<FormField>) => {
    updateForm({
      ...formConfig,
      fields: formConfig.fields.map(f => (f.id === id ? { ...f, ...updates } : f)),
    });
  };

  // Submit test response directly to active dataset
  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    const newRow: Record<string, any> = { ...formData };
    
    // Fill in defaults or timestamps
    if (!newRow.timestamp) {
      newRow.timestamp = new Date().toISOString();
    }

    const updatedData = [newRow, ...activeDataset.data];
    const updatedColumns = generateColumnsFromData(updatedData);

    onUpdateDataset({
      ...activeDataset,
      data: updatedData,
      columns: updatedColumns,
      updatedAt: new Date().toISOString(),
    });

    setSubmitSuccess(true);
    setFormData({});
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const applyTemplate = (templateName: string) => {
    let fields: FormField[] = [];
    if (templateName === 'csat') {
      fields = [
        { id: 'f1', name: 'customer_name', label: 'Customer Name', type: 'text', required: true },
        { id: 'f2', name: 'overall_rating', label: 'Overall Satisfaction', type: 'rating', min: 1, max: 5, required: true },
        { id: 'f3', name: 'product_category', label: 'Product Used', type: 'select', options: ['Pro Tier', 'Enterprise', 'Starter'], required: true },
        { id: 'f4', name: 'nps_score', label: 'Likelihood to Recommend (0-10)', type: 'slider', min: 0, max: 10, required: true },
        { id: 'f5', name: 'feedback_comments', label: 'Additional Comments', type: 'textarea', required: false },
      ];
    } else if (templateName === 'sensor') {
      fields = [
        { id: 'f1', name: 'sensor_id', label: 'Sensor Device ID', type: 'text', required: true },
        { id: 'f2', name: 'location_zone', label: 'Facility Zone', type: 'select', options: ['Zone A - Cleanroom', 'Zone B - Assembly', 'Zone C - Warehouse'], required: true },
        { id: 'f3', name: 'temperature_c', label: 'Temperature (°C)', type: 'number', required: true },
        { id: 'f4', name: 'humidity_pct', label: 'Relative Humidity (%)', type: 'slider', min: 0, max: 100, required: true },
        { id: 'f5', name: 'status_ok', label: 'Operational Status', type: 'radio', options: ['Normal', 'Warning', 'Critical'], required: true },
      ];
    }

    updateForm({
      ...formConfig,
      fields,
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Interactive Survey & Form Builder
          </h2>
          <p className="text-xs text-slate-400">Design custom forms with real-time validation to collect incoming responses directly into your active dataset.</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setActiveMode('builder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'builder'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Form Designer
          </button>
          <button
            onClick={() => setActiveMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'preview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Respondent Live Preview</span>
          </button>
          <button
            onClick={() => setActiveMode('share')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'share'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share & Embed</span>
          </button>
        </div>
      </div>

      {/* MODE 1: BUILDER */}
      {activeMode === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Form Settings & Field Toolbox */}
          <div className="space-y-6">
            
            {/* Quick Templates */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Pre-Made Form Templates</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyTemplate('csat')}
                  className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
                >
                  <p className="text-xs font-semibold text-indigo-300">Customer CSAT</p>
                  <p className="text-[10px] text-slate-400">Ratings, NPS, Feedback</p>
                </button>
                <button
                  onClick={() => applyTemplate('sensor')}
                  className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
                >
                  <p className="text-xs font-semibold text-cyan-300">IoT Sensor Audit</p>
                  <p className="text-[10px] text-slate-400">Metrics, Status, Temp</p>
                </button>
              </div>
            </div>

            {/* Add Field Palette */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Add Field Element</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELD_TYPE_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleAddField(type)}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-xs font-medium transition-all group"
                  >
                    <Icon className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* General Form Info */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Form Header Config</span>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-slate-400">Form Title</label>
                  <input
                    type="text"
                    value={formConfig.title}
                    onChange={e => updateForm({ ...formConfig, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Description / Instructions</label>
                  <textarea
                    rows={2}
                    value={formConfig.description}
                    onChange={e => updateForm({ ...formConfig, description: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right 2 Columns: Form Fields Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Configured Questions & Fields ({formConfig.fields.length})
              </span>
              <span className="text-[11px] text-indigo-400 font-medium">
                Changes auto-synced with dataset schema
              </span>
            </div>

            {formConfig.fields.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
                <Plus className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-400">No fields added yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Click any field type from the toolbox on the left to start building your data collection form.</p>
              </div>
            ) : (
              formConfig.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-mono text-[11px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => handleFieldChange(field.id, { label: e.target.value })}
                        className="font-semibold text-sm text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => handleFieldChange(field.id, { required: e.target.checked })}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500">Dataset Column Key (Identifier)</label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={e => handleFieldChange(field.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500">Placeholder / Subtitle</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={e => handleFieldChange(field.id, { placeholder: e.target.value })}
                        placeholder="e.g. Type answer here..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Options editor for choice fields */}
                  {['select', 'radio', 'checkbox'].includes(field.type) && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <label className="text-[11px] text-slate-500 block mb-1">Options (comma separated)</label>
                      <input
                        type="text"
                        value={(field.options || []).join(', ')}
                        onChange={e =>
                          handleFieldChange(field.id, {
                            options: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Sliders / Ratings bounds */}
                  {(field.type === 'slider' || field.type === 'rating') && (
                    <div className="flex gap-4 pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-500">Min Value</label>
                        <input
                          type="number"
                          value={field.min ?? 0}
                          onChange={e => handleFieldChange(field.id, { min: Number(e.target.value) })}
                          className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Max Value</label>
                        <input
                          type="number"
                          value={field.max ?? (field.type === 'rating' ? 5 : 100)}
                          onChange={e => handleFieldChange(field.id, { max: Number(e.target.value) })}
                          className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* MODE 2: LIVE RESPONDENT PREVIEW */}
      {activeMode === 'preview' && (
        <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 space-y-1">
            <h2 className="text-xl font-bold text-white">{formConfig.title}</h2>
            <p className="text-sm text-slate-400">{formConfig.description}</p>
          </div>

          {submitSuccess ? (
            <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Record Saved!</h3>
              <p className="text-xs text-emerald-200">{formConfig.successMessage}</p>
              <p className="text-[11px] text-slate-400 pt-2">
                Your response is now appended to dataset <span className="font-semibold text-white">"{activeDataset.name}"</span> ({activeDataset.data.length} total rows).
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Submit Another Entry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitResponse} className="space-y-5">
              {formConfig.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    {field.label} {field.required && <span className="text-rose-400">*</span>}
                  </label>

                  {/* Field Rendering */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      step="any"
                      required={field.required}
                      placeholder={field.placeholder || '0.00'}
                      value={formData[field.name] ?? ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value ? Number(e.target.value) : '' })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Option --</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && (
                    <div className="space-y-2 pt-1">
                      {(field.options || []).map(opt => (
                        <label key={opt} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name={field.name}
                            required={field.required}
                            checked={formData[field.name] === opt}
                            onChange={() => setFormData({ ...formData, [field.name]: opt })}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.type === 'rating' && (
                    <div className="flex items-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map(star => {
                        const isFilled = (formData[field.name] || 0) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData({ ...formData, [field.name]: star })}
                            className={`p-1.5 rounded-lg transition-transform hover:scale-125 ${
                              isFilled ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            <Star className={`w-6 h-6 ${isFilled ? 'fill-amber-400' : ''}`} />
                          </button>
                        );
                      })}
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        {formData[field.name] ? `${formData[field.name]} / 5 stars` : 'Select rating'}
                      </span>
                    </div>
                  )}

                  {field.type === 'slider' && (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>{field.min ?? 0}</span>
                        <span className="text-sm font-bold text-indigo-400">{formData[field.name] ?? field.min ?? 0}</span>
                        <span>{field.max ?? 100}</span>
                      </div>
                      <input
                        type="range"
                        min={field.min ?? 0}
                        max={field.max ?? 100}
                        step={field.step ?? 1}
                        value={formData[field.name] ?? field.min ?? 0}
                        onChange={e => setFormData({ ...formData, [field.name]: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Target: {activeDataset.name}</span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{formConfig.submitButtonText}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* MODE 3: SHARE & EMBED */}
      {activeMode === 'share' && (
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Share Form & Survey Endpoint</h3>
            <p className="text-xs text-slate-400">Deploy this data collection form to external respondents via direct URL or embedded widget.</p>
          </div>

          <div className="space-y-4">
            {/* Shareable Link */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300">Public Survey Link</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?formId=${formConfig.id}`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?formId=${formConfig.id}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* HTML iFrame Embed Code */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300">Embed iFrame Widget (HTML)</span>
              <textarea
                readOnly
                rows={3}
                value={`<iframe src="${window.location.origin}/?formId=${formConfig.id}&embed=true" width="100%" height="600" frameborder="0" style="border-radius:12px; border:1px solid #334155;"></iframe>`}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono select-all"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
