"use client";

import { Document, Font, Page, View, Text, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { REPORT_COLUMNS, type ReportRow } from "@/lib/report";

// Don't hyphenate: react-pdf would otherwise split long names mid-word
// ("Sid-diqui-Khan"). Lines still wrap at spaces and at hyphens already in the text.
Font.registerHyphenationCallback((word) => [word]);

// Column widths as percentages of the table: the name column plus one entry
// per REPORT_COLUMNS item, in the same order (sums to 100).
const NAME_WIDTH = 17;
const COLUMN_WIDTHS = [8, 8, 8, 8, 6, 5.5, 5, 5.5, 5.5, 8.5, 7.5, 7.5];

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingHorizontal: 28, paddingBottom: 44, fontSize: 8, fontFamily: "Helvetica", color: "#0b1b2e" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    borderBottom: "2 solid #0b1b2e",
    paddingBottom: 10,
  },
  company: { fontSize: 15, fontWeight: 700 },
  sub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  headRow: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 5, paddingHorizontal: 4 },
  headCell: { fontSize: 7, color: "#64748b", textTransform: "uppercase", textAlign: "right" },
  strongHead: { color: "#0b1b2e", fontWeight: 700 },
  strongCell: { fontWeight: 700 },
  row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottom: "1 solid #f1f5f9", alignItems: "center" },
  name: { fontWeight: 700 },
  dept: { fontSize: 7, color: "#94a3b8", marginTop: 1 },
  num: { textAlign: "right" },
  note: { marginTop: 12, fontSize: 7, color: "#94a3b8" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

function generatedOn(): string {
  return new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

export function ReportDocument({
  rows,
  monthLabel,
}: {
  rows: ReportRow[];
  monthLabel: string;
}) {
  return (
    <Document title={`Employee Report - ${monthLabel}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>Evolut Ecommerce Solutions</Text>
            <Text style={styles.sub}>Jhelum, Pakistan</Text>
          </View>
          <View>
            <Text style={styles.title}>Employee Report</Text>
            <Text style={styles.sub}>
              {monthLabel} · {rows.length} {rows.length === 1 ? "employee" : "employees"}
            </Text>
          </View>
        </View>

        <View style={styles.headRow} fixed>
          <Text style={[styles.headCell, { width: `${NAME_WIDTH}%`, textAlign: "left" }]}>Employee</Text>
          {REPORT_COLUMNS.map((col, i) => (
            <Text
              key={col.key}
              style={[styles.headCell, { width: `${COLUMN_WIDTHS[i]}%` }, col.strong ? styles.strongHead : {}]}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {rows.map((row) => (
          <View key={row.id} style={styles.row} wrap={false}>
            <View style={{ width: `${NAME_WIDTH}%` }}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.dept}>{row.department || row.position || "—"}</Text>
            </View>
            {REPORT_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[styles.num, { width: `${COLUMN_WIDTHS[i]}%` }, col.strong ? styles.strongCell : {}]}
              >
                {col.value(row)}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.note}>
          Required days and hours exclude rest days and approved leave. Extra days are rest days the employee worked.
          Total days worked = Present days + Extra days. Absent days do not include today.
        </Text>

        <View style={styles.footer} fixed>
          <Text>Generated {generatedOn()}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function ReportDownloadButton({
  rows,
  monthLabel,
  monthKey,
}: {
  rows: ReportRow[];
  monthLabel: string;
  monthKey: string;
}) {
  return (
    <PDFDownloadLink
      document={<ReportDocument rows={rows} monthLabel={monthLabel} />}
      fileName={`employee-report-${monthKey}.pdf`}
      className="btn-primary"
    >
      {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
    </PDFDownloadLink>
  );
}
