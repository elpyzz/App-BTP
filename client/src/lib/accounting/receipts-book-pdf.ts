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
 * Génère le PDF du livre de recettes (style aligné sur le PDF devis).
 * @param lines Lignes d'encaissement (une par facture payée ou partielle)
 * @param periodLabel Ex. "Mars 2025" ou "Année 2025"
 * @param company Infos entreprise pour header, bloc infos et footer
 */
export function generateReceiptsBookPDF(
  lines: ReceiptsBookLine[],
  periodLabel: string,
  company?: {
    name?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    siret?: string;
    rcsCity?: string;
    insuranceDecennale?: { company?: string; policyNumber?: string };
  }
): jsPDF {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * margin;
  const accentColor: [number, number, number] = [245, 158, 11];
  let yPos = 0;

  // ============================================
  // HEADER AMBER
  // ============================================
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Nom entreprise (gauche)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  const companyName = company?.name || "VOTRE ENTREPRISE";
  doc.text(companyName.toLowerCase(), margin, 17);

  // Titre document (droite)
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Livre de recettes", pageWidth - margin, 13, { align: "right" });

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(220, 220, 220);
  doc.text(`Période : ${periodLabel}`, pageWidth - margin, 21, { align: "right" });

  yPos = 36;

  // ============================================
  // BLOC INFOS ENTREPRISE
  // ============================================
  doc.setFillColor(248, 248, 248);
  doc.rect(margin - 4, yPos - 4, contentWidth + 8, 22, "F");

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(company?.name || "VOTRE ENTREPRISE", margin, yPos + 2);

  doc.setFont(undefined, "normal");
  doc.setTextColor(80, 80, 80);
  const infoLeft: string[] = [];
  if (company?.address) infoLeft.push(company.address);
  if (company?.postalCode && company?.city) infoLeft.push(`${company.postalCode} ${company.city}`);
  if (company?.rcsCity && company?.siret) {
    const siretFormatted = company.siret.match(/.{1,3}/g)?.join(" ") || company.siret;
    infoLeft.push(`SIRET : ${siretFormatted}`);
  }
  doc.text(infoLeft.join("   |   "), margin, yPos + 8);

  // Date de génération
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    pageWidth - margin,
    yPos + 5,
    { align: "right" }
  );

  yPos += 28;

  // ============================================
  // TABLEAU — EN-TÊTE AMBER
  // ============================================
  const colDate = margin + 2;
  const colDateW = 26;
  const colNum = colDate + colDateW + 2;
  const colNumW = 34;
  const colClient = colNum + colNumW + 2;
  const colClientW = contentWidth - colDateW - colNumW - 40;
  const colStatut = colClient + colClientW + 2;
  const colStatutW = 14;
  const colAmount = pageWidth - margin;

  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, yPos - 4, contentWidth, 9, "F");

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Date", colDate, yPos + 1);
  doc.text("N° Facture", colNum, yPos + 1);
  doc.text("Client", colClient, yPos + 1);
  doc.text("Statut", colStatut, yPos + 1);
  doc.text("Montant TTC", colAmount, yPos + 1, { align: "right" });

  yPos += 9;

  // ============================================
  // LIGNES DU TABLEAU
  // ============================================
  doc.setFont(undefined, "normal");
  doc.setFontSize(8);

  let total = 0;

  lines.forEach((line, index) => {
    // Nouvelle page si nécessaire (footer réservé : 20px)
    if (yPos > pageHeight - 25) {
      doc.addPage();
      yPos = 20;
      // Répéter l'en-tête du tableau sur la nouvelle page
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(margin, yPos - 4, contentWidth, 9, "F");
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Date", colDate, yPos + 1);
      doc.text("N° Facture", colNum, yPos + 1);
      doc.text("Client", colClient, yPos + 1);
      doc.text("Statut", colStatut, yPos + 1);
      doc.text("Montant TTC", colAmount, yPos + 1, { align: "right" });
      yPos += 9;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
    }

    // Alternance de fond
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, yPos - 3, contentWidth, 7, "F");
    }

    doc.setTextColor(40, 40, 40);
    doc.text(formatDate(line.date), colDate, yPos + 1);
    doc.text(line.invoiceNumber, colNum, yPos + 1);

    const clientTxt = doc.splitTextToSize(line.clientName || "—", colClientW);
    doc.text(clientTxt[0], colClient, yPos + 1);

    // Badge statut
    const statutLabel = line.status === "paid" ? "Payée" : "Partiel";
    const statutColor: [number, number, number] = line.status === "paid" ? [34, 197, 94] : [249, 115, 22];
    doc.setTextColor(statutColor[0], statutColor[1], statutColor[2]);
    doc.setFont(undefined, "bold");
    doc.text(statutLabel, colStatut, yPos + 1);
    doc.setFont(undefined, "normal");

    doc.setTextColor(40, 40, 40);
    doc.text(formatCurrency(line.amount), colAmount, yPos + 1, { align: "right" });

    // Trait séparateur léger
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4);

    total += line.amount;
    yPos += 7;
  });

  // ============================================
  // LIGNE TOTAL AMBER
  // ============================================
  yPos += 2;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, yPos - 3, contentWidth, 10, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Total encaissé", colClient, yPos + 3);
  doc.text(formatCurrency(total), colAmount, yPos + 3, { align: "right" });

  // ============================================
  // FOOTER DARK (même que devis)
  // ============================================
  const footerY = pageHeight - 12;
  doc.setFillColor(40, 40, 40);
  doc.rect(0, footerY - 8, pageWidth, 20, "F");
  doc.setFontSize(6);
  doc.setFont(undefined, "normal");
  doc.setTextColor(180, 180, 180);

  const footerLines: string[] = [];
  if (company?.name) footerLines.push(company.name);
  if (company?.rcsCity && company?.siret) {
    const siretFormatted = company.siret.match(/.{1,3}/g)?.join(" ") || company.siret;
    footerLines.push(`RCS ${company.rcsCity} n° ${siretFormatted}`);
  }
  if (company?.insuranceDecennale?.company && company?.insuranceDecennale?.policyNumber) {
    footerLines.push(`Assurance : ${company.insuranceDecennale.company} - Police n° ${company.insuranceDecennale.policyNumber}`);
  }

  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerY + index * 3, { align: "center" });
  });

  return doc;
}
