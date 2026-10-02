// Visual Data Cleaning Recipe Builder & Batch Auto-Healing Engine
import { SupervisorSubmission, DataCleaningDiff } from './supervisorEngine';

export type RecipeActionType = 
  | 'trim_whitespace'
  | 'title_case'
  | 'upper_case'
  | 'lower_case'
  | 'phone_e164'
  | 'clamp_numeric_range'
  | 'impute_missing'
  | 'regex_replace'
  | 'mask_pii'
  | 'round_decimals';

export interface CleaningRecipeRule {
  id: string;
  name: string;
  targetField: string; // Specific field name or '*' for all string fields
  action: RecipeActionType;
  enabled: boolean;
  params: {
    minVal?: number;
    maxVal?: number;
    fallbackValue?: string | number;
    regexPattern?: string;
    replacementText?: string;
    decimalPlaces?: number;
    maskLength?: number;
  };
  description: string;
  executionCount: number;
}

export interface CleaningRecipeBook {
  id: string;
  name: string;
  version: string;
  lastUpdated: string;
  rules: CleaningRecipeRule[];
}

const RECIPE_STORAGE_KEY = 'datahub_supervisor_cleaning_recipe_book_v1';

export const DEFAULT_RECIPE_BOOK: CleaningRecipeBook = {
  id: 'recipe_book_master_v1',
  name: 'Standard Master Ingestion Pipeline Recipe',
  version: '1.4.0',
  lastUpdated: new Date().toISOString(),
  rules: [
    {
      id: 'rule_trim_all',
      name: 'Trim Leading & Trailing Whitespace',
      targetField: '*',
      action: 'trim_whitespace',
      enabled: true,
      params: {},
      description: 'Removes extraneous whitespace and line-breaks from all text inputs.',
      executionCount: 142
    },
    {
      id: 'rule_titlecase_names',
      name: 'Capitalize Farmer & Respondent Names',
      targetField: 'respondent_name',
      action: 'title_case',
      enabled: true,
      params: {},
      description: 'Converts raw farmer and respondent names into Title Case for standardized registry matching.',
      executionCount: 89
    },
    {
      id: 'rule_phone_format',
      name: 'Standardize Phone Numbers (+Country Code)',
      targetField: 'respondent_phone',
      action: 'phone_e164',
      enabled: true,
      params: {},
      description: 'Formats phone inputs into standardized international phone sequences.',
      executionCount: 76
    },
    {
      id: 'rule_clamp_yield',
      name: 'Clamp Biological Crop Yield Range (0 - 5000 kg)',
      targetField: 'yield_estimate_kg',
      action: 'clamp_numeric_range',
      enabled: true,
      params: { minVal: 0, maxVal: 5000 },
      description: 'Prevents impossible agronomic harvest entries by clamping to realistic biological ceilings.',
      executionCount: 14
    },
    {
      id: 'rule_impute_income',
      name: 'Impute Missing Household Income (Fallback to Median $450)',
      targetField: 'monthly_income_usd',
      action: 'impute_missing',
      enabled: true,
      params: { fallbackValue: 450 },
      description: 'Substitutes empty or null household income cells with campaign regional median.',
      executionCount: 23
    },
    {
      id: 'rule_mask_national_id',
      name: 'Mask PII National Identity Numbers',
      targetField: 'national_id',
      action: 'mask_pii',
      enabled: true,
      params: { maskLength: 4 },
      description: 'Redacts sensitive identity numbers to XXXX-XXXX-[Last4] for GDPR/HIPAA compliance.',
      executionCount: 65
    }
  ]
};

export function getStoredRecipeBook(): CleaningRecipeBook {
  try {
    const raw = localStorage.getItem(RECIPE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_RECIPE_BOOK;
}

export function saveStoredRecipeBook(book: CleaningRecipeBook): void {
  try {
    localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(book));
  } catch {}
}

// Execute recipes against a single raw payload
export function applyRecipeBookToData(
  rawData: Record<string, any>,
  recipeBook: CleaningRecipeBook
): { cleanedData: Record<string, any>; diffs: DataCleaningDiff[] } {
  const cleaned: Record<string, any> = { ...rawData };
  const diffs: DataCleaningDiff[] = [];

  recipeBook.rules.filter(r => r.enabled).forEach(rule => {
    const fieldsToProcess = rule.targetField === '*' 
      ? Object.keys(cleaned) 
      : (cleaned[rule.targetField] !== undefined ? [rule.targetField] : []);

    fieldsToProcess.forEach(field => {
      const orig = cleaned[field];
      let val = orig;

      switch (rule.action) {
        case 'trim_whitespace':
          if (typeof val === 'string') {
            val = val.trim().replace(/\s+/g, ' ');
          }
          break;

        case 'title_case':
          if (typeof val === 'string' && val.length > 0) {
            val = val.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
          }
          break;

        case 'upper_case':
          if (typeof val === 'string') {
            val = val.toUpperCase();
          }
          break;

        case 'lower_case':
          if (typeof val === 'string') {
            val = val.toLowerCase();
          }
          break;

        case 'phone_e164':
          if (typeof val === 'string' || typeof val === 'number') {
            const digits = String(val).replace(/\D/g, '');
            if (digits.length >= 10) {
              val = `+1 (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
            }
          }
          break;

        case 'clamp_numeric_range':
          const num = Number(val);
          if (!isNaN(num)) {
            if (rule.params.minVal !== undefined && num < rule.params.minVal) {
              val = rule.params.minVal;
            } else if (rule.params.maxVal !== undefined && num > rule.params.maxVal) {
              val = rule.params.maxVal;
            }
          }
          break;

        case 'impute_missing':
          if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'null') {
            val = rule.params.fallbackValue ?? 'N/A';
          }
          break;

        case 'regex_replace':
          if (typeof val === 'string' && rule.params.regexPattern) {
            try {
              const rx = new RegExp(rule.params.regexPattern, 'gi');
              val = val.replace(rx, rule.params.replacementText ?? '');
            } catch {}
          }
          break;

        case 'mask_pii':
          if (typeof val === 'string' || typeof val === 'number') {
            const str = String(val).trim();
            if (str.length > 4) {
              val = `••••-••••-${str.slice(-4)}`;
            }
          }
          break;

        case 'round_decimals':
          const n = Number(val);
          if (!isNaN(n)) {
            val = Number(n.toFixed(rule.params.decimalPlaces ?? 2));
          }
          break;
      }

      if (val !== orig) {
        cleaned[field] = val;
        diffs.push({
          field,
          originalValue: orig,
          cleanedValue: val,
          ruleApplied: rule.name,
          severity: 'fixed'
        });
      }
    });
  });

  return { cleanedData: cleaned, diffs };
}
