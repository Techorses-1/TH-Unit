import React from "react";
import "./MaintenancePrint.scss";

const MaintenancePrint = ({ maintenance }) => {
    if (!maintenance) return null;

    const {
        maintenanceNo,
        collectionDate,
        flatNo,
        memberName,
        memberType,
        memberMobile,
        memberEmail,
        previousUnitUsed,
        newReadingUnits,
        totalUnits,
        waterUnitRate,
        waterMaintenanceAmount,
        fixedMaintenanceRate,
        fixedMaintenanceAmount,
        previousPendingAmount,
        fineAmount,
        fineReason,
        totalMaintenanceAmount,
        collectionAmount,
        pendingAmount,
        maintenanceMonth,
        maintenanceYear
    } = maintenance;

    // Format currency
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return "₹0.00";
        return `₹${Number(value).toFixed(2)}`;
    };

    // Convert number to words
    const numberToWords = (num) => {
        if (num === 0) return 'Zero Only';

        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
            'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        let integerPart = Math.floor(num);
        let words = '';

        if (integerPart >= 10000000) {
            words += numberToWords(Math.floor(integerPart / 10000000)) + ' Crore ';
            integerPart %= 10000000;
        }

        if (integerPart >= 100000) {
            words += numberToWords(Math.floor(integerPart / 100000)) + ' Lakh ';
            integerPart %= 100000;
        }

        if (integerPart >= 1000) {
            words += numberToWords(Math.floor(integerPart / 1000)) + ' Thousand ';
            integerPart %= 1000;
        }

        if (integerPart >= 100) {
            words += numberToWords(Math.floor(integerPart / 100)) + ' Hundred ';
            integerPart %= 100;
        }

        if (integerPart > 0) {
            if (words !== '') words += ' ';

            if (integerPart < 20) {
                words += ones[integerPart];
            } else {
                words += tens[Math.floor(integerPart / 10)];
                if (integerPart % 10 > 0) {
                    words += ' ' + ones[integerPart % 10];
                }
            }
        }

        const decimalPart = Math.round((num - Math.floor(num)) * 100);
        if (decimalPart > 0) {
            if (words !== '') words += ' and ';
            if (decimalPart < 20) {
                words += ones[decimalPart] + ' Paise';
            } else {
                words += tens[Math.floor(decimalPart / 10)];
                if (decimalPart % 10 > 0) {
                    words += ' ' + ones[decimalPart % 10] + ' Paise';
                }
            }
        }

        return words;
    };

    return (
        <div id="maintenance-pdf">
            <div className="maintenance-container">
                {/* Header with Society Info */}
                <div className="maintenance-header">
                    <div className="company-top-info">
                        <div className="company-name-left">
                            <p><strong>PRAYAG RESIDENCY CO-OP HOUSING SOCIETY</strong></p>
                        </div>
                    </div>

                    <div className="logo-address-center">
                        <div className="maintenance-title">
                            <h1>MAINTENANCE RECEIPT</h1>
                        </div>
                        <div className="society-address">
                            <div className="address-details">
                                <p>Prayag Residency, Near Radhey Infinity, Vatvastation Road, Ropda Circle</p>
                                <p>Sardar Patel Ring Rd, Ahmedabad, Gujarat 382445</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Details Section */}
                <div className="maintenance-details-section">
                    <div className="member-info">
                        <h3>Member Details</h3>
                        <table className="details-table">
                            <tbody>
                                <tr>
                                    <td>Flat Number:</td>
                                    <td>{flatNo || "N/A"}</td>
                                </tr>
                                <tr>
                                    <td>Member Name:</td>
                                    <td>{memberName || "N/A"}</td>
                                </tr>
                                <tr>
                                    <td>Member Type:</td>
                                    <td>{memberType || "N/A"}</td>
                                </tr>
                                {memberMobile && (
                                    <tr>
                                        <td>Mobile:</td>
                                        <td>{memberMobile}</td>
                                    </tr>
                                )}
                                {memberEmail && (
                                    <tr>
                                        <td>Email:</td>
                                        <td>{memberEmail}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="receipt-info">
                        <h3>Receipt Details</h3>
                        <table className="details-table">
                            <tbody>
                                <tr>
                                    <td>Maintenance No:</td>
                                    <td>{maintenanceNo || "N/A"}</td>
                                </tr>
                                <tr>
                                    <td>Date:</td>
                                    <td>{new Date(collectionDate).toLocaleDateString("en-GB")}</td>
                                </tr>
                                <tr>
                                    <td>Month/Year:</td>
                                    <td>{maintenance.maintenanceMonth}/{maintenance.maintenanceYear}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Water Usage Details */}
                <div className="water-usage-section">
                    <h3>Water Usage Calculation</h3>
                    <table className="water-table">
                        <thead>
                            <tr>
                                <th>Previous Reading</th>
                                <th>New Reading</th>
                                <th>Units Consumed</th>
                                <th>Rate per Unit</th>
                                <th>Water Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{previousUnitUsed} units</td>
                                <td>{newReadingUnits} units</td>
                                <td className="highlight">{totalUnits} units</td>
                                <td>₹{waterUnitRate}/unit</td>
                                <td className="amount-cell">{formatCurrency(waterMaintenanceAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Maintenance Breakdown */}
                <div className="breakdown-section">
                    <h3>Maintenance Breakdown</h3>
                    <table className="breakdown-table">
                        <tbody>
                            <tr>
                                <td>Water Amount:</td>
                                <td>{formatCurrency(waterMaintenanceAmount)}</td>
                            </tr>
                            <tr>
                                <td>Fixed Maintenance:</td>
                                <td>{formatCurrency(fixedMaintenanceAmount)}</td>
                            </tr>
                            <tr>
                                <td>Previous Pending:</td>
                                <td>{formatCurrency(previousPendingAmount)}</td>
                            </tr>
                            {fineAmount > 0 && (
                                <>
                                    <tr>
                                        <td>Fine Amount:</td>
                                        <td className="fine-amount">{formatCurrency(fineAmount)}</td>
                                    </tr>
                                    {fineReason && (
                                        <tr>
                                            <td>Fine Reason:</td>
                                            <td>{fineReason}</td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Payment Summary */}
                <div className="payment-summary-section">
                    <h3>Payment Summary</h3>
                    <table className="summary-table">
                        <tbody>
                            <tr className="total-row">
                                <td>Total Maintenance Due:</td>
                                <td>{formatCurrency(totalMaintenanceAmount)}</td>
                            </tr>
                            <tr className="payment-row">
                                <td>Amount Collected:</td>
                                <td className="success">{formatCurrency(collectionAmount)}</td>
                            </tr>
                            <tr className="pending-row">
                                <td>New Pending Amount:</td>
                                <td className={pendingAmount > 0 ? "pending" : "success"}>
                                    {formatCurrency(pendingAmount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Amount in Words */}
                {/* <div className="amount-in-words">
                    <p><strong>Amount in Words:</strong> {numberToWords(collectionAmount)} Only</p>
                </div> */}

                {/* Terms and Conditions */}
                {/* <div className="terms-section">
                    <h3>Terms & Conditions</h3>
                    <div className="terms-content">
                        <p>1. Please keep this receipt for future reference.</p>
                        <p>2. Pending amount will be carried forward to next month.</p>
                        <p>3. Late payment may attract additional charges.</p>
                        <p>4. All disputes subject to Ahmedabad jurisdiction.</p>
                        <p>5. Receipt is generated electronically and valid without signature.</p>
                    </div>
                </div> */}

                {/* Footer */}
                <div className="maintenance-footer">
                    <div className="thank-you">
                        <p>Thank you for your timely payment!</p>
                    </div>
                    <div className="signature">
                        <p>Khajanachi - Ramesh Gala</p> 
                        <div className="signature-line"></div>
                        <p>9372077975</p> 
                    </div>
                    <div className="developer-note">
                        <p>
                            Generated by <a href="https://techorses.com" target="_blank" rel="noopener noreferrer">Techorses</a>
                        </p>
                    </div>
                </div>

                {/* Computer Generated Footer */}
                {/* <div className="page-footer">
                    <p>THIS IS A COMPUTER GENERATED RECEIPT</p>
                </div> */}
            </div>
        </div>
    );
};

export default MaintenancePrint;