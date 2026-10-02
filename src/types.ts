export type ColumnDataType = 'number' | 'string' | 'boolean' | 'date' | 'category';
export type DataType = ColumnDataType;
export type AggregationType = 'sum' | 'mean' | 'count' | 'min' | 'max';

export type AppTab = 
  | 'upload' 
  | 'collection' 
  | 'analysis' 
  | 'grid' 
  | 'simulation' 
  | 'report' 
  | 'team' 
  | 'supervisor' 
  | 'admin'
  | 'operations';

export interface SqlQueryResult {
  columns: string[];
  data: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}

export interface ColumnMeta {
  id: string;
  name: string;
  type: ColumnDataType;
  nullable: boolean;
  uniqueCount?: number;
  sampleValues?: any[];
  description?: string;
}

export interface DatasetVersion {
  id: string;
  versionNumber: number;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  tag?: 'initial' | 'cleaned' | 'filtered' | 'transformed' | 'manual_snapshot' | 'reverted' | 'system' | 'synthetic';
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  data: Record<string, any>[];
  changeSummary?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceType: 'form' | 'csv' | 'excel' | 'json' | 'api' | 'iot' | 'scraper' | 'synthetic' | 'manual' | 'offline_kiosk';
  columns: ColumnMeta[];
  data: Record<string, any>[];
  formConfig?: FormDefinition;
  history?: DataTransformLog[];
  versions?: DatasetVersion[];
  currentVersionId?: string;
}

export type FormFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'rating'
  | 'slider'
  | 'date'
  | 'email'
  | 'switch';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: string[]; // for select, radio, multiselect
  min?: number; // for number, slider, rating
  max?: number;
  step?: number;
  helpText?: string;
}

export interface FormDefinition {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  allowMultipleSubmissions: boolean;
  createdAt: string;
}

export interface DataTransformLog {
  id: string;
  timestamp: string;
  operation: string;
  details: string;
  affectedRowCount?: number;
}

// Statistical Analysis Types
export interface ColumnStats {
  columnName: string;
  dataType: ColumnDataType;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  // Numeric Stats
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  median?: number;
  mode?: any;
  stdDev?: number;
  variance?: number;
  q1?: number;
  q25?: number;
  q3?: number;
  q75?: number;
  iqr?: number;
  skewness?: number;
  kurtosis?: number;
  outliersCount?: number;
  // Categorical/Frequency Stats
  topValues?: { value: string; count: number; percentage: number }[];
  histogram?: { bin: string; count: number; min: number; max: number }[];
  histogramBins?: { bin: string; count: number; min: number; max: number }[];
}

export interface CorrelationResult {
  columns: string[];
  matrix: number[][]; // correlation values between -1 and 1
  pValues?: number[][];
}

export interface RegressionResult {
  independentVar: string;
  dependentVar: string;
  slope: number;
  intercept: number;
  r2: number;
  r: number;
  stdError: number;
  pValue: number;
  fStatistic: number;
  equation: string;
  points: { x: number; y: number; predicted: number; residual: number }[];
}

export interface HypothesisTestResult {
  testType: 't-test' | 'anova' | 'chi-square';
  title: string;
  variable1: string;
  variable2?: string;
  statisticName: string;
  statisticValue: number;
  pValue: number;
  degreesOfFreedom?: number;
  isSignificant: boolean;
  alpha: number;
  conclusion: string;
  details: Record<string, any>;
}

export interface ClusterResult {
  k: number;
  features: string[];
  centroids: Record<string, number>[];
  clusters: {
    clusterId: number;
    count: number;
    percentage: number;
    samplePoints: Record<string, any>[];
  }[];
  pointClusterAssignments: number[]; // index matches data index
  silhouetteScore: number;
}

export type ChartType =
  | 'bar'
  | 'stacked-bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'pie'
  | 'radar'
  | 'histogram'
  | 'heatmap'
  | 'boxplot';

export type AggregationFunction = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'MEDIAN';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxis: string;
  yAxis?: string;
  secondaryYAxis?: string;
  groupBy?: string;
  aggregation: AggregationFunction;
  colorScheme: string;
  showGrid: boolean;
  showLegend: boolean;
  showTrendline?: boolean;
}

export interface PivotConfig {
  rowFields: string[];
  colFields: string[];
  valueField: string;
  aggregation: AggregationFunction;
}

export interface PivotTableData {
  rowHeaders: string[];
  colHeaders: string[];
  matrix: (number | string | null)[][];
  rowTotals: (number | null)[];
  colTotals: (number | null)[];
  grandTotal: number | null;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  chartSuggestion?: ChartConfig;
  sqlSnippet?: string;
}

export interface ZScoreAnomalyPoint {
  rowIndex: number;
  rowId?: string;
  columnName: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  robustZScore: number;
  deviation: number;
  direction: 'high' | 'low';
  severity: 'mild' | 'moderate' | 'extreme';
  isAnomaly: boolean;
  row: Record<string, any>;
  explanation?: string;
}

