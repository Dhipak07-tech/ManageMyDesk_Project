export interface IncidentFeature {
  id: string;
  label: string;
  type: 'section' | 'field' | 'dropdown' | 'button' | 'custom_dropdown';
  group: string;
}

export const CORE_INCIDENT_FEATURES: IncidentFeature[] = [
  // ── Caller / User Info ──────────────────────────────────────────────────────
  { id: 'caller',                    label: 'Reporting User (Caller)',        type: 'field',    group: 'User Info' },
  { id: 'affected_user',             label: 'Affected User',                  type: 'field',    group: 'User Info' },
  { id: 'watch_list',                label: 'Watch List',                     type: 'field',    group: 'User Info' },
  { id: 'business_phone',            label: 'Business Phone',                 type: 'field',    group: 'User Info' },
  { id: 'location',                  label: 'Location',                       type: 'field',    group: 'User Info' },
  { id: 'company',                   label: 'Company',                        type: 'dropdown', group: 'User Info' },

  // ── Classification ──────────────────────────────────────────────────────────
  { id: 'category',                  label: 'Category',                       type: 'dropdown', group: 'Classification' },
  { id: 'subcategory',               label: 'Subcategory',                    type: 'dropdown', group: 'Classification' },
  { id: 'service',                   label: 'Service',                        type: 'dropdown', group: 'Classification' },
  { id: 'service_offering',          label: 'Service Offering',               type: 'dropdown', group: 'Classification' },
  { id: 'configuration_item',        label: 'Configuration Item',             type: 'field',    group: 'Classification' },
  { id: 'computer_name',             label: 'Computer Name',                  type: 'field',    group: 'Classification' },

  // ── Priority / Impact ───────────────────────────────────────────────────────
  { id: 'impact',                    label: 'Impact',                         type: 'dropdown', group: 'Priority' },
  { id: 'urgency',                   label: 'Urgency',                        type: 'dropdown', group: 'Priority' },
  { id: 'priority',                  label: 'Priority (Auto-calculated)',      type: 'field',    group: 'Priority' },

  // ── Assignment ──────────────────────────────────────────────────────────────
  { id: 'assignment_group',          label: 'Assignment Group',               type: 'dropdown', group: 'Assignment' },
  { id: 'assigned_to',               label: 'Assigned To',                    type: 'dropdown', group: 'Assignment' },
  { id: 'original_assignment_group', label: 'Original Assignment Group',      type: 'field',    group: 'Assignment' },

  // ── Ticket Details ──────────────────────────────────────────────────────────
  { id: 'short_description',         label: 'Short Description (Title)',      type: 'field',    group: 'Ticket Details' },
  { id: 'description',               label: 'Description',                    type: 'field',    group: 'Ticket Details' },
  { id: 'channel',                   label: 'Channel',                        type: 'dropdown', group: 'Ticket Details' },
  { id: 'additional_information',    label: 'Additional Information',         type: 'field',    group: 'Ticket Details' },

  // ── Status / Tracking ───────────────────────────────────────────────────────
  { id: 'state',                     label: 'State / Status',                 type: 'dropdown', group: 'Status' },
  { id: 'opened',                    label: 'Opened (Date)',                  type: 'field',    group: 'Status' },
  { id: 'opened_by',                 label: 'Opened By',                      type: 'field',    group: 'Status' },
  { id: 'acknowledged',              label: 'Acknowledged',                   type: 'field',    group: 'Status' },
  { id: 'sla_due',                   label: 'SLA Due Date',                   type: 'field',    group: 'Status' },

  // ── Optional Fields ─────────────────────────────────────────────────────────
  { id: 'knowledge_article_used',    label: 'Knowledge Article Used?',        type: 'field',    group: 'Optional' },
  { id: 'password_reset',            label: 'Password Reset?',                type: 'dropdown', group: 'Optional' },
  { id: 'rackspace_ticket_no',       label: 'Rackspace Ticket No',            type: 'field',    group: 'Optional' },

  // ── AI / Automation ─────────────────────────────────────────────────────────
  { id: 'btn_ai_autofill',           label: 'AI Autofill Button',             type: 'button',   group: 'Automation' },
  { id: 'btn_mic_dictation',         label: 'Mic / Dictation Button',         type: 'button',   group: 'Automation' },

  // ── Form Actions ────────────────────────────────────────────────────────────
  { id: 'btn_submit',                label: 'Submit Button',                  type: 'button',   group: 'Actions' },
  { id: 'btn_cancel',                label: 'Cancel Button',                  type: 'button',   group: 'Actions' },
];

/** All unique groups in order */
export const INCIDENT_FEATURE_GROUPS = [
  ...new Set(CORE_INCIDENT_FEATURES.map(f => f.group))
];
