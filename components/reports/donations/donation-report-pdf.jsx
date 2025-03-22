import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff'
    },
    header: {
        marginBottom: 20,
        paddingBottom: 10
    },
    ngoName: {
        fontSize: 18,
        marginBottom: 5
    },
    ngoDetails: {
        fontSize: 10,
        color: '#666666',
        marginBottom: 2
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center'
    },
    section: {
        margin: 10,
        padding: 10
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 10,
        paddingBottom: 5
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: 10
    },
    summaryItem: {
        flex: 1,
        padding: 10
    },
    summaryLabel: {
        fontSize: 10,
        color: '#666666',
        marginBottom: 3
    },
    summaryValue: {
        fontSize: 14
    },
    table: {
        marginTop: 10
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        minHeight: 24,
        paddingVertical: 5
    },
    tableHeader: {
        backgroundColor: '#f5f5f5'
    },
    tableCell: {
        flex: 1,
        fontSize: 10,
        padding: 4
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        fontSize: 10,
        textAlign: 'center',
        color: '#666666',
        paddingTop: 10
    }
});

const formatAmount = (amount, isCrypto = false) => {
    if (amount === undefined || amount === null) return isCrypto ? '0 Tokens' : '₹0';
    try {
        const formattedAmount = Number(amount).toLocaleString();
        return isCrypto ? `${formattedAmount} Tokens` : `₹${formattedAmount}`;
    } catch (error) {
        return isCrypto ? '0 Tokens' : '₹0';
    }
};

const DonationReportPDF = React.memo(({ data }) => {
    if (!data) return null;

    const safeData = {
        ngoInfo: {
            name: data?.ngoInfo?.name || "NGO Name",
            address: data?.ngoInfo?.address || "Address",
            email: data?.ngoInfo?.email || "Email",
        },
        timeFrame: data?.timeFrame || "All Time",
        date: data?.date || new Date().toLocaleDateString(),
        total: data?.total || 0,
        cryptoTotal: data?.cryptoTotal || 0,
        totalDonors: data?.totalDonors || 0,
        breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
        cashDonations: Array.isArray(data?.cashDonations) ? data.cashDonations : [],
        onlineDonations: Array.isArray(data?.onlineDonations) ? data.onlineDonations : [],
        cryptoDonations: Array.isArray(data?.cryptoDonations) ? data.cryptoDonations : [],
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.ngoName}>{safeData.ngoInfo.name}</Text>
                    <Text style={styles.ngoDetails}>{safeData.ngoInfo.address}</Text>
                    <Text style={styles.ngoDetails}>{safeData.ngoInfo.email}</Text>
                </View>

                <Text style={styles.title}>Donations Report</Text>
                <Text style={styles.ngoDetails}>
                    Time Frame: {safeData.timeFrame} | Generated on: {safeData.date}
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Donations</Text>
                            <Text style={styles.summaryValue}>{formatAmount(safeData.total)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Crypto Donations</Text>
                            <Text style={styles.summaryValue}>{formatAmount(safeData.cryptoTotal, true)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Donors</Text>
                            <Text style={styles.summaryValue}>{safeData.totalDonors}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Donation Breakdown</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={styles.tableCell}>Method</Text>
                            <Text style={styles.tableCell}>Amount</Text>
                        </View>
                        {safeData.breakdown.map((item, index) => (
                            <View style={styles.tableRow} key={index}>
                                <Text style={styles.tableCell}>{item.method || ''}</Text>
                                <Text style={styles.tableCell}>
                                    {formatAmount(item.amount, item.method === 'Crypto')}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Recent Donations</Text>
                    {[
                        { title: "Cash Donations", data: safeData.cashDonations },
                        { title: "Online Donations", data: safeData.onlineDonations },
                        { title: "Crypto Donations", data: safeData.cryptoDonations }
                    ].map((section, idx) => (
                        <View key={idx} style={{ marginTop: 10 }}>
                            <Text style={styles.summaryLabel}>{section.title}</Text>
                            <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <Text style={styles.tableCell}>Date</Text>
                                    <Text style={styles.tableCell}>Donor</Text>
                                    <Text style={styles.tableCell}>Amount</Text>
                                </View>
                                {section.data.map((donation, index) => (
                                    <View style={styles.tableRow} key={index}>
                                        <Text style={styles.tableCell}>{donation.date || ''}</Text>
                                        <Text style={styles.tableCell}>{donation.name || ''}</Text>
                                        <Text style={styles.tableCell}>
                                            {formatAmount(donation.amount, section.title === "Crypto Donations")}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>

                <Text style={styles.footer}>
                    Generated on {safeData.date}
                </Text>
            </Page>
        </Document>
    );
});

DonationReportPDF.displayName = 'DonationReportPDF';

export default DonationReportPDF;