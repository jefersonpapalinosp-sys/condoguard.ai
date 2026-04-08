import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultReportPath = path.resolve(__dirname, "../../database/reports/data_quality_report.json");
const allowedValuesByIssueKey = {
  "eventos_anomalia.status_revisao.values": new Set(["pendente", "em_revisao", "resolvido", "descartado"]),
  "consumo_unidade.unidade_medida.values": new Set(["kwh", "m3", "l", "amper"]),
};

function toAbsolutePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

export function parseCliArgs(argv) {
  const args = {
    reportPath: defaultReportPath,
    warnOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--warn-only") {
      args.warnOnly = true;
      continue;
    }

    if (current === "--report") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Passe um caminho apos --report.");
      }
      args.reportPath = toAbsolutePath(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Argumento nao suportado: ${current}`);
  }

  return args;
}

function summarizeObjectEntries(value, issueKey) {
  const entries = Object.entries(value);
  const allowedValues = issueKey ? allowedValuesByIssueKey[issueKey] : undefined;
  const relevantEntries = allowedValues
    ? entries.filter(([key]) => !allowedValues.has(String(key).trim()))
    : entries;
  const preview = relevantEntries
    .slice(0, 5)
    .map(([key, entryValue]) => `${key}=${Array.isArray(entryValue) ? entryValue.length : entryValue}`);
  let affectedCount = 0;

  for (const [, entryValue] of relevantEntries) {
    if (typeof entryValue === "number") {
      affectedCount += entryValue;
      continue;
    }

    if (Array.isArray(entryValue)) {
      affectedCount += entryValue.length;
      continue;
    }

    affectedCount += 1;
  }

  return {
    distinctCount: relevantEntries.length,
    affectedCount,
    preview,
  };
}

export function summarizeIssueValue(value, issueKey) {
  if (typeof value === "number") {
    return {
      distinctCount: value > 0 ? 1 : 0,
      affectedCount: value,
      preview: [String(value)],
    };
  }

  if (Array.isArray(value)) {
    return {
      distinctCount: value.length,
      affectedCount: value.length,
      preview: value.slice(0, 5).map((entry) => String(entry)),
    };
  }

  if (value && typeof value === "object") {
    return summarizeObjectEntries(value, issueKey);
  }

  return {
    distinctCount: 0,
    affectedCount: 0,
    preview: [],
  };
}

export function buildDataQualitySummary(report) {
  const issues = Object.entries(report?.issues ?? {}).map(([issueKey, issueValue]) => {
    const summary = summarizeIssueValue(issueValue, issueKey);
    return {
      issueKey,
      ...summary,
      blocking: summary.affectedCount > 0,
    };
  });

  const blockingIssues = issues.filter((issue) => issue.blocking);
  const affectedRecords = blockingIssues.reduce((total, issue) => total + issue.affectedCount, 0);

  return {
    generatedAt: report?.generated_at ?? null,
    sourceFile: report?.source_file ?? null,
    tableCount: report?.table_count ?? null,
    totalIssueGroups: issues.length,
    blockingIssueGroups: blockingIssues.length,
    affectedRecords,
    issues,
    blockingIssues,
    ready: blockingIssues.length === 0,
  };
}

export function formatSummary(summary, reportPath) {
  const lines = [
    "Data Quality Gate",
    `- Report: ${reportPath}`,
    `- Generated at: ${summary.generatedAt ?? "n/a"}`,
    `- Source file: ${summary.sourceFile ?? "n/a"}`,
    `- Table count: ${summary.tableCount ?? "n/a"}`,
    `- Blocking groups: ${summary.blockingIssueGroups}`,
    `- Affected records: ${summary.affectedRecords}`,
  ];

  if (summary.blockingIssues.length === 0) {
    lines.push("- Status: PASS");
    return lines.join("\n");
  }

  lines.push("- Status: FAIL");
  lines.push("- Blocking issues:");

  for (const issue of summary.blockingIssues) {
    const preview = issue.preview.length > 0 ? ` | preview: ${issue.preview.join(", ")}` : "";
    lines.push(
      `  - ${issue.issueKey}: ${issue.affectedCount} ocorrencia(s), ${issue.distinctCount} valor(es) distinto(s)${preview}`,
    );
  }

  return lines.join("\n");
}

export function loadDataQualityReport(reportPath) {
  const content = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(content);
}

export function runDataQualityGate(options = {}) {
  const reportPath = options.reportPath ? toAbsolutePath(options.reportPath) : defaultReportPath;
  const warnOnly = Boolean(options.warnOnly);

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Relatorio de data quality nao encontrado: ${reportPath}`);
  }

  const report = loadDataQualityReport(reportPath);
  const summary = buildDataQualitySummary(report);
  const output = formatSummary(summary, reportPath);

  return {
    summary,
    output,
    exitCode: summary.ready || warnOnly ? 0 : 1,
  };
}

function runCli() {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const result = runDataQualityGate(options);
    const writer = result.exitCode === 0 ? console.log : console.error;
    writer(result.output);

    if (result.exitCode !== 0) {
      console.error(
        "Gate bloqueado: o relatorio JSON possui inconsistencias que precisam ser tratadas antes do fechamento da sprint.",
      );
    }

    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
