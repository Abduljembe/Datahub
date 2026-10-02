import { Dataset } from '../types';

export const DEFAULT_QUALITATIVE_DATASET: Dataset = {
  id: 'ds_qualitative_feedback_demo',
  name: 'User Experience & Customer Feedback (Qualitative Study)',
  description: 'Rich participant interviews, open-ended survey responses, sentiment narratives, and feature requests for mixed-methods thematic research.',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: new Date().toISOString(),
  sourceType: 'manual',
  columns: [
    { id: 'col_1', name: 'response_id', type: 'string', nullable: false },
    { id: 'col_2', name: 'participant_name', type: 'string', nullable: false },
    { id: 'col_3', name: 'cohort', type: 'category', nullable: false },
    { id: 'col_4', name: 'satisfaction_rating', type: 'number', nullable: false },
    { id: 'col_5', name: 'feedback_text', type: 'string', nullable: false },
    { id: 'col_6', name: 'channel', type: 'category', nullable: false },
    { id: 'col_7', name: 'urgency_level', type: 'category', nullable: false },
  ],
  data: [
    {
      response_id: 'RESP-101',
      participant_name: 'Elena Rostova',
      cohort: 'Enterprise',
      satisfaction_rating: 5,
      feedback_text: 'The automated data transformation recipes saved our engineering team dozens of manual hours. The interface is intuitive, fast, and extremely reliable for our weekly pipeline runs.',
      channel: 'In-Depth Interview',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-102',
      participant_name: 'Marcus Vance',
      cohort: 'Mid-Market',
      satisfaction_rating: 2,
      feedback_text: 'The dashboard feels slow and unresponsive when rendering large pivot tables over 50,000 rows. It freezes the browser tab and causes major frustration for our analysts.',
      channel: 'Support Ticket',
      urgency_level: 'High'
    },
    {
      response_id: 'RESP-103',
      participant_name: 'Sophia Lin',
      cohort: 'Free Tier',
      satisfaction_rating: 4,
      feedback_text: 'I love how clean the visual design is. It would be amazing if we could export interactive PDF dossiers directly with custom branding and client presentation logos.',
      channel: 'In-App Survey',
      urgency_level: 'Medium'
    },
    {
      response_id: 'RESP-104',
      participant_name: 'David Kalu',
      cohort: 'Enterprise',
      satisfaction_rating: 1,
      feedback_text: 'Critical issue with role permissions: team members with read-only access were still able to see draft datasets in supervisor mode. We need strict granular RBAC immediately.',
      channel: 'Executive Escalation',
      urgency_level: 'Critical'
    },
    {
      response_id: 'RESP-105',
      participant_name: 'Priya Sharma',
      cohort: 'Enterprise',
      satisfaction_rating: 5,
      feedback_text: 'The Gemini AI natural language copilot is phenomenal. It answered complex questions about our marketing churn anomalies instantly without needing SQL syntax.',
      channel: 'In-Depth Interview',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-106',
      participant_name: 'Anonymous 106',
      cohort: 'Free Tier',
      satisfaction_rating: 3,
      feedback_text: 'none',
      channel: 'In-App Survey',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-107',
      participant_name: 'Liam O\'Connor',
      cohort: 'Mid-Market',
      satisfaction_rating: 4,
      feedback_text: 'Great customer support team. They resolved our CSV delimiter parsing issue within ten minutes. Very polite and thorough guidance.',
      channel: 'Support Ticket',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-108',
      participant_name: 'Chloe Bennett',
      cohort: 'Free Tier',
      satisfaction_rating: 2,
      feedback_text: 'The mobile web layout is difficult to navigate on smaller screens. Buttons overlap and the table scrolling feels clunky on iOS Safari.',
      channel: 'Mobile Feedback',
      urgency_level: 'Medium'
    },
    {
      response_id: 'RESP-109',
      participant_name: 'Carlos Mendez',
      cohort: 'Enterprise',
      satisfaction_rating: 5,
      feedback_text: 'Outstanding offline kiosk capability! Our field researchers conducted 400 interviews in remote rural zones without connectivity and synced seamlessly upon return.',
      channel: 'Field Debrief',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-110',
      participant_name: 'Hannah Abbott',
      cohort: 'Mid-Market',
      satisfaction_rating: 3,
      feedback_text: 'The statistical tests are very helpful, but I wish there was more plain-English interpretation of the p-values and confidence intervals for non-statisticians.',
      channel: 'In-App Survey',
      urgency_level: 'Medium'
    },
    {
      response_id: 'RESP-111',
      participant_name: 'Guest Respondent',
      cohort: 'Free Tier',
      satisfaction_rating: 3,
      feedback_text: 'n/a',
      channel: 'In-App Survey',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-112',
      participant_name: 'Tariq Al-Mansoor',
      cohort: 'Enterprise',
      satisfaction_rating: 4,
      feedback_text: 'We really appreciate the PII data masking features. Redacting emails and phone numbers before exporting datasets keeps our compliance team happy.',
      channel: 'Quarterly Review',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-113',
      participant_name: 'Zoe Kravitz-Miller',
      cohort: 'Mid-Market',
      satisfaction_rating: 2,
      feedback_text: 'Encountered unexpected crashes when uploading an Excel workbook with multiple hidden sheets. An error boundary caught it, but the file failed to load.',
      channel: 'Support Ticket',
      urgency_level: 'High'
    },
    {
      response_id: 'RESP-114',
      participant_name: 'Kavita Patel',
      cohort: 'Enterprise',
      satisfaction_rating: 5,
      feedback_text: 'The qualitative thematic coding and sentiment extraction features are a game changer. We can now analyze customer feedback verbatim side-by-side with quantitative metrics.',
      channel: 'In-Depth Interview',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-115',
      participant_name: 'Benjamin Ross',
      cohort: 'Free Tier',
      satisfaction_rating: 3,
      feedback_text: 'idk seems fine so far',
      channel: 'In-App Survey',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-116',
      participant_name: 'Yuki Takahashi',
      cohort: 'Mid-Market',
      satisfaction_rating: 4,
      feedback_text: 'The geospatial GIS map was simple to use. Plotting coordinates with heatmaps allowed our logistics department to pinpoint delivery bottlenecks quickly.',
      channel: 'In-App Survey',
      urgency_level: 'Low'
    },
    {
      response_id: 'RESP-117',
      participant_name: 'Samuel Goldberg',
      cohort: 'Enterprise',
      satisfaction_rating: 2,
      feedback_text: 'Pricing tiers for enterprise team seats feel quite steep compared to standard BI tools. We need more flexible licensing for viewer-only stakeholders.',
      channel: 'Sales Call',
      urgency_level: 'Medium'
    },
    {
      response_id: 'RESP-118',
      participant_name: 'Amara Diop',
      cohort: 'Free Tier',
      satisfaction_rating: 5,
      feedback_text: 'Super intuitive interface! As a student doing qualitative research for my thesis, having automatic codebook generation and quote organization saved me weeks of manual work.',
      channel: 'Community Forum',
      urgency_level: 'Low'
    }
  ]
};