export interface AnomalyColumnSummary {
  columnName: string;
  mean: number;
  stdDev: number;
  median: number;
  mad: number;
  min: number;
  max: number;
  outlierCount: number;
  outlierPercentage: number;
  maxZScore: number;
  minZScore: number;
}

export interface AnomalyDetectionResult {
  totalRows: number;
  anomalousRowCount: number;
  anomalousRowIndices: number[];
  anomalies: ZScoreAnomalyPoint[];
  columnSummaries: Record<string, AnomalyColumnSummary>;
  globalZThreshold: number;
  method: 'standard' | 'robust';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Data Scientist' | 'Analytics Engineer' | 'Product Lead' | 'Executive' | 'Data Analyst' | 'Field Enumerator' | 'Lead Field Supervisor' | 'Workspace Owner';
  organization: string;
  avatarUrl?: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  createdAt: string;
  lastLogin?: string;
  department?: string;
  enumeratorBadgeId?: string;
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected' | 'suspended';
  isOwner?: boolean;
  emailVerified?: boolean;
  authMethod?: 'email_code' | 'password' | 'sso' | 'demo';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

export type CoworkerStatus = 'online' | 'analyzing' | 'in_meeting' | 'offline' | 'pending_invitation' | 'invited';

export interface CoworkerInvitation {
  id: string;
  token: string;
  name: string;
  email: string;
  role: string;
  department: string;
  skills: string[];
  customMessage?: string;
  inviterName: string;
  inviterEmail: string;
  inviterRole?: string;
  workspaceName: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedAt?: string;
  acceptedUserId?: string;
  inviteUrl: string;
  directDeliverySuccess?: boolean;
  deliveryMode?: 'smtp' | 'client_direct';
}

export interface Coworker {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl: string;
  status: CoworkerStatus;
  currentActivity?: string;
  datasetsSharedCount: number;
  joinedDate: string;
  location?: string;
  skills?: string[];
  isRealUser?: boolean;
  invitationToken?: string;
  invitedAt?: string;
  acceptedAt?: string;
}

export interface SharedDataComment {
  id: string;
  author: string;
  authorEmail: string;
  authorAvatar: string;
  authorRole: string;
  timestamp: string;
  text: string;
}

export interface SharedDatasetRecord {
  id: string;
  datasetId: string;
  datasetName: string;
  description: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    department: string;
  };
  recipients: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    permission: 'view' | 'edit' | 'admin';
  }[];
  permission: 'view' | 'edit' | 'admin';
  note: string;
  sharedAt: string;
  rowCount: number;
  columnCount: number;
  sourceType: string;
  accessLink: string;
  dataSnapshot: Record<string, any>[];
  columnsSnapshot: ColumnMeta[];
  tags: string[];
  isPinned?: boolean;
  comments: SharedDataComment[];
}

export interface TeamActivityEvent {
  id: string;
  type: 'share_dataset' | 'update_dataset' | 'comment' | 'import_dataset' | 'invite_member' | 'remove_member' | 'forecast_simulation';
  actorName: string;
  actorAvatar: string;
  actorRole: string;
  targetName: string;
  timestamp: string;
  details: string;
  datasetId?: string;
}

// Scenario Modeling & Forecasting Types
export type ForecastModelType = 'linear' | 'polynomial' | 'exponential' | 'moving_average' | 'monte_carlo';
export type ScenarioPresetType = 'base' | 'bull_growth' | 'stress_test' | 'cost_optimization' | 'marketing_scale' | 'custom';

export interface DriverParameter {
  id: string;
  column: string;
  label: string;
  baseValue: number;
  currentValue: number;
  percentChange: number; // e.g. +15 for +15%
  minPercent: number; // e.g. -50
  maxPercent: number; // e.g. +100
  step: number;
  elasticity: number; // Sensitivity coefficient to target (e.g. 0.85 means +10% causes +8.5% in target)
  unit?: string;
}

export interface TimeSeriesForecastPoint {
  period: string | number;
  periodLabel: string;
  actual?: number | null;
  baselineForecast: number;
  simulatedForecast: number;
  lowerConfidence: number;
  upperConfidence: number;
  isProjected: boolean;
  deltaPercent: number;
}

export interface SimulationResult {
  targetColumn: string;
  targetLabel: string;
  targetMetric: 'sum' | 'mean';
  modelType: ForecastModelType;
  horizonPeriods: number;
  confidenceLevel: number; // 80, 90, 95, 99
  timeSeriesData: TimeSeriesForecastPoint[];
  baselineKpis: {
    total: number;
    mean: number;
    min: number;
    max: number;
    growthRatePercent: number;
  };
  simulatedKpis: {
    total: number;
    mean: number;
    min: number;
    max: number;
    growthRatePercent: number;
  };
  deltaKpis: {
    totalDiff: number;
    totalPercentDiff: number;
    meanDiff: number;
    meanPercentDiff: number;
  };
  parameterSensitivities: {
    paramId: string;
    paramName: string;
    elasticity: number;
    appliedDeltaPercent: number;
    estimatedImpactValue: number;
    estimatedImpactPercent: number;
    correlation: number;
  }[];
  monteCarloSummary?: {
    medianOutcome: number;
    p10Outcome: number;
    p90Outcome: number;
    volatilityPercent: number;
    iterationsCount: number;
    paths: { runIndex: number; values: number[] }[];
  };
  keyInsights: string[];
}

