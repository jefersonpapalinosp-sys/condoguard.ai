import { describe, expect, it } from "vitest";

import {
  buildDataQualitySummary,
  formatSummary,
  summarizeIssueValue,
} from "../../../scripts/db/data-quality-gate.mjs";

describe("data-quality-gate", () => {
  it("summarizes numeric issue counts", () => {
    expect(summarizeIssueValue(7)).toEqual({
      distinctCount: 1,
      affectedCount: 7,
      preview: ["7"],
    });
  });

  it("summarizes list and enum issues", () => {
    expect(summarizeIssueValue(["101", "102"])).toEqual({
      distinctCount: 2,
      affectedCount: 2,
      preview: ["101", "102"],
    });

    expect(
      summarizeIssueValue({
        pendente: 219,
        Pendente: 55,
      }, "eventos_anomalia.status_revisao.values"),
    ).toEqual({
      distinctCount: 1,
      affectedCount: 55,
      preview: ["Pendente=55"],
    });
  });

  it("builds a blocking summary when issues exist", () => {
    const summary = buildDataQualitySummary({
      generated_at: "2026-04-08T00:00:00Z",
      source_file: "baseline.xlsx",
      table_count: 13,
      issues: {
        "eventos_anomalia.duplicated_anomalia_id": 99,
        "consumo_unidade.unidade_id.orphans": ["404"],
        "eventos_anomalia.status_revisao.values": {
          pendente: 219,
          Pendente: 55,
        },
      },
    });

    expect(summary.ready).toBe(false);
    expect(summary.blockingIssueGroups).toBe(3);
    expect(summary.affectedRecords).toBe(155);

    const output = formatSummary(summary, "database/reports/data_quality_report.json");
    expect(output).toContain("Status: FAIL");
    expect(output).toContain("eventos_anomalia.duplicated_anomalia_id");
    expect(output).toContain("consumo_unidade.unidade_id.orphans");
    expect(output).toContain("Pendente=55");
  });

  it("marks the report ready when no blocking issue remains", () => {
    const summary = buildDataQualitySummary({
      generated_at: "2026-04-08T00:00:00Z",
      issues: {},
    });

    expect(summary.ready).toBe(true);
    expect(summary.blockingIssueGroups).toBe(0);
    expect(formatSummary(summary, "report.json")).toContain("Status: PASS");
  });
});
