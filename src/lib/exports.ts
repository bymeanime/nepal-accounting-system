// ============================================================
// PDF/Excel export utilities
// Server-side generation using jsPDF + exceljs
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { formatNpr } from './format'

// ============================================================
// PDF: VAT Return (Form V48) — IRD Nepal format
// ============================================================

export interface VatReturnPdfData {
  tenant: { name: string; pan: string; vatNumber: string; address?: string }
  period: string
  periodLabel: string
  summary: {
    taxableSales: number
    zeroRatedSales: number
    exemptSales: number
    outputVat: number
    taxablePurchases: number
    inputVat: number
    netVatPayable: number
    vatRefundable: number
    totalSales: number
    totalPurchases: number
  }
  sales: Array<{
    invoiceNo: string; bsDate: string; partyName: string; partyPan: string
    invoiceType: string; taxableAmount: number; vatAmount: number
    zeroRatedAmount: number; exemptAmount: number; totalAmount: number
  }>
  purchases: Array<{
    billNo: string; bsDate: string; partyName: string; partyPan: string
    vendorBillNo: string; taxableAmount: number; vatAmount: number
    tdsSection: string; tdsAmount: number; totalAmount: number
  }>
}

export function generateVatReturnPdf(data: VatReturnPdfData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header — Tax Invoice format
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('VAT RETURN — FORM V48', pageWidth / 2, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Inland Revenue Department · Government of Nepal', pageWidth / 2, 21, { align: 'center' })

  // Tenant info
  doc.setFillColor(245, 247, 250)
  doc.rect(10, 26, pageWidth - 20, 22, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(data.tenant.name, 12, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`PAN: ${data.tenant.pan}    VAT: ${data.tenant.vatNumber}`, 12, 37)
  doc.text(`Period: ${data.period} BS (${data.periodLabel})`, 12, 42)
  doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, pageWidth - 12, 37, { align: 'right' })
  doc.text(`Filing deadline: 25th of next BS month`, pageWidth - 12, 42, { align: 'right' })

  // Summary section
  let y = 56
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Summary', 10, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount (NPR)']],
    body: [
      ['Taxable Sales (Domestic)', formatNpr(data.summary.taxableSales)],
      ['Zero-rated Sales (Exports)', formatNpr(data.summary.zeroRatedSales)],
      ['Exempt Sales', formatNpr(data.summary.exemptSales)],
      ['Total Sales', formatNpr(data.summary.totalSales)],
      ['Output VAT (13%)', formatNpr(data.summary.outputVat)],
      ['Taxable Purchases', formatNpr(data.summary.taxablePurchases)],
      ['Input VAT', formatNpr(data.summary.inputVat)],
      ['NET VAT PAYABLE', formatNpr(data.summary.netVatPayable)],
      ['VAT Carry Forward', formatNpr(data.summary.vatRefundable)],
    ],
    foot: [['NET VAT PAYABLE', `Rs ${formatNpr(data.summary.netVatPayable)}`]],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 60, halign: 'right' } },
  })

  // Sales VAT book
  y = (doc as any).lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Sales VAT Book (Output VAT)', 10, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Inv No', 'BS Date', 'Customer', 'PAN', 'Type', 'Taxable', 'VAT', 'Total']],
    body: data.sales.map(s => [
      s.invoiceNo, s.bsDate, s.partyName, s.partyPan || '—', s.invoiceType,
      formatNpr(s.taxableAmount), formatNpr(s.vatAmount), formatNpr(s.totalAmount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 },
      3: { cellWidth: 18 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' }, 7: { cellWidth: 22, halign: 'right' },
    },
  })

  // Purchase VAT book — new page
  doc.addPage()
  y = 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Purchase VAT Book (Input VAT)', 10, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Bill No', 'BS Date', 'Supplier', 'PAN', 'Taxable', 'VAT', 'TDS', 'Total']],
    body: data.purchases.map(p => [
      p.billNo, p.bsDate, p.partyName, p.partyPan || '—',
      formatNpr(p.taxableAmount), formatNpr(p.vatAmount),
      formatNpr(p.tdsAmount), formatNpr(p.totalAmount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 40 },
      3: { cellWidth: 18 }, 4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' }, 6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
  })

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Declaration: I declare that the information provided above is true and correct.', 10, finalY)
  doc.text('Taxpayer Signature: ____________________', 10, finalY + 10)
  doc.text('Date: ____________', 120, finalY + 10)

  doc.text('— This is a computer-generated document. Upload to https://irdtaxpayer.gov.np —', pageWidth / 2, finalY + 25, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}

