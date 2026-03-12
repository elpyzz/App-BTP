import jsPDF from "jspdf";

export type ReceiptsBookLine = {
  date: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: "paid" | "partial";
};

function formatCurrency(amount: number): string {
  const formatted = amount.toFixed(2).replace(".", ",");
  const parts = formatted.split(",");
  const integerPart = parts[0];
  const spacedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return spacedInteger + "," + parts[1] + " €";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Génère le PDF du livre de recettes.
 * @param lines Lignes d'encaissement (une par facture payée ou partielle)
 * @param periodLabel Ex. "Mars 2025" ou "Année 2025"
 */
export function generateReceiptsBookPDF(
  lines: ReceiptsBookLine[],
  periodLabel: string
): jsPDF {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;
  let yPos = 20;

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("Livre de recettes", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Période : ${periodLabel}`, margin, yPos);
  yPos += 12;

  const colDate = margin;
  const colDateW = 28;
  const colNum = colDate + colDateW;
  const colNumW = 32;
  const colClient = colNum + colNumW;
  const colClientW = contentWidth - colNumW - colDateW - 38;
  const colAmount = colClient + colClientW;

  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.text("Date", colDate, yPos);
  doc.text("N° Facture", colNum, yPos);
  doc.text("Client", colClient, yPos);
  doc.text("Montant", colAmount, yPos, { align: "right" });
  yPos += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  doc.setFont(undefined, "normal");
  doc.setFontSize(9);

  const lineHeight = 7;
  const total = { value: 0 };

  for (const line of lines) {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(9);
    }
    doc.text(formatDate(line.date), colDate, yPos);
    doc.text(line.invoiceNumber, colNum, yPos);
    const clientLines = doc.splitTextToSize(line.clientName || "—", colClientW);
    doc.text(clientLines[0], colClient, yPos);
    doc.text(formatCurrency(line.amount), colAmount, yPos, { align: "right" });
    total.value += line.amount;
    yPos += lineHeight;
  }

  yPos += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  doc.setFont(undefined, "bold");
  doc.text("Total", colClient, yPos);
  doc.text(formatCurrency(total.value), colAmount, yPos, { align: "right" });

  return doc;
}
