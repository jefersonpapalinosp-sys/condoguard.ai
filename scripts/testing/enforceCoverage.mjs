import { readFileSync } from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('coverage/coverage-summary.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));

const globalThresholds = {
  lines: 75,
  functions: 75,
  statements: 75,
  branches: 65,
};

const moduleThresholds = [
  {
    name: 'services-criticos',
    files: ['src/services/http.ts', 'src/services/apiStatus.ts', 'src/services/invoicesService.ts'],
    thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
  },
  {
    name: 'componentes-centrais',
    files: ['src/shared/ui/DataSourceBadge.tsx', 'src/shared/ui/ApiFallbackToast.tsx'],
    thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
  },
  {
    name: 'utilitarios-ui',
    files: [
      'src/shared/ui/states/LoadingState.tsx',
      'src/shared/ui/states/ErrorState.tsx',
      'src/shared/ui/states/EmptyState.tsx',
    ],
    thresholds: { lines: 90, functions: 90, statements: 90, branches: 90 },
  },
];

function assertMetric(label, metric, current, minimum, failures) {
  if (current < minimum) {
    failures.push(`${label} ${metric}: ${current.toFixed(2)}% < ${minimum}%`);
  }
}

function getFileEntry(file) {
  const normalizedFile = file.replaceAll('\\', '/');
  return Object.entries(summary).find(([key]) => key.replaceAll('\\', '/').endsWith(normalizedFile));
}

const failures = [];
const total = summary.total;

for (const metric of ['lines', 'functions', 'statements', 'branches']) {
  assertMetric('global', metric, total[metric].pct, globalThresholds[metric], failures);
}

for (const group of moduleThresholds) {
  for (const file of group.files) {
    const entry = getFileEntry(file);
    if (!entry) {
      failures.push(`${group.name}: arquivo sem cobertura no summary -> ${file}`);
      continue;
    }

    const [, data] = entry;
    for (const metric of ['lines', 'functions', 'statements', 'branches']) {
      assertMetric(`${group.name}:${file}`, metric, data[metric].pct, group.thresholds[metric], failures);
    }
  }
}

if (failures.length > 0) {
  console.error('Coverage check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Coverage check passed.');