// ============================================================
// PDF: Sales Invoice (VAT-compliant tax invoice)
// ============================================================

export interface InvoicePdfData {
  tenant: {
    name: string; pan: string; vatNumber: string
    address?: string; phone?: string; email?: string
    municipality?: string; district?: string; province?: string
  }
  invoice: {
    invoiceNo: string; bsDate: string; adDate: string
    partyName: string; partyPan: string; partyAddress?: string
    invoiceType: string
    subtotal: number; discountAmount: number
    taxableAmount: number; vatAmount: number
    zeroRatedAmount: number; exemptAmount: number; totalAmount: number
    notes?: string | null
    qrData?: string | null
  }
  lines: Array<{
    description: string; quantity: number; unit: string
    rate: number; taxableAmount: number; vatRate: number
    vatAmount: number; totalAmount: number
  }>
}

export function generateInvoicePdf(data: InvoicePdfData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const { tenant, invoice, lines } = data

  // Header — Tax Invoice
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(tenant.name, 10, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let addrY = 24
  if (tenant.address) { doc.text(tenant.address, 10, addrY); addrY += 5 }
  if (tenant.municipality) { doc.text(`${tenant.municipality}, ${tenant.district || ''}, ${tenant.province || ''}`, 10, addrY); addrY += 5 }
  doc.text(`PAN: ${tenant.pan}   VAT: ${tenant.vatNumber}`, 10, addrY); addrY += 5
  if (tenant.phone) { doc.text(`Phone: ${tenant.phone}`, 10, addrY); addrY += 5 }

  // Invoice type box on right
  doc.setFillColor(37, 99, 235)
  doc.rect(pageWidth - 70, 12, 60, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.invoiceType.replace(/_/g, ' '), pageWidth - 40, 21, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No: ${invoice.invoiceNo}`, pageWidth - 70, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date (BS): ${invoice.bsDate}`, pageWidth - 70, 37)
  doc.text(`Date (AD): ${invoice.adDate}`, pageWidth - 70, 42)

  // Bill To
  doc.setDrawColor(220, 220, 220)
  doc.line(10, 52, pageWidth - 10, 52)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Bill To:', 10, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.partyName, 10, 63)
  if (invoice.partyAddress) doc.text(invoice.partyAddress, 10, 68)
  doc.text(`PAN: ${invoice.partyPan || '—'}`, 10, invoice.partyAddress ? 73 : 68)

  // Items table
  let y = invoice.partyAddress ? 80 : 75
  autoTable(doc, {
    startY: y,
    head: [['S.N.', 'Description', 'Qty', 'Unit', 'Rate', 'Amount', 'VAT%', 'VAT', 'Total']],
    body: lines.map((l, i) => [
      i + 1, l.description, l.quantity, l.unit, formatNpr(l.rate),
      formatNpr(l.taxableAmount), `${l.vatRate}%`, formatNpr(l.vatAmount), formatNpr(l.totalAmount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 24, halign: 'right' },
    },
  })

  // Totals
  y = (doc as any).lastAutoTable.finalY + 5
  const totalsX = pageWidth - 80

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Subtotal:', totalsX, y)
  doc.text(`Rs ${formatNpr(invoice.subtotal)}`, pageWidth - 10, y, { align: 'right' })

  if (invoice.discountAmount > 0) {
    y += 5
    doc.text('Discount:', totalsX, y)
    doc.text(`- Rs ${formatNpr(invoice.discountAmount)}`, pageWidth - 10, y, { align: 'right' })
  }

  y += 5
  if (invoice.taxableAmount > 0) {
    doc.text('Taxable Amount:', totalsX, y)
    doc.text(`Rs ${formatNpr(invoice.taxableAmount)}`, pageWidth - 10, y, { align: 'right' })
  }
  if (invoice.zeroRatedAmount > 0) {
    y += 5
    doc.text('Zero-rated:', totalsX, y)
    doc.text(`Rs ${formatNpr(invoice.zeroRatedAmount)}`, pageWidth - 10, y, { align: 'right' })
  }
  if (invoice.exemptAmount > 0) {
    y += 5
    doc.text('Exempt:', totalsX, y)
    doc.text(`Rs ${formatNpr(invoice.exemptAmount)}`, pageWidth - 10, y, { align: 'right' })
  }

  y += 5
  doc.setTextColor(37, 99, 235)
  doc.setFont('helvetica', 'bold')
  doc.text(`VAT (${invoice.vatAmount > 0 ? '13%' : '0%'}):`, totalsX, y)
  doc.text(`Rs ${formatNpr(invoice.vatAmount)}`, pageWidth - 10, y, { align: 'right' })

  y += 6
  doc.setFillColor(37, 99, 235)
  doc.rect(totalsX - 2, y - 4, pageWidth - totalsX - 8, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('TOTAL:', totalsX, y + 1)
  doc.text(`Rs ${formatNpr(invoice.totalAmount)}`, pageWidth - 10, y + 1, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  // QR placeholder (bottom left)
  y += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Scan QR for verification:', 10, y)
  doc.rect(10, y + 2, 35, 35)
  doc.setFontSize(7)
  if (invoice.qrData) {
    // Draw a fake QR placeholder (real QR generation would need extra setup)
    const lines = invoice.qrData.slice(0, 60).split(',')
    lines.forEach((line, i) => doc.text(line, 12, y + 8 + i * 3))
  }

  // Notes + signature
  if (invoice.notes) {
    doc.setFontSize(9)
    doc.text(`Notes: ${invoice.notes}`, 50, y + 5)
  }

  doc.setFontSize(9)
  doc.text('Authorized Signature:', pageWidth - 60, y + 25)
  doc.line(pageWidth - 60, y + 35, pageWidth - 15, y + 35)

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer-generated tax invoice as per Nepal VAT Rule 17.', pageWidth / 2, 287, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}

// ============================================================
// PDF: Generic financial statement
// ============================================================

export function generateStatementPdf(opts: {
  title: string
  subtitle?: string
  periodLabel: string
  tenantName: string
  tenantPan?: string
  sections: Array<{
    title: string
    rows: Array<{ code?: string; label: string; amount: number }>
    totalLabel: string
    total: number
  }>
  summary?: Array<{ label: string; amount: number; bold?: boolean; color?: 'blue' | 'rose' | 'emerald' }>
}): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.title, pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(opts.tenantName, pageWidth / 2, 25, { align: 'center' })
  if (opts.tenantPan) doc.text(`PAN: ${opts.tenantPan}`, pageWidth / 2, 30, { align: 'center' })
  doc.text(opts.periodLabel, pageWidth / 2, 35, { align: 'center' })
  if (opts.subtitle) doc.text(opts.subtitle, pageWidth / 2, 40, { align: 'center' })

  let y = 48
  for (const section of opts.sections) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(section.title, 10, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Code', 'Account', 'Amount (NPR)']],
      body: section.rows.map(r => [r.code || '', r.label, formatNpr(r.amount)]),
      foot: [[ '', section.totalLabel, formatNpr(section.total)]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 120 }, 2: { cellWidth: 50, halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (opts.summary && opts.summary.length > 0) {
    doc.setFillColor(15, 23, 42)
    doc.rect(10, y, pageWidth - 20, opts.summary.length * 7 + 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    let sy = y + 6
    for (const item of opts.summary) {
      doc.setFont('helvetica', item.bold ? 'bold' : 'normal')
      doc.text(item.label, 12, sy)
      doc.text(formatNpr(item.amount), pageWidth - 12, sy, { align: 'right' })
      sy += 7
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}

// ============================================================
// Excel: Generic workbook export
// ============================================================

export async function generateExcelWorkbook(opts: {
  filename: string
  sheets: Array<{
    name: string
    headers: string[]
    rows: Array<Array<string | number>>
    totals?: Array<{ label: string; amount: number }>
  }>
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Nepal Accounting System'
  wb.created = new Date()

  for (const sheet of opts.sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    // Headers
    ws.columns = sheet.headers.map(h => ({ header: h, width: 22 }))
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
    ws.getRow(1).alignment = { horizontal: 'left' }

    // Rows
    sheet.rows.forEach(row => ws.addRow(row))

    // Totals
    if (sheet.totals && sheet.totals.length > 0) {
      ws.addRow([])
      for (const total of sheet.totals) {
        const row = ws.addRow([total.label, '', '', '', '', '', '', '', total.amount])
        row.font = { bold: true }
      }
    }

    // Style number columns
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      row.eachCell((cell, colNumber) => {
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00'
          cell.alignment = { horizontal: 'right' }
        }
      })
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
