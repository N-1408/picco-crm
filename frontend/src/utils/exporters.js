import { format } from 'date-fns';

export async function exportOrdersToPDF({ orders, stores, agents, chartImage }) {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF.jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PICCO CRM — Buyurtmalar hisobotı', 40, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#555555');
  doc.text(`Sana: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 40, 78);

  if (chartImage) {
    doc.addImage(chartImage, 'PNG', 320, 40, 220, 120, undefined, 'SLOW');
  }

  const rows = orders.map((order) => ({
    id: order.id,
    store:
      stores.find((store) => store.id === order.storeId)?.title ??
      `Do'kon: ${order.storeId}`,
    agent: agents.find((agent) => agent.id === order.agentId)?.name ?? 'Aniq emas',
    amount: `${order.amount.toLocaleString('uz-UZ')} so'm`,
    status:
      order.status === 'completed'
        ? '✅ Yakunlangan'
        : order.status === 'processing'
        ? '🟡 Jarayonda'
        : '⏳ Kutilmoqda',
    createdAt: format(new Date(order.createdAt), 'dd.MM.yyyy')
  }));

  autoTable.default(doc, {
    startY: chartImage ? 180 : 120,
    headStyles: {
      fillColor: [238, 241, 255],
      textColor: [28, 28, 30],
      fontSize: 11,
      halign: 'center'
    },
    bodyStyles: {
      textColor: [80, 80, 85],
      fontSize: 10,
      halign: 'left'
    },
    columnStyles: {
      amount: { halign: 'right' },
      status: { halign: 'center' }
    },
    head: [['ID', 'Do\'kon', 'Agent', 'Summasi', 'Holati', 'Sana']],
    body: rows.map((row) => [row.id, row.store, row.agent, row.amount, row.status, row.createdAt])
  });

  doc.save(`picco-orders-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
}

export async function exportOrdersToExcel({ orders, stores, agents }) {
  const XLSX = await import('xlsx');

  const header = [
    ['Buyurtma ID', 'Do\'kon', 'Agent', 'Summasi (so\'m)', 'Holati', 'Sana']
  ];
  const rows = orders.map((order) => [
    order.id,
    stores.find((store) => store.id === order.storeId)?.title ?? order.storeId,
    agents.find((agent) => agent.id === order.agentId)?.name ?? order.agentId,
    order.amount,
    order.status,
    format(new Date(order.createdAt), 'dd.MM.yyyy')
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([...header, ...rows]);

  // Apply header styling
  header[0].forEach((_, idx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: idx });
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'EEF1FF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  });

  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Buyurtmalar');
  XLSX.writeFile(workbook, `picco-orders-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
}
