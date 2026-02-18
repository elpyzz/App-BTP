import jsPDF from "jspdf";
import { Invoice } from "./types";
import { formatVatRate } from "./calculations";
import { UNIT_LABELS } from "@/lib/quotes/defaults";

/**
 * Formate un montant pour jsPDF
 */
function formatCurrencyForPDF(amount: number): string {
  const formatted = amount.toFixed(2).replace('.', ',');
  const parts = formatted.split(',');
  const integerPart = parts[0];
  const spacedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return spacedInteger + ',' + parts[1] + ' €';
}

/**
 * Génère un PDF professionnel pour une facture
 */
export function generateInvoicePDF(invoice: Invoice): jsPDF {
  const doc = new jsPDF();
  let yPos = 25;

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - 2 * margin;
  const violetColor = [138, 43, 226]; // Violet RGB

  // ============================================
  // EN-TÊTE AVEC LOGO ET NUMÉRO FACTURE
  // ============================================
  
  // Logo à gauche
  const logoSize = 18;
  const logoX = margin;
  const logoY = yPos;
  
  doc.setFillColor(violetColor[0], violetColor[1], violetColor[2]);
  doc.rect(logoX, logoY, logoSize, logoSize, "F");
  
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
  const companyInitial = invoice.company?.name?.charAt(0).toUpperCase() || "C";
  doc.text(companyInitial, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" });
  
  doc.setTextColor(violetColor[0], violetColor[1], violetColor[2]);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  const companyName = (invoice.company?.name || "VOTRE ENTREPRISE").toLowerCase();
  const maxCompanyNameWidth = pageWidth / 2 - logoX - logoSize - 8;
  const companyNameLines = doc.splitTextToSize(companyName, maxCompanyNameWidth);
  doc.text(companyNameLines, logoX + logoSize + 8, logoY + logoSize / 2 + 2);

  // Numéro de facture à droite
  const rightX = pageWidth - margin;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Facture n° ${invoice.invoiceNumber || "N/A"}`, rightX, yPos + 5, { align: "right" });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Date d'émission : ${new Date(invoice.issueDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });
  yPos += 5;
  if (invoice.saleDate) {
    doc.text(`Date de vente/prestation : ${new Date(invoice.saleDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });
    yPos += 5;
  }
  doc.text(`Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });

  // Nom du client centré
  yPos += 10;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  const centerX = pageWidth / 2;
  doc.text(invoice.client?.name || "Nom du client", centerX, yPos, { align: "center" });

  // ============================================
  // SECTION ENTREPRISE / CLIENT (DEUX COLONNES)
  // ============================================
  yPos += 20;
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;
  
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 15;
  const colWidth = (pageWidth - 2 * margin - 30) / 2;
  
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.company?.name || "VOTRE ENTREPRISE", leftColX, yPos);
  
  let leftY = yPos + 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  if (invoice.company?.address) {
    doc.text("Adresse", leftColX, leftY);
    doc.text(invoice.company.address, leftColX, leftY + 4);
    leftY += 8;
  }
  
  if (invoice.company?.postalCode && invoice.company?.city) {
    doc.text("Code postal, Ville", leftColX, leftY);
    doc.text(`${invoice.company.postalCode} ${invoice.company.city}`, leftColX, leftY + 4);
    leftY += 8;
  }
  
  if (invoice.company?.phone) {
    doc.text("Téléphone", leftColX, leftY);
    doc.text(invoice.company.phone, leftColX, leftY + 4);
    leftY += 8;
  }
  
  if (invoice.company?.email) {
    doc.text("Email", leftColX, leftY);
    doc.text(invoice.company.email, leftColX, leftY + 4);
    leftY += 8;
  }

  // Colonne droite - Client
  let rightY = yPos + 7;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.client?.name || "Nom du client", rightColX, yPos);
  
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  if (invoice.client?.billingAddress) {
    doc.text("Adresse", rightColX, rightY);
    doc.text(invoice.client.billingAddress, rightColX, rightY + 4);
    rightY += 8;
  }
  
  if (invoice.client?.billingPostalCode && invoice.client?.billingCity) {
    doc.text("Code postal, Ville", rightColX, rightY);
    doc.text(`${invoice.client.billingPostalCode} ${invoice.client.billingCity}`, rightColX, rightY + 4);
    rightY += 8;
  }

  // ============================================
  // INFORMATIONS FACTURE
  // ============================================
  const maxY = Math.max(leftY, rightY);
  yPos = maxY + 18;
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
  
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Informations facture :", margin, yPos);
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  const infoLines = [];
  if (invoice.chantier?.name) {
    infoLines.push(`Chantier : ${invoice.chantier.name}`);
  }
  if (invoice.executionPeriodStart && invoice.executionPeriodEnd) {
    infoLines.push(`Période d'exécution : ${new Date(invoice.executionPeriodStart).toLocaleDateString("fr-FR")} au ${new Date(invoice.executionPeriodEnd).toLocaleDateString("fr-FR")}`);
  }
  if (invoice.quoteNumber) {
    infoLines.push(`Référence devis : ${invoice.quoteNumber}`);
  }
  if (invoice.purchaseOrderNumber) {
    infoLines.push(`Bon de commande : ${invoice.purchaseOrderNumber}`);
  }
  if (invoice.internalReference) {
    infoLines.push(`Référence interne : ${invoice.internalReference}`);
  }
  
  if (infoLines.length > 0) {
    infoLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }
  yPos += 5;

  // ============================================
  // TABLEAU DES LIGNES
  // ============================================
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 5, contentWidth, 8, "F");
  
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  const tableStartY = yPos;
  
  const colDesignation = margin + 5;
  const colDesignationWidth = 60;
  const colQte = colDesignation + colDesignationWidth + 3;
  const colQteWidth = 10;
  const colTVA = colQte + colQteWidth + 3;
  const colTVAWidth = 12;
  const colPrixHT = colTVA + colTVAWidth + 5;
  const colPrixHTWidth = 20;
  const colMontantTTC = colPrixHT + colPrixHTWidth + 6;
  const colMontantTTCWidth = 25;
  
  doc.text("Désignation", colDesignation, yPos);
  doc.text("Qté", colQte, yPos);
  doc.text("TVA", colTVA, yPos);
  doc.text("Prix HT", colPrixHT, yPos);
  doc.text("Montant TTC", colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
  
  yPos += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // Grouper par lots
  const linesByLot = (invoice.lots || []).map(lot => ({
    lot,
    lines: (invoice.lines || []).filter(l => l.lotId === lot.id),
  }));
  const linesWithoutLot = (invoice.lines || []).filter(l => !l.lotId);

  linesByLot.forEach(({ lot, lines }) => {
    if (lines.length === 0) return;
    
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 25;
    }
    
    doc.setFont(undefined, "bold");
    doc.text(lot.name, colDesignation, yPos);
    yPos += 6;
    doc.setFont(undefined, "normal");

    lines.forEach((line, index) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = 25;
      }
      
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, colDesignationWidth - 5);
      const lineHeight = Math.max(6, descriptionLines.length * 4.5);
      
      doc.setFont(undefined, "bold");
      const fullDescription = `Ligne n°${index + 1}\n${description}`;
      const fullDescriptionLines = doc.splitTextToSize(fullDescription, colDesignationWidth - 5);
      doc.text(fullDescriptionLines, colDesignation, yPos);
      doc.setFont(undefined, "normal");
      
      const qtyText = (line.quantity || 0).toString();
      doc.text(qtyText, colQte + colQteWidth, yPos, { align: "right" });
      
      doc.text(formatVatRate(line.vatRate || "20"), colTVA, yPos);
      
      const prixHTText = formatCurrencyForPDF(line.unitPriceHT || 0);
      doc.text(prixHTText, colPrixHT + colPrixHTWidth, yPos, { align: "right" });
      
      const montantTTCText = formatCurrencyForPDF(line.totalTTC || 0);
      doc.text(montantTTCText, colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
      
      yPos += lineHeight;
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
    });
  });

  if (linesWithoutLot.length > 0) {
    let lineNumber = 1;
    linesWithoutLot.forEach((line) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = 25;
        lineNumber = 1;
      }
      
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, 85);
      const lineHeight = Math.max(6, descriptionLines.length * 4.5);
      
      doc.setFont(undefined, "bold");
      const fullDescription = `Ligne n°${lineNumber}\n${description}`;
      const fullDescriptionLines = doc.splitTextToSize(fullDescription, 85);
      doc.text(fullDescriptionLines, colDesignation, yPos);
      doc.setFont(undefined, "normal");
      
      const qtyText = (line.quantity || 0).toString();
      doc.text(qtyText, colQte + colQteWidth, yPos, { align: "right" });
      
      doc.text(formatVatRate(line.vatRate || "20"), colTVA, yPos);
      
      const prixHTText = formatCurrencyForPDF(line.unitPriceHT || 0);
      doc.text(prixHTText, colPrixHT + colPrixHTWidth, yPos, { align: "right" });
      
      const montantTTCText = formatCurrencyForPDF(line.totalTTC || 0);
      doc.text(montantTTCText, colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
      
      yPos += lineHeight;
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
      
      lineNumber++;
    });
  }

  // ============================================
  // TOTAUX
  // ============================================
  yPos += 5;
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 25;
  }
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.text("Sous-total HT", colDesignation, yPos);
  doc.text(formatCurrencyForPDF(invoice.subtotalHT || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });
  
  yPos += 6;
  doc.text("Total TVA", colDesignation, yPos);
  doc.text(formatCurrencyForPDF(invoice.totalTVA || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });
  
  yPos += 6;
  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.text("Total TTC", colDesignation + 5, yPos);
  doc.text(formatCurrencyForPDF(invoice.totalTTC || 0), colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);

  // ============================================
  // ACOMPTES ET RESTE À PAYER
  // ============================================
  if (invoice.depositsPaid > 0) {
    yPos += 12;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 25;
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Acomptes et solde :", margin, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(60, 60, 60);
    
    doc.text("Acomptes déjà payés", margin, yPos);
    doc.text(formatCurrencyForPDF(invoice.depositsPaid), colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
    yPos += 6;
    
    doc.setFont(undefined, "bold");
    doc.text("Reste à payer", margin, yPos);
    doc.text(formatCurrencyForPDF(invoice.remainingAmount || 0), colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
    doc.setFont(undefined, "normal");
  }

  // ============================================
  // CONDITIONS DE PAIEMENT
  // ============================================
  yPos += 18;
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 25;
  }
  
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Conditions de paiement :", margin, yPos);
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  if (invoice.paymentTerms) {
    const paymentLines = doc.splitTextToSize(invoice.paymentTerms, contentWidth);
    doc.text(paymentLines, margin, yPos);
    yPos += paymentLines.length * 4.5;
  }
  
  yPos += 5;
  if (invoice.paymentMethods && invoice.paymentMethods.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Moyens de paiement :", margin, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(invoice.paymentMethods.join(", "), margin, yPos);
    yPos += 10;
  }

  // ============================================
  // MENTIONS LÉGALES
  // ============================================
  if (invoice.latePaymentPenalties || invoice.recoveryFee || invoice.specialVatMention) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 25;
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Mentions légales :", margin, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(60, 60, 60);
    
    if (invoice.latePaymentPenalties) {
      const penaltyLines = doc.splitTextToSize(invoice.latePaymentPenalties, contentWidth);
      doc.text(penaltyLines, margin, yPos);
      yPos += penaltyLines.length * 4.5;
    }
    
    if (invoice.recoveryFee && invoice.recoveryFee > 0) {
      doc.text(`Indemnité forfaitaire pour frais de recouvrement : ${formatCurrencyForPDF(invoice.recoveryFee)}`, margin, yPos);
      yPos += 6;
    }
    
    if (invoice.specialVatMention) {
      doc.text(invoice.specialVatMention, margin, yPos);
      yPos += 6;
    }
  }

  // ============================================
  // PIED DE PAGE
  // ============================================
  const footerY = pageHeight - 18;
  doc.setFontSize(7);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100, 100, 100);
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
  
  const footerLines = [];
  if (invoice.company?.name) {
    const capital = invoice.company?.capital ? formatCurrencyForPDF(invoice.company.capital) : "0,00 €";
    footerLines.push(`${invoice.company.name} au capital de ${capital}`);
  }
  
  if (invoice.company?.rcsCity && invoice.company?.siret) {
    const siretFormatted = invoice.company.siret.match(/.{1,3}/g)?.join(' ') || invoice.company.siret;
    footerLines.push(`RCS ${invoice.company.rcsCity} n° ${siretFormatted}`);
  }
  
  if (invoice.company?.vatNumber) {
    footerLines.push(`Numéro de TVA : ${invoice.company.vatNumber}`);
  }
  
  if (invoice.company?.insuranceDecennale?.company && invoice.company?.insuranceDecennale?.policyNumber) {
    footerLines.push(`Assurance : ${invoice.company.insuranceDecennale.company} - Police n° ${invoice.company.insuranceDecennale.policyNumber}`);
  }
  
  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerY + (index * 3.5), { align: "center" });
  });

  return doc;
}

/**
 * Télécharge le PDF d'une facture
 */
export function downloadInvoicePDF(invoice: Invoice): void {
  const doc = generateInvoicePDF(invoice);
  const fileName = `Facture_${invoice.invoiceNumber || invoice.id}_${(invoice.client?.name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}
