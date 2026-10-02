import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Share2, 
  Database, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Edit3, 
  ShieldAlert, 
  Download, 
  Send, 
  Sparkles, 
  UserPlus, 
  Mail, 
  Layers, 
  Activity, 
  Tag, 
  ArrowRight, 
  Copy, 
  Check, 
  Trash2, 
  Lock,
  ExternalLink,
  MessageCircle,
  Briefcase,
  MapPin,
  Flame,
  FileSpreadsheet,
  Pin,
  PinOff,
  SlidersHorizontal,
  Table as TableIcon,
  LineChart,
  Bot,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  FileJson,
  X,
  AlertTriangle,
  Server,
  Phone,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { Dataset, Coworker, SharedDatasetRecord, TeamActivityEvent, UserProfile, ColumnMeta, CoworkerInvitation } from '../../types';
import { getCountySupervisors, CountySupervisor } from '../../utils/countySupervisorEngine';
import { 
  getSavedCoworkers, 
  saveCoworkers, 
  getSavedSharedDatasets, 
  saveSharedDatasets, 
  getSavedTeamActivities, 
  saveTeamActivities,
  getSavedInvitations,
  saveSingleInvitation,
  getInvitationByToken,
  INITIAL_COWORKERS
} from '../../utils/teamData';
import { exportToCSV, exportToExcel, exportToJSON } from '../../utils/dataEngine';
import { TeamMessenger } from './TeamMessenger';
import { AcceptInvitationModal } from './AcceptInvitationModal';
import { EmailSettingsModal } from './EmailSettingsModal';

interface TeamHubProps {
  activeDataset: Dataset;
  datasets: Dataset[];
  currentUser?: UserProfile | null;
  onSelectDataset: (id: string) => void;
  onCreateDataset: (dataset: Dataset) => void;
  onOpenShareModal: (dataset: Dataset) => void;
  onOpenUploadStudio?: () => void;
  onNavigateToTab?: (tab: 'analysis' | 'grid' | 'simulation' | 'report' | 'upload' | 'collection') => void;
  onOpenAcceptInvite?: (token?: string) => void;
}

