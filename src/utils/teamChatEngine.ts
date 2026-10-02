import { ChatThread, ChatMessage, Coworker, Dataset, ChatDataAttachment } from '../types';
import { INITIAL_COWORKERS } from './teamData';

export const INITIAL_CHAT_CHANNELS: ChatThread[] = [
  {
    id: 'chan_general',
    type: 'channel',
    name: '# general-analytics',
    topic: 'Team-wide data discussions, pipeline updates, and collaboration',
    participantIds: [],
    unreadCount: 0
  },
  {
    id: 'chan_supervisors',
    type: 'channel',
    name: '# county-supervisors',
    topic: 'Liaison between County Field Supervisors, regional leads, and Central Admin Office',
    participantIds: [],
    unreadCount: 2
  },
  {
    id: 'chan_field_ops',
    type: 'channel',
    name: '# field-enumerators-dispatch',
    topic: 'Live enumerator field support, GPS routes, battery alerts & tactical instructions',
    participantIds: [],
    unreadCount: 1
  },
  {
    id: 'chan_cleaning',
    type: 'channel',
    name: '# data-cleaning-alerts',
    topic: 'Automated cleaning recipe logs, outlier capping triggers & supervisor signoffs',
    participantIds: [],
    unreadCount: 0
  },
  {
    id: 'chan_ml',
    type: 'channel',
    name: '# ml-modeling-reviews',
    topic: 'Statistical verification, regression formulas, and forecasting checks',
    participantIds: [],
    unreadCount: 0
  },
  {
    id: 'chan_eng',
    type: 'channel',
    name: '# data-pipelines',
    topic: 'Ingestion streams, SQL optimizations, and schema validation',
    participantIds: [],
    unreadCount: 0
  }
];

export const INITIAL_DIRECT_THREADS: ChatThread[] = [
  {
    id: 'dm_sup_grace',
    type: 'direct',
    name: 'Grace Wambui (Nairobi Supervisor)',
    topic: 'Nairobi County Field Operations · Westlands, Kasarani, Kibra & Langata',
    participantIds: ['sup_nrb_01'],
    unreadCount: 1
  },
  {
    id: 'dm_sup_kamau',
    type: 'direct',
    name: 'Peter Kamau (Kiambu Supervisor)',
    topic: 'Kiambu County Operations · Thika, Ruiru, Kikuyu & Githunguri',
    participantIds: ['sup_kbu_02'],
    unreadCount: 0
  },
  {
    id: 'dm_hq_admin',
    type: 'direct',
    name: 'Central Admin Office (HQ)',
    topic: 'Office Data Clearinghouse & National Datasets Ingestion',
    participantIds: ['admin_hq'],
    unreadCount: 0
  }
];

