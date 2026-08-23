// ============================================================
// Generación de reportes — Excel (xlsx) y PDF (jspdf).
// Todo corre en el navegador del usuario (sin backend): se arma
// el archivo en memoria y se dispara la descarga directamente.
// ============================================================

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function filasDetalle(ventas, productos) {
  const filas = [];
  ventas.forEach((v) => {
    v.detalles.forEach((d) => {
      const producto = productos.find((p) => p.id === d.productoId);
      filas.push({
        fecha: new Date(v.fecha),
        producto: producto?.nombre ?? d.productoId,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
        total: d.precioUnitario * d.cantidad - d.descuento,
        tipoPago: v.tipoPago,
        estado: v.estado,
      });
    });
  });
  return filas;
}

export function exportarVentasExcel(ventas, productos, nombreArchivo = 'ventas') {
  const filas = filasDetalle(ventas, productos).map((f) => ({
    Fecha: f.fecha.toLocaleString('es-MX'),
    Producto: f.producto,
    Cantidad: f.cantidad,
    'Precio unitario': f.precioUnitario,
    Descuento: f.descuento,
    Total: f.total,
    'Tipo de pago': f.tipoPago,
    Estado: f.estado,
  }));

  const totalConfirmado = ventas.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.total, 0);
  const gananciaConfirmada = ventas.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.gananciaEstimada, 0);
  filas.push({}, { Fecha: 'TOTAL VENDIDO (confirmadas)', Total: totalConfirmado });
  filas.push({ Fecha: 'GANANCIA ESTIMADA (confirmadas)', Total: gananciaConfirmada });

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Ventas');
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

export function exportarVentasPDF(ventas, productos, nombreArchivo = 'ventas') {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text('Reporte de ventas — StockCerveza', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 21);
  doc.setTextColor(0);

  const filas = filasDetalle(ventas, productos).map((f) => [
    f.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    f.producto,
    f.cantidad,
    `$${f.precioUnitario}`,
    `$${f.total.toFixed(0)}`,
    f.tipoPago,
    f.estado,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['Hora', 'Producto', 'Cant.', 'P. Unit.', 'Total', 'Pago', 'Estado']],
    body: filas,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] },
  });

  const totalConfirmado = ventas.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.total, 0);
  const gananciaConfirmada = ventas.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.gananciaEstimada, 0);
  const finalY = doc.lastAutoTable?.finalY ?? 30;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total vendido (confirmadas): $${totalConfirmado.toFixed(0)}`, 14, finalY + 10);
  doc.text(`Ganancia estimada (confirmadas): $${gananciaConfirmada.toFixed(0)}`, 14, finalY + 16);

  doc.save(`${nombreArchivo}.pdf`);
}
