// backend/src/controllers/invoiceController.js
const PDFDocument = require('pdfkit');
const prisma = require('../lib/prisma');

// Generate invoice PDF
const generateInvoice = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await prisma.subscriptionHistory.findUnique({
      where: { id: subscriptionId },
      include: { user: true }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check authorization
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isAdmin && subscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${subscriptionId.slice(0, 8)}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('OzBiz Directory', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: INV-${subscriptionId.slice(0, 8).toUpperCase()}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, { align: 'right' });
    doc.text(`Subscription ID: ${subscriptionId.slice(0, 12)}`, { align: 'right' });
    doc.moveDown();
    
    // Bill To
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
    doc.fontSize(10).font('Helvetica');
    doc.text(subscription.user.name);
    doc.text(subscription.user.email);
    if (subscription.user.businessName) {
      doc.text(subscription.user.businessName);
    }
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Quantity', 350, tableTop);
    doc.text('Amount', 450, tableTop);
    
    doc.moveDown();
    const lineY = doc.y;
    doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
    
    // Table row
    doc.font('Helvetica');
    doc.text(`${subscription.plan.toUpperCase()} Plan Subscription`, 50, lineY + 10);
    doc.text('1', 350, lineY + 10);
    doc.text(`$${subscription.amount.toFixed(2)} AUD`, 450, lineY + 10);
    
    doc.moveDown(3);
    
    // Total
    const totalY = doc.y;
    doc.moveTo(350, totalY).lineTo(550, totalY).stroke();
    doc.font('Helvetica-Bold');
    doc.text('Total', 350, totalY + 10);
    doc.text(`$${subscription.amount.toFixed(2)} AUD`, 450, totalY + 10);
    doc.text('(Incl. GST)', 450, totalY + 25);
    
    doc.moveDown(3);
    
    // Footer
    doc.fontSize(8).font('Helvetica');
    doc.text('Payment Terms: Due upon receipt', 50, doc.y);
    doc.text('ABN: 12 345 678 901', 50, doc.y + 15);
    doc.text('Thank you for choosing OzBiz Directory!', 50, doc.y + 30);
    
    doc.end();
  } catch (err) {
    console.error('Generate invoice error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

// Get invoice list for user
const getUserInvoices = async (req, res) => {
  try {
    const subscriptions = await prisma.subscriptionHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

module.exports = { generateInvoice, getUserInvoices };