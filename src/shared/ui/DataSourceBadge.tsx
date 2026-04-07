import { useEffect, useState } from 'react';
import { getModuleDataSource, subscribeModuleDataSource, type DataSourceType } from '../../services/apiStatus';

const labelBySource: Record<DataSourceType, string> = {
  api: 'Fonte: API real',
  mock: 'Fonte: fallback mock',
  unknown: 'Fonte: indefinida',
};

const classBySource: Record<DataSourceType, string> = {
  api: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  mock: 'bg-error-container text-on-error-container',
  unknown: 'bg-surface-container-highest text-on-surface-variant',
};

export function DataSourceBadge({ module }: { module: string }) {
  const [source, setSource] = useState<DataSourceType>(() => getModuleDataSource(module));

  useEffect(() => {
    setSource(getModuleDataSource(module));
    return subscribeModuleDataSource(module, setSource);
  }, [module]);

  return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${classBySource[source]}`}>{labelBySource[source]}</span>;
}
