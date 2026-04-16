import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface InvoiceData {
    receiptNo: string;
    date: Date;
    member: {
        name: string;
        knownId: string;
        contact: string;
    };
    gymName: string;
    items: {
        description: string;
        amount: number;
    }[];
    totalPaid: number;
    paymentMethod: string;
    nextRenewalDate?: Date;
}

const generateInvoiceHtml = (data: InvoiceData) => {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const formatDate = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

    const itemsHtml = data.items.map(item => `
        <tr class="item">
            <td>${item.description}</td>
            <td>₹${item.amount.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
        <style>
            body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; text-align: center; color: #333; margin: 0; padding: 0; background: #fff; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; text-align: left; }
            .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
            .invoice-box table td { padding: 5px; vertical-align: top; }
            .invoice-box table tr td:nth-child(2) { text-align: right; }
            .invoice-box table tr.top table td { padding-bottom: 20px; }
            .invoice-box table tr.top table td.title { font-size: 32px; line-height: 45px; color: #333; font-weight: bold; }
            .invoice-box table tr.information table td { padding-bottom: 40px; }
            .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
            .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
            .invoice-box table tr.item.last td { border-bottom: none; }
            .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; font-size: 18px; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0, 0, 0, 0.05); z-index: -1; white-space: nowrap; pointer-events: none; }
            .footer { margin-top: 50px; text-align: center; color: #777; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="watermark">PAYMENT SECURED</div>
            <table cellpadding="0" cellspacing="0">
                <tr class="top">
                    <td colspan="2">
                        <table>
                            <tr>
                                <td class="title">${data.gymName}</td>
                                <td>
                                    <strong>Receipt #:</strong> ${data.receiptNo}<br>
                                    <strong>Date:</strong> ${formatDate(data.date)}<br>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr class="information">
                    <td colspan="2">
                        <table>
                            <tr>
                                <td>
                                    <strong>Billed To:</strong><br>
                                    ${data.member.name}<br>
                                    ID: ${data.member.knownId}<br>
                                    Phone: ${data.member.contact}
                                </td>
                                <td>
                                    <strong>Payment Method:</strong><br>
                                    ${data.paymentMethod.toUpperCase()}<br>
                                    ${data.nextRenewalDate ? `<strong>Next Renewal:</strong> ${formatDate(data.nextRenewalDate)}` : ''}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr class="heading">
                    <td>Description</td>
                    <td>Amount</td>
                </tr>
                ${itemsHtml}
                <tr class="total">
                    <td></td>
                    <td>Total Paid: ₹${data.totalPaid.toFixed(2)}</td>
                </tr>
            </table>
            <div class="footer">
                Thank you for your business! This is a system generated, digitally verifiable document.
            </div>
        </div>
    </body>
    </html>
    `;
};

export const generateAndShareInvoice = async (data: InvoiceData) => {
    try {
        const html = generateInvoiceHtml(data);
        
        if (Platform.OS === 'web') {
            // Expo-print on Web simply calls window.print() on the current screen.
            // To print the actual HTML invoice, we inject it into a new window.
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                // Slight delay to ensure CSS renders before print dialog locks thread
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            } else {
                console.warn('Popup blocked. Cannot print invoice.');
            }
            return;
        }

        const { uri } = await Print.printToFileAsync({ html });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Receipt' });
        } else {
            console.warn('Sharing is not available on this device');
        }
    } catch (error) {
        console.error('Error generating or sharing invoice:', error);
        throw error;
    }
};
