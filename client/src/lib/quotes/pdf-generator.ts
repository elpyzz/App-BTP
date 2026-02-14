import jsPDF from "jspdf";
import { Quote } from "./types";
import { formatCurrency, formatVatRate } from "./calculations";
import { UNIT_LABELS } from "./defaults";

/**
 * Génère un PDF professionnel pour un devis
 */
export function generateQuotePDF(quote: Quote): jsPDF {
  const doc = new jsPDF();
  let yPos = 20;

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // En-tête avec logo et infos entreprise
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  if (quote.company.name) {
    doc.text(quote.company.name, margin, yPos);
  }
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (quote.company.legalForm) {
    doc.text(quote.company.legalForm, margin, yPos);
    yPos += 5;
  }
  if (quote.company.address) {
    doc.text(quote.company.address, margin, yPos);
    yPos += 5;
  }
  if (quote.company.postalCode && quote.company.city) {
    doc.text(`${quote.company.postalCode} ${quote.company.city}`, margin, yPos);
    yPos += 5;
  }
  if (quote.company.phone) {
    doc.text(`Tél: ${quote.company.phone}`, margin, yPos);
    yPos += 5;
  }
  if (quote.company.email) {
    doc.text(`Email: ${quote.company.email}`, margin, yPos);
    yPos += 5;
  }
  
  if (quote.company.siret) {
    yPos += 5;
    doc.text(`SIRET: ${quote.company.siret}`, margin, yPos);
  }
  
  if (quote.company.vatNumber) {
    yPos += 5;
    doc.text(`TVA: ${quote.company.vatNumber}`, margin, yPos);
  }

  // Bloc devis (droite)
  const rightX = pageWidth - margin - 60;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("DEVIS", rightX, 20, { align: "right" });
  
  yPos = 30;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`N° ${quote.quoteNumber}`, rightX, yPos, { align: "right" });
  yPos += 6;
  doc.text(`Date: ${new Date(quote.issueDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });
  yPos += 6;
  doc.text(`Validité: ${quote.validityDays} jours`, rightX, yPos, { align: "right" });
  yPos += 6;
  doc.text(`Expire le: ${new Date(quote.expirationDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });

  // Client
  yPos = 70;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("CLIENT", margin, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (quote.client.name) {
    doc.text(quote.client.name, margin, yPos);
    yPos += 5;
  }
  if (quote.client.billingAddress) {
    doc.text(quote.client.billingAddress, margin, yPos);
    yPos += 5;
  }
  if (quote.client.billingPostalCode && quote.client.billingCity) {
    doc.text(`${quote.client.billingPostalCode} ${quote.client.billingCity}`, margin, yPos);
    yPos += 5;
  }
  if (quote.client.email) {
    doc.text(`Email: ${quote.client.email}`, margin, yPos);
    yPos += 5;
  }
  if (quote.client.phone) {
    doc.text(`Tél: ${quote.client.phone}`, margin, yPos);
    yPos += 5;
  }

  // Chantier
  const chantierX = pageWidth / 2 + 10;
  yPos = 70;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("CHANTIER", chantierX, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (quote.chantier.name) {
    doc.text(quote.chantier.name, chantierX, yPos);
    yPos += 5;
  }
  if (quote.chantier.description) {
    const descriptionLines = doc.splitTextToSize(quote.chantier.description, 80);
    doc.text(descriptionLines, chantierX, yPos);
    yPos += descriptionLines.length * 5;
  }
  if (quote.chantier.address) {
    doc.text(`Adresse: ${quote.chantier.address}`, chantierX, yPos);
    yPos += 5;
  }

  // Tableau des lignes
  yPos = Math.max(110, yPos + 15);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  
  // En-tête du tableau
  doc.rect(margin, yPos - 5, contentWidth, 8);
  doc.text("Description", margin + 2, yPos);
  doc.text("Qté", margin + 100, yPos);
  doc.text("Unité", margin + 115, yPos);
  doc.text("PU HT", margin + 135, yPos);
  doc.text("TVA", margin + 155, yPos);
  doc.text("Total HT", margin + 170, yPos);
  
  yPos += 10;
  doc.setFont(undefined, "normal");

  // Grouper par lots
  const linesByLot = quote.lots.map(lot => ({
    lot,
    lines: quote.lines.filter(l => l.lotId === lot.id),
  }));
  const linesWithoutLot = quote.lines.filter(l => !l.lotId);

  // Lignes groupées par lots
  linesByLot.forEach(({ lot, lines }) => {
    if (lines.length === 0) return;
    
    // En-tête du lot
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont(undefined, "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 3, contentWidth, 6, "F");
    doc.text(lot.name, margin + 2, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");

      // Lignes du lot
      lines.forEach((line) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        const description = line.description || "";
        const descriptionLines = doc.splitTextToSize(description, 90);
        doc.text(descriptionLines, margin + 2, yPos);
        doc.text((line.quantity || 0).toString(), margin + 100, yPos);
        doc.text(UNIT_LABELS[line.unit] || line.unit || "", margin + 115, yPos);
        doc.text(formatCurrency(line.unitPriceHT || 0), margin + 135, yPos);
        doc.text(formatVatRate(line.vatRate || "20"), margin + 155, yPos);
        doc.text(formatCurrency(line.totalHT || 0), margin + 170, yPos);
        yPos += Math.max(5, descriptionLines.length * 5);
      });
  });

  // Lignes sans lot
  if (linesWithoutLot.length > 0) {
    linesWithoutLot.forEach((line) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, 90);
      doc.text(descriptionLines, margin + 2, yPos);
      doc.text((line.quantity || 0).toString(), margin + 100, yPos);
      doc.text(UNIT_LABELS[line.unit] || line.unit || "", margin + 115, yPos);
      doc.text(formatCurrency(line.unitPriceHT || 0), margin + 135, yPos);
      doc.text(formatVatRate(line.vatRate || "20"), margin + 155, yPos);
      doc.text(formatCurrency(line.totalHT || 0), margin + 170, yPos);
      yPos += Math.max(5, descriptionLines.length * 5);
    });
  }

  // Totaux
  yPos += 5;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  const totalsX = margin + 120;
  doc.setFontSize(10);
  doc.text("Sous-total HT:", totalsX, yPos);
  doc.text(formatCurrency(quote.subtotalHT), totalsX + 50, yPos, { align: "right" });
  
  if (quote.discountAmount > 0) {
    yPos += 6;
    doc.text("Remise:", totalsX, yPos);
    doc.text(`-${formatCurrency(quote.discountAmount)}`, totalsX + 50, yPos, { align: "right" });
  }
  
  yPos += 6;
  doc.text("Total HT:", totalsX, yPos);
  doc.text(formatCurrency(quote.totalHT), totalsX + 50, yPos, { align: "right" });
  
  // Détail TVA
  quote.vatBreakdown.forEach((vat) => {
    yPos += 6;
    doc.text(`TVA ${formatVatRate(vat.rate)}:`, totalsX, yPos);
    doc.text(formatCurrency(vat.vatAmount), totalsX + 50, yPos, { align: "right" });
  });
  
  yPos += 6;
  doc.text("Total TVA:", totalsX, yPos);
  doc.text(formatCurrency(quote.totalTVA), totalsX + 50, yPos, { align: "right" });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("TOTAL TTC:", totalsX, yPos);
  doc.text(formatCurrency(quote.totalTTC), totalsX + 50, yPos, { align: "right" });
  
  if (quote.depositAmount > 0) {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Acompte à la commande:", totalsX, yPos);
    doc.text(formatCurrency(quote.depositAmount), totalsX + 50, yPos, { align: "right" });
    yPos += 6;
    doc.text("Solde à payer:", totalsX, yPos);
    doc.text(formatCurrency(quote.remainingAmount), totalsX + 50, yPos, { align: "right" });
  }

  // Conditions
  if (quote.conditions) {
    yPos += 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("CONDITIONS", margin, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    
    if (quote.conditions.paymentTerms) {
      const paymentLines = doc.splitTextToSize(`Paiement: ${quote.conditions.paymentTerms}`, contentWidth);
      doc.text(paymentLines, margin, yPos);
      yPos += paymentLines.length * 4;
    }
    
    if (quote.conditions.executionTerms) {
      const executionLines = doc.splitTextToSize(`Exécution: ${quote.conditions.executionTerms}`, contentWidth);
      doc.text(executionLines, margin, yPos);
      yPos += executionLines.length * 4;
    }
    
    if (quote.conditions.warranties) {
      const warrantyLines = doc.splitTextToSize(`Garanties: ${quote.conditions.warranties}`, contentWidth);
      doc.text(warrantyLines, margin, yPos);
      yPos += warrantyLines.length * 4;
    }
  }

  // Signature
  if (quote.signature?.enabled) {
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(quote.signature.acceptanceText || "Bon pour accord", margin, yPos);
    yPos += 10;
    doc.setFont(undefined, "normal");
    doc.text("Date: ________________", margin, yPos);
    yPos += 6;
    doc.text("Signature du client:", margin, yPos);
    yPos += 15;
    doc.rect(margin, yPos, 80, 30);
    if (quote.signature.signatureData) {
      // TODO: Ajouter l'image de signature si disponible
    }
  }

  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setFont(undefined, "normal");
  const footerText = [
    quote.company.name,
    quote.company.legalForm || "",
    quote.company.siret ? `SIRET: ${quote.company.siret}` : "",
  ].filter(Boolean).join(" - ");
  if (footerText) {
    doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
  }
  if (quote.company.insuranceDecennale?.company && quote.company.insuranceDecennale?.policyNumber) {
    doc.text(
      `Assurance décennale: ${quote.company.insuranceDecennale.company} - Police n° ${quote.company.insuranceDecennale.policyNumber}`,
      pageWidth / 2,
      footerY + 5,
      { align: "center" }
    );
  }

  return doc;
}

/**
 * Télécharge le PDF d'un devis
 */
export function downloadQuotePDF(quote: Quote): void {
  const doc = generateQuotePDF(quote);
  const fileName = `Devis_${quote.quoteNumber}_${quote.client.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}
