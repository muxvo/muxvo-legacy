// Ordered steps of the auto-update funnel (mirrors the server's
// UPDATE_FUNNEL_STEPS). Used by QualitySection via GET /admin/analytics/funnel.
export const UPDATE_FUNNEL_STEPS = [
  'update.prompted',
  'update.downloaded',
  'update.applied',
] as const;

export const UPDATE_FUNNEL_LABELS: Record<string, string> = {
  'update.prompted': '提醒 Prompted',
  'update.downloaded': '下载 Downloaded',
  'update.applied': '完成 Applied',
};
