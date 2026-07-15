import { FunnelChart } from '../../../components/charts/FunnelChart';
import { BarChart } from '../../../components/charts/BarChart';
import { Panel, AsyncBlock } from '../Panel';
import { useResource, qstr } from '../useAnalyticsData';
import type { AcquisitionFunnelResponse, ReferrersResponse } from '../types';

// ---------------------------------------------------------------------------
// Growth: acquisition funnel + referrer distribution.
// Website (web:*) data is device-population independent of the app dimension,
// so this section ignores the global app scope filter.
// ---------------------------------------------------------------------------

export function GrowthSection({ from, to }: { from: string; to: string }) {
  const funnel = useResource<AcquisitionFunnelResponse>(
    `/admin/analytics/acquisition-funnel${qstr({ from, to })}`,
  );
  const referrers = useResource<ReferrersResponse>(
    `/admin/analytics/referrers${qstr({ from, to, limit: 20 })}`,
  );

  const steps = (funnel.data?.stages ?? []).map((s, i) => ({
    label: s.label,
    value: s.devices,
    rate: i > 0 ? s.rate : undefined,
    detail: s.clicks != null ? `${s.clicks.toLocaleString()} 次点击` : undefined,
  }));

  const bars = (referrers.data?.data ?? []).map((r) => ({
    label: r.source,
    value: r.views,
    detail: `${r.devices} 设备`,
  }));

  return (
    <>
      <Panel title="获客漏斗 Acquisition Funnel">
        <AsyncBlock loading={funnel.loading} error={funnel.error} empty={steps.length === 0}>
          <FunnelChart steps={steps} valueLabel="设备" />
        </AsyncBlock>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          {funnel.data?.note ??
            '下载完成不可测（静态直链），漏斗以下载点击为准；官网与 app 设备无法关联，比率为聚合口径而非同设备转化。'}
        </p>
      </Panel>

      <Panel title="来源分布 Referrers（官网访问）">
        <AsyncBlock loading={referrers.loading} error={referrers.error} empty={bars.length === 0}>
          <BarChart data={bars} formatValue={(v) => `${v.toLocaleString()} PV`} />
        </AsyncBlock>
      </Panel>
    </>
  );
}