export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  datasetId: string;
  datasetName: string;
  targetColumn: string;
  modelType: ForecastModelType;
  horizonPeriods: number;
  confidenceLevel: number;
  parameters: DriverParameter[];
  createdAt: string;
  author: string;
  simulatedTotalDiffPercent: number;
}

// Chat & Data Exchange Types
export interface ChatDataAttachment {
  id: string;
  type: 'dataset' | 'data_slice' | 'forecast_scenario' | 'sql_query' | 'chart_snapshot';
  datasetId?: string;
  datasetName: string;
  title: string;
  description?: string;
  rowCount?: number;
  columnCount?: number;
  columns?: ColumnMeta[];
  dataPreview?: Record<string, any>[];
  sqlQuery?: string;
  scenarioMetrics?: {
    targetColumn: string;
    modelType: string;
    horizon: number;
    projectedTotal: number;
    deltaPercent: number;
  };
  filterDescription?: string;
}

export interface ChatMessage {
  id: string;
  threadId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  senderDepartment?: string;
  text: string;
  timestamp: string;
  attachments?: ChatDataAttachment[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  isPinned?: boolean;
}

export interface ChatThread {
  id: string;
  type: 'direct' | 'channel';
  name: string;
  topic?: string;
  avatarUrl?: string;
  participantIds: string[]; // Coworker IDs
  unreadCount: number;
  lastMessage?: {
    text: string;
    timestamp: string;
    senderName: string;
  };
}

// Anomaly Alerting & Stream Monitoring Types
export interface AnomalyAlertRule {
  id: string;
  name: string;
  metricKey: string;
  metricLabel: string;
  enabled: boolean;
  zThreshold: number; // e.g. 2.5, 3.0, 3.5
  method: 'standard' | 'robust';
  direction: 'both' | 'high' | 'low';
  severity: 'critical' | 'warning' | 'info';
  windowSize: number; // Rolling points count e.g. 30, 50, 100
  notifyBrowser: boolean;
  soundAlert: boolean;
  inAppToast: boolean;
  cooldownSeconds: number; // Minimum gap between notifications for this rule
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface AnomalyAlertIncident {
  id: string;
  ruleId: string;
  ruleName: string;
  metricKey: string;
  metricLabel: string;
  timestamp: string;
  streamSource: string;
  value: number;
  baselineMean: number;
  baselineStdDev: number;
  baselineMedian?: number;
  baselineMad?: number;
  zScore: number;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  fullRecordSnapshot?: Record<string, any>;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface StreamMonitoringStats {
  totalPointsProcessed: number;
  outliersDetectedCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  browserNotificationsSentCount: number;
  currentStreamSpeedHz: number;
  activeRulesCount: number;
  lastUpdated: string;
}

// ==========================================
// DATA HEALTH & AI QUALITY AUDIT TYPES
// ==========================================

export type DataHealthCategory = 'missing_values' | 'duplicate_rows' | 'outliers';
export type DataHealthSeverity = 'critical' | 'warning' | 'info';

export interface DataHealthCleanAction {
  type: 'impute' | 'drop_rows' | 'remove_duplicates' | 'winsorize' | 'trim_outliers';
  label: string;
  column?: string;
  strategy?: 'mean' | 'median' | 'mode' | 'custom' | 'zero' | 'drop' | 'winsorize_3std' | 'trim';
  fillValue?: any;
  lowerBound?: number;
  upperBound?: number;
  description: string;
}

export interface DataHealthIssue {
  id: string;
  category: DataHealthCategory;
  severity: DataHealthSeverity;
  column?: string;
  title: string;
  affectedCount: number;
  affectedPercentage: number;
  metricsSummary: string;
  aiExplanation: string;
  aiRecommendation: string;
  suggestedAction: DataHealthCleanAction;
  alternativeActions?: DataHealthCleanAction[];
  sampleRows?: Record<string, any>[];
  resolved?: boolean;
}

export interface DataHealthReport {
  overallScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'Optimal' | 'Good' | 'Needs Attention' | 'Critical Quality Risk';
  executiveSummary: string;
  keyRisks: string[];
  totalCells: number;
  totalNulls: number;
  duplicateRowCount: number;
  totalOutliers: number;
  issues: DataHealthIssue[];
  scannedAt: string;
  isAiGenerated: boolean;
  modelUsed?: string;
}




