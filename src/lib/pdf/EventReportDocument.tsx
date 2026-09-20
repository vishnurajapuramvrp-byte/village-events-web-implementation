import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  section: { marginTop: 16 },
  heading: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #d1d5db",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: { flexDirection: "row", marginBottom: 3 },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: "right" },
  footer: { marginTop: 24, fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
  sign: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  signBox: { width: "30%", borderTop: "1 solid #9ca3af", paddingTop: 6, textAlign: "center" },
});

export type EventReportData = {
  organizationName: string;
  villageName: string;
  eventName: string;
  year: number;
  startDate: Date;
  endDate: Date | null;
  generatedAt: Date;
  generatedBy: string;
  openingBalancePaise: number;
  donationsPaise: number;
  expensesPaise: number;
  distributedPaise: number;
  availableBeforeDistributionPaise: number;
  distributableBalancePaise: number;
  donations: { donorName: string; receivedOn: Date; amountPaise: number; method: string }[];
  expenses: { description: string; category: string; incurredOn: Date; amountPaise: number }[];
  distributions: {
    personName: string;
    principalPaise: number;
    dueDate: Date;
    repaidPaise: number;
  }[];
};

export function EventReportDocument({ data }: { data: EventReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.eventName}</Text>
        <Text style={styles.muted}>
          {data.organizationName} · {data.villageName} · {data.year}
        </Text>
        <View style={styles.row}>
          <Text>Period: {formatDate(data.startDate)}{data.endDate ? ` – ${formatDate(data.endDate)}` : ""}</Text>
          <Text>Report date: {formatDate(data.generatedAt)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Computed balance</Text>
          <View style={styles.row}>
            <Text>Opening balance</Text>
            <Text>{formatINR(data.openingBalancePaise)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Donations (income)</Text>
            <Text>{formatINR(data.donationsPaise)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Expenses</Text>
            <Text>{formatINR(data.expensesPaise)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Available before distribution</Text>
            <Text>{formatINR(data.availableBeforeDistributionPaise)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Distributed principal</Text>
            <Text>{formatINR(data.distributedPaise)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Distributable balance</Text>
            <Text>{formatINR(data.distributableBalancePaise)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Income (donations)</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Donor</Text>
            <Text style={styles.col}>Date</Text>
            <Text style={styles.colRight}>Amount</Text>
          </View>
          {data.donations.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col}>{row.donorName}</Text>
              <Text style={styles.col}>{formatDate(row.receivedOn)} ({row.method})</Text>
              <Text style={styles.colRight}>{formatINR(row.amountPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Expenses</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Item</Text>
            <Text style={styles.col}>Date</Text>
            <Text style={styles.colRight}>Amount</Text>
          </View>
          {data.expenses.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col}>{row.description} · {row.category}</Text>
              <Text style={styles.col}>{formatDate(row.incurredOn)}</Text>
              <Text style={styles.colRight}>{formatINR(row.amountPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Distributions</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Recipient</Text>
            <Text style={styles.col}>Due</Text>
            <Text style={styles.colRight}>Principal / repaid</Text>
          </View>
          {data.distributions.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col}>{row.personName}</Text>
              <Text style={styles.col}>{formatDate(row.dueDate)}</Text>
              <Text style={styles.colRight}>
                {formatINR(row.principalPaise)} / {formatINR(row.repaidPaise)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sign}>
          <Text style={styles.signBox}>Prepared by</Text>
          <Text style={styles.signBox}>Treasurer</Text>
          <Text style={styles.signBox}>Committee approval</Text>
        </View>

        <Text style={styles.footer}>
          Generated by {data.generatedBy} from {data.villageName} events and programmes. This report is generated
          from records maintained in the application. Please verify against original receipts/records.
        </Text>
      </Page>
    </Document>
  );
}