export const INITIAL_MESSAGES_BY_THREAD: Record<string, ChatMessage[]> = {
  chan_general: [
    {
      id: 'msg_gen_1',
      threadId: 'chan_general',
      senderId: 'coworker_sarah',
      senderName: 'Sarah Chen (Lead Analyst)',
      senderRole: 'Lead Data Scientist',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      text: 'Welcome to the analytics workspace! All active datasets are linked with reproducible audit trails and the executive dossier export.'
    }
  ],
  chan_supervisors: [
    {
      id: 'msg_sup_1',
      threadId: 'chan_supervisors',
      senderId: 'sup_nrb_01',
      senderName: 'Grace Wambui (Nairobi Supervisor)',
      senderRole: 'County Field Supervisor',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      text: 'Greetings team! Nairobi County team just finished cleaning Batch DISPATCH-NRB-2026-041. All phone numbers standardized and GPS boundaries locked. Sent to Central Admin Office!'
    },
    {
      id: 'msg_sup_2',
      threadId: 'chan_supervisors',
      senderId: 'sup_kbu_02',
      senderName: 'Peter Kamau (Kiambu Supervisor)',
      senderRole: 'County Field Supervisor',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      text: 'Kiambu County is running the automated outlier capping recipe on smallholder farm yields. We will transmit our cleaned batch to HQ within the hour.'
    },
    {
      id: 'msg_sup_3',
      threadId: 'chan_supervisors',
      senderId: 'admin_hq',
      senderName: 'Central Admin Office (HQ)',
      senderRole: 'Central Administrator',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      text: 'Acknowledged Nairobi batch! The verified records have been ingested into the Master Analytics repository. Great work team.'
    }
  ],
  chan_field_ops: [
    {
      id: 'msg_field_1',
      threadId: 'chan_field_ops',
      senderId: 'agent_faith',
      senderName: 'Faith Mutua (Enumerator)',
      senderRole: 'Field Enumerator',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      text: 'Westlands zone survey target reached for the day (28 household interviews completed). Submitting to supervisor vault for QA.'
    }
  ],
  chan_cleaning: [
    {
      id: 'msg_clean_1',
      threadId: 'chan_cleaning',
      senderId: 'system_bot',
      senderName: 'DataHub Auto-Heal Bot',
      senderRole: 'System Bot',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      text: 'Cleaning Recipe Executed: 42 whitespaces trimmed, 18 telephone numbers formatted to E.164, and 3 outliers capped at Q3 + 1.5*IQR.'
    }
  ],
  dm_sup_grace: [
    {
      id: 'msg_dm_grace_1',
      threadId: 'dm_sup_grace',
      senderId: 'sup_nrb_01',
      senderName: 'Grace Wambui (Nairobi Supervisor)',
      senderRole: 'County Field Supervisor',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      text: 'Hello! I have reviewed all incoming submissions from Faith and Brian. If you need any sub-county breakdown for Westlands or Kasarani, let me know.'
    }
  ],
  dm_sup_kamau: [],
  dm_hq_admin: [],
  chan_ml: [],
  chan_eng: []
};

/**
 * Real-time responses from coworkers based on their specific persona
 */
export function generateCoworkerChatResponse(
  coworker: Coworker,
  userMessageText: string,
  attachedDataset?: Dataset | null
): { text: string; attachment?: ChatDataAttachment } {
  const lower = userMessageText.toLowerCase();

  // If user attached a dataset
  if (attachedDataset) {
    return {
      text: `Received **${attachedDataset.name}** (${attachedDataset.data.length.toLocaleString()} rows, ${attachedDataset.columns.length} columns). The schema is verified and ready for collaborative analysis.`,
      attachment: {
        id: `att_rev_${Date.now()}`,
        type: 'data_slice',
        datasetId: attachedDataset.id,
        datasetName: attachedDataset.name,
        title: `Data Slice Preview • ${attachedDataset.name}`,
        description: `Shared with ${coworker.name} (${attachedDataset.data.length} records)`,
        rowCount: attachedDataset.data.length,
        columnCount: attachedDataset.columns.length,
        columns: attachedDataset.columns,
        dataPreview: attachedDataset.data.slice(0, 3)
      }
    };
  }

  // Text-only questions & conversational prompts
  if (lower.includes('forecast') || lower.includes('what-if') || lower.includes('simulation') || lower.includes('predict')) {
    return {
      text: `For your forecasting scenario, you can configure polynomial curves or stochastic walk models in the Scenario Sandbox. Check elasticity coefficients to measure sensitivity.`
    };
  }

  if (lower.includes('clean') || lower.includes('null') || lower.includes('outlier') || lower.includes('missing')) {
    return {
      text: `You can use the Data Cleaning tools in the Upload Studio or the Grid view to detect and handle missing values, duplicates, and statistical outliers.`
    };
  }

  if (lower.includes('sql') || lower.includes('query') || lower.includes('database')) {
    return {
      text: `You can execute SQL queries directly against your active dataset in the Analysis tab using standard SQL syntax.`
    };
  }

  if (lower.includes('county') || lower.includes('supervisor') || lower.includes('enumerator') || lower.includes('batch') || lower.includes('field') || lower.includes('admin')) {
    return {
      text: `Field operations update received! County supervisors are auditing incoming enumerator submissions, applying cleaning recipes, and transmitting verified batches directly to the Central Admin Office for ingestion.`
    };
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      text: `Hello! I am ready to collaborate on your datasets and analyses.`
    };
  }

  // Fallback realistic response
  return {
    text: `Thanks for the update. I have reviewed your notes and will follow up on any data tasks or reviews needed.`
  };
}
