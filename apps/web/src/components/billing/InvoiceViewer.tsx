'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Invoice, OrganizationStatus } from '@/hooks/use-billing';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { formatCurrency } from '@/lib/utils';
import { Download, Mail, Phone, Globe, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface InvoiceViewerProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  organization?: OrganizationStatus | null;
  platformName?: string;
  platformEmail?: string;
  platformWebsite?: string;
}

export function InvoiceViewer({
  invoice,
  open,
  onClose,
  organization,
  platformName = 'Office Management System',
  platformEmail = 'support@oms.com',
  platformWebsite = 'www.oms.com',
}: InvoiceViewerProps) {
  // Organization-aware date formatter
  const { formatDateTime } = useOrgFormatters();
  
  if (!invoice) return null;

  // Build billing address from organization
  const getBillingAddress = () => {
    if (!organization?.address) return '';
    const addr = organization.address;
    const parts = [];
    if (addr.line1) parts.push(addr.line1);
    if (addr.line2) parts.push(addr.line2);
    const cityStateZip = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
    if (cityStateZip) parts.push(cityStateZip);
    if (addr.country) parts.push(addr.country);
    return parts.join('\n');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Helper functions
    const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; color?: number[]; align?: 'left' | 'right' | 'center' } = {}) => {
      doc.setFontSize(options.fontSize || 10);
      doc.setFont('helvetica', options.fontStyle || 'normal');
      if (options.color) {
        doc.setTextColor(options.color[0], options.color[1], options.color[2]);
      } else {
        doc.setTextColor(51, 51, 51);
      }
      if (options.align === 'right') {
        doc.text(text, x, y, { align: 'right' });
      } else if (options.align === 'center') {
        doc.text(text, x, y, { align: 'center' });
      } else {
        doc.text(text, x, y);
      }
    };

    // Helper to wrap text within max width
    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      doc.setFontSize(fontSize);
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.getTextWidth(testLine);
        
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // From Section (Platform)
    addText(platformName, margin, yPos, { fontSize: 18, fontStyle: 'bold' });
    yPos += 7;
    // Show email and website on one line with separators
    const contactParts = [platformEmail, platformWebsite].filter(Boolean);
    if (contactParts.length > 0) {
      addText(contactParts.join('  |  '), margin, yPos, { fontSize: 9, color: [107, 114, 128] });
    }

    // Invoice Title (right side)
    addText('INVOICE', pageWidth - margin, margin, { fontSize: 24, fontStyle: 'bold', align: 'right' });
    addText(invoice.invoiceNumber, pageWidth - margin, margin + 8, { fontSize: 10, color: [107, 114, 128], align: 'right' });
    addText(invoice.status, pageWidth - margin, margin + 16, { fontSize: 9, fontStyle: 'bold', color: invoice.status === 'PAID' ? [22, 163, 74] : [234, 179, 8], align: 'right' });

    yPos = 55;

    // Calculate Bill To content height first to determine box size
    const billToMaxWidth = (pageWidth / 2) - margin - 20; // Max width for Bill To column
    const fromMaxWidth = (pageWidth / 2) - margin - 20; // Max width for From column
    
    let billToLines: { text: string; color: number[] }[] = [];
    const billingAddress = getBillingAddress();
    if (billingAddress) {
      const addressLines = billingAddress.split('\n');
      addressLines.forEach((line) => {
        const wrapped = wrapText(line, billToMaxWidth, 9);
        wrapped.forEach(wl => billToLines.push({ text: wl, color: [107, 114, 128] }));
      });
    }
    if (organization?.email) {
      const wrapped = wrapText(organization.email, billToMaxWidth, 9);
      wrapped.forEach(wl => billToLines.push({ text: wl, color: [107, 114, 128] }));
    }
    if (organization?.phone) {
      billToLines.push({ text: organization.phone, color: [107, 114, 128] });
    }

    // Calculate dynamic box height (minimum 55, expand if needed)
    const lineHeight = 5;
    const headerHeight = 12; // For "FROM" / "BILL TO" label
    const nameHeight = 8; // For company name
    const contentHeight = Math.max(billToLines.length * lineHeight, 20); // Minimum content area
    const boxHeight = Math.max(55, headerHeight + nameHeight + contentHeight + 10); // Add padding

    // Billing Section Background
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, boxHeight, 3, 3, 'F');

    // Bill From
    addText('FROM', margin + 8, yPos + 3, { fontSize: 8, fontStyle: 'bold', color: [156, 163, 175] });
    addText(platformName, margin + 8, yPos + 12, { fontSize: 11, fontStyle: 'bold' });
    // Show email and website on one line, wrapped if needed
    const fromContactParts = [platformEmail, platformWebsite].filter(Boolean);
    if (fromContactParts.length > 0) {
      const fromContactText = fromContactParts.join('  |  ');
      const wrappedFromContact = wrapText(fromContactText, fromMaxWidth, 9);
      let fromYOffset = 20;
      wrappedFromContact.forEach((line) => {
        addText(line, margin + 8, yPos + fromYOffset, { fontSize: 9, color: [107, 114, 128] });
        fromYOffset += lineHeight;
      });
    }

    // Bill To
    const billToX = pageWidth / 2 + 10;
    addText('BILL TO', billToX, yPos + 3, { fontSize: 8, fontStyle: 'bold', color: [156, 163, 175] });
    
    // Wrap company name if too long
    const companyName = organization?.legalName || organization?.name || 'Customer';
    const wrappedCompanyName = wrapText(companyName, billToMaxWidth, 11);
    let billToYOffset = 12;
    wrappedCompanyName.forEach((line, idx) => {
      addText(line, billToX, yPos + billToYOffset, { fontSize: 11, fontStyle: idx === 0 ? 'bold' : 'normal' });
      billToYOffset += 6;
    });
    
    billToYOffset += 2; // Small gap after name
    
    // Add address and contact lines
    billToLines.forEach((lineObj) => {
      addText(lineObj.text, billToX, yPos + billToYOffset, { fontSize: 9, color: lineObj.color });
      billToYOffset += lineHeight;
    });

    yPos = yPos + boxHeight + 10;

    // Dates
    addText('Issue Date:', margin, yPos, { fontSize: 9, color: [107, 114, 128] });
    addText(formatDateTime(invoice.issueDate), margin + 25, yPos, { fontSize: 9 });
    
    const dueDateLabel = invoice.status === 'PAID' ? 'Paid On:' : 'Due Date:';
    const dueDateValue = invoice.status === 'PAID' && invoice.paidAt ? formatDateTime(invoice.paidAt) : formatDateTime(invoice.dueDate);
    addText(dueDateLabel, pageWidth / 2, yPos, { fontSize: 9, color: [107, 114, 128] });
    addText(dueDateValue, pageWidth / 2 + 22, yPos, { fontSize: 9 });

    yPos += 20; // Move down for table

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
    
    addText('DESCRIPTION', margin + 4, yPos, { fontSize: 8, fontStyle: 'bold', color: [107, 114, 128] });
    addText('QTY', pageWidth - margin - 65, yPos, { fontSize: 8, fontStyle: 'bold', color: [107, 114, 128], align: 'right' });
    addText('PRICE', pageWidth - margin - 35, yPos, { fontSize: 8, fontStyle: 'bold', color: [107, 114, 128], align: 'right' });
    addText('AMOUNT', pageWidth - margin - 4, yPos, { fontSize: 8, fontStyle: 'bold', color: [107, 114, 128], align: 'right' });

    yPos += 12;

    // Line Items
    const lineItems = invoice.lineItems && invoice.lineItems.length > 0 
      ? invoice.lineItems 
      : [{ description: 'Subscription', quantity: 1, unitPrice: invoice.total, total: invoice.total }];

    lineItems.forEach((item) => {
      addText(item.description, margin + 4, yPos, { fontSize: 10 });
      addText(String(item.quantity), pageWidth - margin - 65, yPos, { fontSize: 10, color: [107, 114, 128], align: 'right' });
      addText(formatCurrency(item.unitPrice), pageWidth - margin - 35, yPos, { fontSize: 10, color: [107, 114, 128], align: 'right' });
      addText(formatCurrency(item.total), pageWidth - margin - 4, yPos, { fontSize: 10, align: 'right' });
      
      // Line below item
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
      yPos += 14;
    });

    yPos += 10;

    // Totals
    const totalsX = pageWidth - margin - 80;
    
    addText('Subtotal', totalsX, yPos, { fontSize: 10, color: [107, 114, 128] });
    addText(formatCurrency(invoice.subtotal || invoice.total), pageWidth - margin - 4, yPos, { fontSize: 10, align: 'right' });
    yPos += 8;

    if (invoice.tax > 0) {
      addText('Tax', totalsX, yPos, { fontSize: 10, color: [107, 114, 128] });
      addText(formatCurrency(invoice.tax), pageWidth - margin - 4, yPos, { fontSize: 10, align: 'right' });
      yPos += 8;
    }

    if (invoice.discount > 0) {
      addText('Discount', totalsX, yPos, { fontSize: 10, color: [34, 197, 94] });
      addText(`-${formatCurrency(invoice.discount)}`, pageWidth - margin - 4, yPos, { fontSize: 10, color: [34, 197, 94], align: 'right' });
      yPos += 8;
    }

    // Total line
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 10, yPos, pageWidth - margin, yPos);
    yPos += 8;

    addText('Total', totalsX, yPos, { fontSize: 12, fontStyle: 'bold' });
    addText(formatCurrency(invoice.total), pageWidth - margin - 4, yPos, { fontSize: 12, fontStyle: 'bold', align: 'right' });
    yPos += 10;

    if (invoice.status === 'PAID') {
      addText('Amount Paid', totalsX, yPos, { fontSize: 10, color: [34, 197, 94] });
      addText(formatCurrency(invoice.amountPaid || invoice.total), pageWidth - margin - 4, yPos, { fontSize: 10, color: [34, 197, 94], align: 'right' });
      yPos += 8;
    }

    // Payment Info
    if (invoice.cardLast4) {
      yPos += 10;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 20, 3, 3, 'F');
      
      addText('Payment Information', margin + 8, yPos + 3, { fontSize: 10, fontStyle: 'bold', color: [22, 101, 52] });
      const cardText = `Paid with ${invoice.cardBrand || 'Card'} ending in ${invoice.cardLast4}`;
      addText(cardText, margin + 8, yPos + 12, { fontSize: 9, color: [21, 128, 61] });
      yPos += 25;
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos - 10, pageWidth - margin, yPos - 10);
    addText('Thank you for your business!', pageWidth / 2, yPos, { fontSize: 10, color: [156, 163, 175], align: 'center' });

    // Save PDF
    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-500';
      case 'PENDING': return 'bg-yellow-500';
      case 'VOID': return 'bg-gray-500';
      case 'DRAFT': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Sticky Header */}
        <div className="shrink-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Invoice {invoice.invoiceNumber}</DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 bg-white">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{platformName}</h1>
              <div className="flex items-center gap-3 mt-2">
                {platformEmail && (
                  <a href={`mailto:${platformEmail}`} className="text-gray-500 hover:text-gray-700" title={platformEmail}>
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {platformWebsite && (
                  <a href={platformWebsite.startsWith('http') ? platformWebsite : `https://${platformWebsite}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700" title={platformWebsite}>
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-gray-500 mt-1">{invoice.invoiceNumber}</p>
              <Badge className={`mt-2 ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </Badge>
            </div>
          </div>

          {/* Billing Section */}
          <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-gray-50 rounded-lg">
            {/* From */}
            <div>
              <h3 className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-3">From</h3>
              <p className="font-semibold text-gray-900">{platformName}</p>
              <div className="flex items-center gap-3 mt-2">
                {platformEmail && (
                  <a href={`mailto:${platformEmail}`} className="text-gray-500 hover:text-gray-700" title={platformEmail}>
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {platformWebsite && (
                  <a href={platformWebsite.startsWith('http') ? platformWebsite : `https://${platformWebsite}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700" title={platformWebsite}>
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Bill To */}
            <div>
              <h3 className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-3">Bill To</h3>
              <p className="font-semibold text-gray-900">{organization?.legalName || organization?.name || 'Customer'}</p>
              {getBillingAddress() && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{getBillingAddress()}</p>
              )}
              {organization?.email && (
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {organization.email}
                </p>
              )}
              {organization?.phone && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {organization.phone}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs text-gray-400 uppercase font-medium mb-2">Issue Date</h3>
              <p className="text-gray-900">{formatDateTime(invoice.issueDate)}</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-400 uppercase font-medium mb-2">
                {invoice.status === 'PAID' ? 'Paid On' : 'Due Date'}
              </h3>
              <p className="text-gray-900">
                {invoice.status === 'PAID' && invoice.paidAt 
                  ? formatDateTime(invoice.paidAt) 
                  : formatDateTime(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase font-semibold">Description</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase font-semibold">Qty</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase font-semibold">Unit Price</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [
                  { description: 'Subscription', quantity: 1, unitPrice: invoice.total, total: invoice.total }
                ]).map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-900">{item.description}</td>
                    <td className="py-4 px-4 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-4 px-4 text-right text-gray-900 font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2 text-gray-600">
                <span>Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal || invoice.total)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Tax</span>
                  <span className="text-gray-900">{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between py-2 text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between py-2 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.status === 'PAID' && (
                <div className="flex justify-between py-2 text-green-600 font-medium">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(invoice.amountPaid || invoice.total)}</span>
                </div>
              )}
              {invoice.amountDue > 0 && (
                <div className="flex justify-between py-2 text-red-600 font-medium">
                  <span>Amount Due</span>
                  <span>{formatCurrency(invoice.amountDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          {invoice.cardLast4 && (
            <>
              <Separator className="my-6" />
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-1">Payment Information</h3>
                <p className="text-green-700 text-sm">
                  Paid with {invoice.cardBrand && <span className="capitalize">{invoice.cardBrand}</span>} card ending in {invoice.cardLast4}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-600 text-sm">{invoice.notes}</p>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-gray-50 border-t px-6 py-4">
          <p className="text-center text-gray-500 text-sm">Thank you for your business!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
