import { BarChart } from '../../../components/charts/BarChart';
import { FunnelChart } from '../../../components/charts/FunnelChart';
import { Panel, AsyncBlock } from '../Panel';
import { useResource, qstr } from '../useAnalyticsData';
import { UPDATE_FUNNEL_STEPS, UPDATE_FUNNEL_LABELS } from '../updateFunnelSteps';
import type { VersionsResponse, FunnelResponse, ErrorsResponse, AppScope } from '../types';

export function QualitySection({ from, to, app }: { from: string; to: string; app: AppScope }) {
  const versions = useResource<VersionsResponse>(`/admin/analytics/versions${qstr({ from, to })}`);
  const funnel = useResource<FunnelResponse>(
    `/admin/analytics/funnel${qstr({ from, to, app, steps: UPDATE_FUNNEL_STEPS.join(',') })}`,
  );
  const errors = useResource<ErrorsResponse>(
    `/admin/analytics/errors${qstr({ from, to, app, limit: 20 })}`,
  );

  const byApp = versions.data
    ? [
        { label: '老版 Legacy', value: versions.data.by_app.legacy },
        { label: '新版 muxvo2', value: versions.data.by_app.muxvo2 },
      ]
    : [];
  const byVersion = (versions.data?.by_version ?? []).map((v) => ({ label: v.version, value: v.devices }));
  const byOs = (versions.data?.by_os ?? []).map((v) => ({ label: v.os, value: v.devices }));

  const funnelSteps = UPDATE_FUNNEL_STEPS.map((metric, i) => {
    const row = funnel.data?.data.find((d) => d.metric === metric);
    return {
      label: UPDATE_FUNNEL_LABELS[metric] ?? metric,
      value: row?.devices ?? 0,
      rate: i > 0 ? row?.rate_from_prev ?? 0 : undefined,
    };
  });

  const errorRows = errors.data?.data ?? [];

  return (
    <>
      <Panel title="版本分布 Versions">
        <AsyncBlock loading={versions.loading} error={versions.error}>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">按端 By App</p>
              <BarChart data={byApp} formatValue={(v) => `${v.toLocaleString()} 设备`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">muxvo2 版本 By Version</p>
              <BarChart data={byVersion} color="bg-cyan-400/70" formatValue={(v) => `${v.toLocaleString()} 设备`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">系统 By OS</p>
              <BarChart data={byOs} color="bg-emerald-400/70" formatValue={(v) => `${v.toLocaleString()} 设备`} />
            </div>
          </div>
        </AsyncBlock>
      </Panel>

      <Panel title="自动更新漏斗 Auto-Update Funnel">
        <AsyncBlock loading={funnel.loading} error={funnel.error}>
          <FunnelChart steps={funnelSteps} valueLabel="设备" />
        </AsyncBlock>
      </Panel>

      <Panel title="错误 Top Errors">
        <AsyncBlock loading={errors.loading} error={errors.error} empty={errorRows.length === 0}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs uppercase py-2 pr-4">Metric</th>
                <th className="text-right text-gray-500 text-xs uppercase py-2 px-4">Occurrences 次数</th>
                <th className="text-right text-gray-500 text-xs uppercase py-2 px-4">Devices 影响设备</th>
                <th className="text-left text-gray-500 text-xs uppercase py-2 pl-4">Common Code 常见码</th>
              </tr>
            </thead>
            <tbody>
              {errorRows.map((row) => (
                <tr key={row.metric} className="border-b border-gray-800 last:border-0">
                  <td className="py-2 pr-4 text-sm text-red-300">{row.metric}</td>
                  <td className="py-2 px-4 text-sm text-right text-gray-300">{row.occurrences.toLocaleString()}</td>
                  <td className="py-2 px-4 text-sm text-right text-gray-400">{row.devices.toLocaleString()}</td>
                  <td className="py-2 pl-4 text-sm text-gray-400">{row.common_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AsyncBlock>
      </Panel>
    </>
  );
}
