import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 70, paddingBottom: 50, paddingHorizontal: 28, fontSize: 10, color: "#1A1A1A" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#FFD700", fontSize: 10, fontWeight: 700 },
  confidential: { color: "#DC2626", fontSize: 10, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
    fontSize: 9,
    color: "#4B5563",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  table: { borderWidth: 1, borderColor: "#D1D5DB", marginBottom: 10 },
  row: { flexDirection: "row" },
  headerRow: { backgroundColor: "#FFD700" },
  cell: { padding: 5, borderRightWidth: 1, borderRightColor: "#D1D5DB", borderBottomWidth: 1, borderBottomColor: "#D1D5DB" },
  keyCell: { width: "30%", fontWeight: 700, backgroundColor: "#F3F4F6" },
  valueCell: { width: "70%" },
  paragraph: { marginBottom: 6, lineHeight: 1.4 },
  objectiveBlock: { borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB", padding: 8, marginBottom: 8 },
  small: { fontSize: 9, color: "#4B5563" },
});

type KeyValue = { key: string; value: string };
type TableSection = { columns: string[]; rows: string[][] };

export interface RfePacketData {
  generatedAt: string;
  profileSummary: KeyValue[];
  trainingSummary: KeyValue[];
  objectives: Array<{ title: string; status: string; mappedProject: string }>;
  weeklyTable: TableSection;
  totalHoursSixMonths: string;
  dailyLogsTable: TableSection;
  approvalLogTable: TableSection;
  documentsTable: TableSection;
  documentsCompleteText: string;
}

function HeaderFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <>
      <View fixed style={styles.header}>
        <Text style={styles.headerTitle}>TanTech LLC — Archway Compliance Platform</Text>
        <Text style={styles.confidential}>CONFIDENTIAL</Text>
      </View>
      <View fixed style={styles.footer}>
        <Text>TanTech LLC — Confidential | Generated {generatedAt}</Text>
        <Text
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </>
  );
}

function KeyValueTable({ rows }: { rows: KeyValue[] }) {
  return (
    <View style={styles.table}>
      {rows.map((item) => (
        <View key={item.key} style={styles.row}>
          <Text style={[styles.cell, styles.keyCell]}>{item.key}</Text>
          <Text style={[styles.cell, styles.valueCell]}>{item.value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function GenericTable({ section }: { section: TableSection }) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        {section.columns.map((column, index) => (
          <Text key={`${column}-${index}`} style={[styles.cell, { flex: 1, fontWeight: 700, color: "#FFFFFF" }]}>
            {column}
          </Text>
        ))}
      </View>
      {section.rows.map((row, rowIndex) => (
        <View
          key={`r-${rowIndex}`}
          style={[styles.row, { backgroundColor: rowIndex % 2 ? "#F9FAFB" : "#FFFFFF" }]}
        >
          {row.map((cell, cellIndex) => (
            <Text key={`c-${rowIndex}-${cellIndex}`} style={[styles.cell, { flex: 1 }]}>
              {cell || "—"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function RfePacketPdf({ data }: { data: RfePacketData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderFooter generatedAt={data.generatedAt} />

        <Text style={styles.sectionHeading}>Employee Profile Summary</Text>
        <KeyValueTable rows={data.profileSummary} />

        <Text style={styles.sectionHeading}>I-983 Training Plan</Text>
        <KeyValueTable rows={data.trainingSummary} />
        {data.objectives.map((objective, index) => (
          <View key={`obj-${index}`} style={styles.objectiveBlock}>
            <Text style={styles.paragraph}>{`Objective ${index + 1}: ${objective.title}`}</Text>
            <Text style={styles.small}>{`Status: ${objective.status}`}</Text>
            <Text style={styles.small}>{`Mapped Project: ${objective.mappedProject}`}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Timesheet Summary — Last 6 Months</Text>
        <GenericTable section={data.weeklyTable} />
        <Text style={styles.paragraph}>{`Total Hours Logged (6 months): ${data.totalHoursSixMonths} hrs`}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <HeaderFooter generatedAt={data.generatedAt} />
        <Text style={styles.sectionHeading}>Daily Activity Log — Last 6 Months</Text>
        <GenericTable section={data.dailyLogsTable} />
      </Page>

      <Page size="A4" style={styles.page}>
        <HeaderFooter generatedAt={data.generatedAt} />
        <Text style={styles.sectionHeading}>Supervisor Approval Log</Text>
        <GenericTable section={data.approvalLogTable} />

        <Text style={styles.sectionHeading}>Compliance Document Status</Text>
        <GenericTable section={data.documentsTable} />
        <Text style={styles.paragraph}>{data.documentsCompleteText}</Text>
      </Page>
    </Document>
  );
}