export const TeamHub: React.FC<TeamHubProps> = ({
  activeDataset,
  datasets,
  currentUser,
  onSelectDataset,
  onCreateDataset,
  onOpenShareModal,
  onOpenUploadStudio,
  onNavigateToTab,
  onOpenAcceptInvite,
}) => {
  // Team state with persistent storage
  const [coworkers, setCoworkers] = useState<Coworker[]>(getSavedCoworkers);
  const [sharedDatasets, setSharedDatasets] = useState<SharedDatasetRecord[]>(getSavedSharedDatasets);
  const [activities, setActivities] = useState<TeamActivityEvent[]>(getSavedTeamActivities);
  const [invitations, setInvitations] = useState<CoworkerInvitation[]>(getSavedInvitations);

  // Sync listener for cross-component updates
  useEffect(() => {
    const handleSync = () => {
      setCoworkers(getSavedCoworkers());
      setSharedDatasets(getSavedSharedDatasets());
      setActivities(getSavedTeamActivities());
      setInvitations(getSavedInvitations());
    };

    window.addEventListener('team_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('team_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Navigation sub-tab
  const [subTab, setSubTab] = useState<'shared_with_me' | 'chat' | 'coworkers' | 'field_supervisors' | 'send_slice' | 'activity'>('shared_with_me');
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'view' | 'edit' | 'admin'>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState<boolean>(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  
  // Modals & Forms
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState<boolean>(false);
  const [newInvite, setNewInvite] = useState({
    name: '',
    email: '',
    role: 'Data Scientist',
    department: 'Quantitative Analytics',
    skills: 'SQL, Python, Analytics',
    customMessage: '',
  });

  // Invitation Result Dispatch Station Modal state
  const [inviteResultDialog, setInviteResultDialog] = useState<{
    inviteToken: string;
    inviteUrl: string;
    email: string;
    name: string;
    role: string;
    department: string;
    realDeliverySuccess: boolean;
    deliveryMode: string;
    gmailUrl: string;
    outlookUrl: string;
    mailtoUrl: string;
    subject: string;
    emailBodyText: string;
    info?: string;
  } | null>(null);

  // Accept Invitation Modal for testing / coworker activation
  const [acceptModalOpen, setAcceptModalOpen] = useState<boolean>(false);
  const [acceptModalToken, setAcceptModalToken] = useState<string>('');

  // Email Server & Outbox Settings Modal
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState<boolean>(false);

  // Direct Ping / Review Modal
  const [pingModalCoworker, setPingModalCoworker] = useState<Coworker | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('Could you please review the outlier thresholds and distribution variance on this dataset?');
  const [pingSelectedDatasetId, setPingSelectedDatasetId] = useState<string>(activeDataset?.id || (datasets[0]?.id || ''));

  // Comment input state per dataset
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick Slice Dispatcher State
  const [sliceTargetCoworker, setSliceTargetCoworker] = useState<string>(coworkers[0]?.id || '');
  const [sliceSelectedDatasetId, setSliceSelectedDatasetId] = useState<string>(activeDataset?.id || datasets[0]?.id);
  const [sliceRowCount, setSliceRowCount] = useState<number>(50);
  const [sliceNote, setSliceNote] = useState<string>('Check out this filtered dataset slice from today\'s run.');
  
  // Selected columns for slice
  const sourceDatasetForSlice = useMemo(() => {
    return datasets.find(d => d.id === sliceSelectedDatasetId) || activeDataset;
  }, [datasets, sliceSelectedDatasetId, activeDataset]);

  const [selectedSliceColumns, setSelectedSliceColumns] = useState<string[]>([]);

  // Keep columns updated when dataset changes
  useEffect(() => {
    if (sourceDatasetForSlice?.columns) {
      setSelectedSliceColumns(sourceDatasetForSlice.columns.map(c => c.key));
    }
  }, [sourceDatasetForSlice?.id]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    coworkers.forEach(c => set.add(c.department));
    return ['all', ...Array.from(set)];
  }, [coworkers]);

  // Filtered Coworkers
  const filteredCoworkers = useMemo(() => {
    return coworkers.filter(c => {
      if (departmentFilter !== 'all' && c.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills && c.skills.some(s => s.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [coworkers, departmentFilter, statusFilter, searchQuery]);

  // Filtered Shared Datasets
  const filteredSharedDatasets = useMemo(() => {
    return sharedDatasets.filter(record => {
      if (showPinnedOnly && !record.isPinned) return false;
      if (permissionFilter !== 'all' && record.permission !== permissionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          record.datasetName.toLowerCase().includes(q) ||
          record.sender.name.toLowerCase().includes(q) ||
          record.note.toLowerCase().includes(q) ||
          (record.tags && record.tags.some(t => t.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [sharedDatasets, showPinnedOnly, permissionFilter, searchQuery]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (activityTypeFilter !== 'all' && act.type !== activityTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          act.actorName.toLowerCase().includes(q) ||
          act.details.toLowerCase().includes(q) ||
          (act.targetName && act.targetName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activities, activityTypeFilter, searchQuery]);

  // Handle Invite Coworker with Real Email Dispatch
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite.name.trim() || !newInvite.email.trim()) return;

    setIsSubmittingInvite(true);
    const token = 'inv_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    const appOrigin = window.location.origin;
    const inviteUrl = `${appOrigin}/?invite_token=${token}`;

    let serverResult: any = null;
    try {
      const res = await fetch('/api/team/invite-coworker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newInvite.name.trim(),
          email: newInvite.email.trim(),
          role: newInvite.role,
          department: newInvite.department,
          skills: newInvite.skills.split(',').map(s => s.trim()).filter(Boolean),
          customMessage: newInvite.customMessage || '',
          inviterName: currentUser?.name || 'Workspace Admin',
          inviterEmail: currentUser?.email || 'admin@datahub.analytics',
          inviterRole: currentUser?.role || 'Lead Analyst',
          workspaceName: 'DataHub Analytics Enterprise',
          origin: appOrigin,
        }),
      });
      if (res.ok) {
        serverResult = await res.json();
      }
    } catch (err) {
      console.warn('Invite server request failed, continuing with client-side fallback:', err);
    }

    const finalToken = serverResult?.inviteToken || token;
    const finalInviteUrl = serverResult?.inviteUrl || inviteUrl;
    const subject = serverResult?.subject || `[Invitation] ${currentUser?.name || 'A teammate'} invited you to join DataHub Workspace`;
    const emailBodyText = serverResult?.emailBodyText || `Hi ${newInvite.name.trim()},\n\nYou have been invited to join the DataHub workspace as a ${newInvite.role}.\n\nAccept your invitation and join here:\n${finalInviteUrl}`;
    
    const gmailUrl = serverResult?.gmailUrl || `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(newInvite.email.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyText)}`;
    const outlookUrl = serverResult?.outlookUrl || `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(newInvite.email.trim())}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyText)}`;
    const mailtoUrl = serverResult?.mailtoUrl || `mailto:${encodeURIComponent(newInvite.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyText)}`;

    // Add coworker in pending state
    const newCoworker: Coworker = {
      id: `cw_${Date.now()}`,
      name: newInvite.name.trim(),
      email: newInvite.email.trim(),
      role: newInvite.role,
      department: newInvite.department,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      status: 'pending_invitation',
      currentActivity: 'Invitation dispatched · awaiting coworker acceptance',
      datasetsSharedCount: 0,
      joinedDate: 'Invited Today',
      location: 'Remote',
      skills: newInvite.skills.split(',').map(s => s.trim()).filter(Boolean),
      invitationToken: finalToken,
      invitedAt: new Date().toISOString(),
      isRealUser: true,
    };

    const updated = [newCoworker, ...coworkers.filter(c => c.email.toLowerCase() !== newInvite.email.trim().toLowerCase())];
    setCoworkers(updated);
    saveCoworkers(updated);

    // Save invitation record
    const inviteObj: CoworkerInvitation = {
      id: `inv_${Date.now()}`,
      token: finalToken,
      name: newInvite.name.trim(),
      email: newInvite.email.trim(),
      role: newInvite.role,
      department: newInvite.department,
      skills: newInvite.skills.split(',').map(s => s.trim()).filter(Boolean),
      customMessage: newInvite.customMessage,
      inviterName: currentUser?.name || 'Workspace Admin',
      inviterEmail: currentUser?.email || 'admin@datahub.analytics',
      inviterRole: currentUser?.role || 'Lead Analyst',
      workspaceName: 'DataHub Analytics Enterprise',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      inviteUrl: finalInviteUrl,
      directDeliverySuccess: serverResult?.realDeliverySuccess || false,
      deliveryMode: serverResult?.deliveryMode || 'client_direct',
    };
    saveSingleInvitation(inviteObj);
    setInvitations(getSavedInvitations());

    // Add activity
    const act: TeamActivityEvent = {
      id: `act_${Date.now()}`,
      type: 'invite_member',
      actorName: currentUser?.name || 'You',
      actorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      actorRole: currentUser?.role || 'Data Scientist',
      targetName: newInvite.name.trim(),
      timestamp: 'Just now',
      details: `Dispatched workspace invitation email to ${newInvite.name.trim()} (${newInvite.email.trim()}) for ${newInvite.role} role.`
    };
    const updatedActs = [act, ...activities];
    setActivities(updatedActs);
    saveTeamActivities(updatedActs);

    setIsSubmittingInvite(false);
    setIsInviteModalOpen(false);

    // Open the Dispatch Confirmation Dialog with full direct mailer links
    setInviteResultDialog({
      inviteToken: finalToken,
      inviteUrl: finalInviteUrl,
      email: newInvite.email.trim(),
      name: newInvite.name.trim(),
      role: newInvite.role,
      department: newInvite.department,
      realDeliverySuccess: serverResult?.realDeliverySuccess || false,
      deliveryMode: serverResult?.deliveryMode || 'client_direct',
      gmailUrl,
      outlookUrl,
      mailtoUrl,
      subject,
      emailBodyText,
      info: serverResult?.info,
    });

    setNewInvite({
      name: '',
      email: '',
      role: 'Data Scientist',
      department: 'Quantitative Analytics',
      skills: 'SQL, Python, Analytics',
      customMessage: '',
    });

    showToast(`📧 Invitation created for ${newCoworker.name}!`);
  };

  // Handle Clone or Load Shared Dataset into Active Workspace
  const handleLoadDataset = (record: SharedDatasetRecord, targetTab?: 'analysis' | 'grid' | 'simulation') => {
    // Check if dataset already exists in user's datasets
    const exists = datasets.find(d => d.id === record.datasetId || d.name === record.datasetName);
    if (exists) {
      onSelectDataset(exists.id);
      showToast(`⚡ Loaded "${record.datasetName}" into your workspace.`);
    } else {
      // Create new dataset copy
      const newDataset: Dataset = {
        id: `ds_imported_${Date.now()}`,
        name: `${record.datasetName} (from ${record.sender.name.split(' ')[0]})`,
        description: `${record.description} — Shared by ${record.sender.name} with ${record.permission.toUpperCase()} access.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceType: (record.sourceType as any) || 'csv',
        columns: record.columnsSnapshot || [],
        data: record.dataSnapshot || []
      };
      onCreateDataset(newDataset);
      showToast(`📥 Cloned "${record.datasetName}" to your local dataset collection!`);
    }

    if (targetTab && onNavigateToTab) {
      onNavigateToTab(targetTab);
    }
  };

  // Toggle Pin on Dataset
  const handleTogglePin = (recordId: string) => {
    const updated = sharedDatasets.map(r => {
      if (r.id === recordId) {
        return { ...r, isPinned: !r.isPinned };
      }
      return r;
    });
    setSharedDatasets(updated);
    saveSharedDatasets(updated);
    showToast('📌 Dataset pin preference updated.');
  };

  // Remove Shared Dataset from local pool
  const handleDeleteSharedRecord = (recordId: string, name: string) => {
    if (window.confirm(`Remove "${name}" from your shared dataset pool?`)) {
      const updated = sharedDatasets.filter(r => r.id !== recordId);
      setSharedDatasets(updated);
      saveSharedDatasets(updated);
      showToast(`🗑️ Removed "${name}" from shared pool.`);
    }
  };

  // Handle Add Comment to Shared Dataset
  const handleAddComment = (recordId: string) => {
    const text = commentInputs[recordId]?.trim();
    if (!text) return;

    const newComment = {
      id: `comm_${Date.now()}`,
      author: currentUser?.name || 'You',
      authorEmail: currentUser?.email || 'analyst@datahub.internal',
      authorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      authorRole: currentUser?.role || 'Data Scientist',
      timestamp: 'Just now',
      text: text
    };

    const updated = sharedDatasets.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          comments: [...(r.comments || []), newComment]
        };
      }
      return r;
    });

    setSharedDatasets(updated);
    saveSharedDatasets(updated);
    setCommentInputs({ ...commentInputs, [recordId]: '' });

    // Add activity
    const targetDataset = sharedDatasets.find(r => r.id === recordId);
    if (targetDataset) {
      const act: TeamActivityEvent = {
        id: `act_${Date.now()}`,
        type: 'comment',
        actorName: currentUser?.name || 'You',
        actorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        actorRole: currentUser?.role || 'Data Scientist',
        targetName: targetDataset.datasetName,
        timestamp: 'Just now',
        details: `Left a collaborator note on "${targetDataset.datasetName}": "${text.substring(0, 45)}${text.length > 45 ? '...' : ''}"`,
        datasetId: targetDataset.datasetId
      };
      const updatedActs = [act, ...activities];
      setActivities(updatedActs);
      saveTeamActivities(updatedActs);
    }

    showToast('💬 Note posted to shared dataset.');
  };

  // Handle Copy Share Link
  const handleCopyLink = (record: SharedDatasetRecord) => {
    navigator.clipboard.writeText(record.accessLink);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2500);
    showToast('📋 Direct dataset access link copied to clipboard.');
  };

  // Trigger Simulated Coworker Review / Ping Response
  const handleSendPing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingModalCoworker) return;

    const targetDs = datasets.find(d => d.id === pingSelectedDatasetId) || activeDataset;
    const cw = pingModalCoworker;

    // 1. Log the user request event
    const userAct: TeamActivityEvent = {
      id: `act_${Date.now()}`,
      type: 'comment',
      actorName: currentUser?.name || 'You',
      actorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      actorRole: currentUser?.role || 'Data Scientist',
      targetName: targetDs.name,
      timestamp: 'Just now',
      details: `Requested statistical review from ${cw.name}: "${pingMessage}"`,
      datasetId: targetDs.id
    };

    let updatedActs = [userAct, ...activities];
    setActivities(updatedActs);
    saveTeamActivities(updatedActs);
    setPingModalCoworker(null);
    showToast(`📨 Sent review request to ${cw.name}.`);

    // 2. Simulate intelligent colleague response after 1.5 seconds
    setTimeout(() => {
      const responses: Record<string, string> = {
        'Dr. Elena Rostova': `I reviewed ${targetDs.name}. The empirical distributions look sound. I recommend clipping values above 3 standard deviations for the variance estimates.`,
        'Marcus Vance': `Checked ${targetDs.name} pipeline schema. Null rates are strictly under 0.8%. Ready for production ingestion!`,
        'Sarah Chen': `Ran quick linear regressions on ${targetDs.name}. Strong positive correlation (R² = 0.84) observed between principal features.`,
        'Alex Rivera': `Mapped key cohort segments in ${targetDs.name}. Retention looks steady across enterprise tiers. Included in weekly slide deck.`,
        'Aisha Patel': `Verified anomaly scoring on ${targetDs.name}. No fraudulent or out-of-boundary outliers detected in sample.`,
        'David Kim': `Conversion funnel on ${targetDs.name} shows a 14% lift in organic acquisition. Clean data!`
      };

      const replyText = responses[cw.name] || `Looks good! I've reviewed the dataset and everything matches our standard analytical quality benchmarks.`;

      const colleagueAct: TeamActivityEvent = {
        id: `act_${Date.now() + 1}`,
        type: 'comment',
        actorName: cw.name,
        actorAvatar: cw.avatarUrl,
        actorRole: cw.role,
        targetName: targetDs.name,
        timestamp: 'Just now',
        details: `Reviewed "${targetDs.name}": "${replyText}"`,
        datasetId: targetDs.id
      };

      const freshActs = [colleagueAct, ...getSavedTeamActivities()];
      setActivities(freshActs);
      saveTeamActivities(freshActs);

      // Also append to comments in shared dataset if it exists
      const currentShares = getSavedSharedDatasets();
      const matchingShare = currentShares.find(s => s.datasetId === targetDs.id || s.datasetName === targetDs.name);
      if (matchingShare) {
        const newComm = {
          id: `comm_${Date.now()}`,
          author: cw.name,
          authorEmail: cw.email,
          authorAvatar: cw.avatarUrl,
          authorRole: cw.role,
          timestamp: 'Just now',
          text: replyText
        };
        const updatedShares = currentShares.map(s => s.id === matchingShare.id ? { ...s, comments: [...(s.comments || []), newComm] } : s);
        setSharedDatasets(updatedShares);
        saveSharedDatasets(updatedShares);
      }

      showToast(`🔔 ${cw.name} responded to your review request!`);
    }, 1600);
  };

  // Handle Quick Slice Send
  const handleSendSlice = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCw = coworkers.find(c => c.id === sliceTargetCoworker);
    const sourceDs = sourceDatasetForSlice;
    if (!targetCw || !sourceDs) return;

    // Filter columns and row range
    const colsToKeep = sourceDs.columns.filter(c => selectedSliceColumns.includes(c.key));
    const sliceRawData = sourceDs.data.slice(0, Math.min(sliceRowCount, sourceDs.data.length));
    
    // Project rows to only selected columns
    const sliceData = sliceRawData.map(row => {
      const projected: Record<string, any> = {};
      colsToKeep.forEach(col => {
        projected[col.key] = row[col.key];
      });
      return projected;
    });

    const newRecord: SharedDatasetRecord = {
      id: `share_slice_${Date.now()}`,
      datasetId: sourceDs.id,
      datasetName: `${sourceDs.name} [Slice: ${sliceData.length} rows, ${colsToKeep.length} cols]`,
      description: `Targeted data slice dispatched directly to ${targetCw.name}.`,
      sender: {
        id: currentUser?.id || 'current_user',
        name: currentUser?.name || 'You (Analytics Lead)',
        email: currentUser?.email || 'analyst@datahub.internal',
        avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: currentUser?.role || 'Data Scientist',
        department: 'Quantitative Analytics'
      },
      recipients: [{
        id: targetCw.id,
        name: targetCw.name,
        email: targetCw.email,
        avatarUrl: targetCw.avatarUrl,
        permission: 'edit'
      }],
      permission: 'edit',
      note: sliceNote.trim() || 'Custom data slice dispatched for team inspection.',
      sharedAt: 'Just now',
      rowCount: sliceData.length,
      columnCount: colsToKeep.length,
      sourceType: sourceDs.sourceType,
      accessLink: `https://datahub.internal/shared/slice-${sourceDs.id}`,
      dataSnapshot: sliceData,
      columnsSnapshot: colsToKeep,
      tags: ['Data Slice', 'Direct Dispatch', 'Priority'],
      comments: []
    };

    const updatedShares = [newRecord, ...sharedDatasets];
    setSharedDatasets(updatedShares);
    saveSharedDatasets(updatedShares);

    // Add activity
    const act: TeamActivityEvent = {
      id: `act_${Date.now()}`,
      type: 'share_dataset',
      actorName: currentUser?.name || 'You',
      actorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      actorRole: currentUser?.role || 'Data Scientist',
      targetName: newRecord.datasetName,
      timestamp: 'Just now',
      details: `Dispatched filtered slice (${sliceData.length} rows, ${colsToKeep.length} columns) directly to ${targetCw.name}.`,
      datasetId: sourceDs.id
    };
    const updatedActs = [act, ...activities];
    setActivities(updatedActs);
    saveTeamActivities(updatedActs);

    showToast(`🚀 Dispatched ${sliceData.length}-row data slice directly to ${targetCw.name}!`);
    setSubTab('shared_with_me');
  };

  // Toggle Column Selection in Slice
  const toggleColumnSelection = (colKey: string) => {
    setSelectedSliceColumns(prev => 
      prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
    );
  };

  const handleSelectAllColumns = () => {
    if (!sourceDatasetForSlice?.columns) return;
    if (selectedSliceColumns.length === sourceDatasetForSlice.columns.length) {
      setSelectedSliceColumns([sourceDatasetForSlice.columns[0]?.key]);
    } else {
      setSelectedSliceColumns(sourceDatasetForSlice.columns.map(c => c.key));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* 1. TOP TEAM HERO & LIVE PRESENCE BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Co-workers & Shared Workspace</h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {coworkers.filter(c => c.status === 'online' || c.status === 'analyzing').length} Online Now
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Collaborate in real-time, inspect colleagues' live analyses, and exchange verified data assets.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenShareModal(activeDataset)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Active Dataset ({activeDataset.name})</span>
            </button>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>Invite Co-worker</span>
            </button>

            <button
              onClick={() => setIsEmailSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02]"
              title="Configure outbound email server (Gmail App Password, SMTP, Resend) and view outbox"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>Email Settings & Outbox</span>
            </button>
          </div>

        </div>

        {/* Live Coworker Avatars Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Colleagues:
            </span>
            <div className="flex items-center -space-x-2 overflow-hidden py-1">
              {coworkers.slice(0, 6).map((cw, idx) => (
                <div 
                  key={cw.id ? `cw_avatar_${cw.id}` : `cw_avatar_idx_${idx}`} 
                  className="relative group cursor-pointer"
                  title={`${cw.name} (${cw.role}) - ${cw.currentActivity || 'Online'}. Click to dispatch data slice.`}
                  onClick={() => {
                    setSliceTargetCoworker(cw.id);
                    setSubTab('send_slice');
                  }}
                >
                  <img
                    src={cw.avatarUrl}
                    alt={cw.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-900 group-hover:ring-indigo-500 transition-all group-hover:scale-110"
                  />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                    cw.status === 'online' ? 'bg-emerald-400 animate-pulse' : cw.status === 'analyzing' ? 'bg-purple-400' : 'bg-slate-500'
                  }`} />
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-mono ml-2">
              +{coworkers.length} members in organization
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              {sharedDatasets.length} Shared Datasets
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              {activities.length} Team Activities
            </span>
          </div>
        </div>

      </div>

      {/* 2. MAIN SUB-TABS NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setSubTab('shared_with_me')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'shared_with_me'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Shared Data Pool ({sharedDatasets.length})</span>
          </button>

          <button
            id="tab-team-chat-btn"
            onClick={() => setSubTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'chat'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chat & Data Exchange</span>
          </button>

          <button
            onClick={() => setSubTab('coworkers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'coworkers'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Co-worker Directory ({coworkers.length})</span>
          </button>

          <button
            id="tab-field-supervisors-btn"
            onClick={() => setSubTab('field_supervisors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'field_supervisors'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>County Supervisors & Field Comms</span>
          </button>

          <button
            onClick={() => setSubTab('send_slice')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'send_slice'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-cyan-300" />
            <span>Dispatch Data Slice</span>
          </button>

          <button
            onClick={() => setSubTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
              subTab === 'activity'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Audit Feed ({activities.length})</span>
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={subTab === 'coworkers' ? "Search colleagues..." : "Search data, notes..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>

          {subTab === 'coworkers' && (
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {departments.map((dept, idx) => (
                <option key={`dept_${dept}_${idx}`} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          )}

          {subTab === 'shared_with_me' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  showPinnedOnly ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Show pinned datasets only"
              >
                <Pin className="w-3 h-3" />
                <span className="hidden md:inline">Pinned</span>
              </button>

              <select
                value={permissionFilter}
                onChange={e => setPermissionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Permissions</option>
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </div>

      </div>

      {/* ================= SUB-TAB 1: SHARED DATA POOL ================= */}
      {subTab === 'shared_with_me' && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Team Shared Datasets & Assets ({filteredSharedDatasets.length})
              </h3>
              <p className="text-xs text-slate-400">
                Datasets shared by your colleagues with embedded schema, data snapshots, collaborator notes, and direct analysis shortcuts.
              </p>
            </div>
            <button
              onClick={() => onOpenShareModal(activeDataset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Active Dataset</span>
            </button>
          </div>

          {filteredSharedDatasets.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Shared Datasets Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? 'No datasets match your search query.' : 'Click "Share Active Dataset" or dispatch a data slice to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredSharedDatasets.map((record, rIdx) => {
                const isLoaded = activeDataset?.id === record.datasetId || activeDataset?.name === record.datasetName;
                const recordKey = record.id ? `share_record_${record.id}` : `share_record_idx_${rIdx}`;
                return (
                  <div
                    key={recordKey}
                    className={`bg-slate-900 border rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 shadow-lg relative ${
                      record.isPinned ? 'border-amber-500/40' : 'border-slate-800'
                    }`}
                  >
                    
                    {/* Header Info */}
                    <div className="space-y-3">
                      
                      {/* Sender Info & Permission Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={record.sender.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt={record.sender.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">{record.sender.name}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({record.sender.department})
                              </span>
                            </div>
                            <p className="text-[10px] text-indigo-300 font-mono">
                              Shared {record.sharedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePin(record.id)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              record.isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title={record.isPinned ? 'Unpin Dataset' : 'Pin Dataset to Top'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            record.permission === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : record.permission === 'edit'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {record.permission.toUpperCase()}
                          </span>

                          <button
                            onClick={() => handleDeleteSharedRecord(record.id, record.datasetName)}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                            title="Remove from shared pool"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Dataset Name & Description */}
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{record.datasetName}</span>
                          {record.isPinned && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                              PINNED
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {record.description}
                        </p>
                      </div>

                      {/* Sender's Collaboration Note */}
                      {record.note && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                          <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                              Note from {record.sender.name.split(' ')[0]}:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              "{record.note}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Metric Badges & Tags */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {record.rowCount.toLocaleString()} rows
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {record.columnCount} columns
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {record.sourceType.toUpperCase()}
                        </span>
                        {record.tags?.map((t, tIdx) => (
                          <span key={`rec_tag_${record.id}_${t}_${tIdx}`} className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Comments Stream (Collaborator discussions) */}
                      {record.comments && record.comments.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Collaborator Notes ({record.comments.length}):
                          </span>
                          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                            {record.comments.map((comm, cIdx) => (
                              <div key={comm.id ? `comm_${comm.id}` : `comm_${record.id}_${cIdx}`} className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-2">
                                <img
                                  src={comm.authorAvatar}
                                  alt={comm.author}
                                  className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-white text-[11px]">{comm.author}</span>
                                    <span className="text-[9px] text-slate-500">{comm.timestamp}</span>
                                  </div>
                                  <p className="text-slate-300 text-[11px] leading-snug">{comm.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Reply or add team note..."
                          value={commentInputs[record.id] || ''}
                          onChange={e => setCommentInputs({ ...commentInputs, [record.id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(record.id)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleAddComment(record.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                          title="Post Note"
                        >
                          <Send className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      </div>

                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      
                      {/* Left: Share Link & Export formats */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(record)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors font-mono"
                          title="Copy Direct Share Link"
                        >
                          {copiedId === record.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === record.id ? 'Copied' : 'Link'}</span>
                        </button>

                        <div className="h-3 w-px bg-slate-800" />

                        <button
                          onClick={() => exportToCSV({
                            id: record.datasetId,
                            name: record.datasetName,
                            description: record.description,
                            createdAt: record.sharedAt,
                            updatedAt: record.sharedAt,
                            sourceType: record.sourceType as any,
                            columns: record.columnsSnapshot,
                            data: record.dataSnapshot
                          })}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors font-mono"
                          title="Export to CSV"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => exportToJSON({
                            id: record.datasetId,
                            name: record.datasetName,
                            description: record.description,
                            createdAt: record.sharedAt,
                            updatedAt: record.sharedAt,
                            sourceType: record.sourceType as any,
                            columns: record.columnsSnapshot,
                            data: record.dataSnapshot
                          })}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors font-mono"
                          title="Export to JSON"
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => exportToExcel({
                            id: record.datasetId,
                            name: record.datasetName,
                            description: record.description,
                            createdAt: record.sharedAt,
                            updatedAt: record.sharedAt,
                            sourceType: record.sourceType as any,
                            columns: record.columnsSnapshot,
                            data: record.dataSnapshot
                          })}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors font-mono"
                          title="Export to Excel"
                        >
                          XLSX
                        </button>
                      </div>

                      {/* Right: Direct Studio Open Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadDataset(record, 'grid')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Open directly in Grid Editor"
                        >
                          <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Grid</span>
                        </button>

                        <button
                          onClick={() => handleLoadDataset(record, 'simulation')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Open in What-If Scenario Sandbox"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Forecast</span>
                        </button>

                        <button
                          onClick={() => handleLoadDataset(record, 'analysis')}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isLoaded
                              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                              : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          <LineChart className="w-3.5 h-3.5" />
                          <span>{isLoaded ? 'Active in Analysis' : 'Analyze'}</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ================= SUB-TAB: LIVE CHAT & DATA EXCHANGE ================= */}
      {subTab === 'chat' && (
        <div className="space-y-4">
          <TeamMessenger
            datasets={datasets}
            activeDataset={activeDataset}
            currentUser={currentUser}
            onSelectDataset={onSelectDataset}
            onNavigateToTab={onNavigateToTab}
            onOpenShareModal={onOpenShareModal}
          />
        </div>
      )}

      {/* ================= SUB-TAB 2: CO-WORKER DIRECTORY ================= */}
      {subTab === 'coworkers' && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Organization Co-worker Directory ({filteredCoworkers.length})
              </h3>
              <p className="text-xs text-slate-400">
                View team members, inspect their active focus, analytical skills, request reviews, and dispatch data in 1-click.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAcceptModalToken('');
                  setAcceptModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                title="Have an invitation token? Enter it here to join the team"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Accept Invite Code</span>
              </button>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Co-worker</span>
              </button>
            </div>
          </div>

          {filteredCoworkers.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Team Members Added Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? 'No colleagues match your search query.' : 'Add your co-workers, data engineers, and analysts to start collaborating.'}
              </p>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite First Co-worker</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoworkers.map((cw, cwIdx) => {
                const isPending = cw.status === 'pending_invitation' || cw.status === 'invited';

                return (
                <div
                  key={cw.id ? `cw_card_${cw.id}` : `cw_card_idx_${cwIdx}`}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 shadow-lg ${
                    isPending ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-500/60' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                
                <div className="space-y-3">
                  
                  {/* Avatar & Presence Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={cw.avatarUrl}
                          alt={cw.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-800"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          isPending
                            ? 'bg-amber-400'
                            : cw.status === 'online'
                            ? 'bg-emerald-400 animate-pulse'
                            : cw.status === 'analyzing'
                            ? 'bg-purple-400'
                            : 'bg-slate-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white">{cw.name}</h4>
                          {isPending && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                              INVITED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-300 font-medium">{cw.role}</p>
                        <p className="text-[11px] text-slate-400">{cw.department}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      isPending
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : cw.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : cw.status === 'analyzing'
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isPending ? 'Pending Acceptance' : cw.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Current Real-Time Activity / Invitation Status */}
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isPending ? 'bg-amber-950/20 border-amber-500/20' : 'bg-slate-950 border-slate-800/80'
                  }`}>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">
                      {isPending ? 'INVITATION STATUS' : 'CURRENT FOCUS'}
                    </span>
                    <p className={`font-medium mt-0.5 line-clamp-2 ${isPending ? 'text-amber-200/90' : 'text-slate-300'}`}>
                      {isPending
                        ? `Invitation email dispatched to ${cw.email}. Awaiting coworker acceptance.`
                        : (cw.currentActivity || 'Online & active in DataHub')}
                    </p>
                  </div>

                  {/* Details / Location / Joined */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {cw.location || 'Remote'}
                    </span>
                    <span>{cw.datasetsSharedCount} Datasets Shared</span>
                  </div>

                  {/* Skills Chips */}
                  {cw.skills && cw.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cw.skills.map((s, sIdx) => (
                        <span key={`cw_skill_${cw.id}_${s}_${sIdx}`} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {/* Bottom Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => {
                          const appOrigin = window.location.origin;
                          const tok = cw.invitationToken || 'inv_' + Math.random().toString(36).substring(2, 8);
                          const url = `${appOrigin}/?invite_token=${tok}`;
                          const sub = `[Invitation] You've been invited to join DataHub Workspace`;
                          const body = `Hi ${cw.name},\n\nYou have been invited to join DataHub as a ${cw.role}.\nAccept here: ${url}`;
                          
                          setInviteResultDialog({
                            inviteToken: tok,
                            inviteUrl: url,
                            email: cw.email,
                            name: cw.name,
                            role: cw.role,
                            department: cw.department,
                            realDeliverySuccess: false,
                            deliveryMode: 'client_direct',
                            gmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cw.email)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`,
                            outlookUrl: `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(cw.email)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`,
                            mailtoUrl: `mailto:${encodeURIComponent(cw.email)}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`,
                            subject: sub,
                            emailBodyText: body,
                          });
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                        title="View invitation link and direct email launchers"
                      >
                        <Mail className="w-3.5 h-3.5 text-amber-300" />
                        <span>Email Options</span>
                      </button>

                      <button
                        onClick={() => {
                          setAcceptModalToken(cw.invitationToken || '');
                          setAcceptModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                        title="Accept invitation to activate this colleague as a real user"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Accept & Join</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSubTab('chat');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                        title="Open Direct Chat with this Colleague"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => {
                          setPingModalCoworker(cw);
                          setPingSelectedDatasetId(activeDataset?.id || datasets[0]?.id);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                        title="Request Statistical Review from this Colleague"
                      >
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Review</span>
                      </button>

                      <button
                        onClick={() => {
                          setSliceTargetCoworker(cw.id);
                          setSubTab('send_slice');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Data</span>
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
          </div>
          )}

        </div>
      )}

      {/* ================= SUB-TAB: COUNTY SUPERVISORS & FIELD COMMS ================= */}
      {subTab === 'field_supervisors' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">County Field Supervisors Directory & Live Comms</h3>
                <p className="text-xs text-slate-300">
                  Direct liaison with field supervisors across all Kenya counties. Message supervisors directly, coordinate data cleaning, and review active field quotas.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubTab('chat')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all shrink-0 shadow-md shadow-indigo-600/30"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Supervisor Chat Channel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCountySupervisors().map(sup => (
              <div
                key={sup.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500/50 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${sup.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {sup.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{sup.name}</h4>
                        <p className="text-xs text-indigo-400">{sup.role}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {sup.county}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block">Badge ID</span>
                      <span className="font-mono font-semibold text-slate-200">{sup.badgeId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cleaned & Sent</span>
                      <span className="font-mono font-bold text-emerald-400">{sup.totalDispatchedToAdmin} records</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assigned Sector</span>
                      <span className="text-slate-300 truncate block">{sup.assignedSubCounties.slice(0, 2).join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Field Fleet</span>
                      <span className="font-semibold text-cyan-400">{sup.assignedEnumerators.length} active agents</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSubTab('chat');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat in Team Channel</span>
                  </button>

                  <a
                    href={`tel:${sup.phone}`}
                    className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    title={`Call ${sup.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={`mailto:${sup.email}`}
                    className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    title={`Email ${sup.name}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: DISPATCH DATA SLICE ================= */}
      {subTab === 'send_slice' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl mx-auto space-y-6 shadow-xl">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Direct Data Slice Dispatcher</h3>
              <p className="text-xs text-slate-400">
                Send a custom subset of rows and selected columns directly to a teammate with 1-click import.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendSlice} className="space-y-5 text-xs">
            
            {/* Choose Coworker */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block">Select Co-worker Recipient</label>
              <select
                value={sliceTargetCoworker}
                onChange={e => setSliceTargetCoworker(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {coworkers.map((cw, idx) => (
                  <option key={`slice_cw_opt_${cw.id}_${idx}`} value={cw.id}>
                    {cw.name} — {cw.role} ({cw.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Choose Dataset */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block">Source Dataset</label>
              <select
                value={sliceSelectedDatasetId}
                onChange={e => setSliceSelectedDatasetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {datasets.map((d, idx) => (
                  <option key={`slice_ds_opt_${d.id}_${idx}`} value={d.id}>
                    {d.name} ({d.data.length.toLocaleString()} total rows, {d.columns.length} cols)
                  </option>
                ))}
              </select>
            </div>

            {/* Slice Column Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 block">
                  Select Columns to Include ({selectedSliceColumns.length} / {sourceDatasetForSlice.columns.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {selectedSliceColumns.length === sourceDatasetForSlice.columns.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {sourceDatasetForSlice.columns.map((col, idx) => {
                  const isChecked = selectedSliceColumns.includes(col.key);
                  return (
                    <button
                      key={`slice_col_btn_${col.key}_${idx}`}
                      type="button"
                      onClick={() => toggleColumnSelection(col.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 border transition-all ${
                        isChecked
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{col.label || col.name || col.key}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slice Row Range / Count */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block">Number of Rows in Slice</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={Math.min(500, sourceDatasetForSlice.data.length || 100)}
                  value={sliceRowCount}
                  onChange={e => setSliceRowCount(Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-mono text-indigo-300 font-bold px-3 py-1 bg-slate-950 rounded-lg border border-slate-800">
                  {Math.min(sliceRowCount, sourceDatasetForSlice.data.length)} rows
                </span>
              </div>
            </div>

            {/* Live Mini Preview of Slice */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-400 block uppercase font-mono text-[10px]">
                Slice Snapshot Preview (Top 2 Rows)
              </label>
              <div className="overflow-x-auto p-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-indigo-300">
                      {sourceDatasetForSlice.columns
                        .filter(c => selectedSliceColumns.includes(c.key))
                        .slice(0, 5)
                        .map((col, idx) => (
                          <th key={`slice_prev_th_${col.key}_${idx}`} className="py-1 px-2 font-bold">{col.label || col.key}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sourceDatasetForSlice.data.slice(0, 2).map((row, rowIdx) => (
                      <tr key={`slice_prev_tr_${rowIdx}`} className="border-b border-slate-900 text-slate-300">
                        {sourceDatasetForSlice.columns
                          .filter(c => selectedSliceColumns.includes(c.key))
                          .slice(0, 5)
                          .map((col, colIdx) => (
                            <td key={`slice_prev_td_${rowIdx}_${col.key}_${colIdx}`} className="py-1 px-2 truncate max-w-[120px]">
                              {String(row[col.key] ?? '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Context Note */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block">Collaboration Note</label>
              <textarea
                rows={2}
                value={sliceNote}
                onChange={e => setSliceNote(e.target.value)}
                placeholder="Include instructions or observations for your coworker..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubTab('shared_with_me')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedSliceColumns.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Slice to Colleague</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* ================= SUB-TAB 4: LIVE AUDIT FEED ================= */}
      {subTab === 'activity' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Real-Time Team Collaboration Feed ({filteredActivities.length})
              </h3>
              <p className="text-xs text-slate-400">
                Live chronological audit of dataset shares, collaborator notes, review pings, and team invites.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activityTypeFilter}
                onChange={e => setActivityTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Event Types</option>
                <option value="share_dataset">Dataset Shares</option>
                <option value="comment">Collaborator Notes</option>
                <option value="invite_member">Team Invites</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No activity logs match the selected filter.
              </div>
            ) : (
              filteredActivities.map((act, actIdx) => (
                <div
                  key={act.id ? `act_event_${act.id}` : `act_event_idx_${actIdx}`}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start gap-3.5"
                >
                  <img
                    src={act.actorAvatar}
                    alt={act.actorName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{act.actorName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({act.actorRole})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {act.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {act.details}
                    </p>

                    {act.targetName && (
                      <span className="inline-block text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        Target: {act.targetName}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ================= INVITE CO-WORKER MODAL ================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Invite Co-worker to Workspace</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hayes"
                  value={newInvite.name}
                  onChange={e => setNewInvite({ ...newInvite, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="jordan.hayes@datahub.internal"
                  value={newInvite.email}
                  onChange={e => setNewInvite({ ...newInvite, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 block">An official workspace invitation email will be dispatched to this address.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Role</label>
                  <select
                    value={newInvite.role}
                    onChange={e => setNewInvite({ ...newInvite, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Analytics Engineer">Analytics Engineer</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="Product Analyst">Product Analyst</option>
                    <option value="VP of Analytics">VP of Analytics</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Department</label>
                  <select
                    value={newInvite.department}
                    onChange={e => setNewInvite({ ...newInvite, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Quantitative Analytics">Quantitative Analytics</option>
                    <option value="Data Platform">Data Platform</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Product Operations">Product Operations</option>
                    <option value="Risk Management">Risk Management</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Analytical Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Econometrics, PyTorch, SQL, R"
                  value={newInvite.skills}
                  onChange={e => setNewInvite({ ...newInvite, skills: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Personal Welcome Message (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Welcome to the Quantitative Analytics team! Looking forward to reviewing the churn models together."
                  value={newInvite.customMessage}
                  onChange={e => setNewInvite({ ...newInvite, customMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingInvite ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Workspace Invitation Email</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= INVITATION DISPATCH CONFIRMATION & LAUNCHER DIALOG ================= */}
      {inviteResultDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  inviteResultDialog.realDeliverySuccess 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {inviteResultDialog.realDeliverySuccess ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Mail className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {inviteResultDialog.realDeliverySuccess
                      ? 'Automated Email Delivered!'
                      : 'Invitation Ready for Dispatch'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Invitation prepared for <strong>{inviteResultDialog.name}</strong> ({inviteResultDialog.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteResultDialog(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Recipient & Role Details */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recipient Email:</span>
                <span className="text-white font-mono font-semibold">{inviteResultDialog.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="text-indigo-300 font-semibold">{inviteResultDialog.role} · {inviteResultDialog.department}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Delivery Status:</span>
                {inviteResultDialog.realDeliverySuccess ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Automated Email Delivered to Inbox
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Ready to Send via 1-Click Mailer
                  </span>
                )}
              </div>
            </div>

            {/* Delivery Guidance or Action Card */}
            {!inviteResultDialog.realDeliverySuccess && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Deliver Invitation to {inviteResultDialog.email}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Automated background email sending requires an authenticated mail server (like a Gmail App Password or Resend key).
                  Click the button below to <strong>send this invitation directly via Gmail</strong> in 1 click!
                </p>

                {/* Primary 1-Click Gmail Action Button */}
                <a
                  href={inviteResultDialog.gmailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all hover:scale-[1.01]"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>🚀 Open & Send in Gmail to {inviteResultDialog.email}</span>
                </a>
              </div>
            )}

            {/* Direct Email Launchers */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Additional Delivery Options
              </label>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={inviteResultDialog.outlookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>Send via Outlook</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const fullMsg = `Subject: ${inviteResultDialog.subject}\n\n${inviteResultDialog.emailBodyText}`;
                    navigator.clipboard.writeText(fullMsg);
                    showToast('📋 Full email message copied to clipboard!');
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
                >
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy Full Message</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEmailSettingsOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all"
              >
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>⚙️ Connect SMTP or Resend for 100% Automated Delivery</span>
              </button>
            </div>

            {/* Copyable Acceptance Link */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Direct Invitation Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResultDialog.inviteUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteResultDialog.inviteUrl);
                    showToast('📋 Invitation link copied to clipboard!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            {/* Test Acceptance Experience directly */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const tok = inviteResultDialog.inviteToken;
                  setInviteResultDialog(null);
                  setAcceptModalToken(tok);
                  setAcceptModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                title="Test accepting this invitation as the coworker right now"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Accept as Coworker (Test Real Flow)</span>
              </button>

              <button
                type="button"
                onClick={() => setInviteResultDialog(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= EMAIL SETTINGS & OUTBOX MODAL ================= */}
      <EmailSettingsModal
        isOpen={isEmailSettingsOpen}
        onClose={() => setIsEmailSettingsOpen(false)}
        defaultRecipientEmail="abduljembe@gmail.com"
      />

      {/* ================= ACCEPT INVITATION MODAL ================= */}
      {acceptModalOpen && (
        <AcceptInvitationModal
          isOpen={acceptModalOpen}
          onClose={() => setAcceptModalOpen(false)}
          inviteToken={acceptModalToken}
          onAcceptSuccess={(newUser) => {
            setCoworkers(getSavedCoworkers());
            showToast(`🎉 ${newUser.name} accepted the invitation and is now an active colleague!`);
          }}
        />
      )}

      {/* ================= PING / REQUEST REVIEW MODAL ================= */}
      {pingModalCoworker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={pingModalCoworker.avatarUrl}
                  alt={pingModalCoworker.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">Request Review from {pingModalCoworker.name}</h3>
                  <p className="text-[10px] text-indigo-300">{pingModalCoworker.role} · {pingModalCoworker.department}</p>
                </div>
              </div>
              <button
                onClick={() => setPingModalCoworker(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendPing} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Dataset to Review</label>
                <select
                  value={pingSelectedDatasetId}
                  onChange={e => setPingSelectedDatasetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {datasets.map((d, idx) => (
                    <option key={`ping_ds_opt_${d.id}_${idx}`} value={d.id}>
                      {d.name} ({d.data.length.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Review Request / Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={pingMessage}
                  onChange={e => setPingMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Colleague will perform analytical review and post notes to the live team feed.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPingModalCoworker(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Review Request</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
