import jsPDF from "jspdf";
import { Quote } from "./types";
import { formatVatRate } from "./calculations";
import { UNIT_LABELS } from "./defaults";

/**
 * Formate un montant pour jsPDF (sans espaces insécables problématiques)
 */
function formatCurrencyForPDF(amount: number): string {
  // Utiliser un formatage simple sans espaces insécables
  const formatted = amount.toFixed(2).replace('.', ',');
  // Ajouter des espaces pour les milliers manuellement
  const parts = formatted.split(',');
  const integerPart = parts[0];
  // Ajouter des espaces tous les 3 chiffres depuis la droite
  const spacedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return spacedInteger + ',' + parts[1] + ' €';
}

/**
 * Génère un PDF professionnel pour un devis selon le modèle fourni
 */
export function generateQuotePDF(quote: Quote): jsPDF {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:23',message:'Génération PDF - Données reçues',data:{quoteId:quote.id,companyName:quote.company?.name,companyAddress:quote.company?.address,companyPostalCode:quote.company?.postalCode,companyCity:quote.company?.city,companyPhone:quote.company?.phone,companyEmail:quote.company?.email,companySiret:quote.company?.siret,clientName:quote.client?.name,clientAddress:quote.client?.billingAddress,chantierName:quote.chantier?.name,linesCount:quote.lines?.length,hasCompany:!!quote.company,hasClient:!!quote.client,hasChantier:!!quote.chantier},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  const doc = new jsPDF();
  let yPos = 20; // Réduit de 25 à 20

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // Réduit de 25 à 20
  const contentWidth = pageWidth - 2 * margin;
  const violetColor = [138, 43, 226]; // Violet RGB

  // ============================================
  // EN-TÊTE AVEC LOGO ET NUMÉRO DEVIS
  // ============================================
  
  // Logo à gauche (carré violet avec initiale)
  const logoSize = 15; // Réduit de 18 à 15
  const logoX = margin;
  const logoY = yPos;
  
  // Carré violet pour le logo
  doc.setFillColor(violetColor[0], violetColor[1], violetColor[2]);
  doc.rect(logoX, logoY, logoSize, logoSize, "F");
  
  // Initiale ou première lettre du nom de l'entreprise
  doc.setFontSize(12); // Réduit de 14 à 12
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
  const companyInitial = quote.company?.name?.charAt(0).toUpperCase() || "C";
  doc.text(companyInitial, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" });
  
  // Nom de l'entreprise à côté du logo (en violet, en minuscules)
  // Limiter la largeur pour éviter le chevauchement avec le numéro de devis
  doc.setTextColor(violetColor[0], violetColor[1], violetColor[2]);
  doc.setFontSize(14); // Réduit de 16 à 14
  doc.setFont(undefined, "bold");
  const companyName = (quote.company?.name || "VOTRE ENTREPRISE").toLowerCase();
  const maxCompanyNameWidth = pageWidth / 2 - logoX - logoSize - 8;
  const companyNameLines = doc.splitTextToSize(companyName, maxCompanyNameWidth);
  doc.text(companyNameLines, logoX + logoSize + 8, logoY + logoSize / 2 + 2);

  // Numéro de devis à droite (pas centré pour éviter le chevauchement)
  const rightX = pageWidth - margin;
  doc.setFontSize(16); // Réduit de 18 à 16
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Devis n° ${quote.quoteNumber || "N/A"}`, rightX, yPos + 4, { align: "right" });
  
  yPos += 7; // Réduit de 10 à 7
  doc.setFontSize(9); // Réduit de 10 à 9
  doc.setFont(undefined, "normal");
  doc.text(`Date d'émission : ${new Date(quote.issueDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });
  yPos += 4; // Réduit de 5 à 4
  doc.text(`Date d'expiration : ${new Date(quote.expirationDate).toLocaleDateString("fr-FR")}`, rightX, yPos, { align: "right" });

  // Nom du client centré (sous le logo et le numéro)
  yPos += 8; // Réduit de 10 à 8
  doc.setFontSize(12); // Réduit de 13 à 12
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  const centerX = pageWidth / 2;
  doc.text(quote.client?.name || "Nom du client", centerX, yPos, { align: "center" });

  // ============================================
  // SECTION ENTREPRISE / CLIENT (DEUX COLONNES)
  // ============================================
  yPos += 12; // Réduit de 20 à 12
  
  // Ligne de séparation
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8; // Réduit de 12 à 8
  
  // Colonne gauche - Entreprise
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 15;
  const colWidth = (pageWidth - 2 * margin - 30) / 2;
  
  doc.setFontSize(10); // Réduit de 11 à 10
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quote.company?.name || "VOTRE ENTREPRISE", leftColX, yPos);
  
  let leftY = yPos + 5; // Réduit de 7 à 5
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  // Adresse entreprise
  if (quote.company?.address) {
    doc.text("Adresse", leftColX, leftY);
    doc.text(quote.company.address, leftColX, leftY + 3); // Réduit de 4 à 3
    leftY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Adresse", leftColX, leftY);
    leftY += 4; // Réduit de 5 à 4
  }
  
  // Code postal et ville
  if (quote.company?.postalCode && quote.company?.city) {
    doc.text("Code postal, Ville", leftColX, leftY);
    doc.text(`${quote.company.postalCode} ${quote.company.city}`, leftColX, leftY + 3); // Réduit de 4 à 3
    leftY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Code postal, Ville", leftColX, leftY);
    leftY += 4; // Réduit de 5 à 4
  }
  
  // Pays
  doc.text("Pays", leftColX, leftY);
  leftY += 4; // Réduit de 5 à 4
  
  // Téléphone
  if (quote.company?.phone) {
    doc.text("Téléphone", leftColX, leftY);
    doc.text(quote.company.phone, leftColX, leftY + 3); // Réduit de 4 à 3
    leftY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Téléphone", leftColX, leftY);
    leftY += 4; // Réduit de 5 à 4
  }
  
  // Site internet
  if (quote.company?.website) {
    doc.text("Site internet", leftColX, leftY);
    doc.text(quote.company.website, leftColX, leftY + 3); // Réduit de 4 à 3
    leftY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Site internet", leftColX, leftY);
    leftY += 4; // Réduit de 5 à 4
  }
  
  // Email
  if (quote.company?.email) {
    doc.text("Email", leftColX, leftY);
    doc.text(quote.company.email, leftColX, leftY + 3); // Réduit de 4 à 3
    leftY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Email", leftColX, leftY);
    leftY += 4; // Réduit de 5 à 4
  }

  // Colonne droite - Client
  let rightY = yPos + 5; // Réduit de 7 à 5
  doc.setFontSize(10); // Réduit de 11 à 10
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quote.client?.name || "Nom du client", rightColX, yPos);
  
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  // Adresse client
  if (quote.client?.billingAddress) {
    doc.text("Adresse", rightColX, rightY);
    doc.text(quote.client.billingAddress, rightColX, rightY + 3); // Réduit de 4 à 3
    rightY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Adresse", rightColX, rightY);
    rightY += 4; // Réduit de 5 à 4
  }
  
  // Code postal et ville client
  if (quote.client?.billingPostalCode && quote.client?.billingCity) {
    doc.text("Code postal, Ville", rightColX, rightY);
    doc.text(`${quote.client.billingPostalCode} ${quote.client.billingCity}`, rightColX, rightY + 3); // Réduit de 4 à 3
    rightY += 6; // Réduit de 8 à 6
  } else {
    doc.text("Code postal, Ville", rightColX, rightY);
    rightY += 4; // Réduit de 5 à 4
  }
  
  // Pays client
  doc.text("Pays", rightColX, rightY);

  // ============================================
  // INTITULÉ DU DEVIS
  // ============================================
  const maxY = Math.max(leftY, rightY);
  yPos = maxY + 10; // Réduit de 18 à 10
  
  // Ligne de séparation
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3); // Ajusté
  
  doc.setFontSize(9); // Réduit de 10 à 9
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  
  // Intitulé avec le nom du chantier
  const intitule = quote.chantier?.name || quote.chantier?.description || quote.notes || "Motif ou présentation du devis";
  doc.text(`Intitulé : ${intitule}`, margin, yPos);
  yPos += 5; // Réduit de 8 à 5

  // ============================================
  // TABLEAU DES LIGNES
  // ============================================
  yPos += 3; // Réduit de 5 à 3
  
  // En-tête du tableau avec fond gris clair
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 3, contentWidth, 6, "F"); // Réduit de 8 à 6
  
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  const tableStartY = yPos;
  
  // Colonnes : Désignation, Qté, TVA, Prix HT, Montant TTC
  // Réorganiser avec des largeurs fixes pour un meilleur alignement
  // Largeur utilisable : 210mm - 2*25mm = 160mm
  const colDesignation = margin + 5;
  const colDesignationWidth = 60; // Largeur pour la description
  const colQte = colDesignation + colDesignationWidth + 3;
  const colQteWidth = 10; // Largeur pour la quantité
  const colTVA = colQte + colQteWidth + 3;
  const colTVAWidth = 12; // Largeur pour la TVA
  const colPrixHT = colTVA + colTVAWidth + 5; // Espacement entre TVA et Prix HT
  const colPrixHTWidth = 20; // Largeur pour Prix HT
  const colMontantTTC = colPrixHT + colPrixHTWidth + 6; // Espacement entre Prix HT et Montant TTC
  const colMontantTTCWidth = 25; // Largeur pour Montant TTC (aligné à droite)
  
  doc.text("Désignation", colDesignation, yPos);
  doc.text("Qté", colQte, yPos);
  doc.text("TVA", colTVA, yPos);
  doc.text("Prix HT", colPrixHT, yPos);
  // En-tête "Montant TTC" aligné à droite dans sa colonne
  doc.text("Montant TTC", colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
  
  // Ligne de séparation sous l'en-tête
  yPos += 2; // Réduit de 3 à 2
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4; // Réduit de 6 à 4
  
  doc.setFont(undefined, "normal");
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setTextColor(0, 0, 0);

  // Grouper par lots
  const linesByLot = (quote.lots || []).map(lot => ({
    lot,
    lines: (quote.lines || []).filter(l => l.lotId === lot.id),
  }));
  const linesWithoutLot = (quote.lines || []).filter(l => !l.lotId);

  // Lignes groupées par lots
  linesByLot.forEach(({ lot, lines }) => {
    if (lines.length === 0) return;
    
    // En-tête du lot
    doc.setFont(undefined, "bold");
    doc.text(lot.name, colDesignation, yPos);
    yPos += 4; // Réduit de 6 à 4
    doc.setFont(undefined, "normal");

    lines.forEach((line, index) => {
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, colDesignationWidth - 5);
      const lineHeight = Math.max(4, descriptionLines.length * 3.5); // Réduit de 6 et 4.5 à 4 et 3.5
      
      // Description avec numéro de ligne
      doc.setFont(undefined, "bold");
      const fullDescription = `Ligne n°${index + 1}\n${description}`;
      const fullDescriptionLines = doc.splitTextToSize(fullDescription, colDesignationWidth - 5);
      doc.text(fullDescriptionLines, colDesignation, yPos);
      doc.setFont(undefined, "normal");
      
      // Quantité (aligné à droite dans la colonne)
      const qtyText = (line.quantity || 0).toString();
      doc.text(qtyText, colQte + colQteWidth, yPos, { align: "right" });
      
      // TVA
      doc.text(formatVatRate(line.vatRate || "20"), colTVA, yPos);
      
      // Prix HT (aligné à droite dans la colonne)
      const prixHTText = formatCurrencyForPDF(line.unitPriceHT || 0);
      doc.text(prixHTText, colPrixHT + colPrixHTWidth, yPos, { align: "right" });
      
      // Montant TTC (aligné à droite dans la colonne)
      const montantTTCText = formatCurrencyForPDF(line.totalTTC || 0);
      doc.text(montantTTCText, colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
      
      // Ligne de séparation
      yPos += lineHeight;
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3; // Réduit de 4 à 3
    });
  });

  // Lignes sans lot
  if (linesWithoutLot.length > 0) {
    let lineNumber = 1;
    linesWithoutLot.forEach((line) => {
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, 85);
      const lineHeight = Math.max(4, descriptionLines.length * 3.5); // Réduit
      
      // Description avec numéro de ligne
      doc.setFont(undefined, "bold");
      const fullDescription = `Ligne n°${lineNumber}\n${description}`;
      const fullDescriptionLines = doc.splitTextToSize(fullDescription, 85);
      doc.text(fullDescriptionLines, colDesignation, yPos);
      doc.setFont(undefined, "normal");
      
      // Quantité (aligné à droite dans la colonne)
      const qtyText = (line.quantity || 0).toString();
      doc.text(qtyText, colQte + colQteWidth, yPos, { align: "right" });
      
      // TVA
      doc.text(formatVatRate(line.vatRate || "20"), colTVA, yPos);
      
      // Prix HT (aligné à droite dans la colonne)
      const prixHTText = formatCurrencyForPDF(line.unitPriceHT || 0);
      doc.text(prixHTText, colPrixHT + colPrixHTWidth, yPos, { align: "right" });
      
      // Montant TTC (aligné à droite dans la colonne)
      const montantTTCText = formatCurrencyForPDF(line.totalTTC || 0);
      doc.text(montantTTCText, colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
      
      // Ligne de séparation
      yPos += lineHeight;
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3; // Réduit de 4 à 3
      
      lineNumber++;
    });
  }

  // ============================================
  // TOTAUX DANS LE TABLEAU
  // ============================================
  yPos += 3; // Réduit de 5 à 3
  
  // Ligne de séparation avant les totaux
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4; // Réduit de 6 à 4
  
  // Sous-total HT (dans la colonne Prix HT)
  doc.text("Sous-total HT", colDesignation, yPos);
  doc.text(formatCurrencyForPDF(quote.subtotalHT || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });
  
  yPos += 4; // Réduit de 6 à 4
  
  // Total TVA (dans la colonne Prix HT)
  doc.text("Total TVA", colDesignation, yPos);
  doc.text(formatCurrencyForPDF(quote.totalTVA || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });
  
  yPos += 4; // Réduit de 6 à 4
  
  // Total TTC (en gras et plus grand, dans la colonne Montant TTC)
  // Le label "Total TTC" est légèrement décalé à gauche pour un meilleur alignement visuel
  doc.setFont(undefined, "bold");
  doc.setFontSize(9); // Réduit de 10 à 9
  doc.text("Total TTC", colDesignation + 5, yPos);
  doc.text(formatCurrencyForPDF(quote.totalTTC || 0), colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(8); // Réduit de 9 à 8

  // ============================================
  // CONDITIONS DE PAIEMENT
  // ============================================
  yPos += 10; // Réduit de 18 à 10
  
  doc.setFontSize(9); // Réduit de 10 à 9
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Conditions de paiement :", margin, yPos);
  yPos += 5; // Réduit de 7 à 5
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  if (quote.conditions?.paymentTerms) {
    const paymentLines = doc.splitTextToSize(quote.conditions.paymentTerms, contentWidth);
    doc.text(paymentLines, margin, yPos);
    yPos += paymentLines.length * 3.5; // Réduit de 4.5 à 3.5
  } else {
    doc.text("Paiement à réception de facture. Modes de paiement acceptés : virement bancaire, chèque. En cas de retard de paiement, des pénalités de retard seront appliquées au taux de 3 fois le taux d'intérêt légal.", margin, yPos);
    yPos += 4; // Réduit de 5 à 4
  }

  // ============================================
  // MOYENS DE PAIEMENT
  // ============================================
  yPos += 3; // Réduit de 5 à 3
  doc.setFontSize(9); // Réduit de 10 à 9
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Moyens de paiement :", margin, yPos);
  yPos += 5; // Réduit de 7 à 5
  doc.setFontSize(8); // Réduit de 9 à 8
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  
  // Utiliser les moyens de paiement sélectionnés dans les conditions
  let paymentMethodsText = "";
  
  if (quote.conditions?.paymentMethods && quote.conditions.paymentMethods.length > 0) {
    const methods = quote.conditions.paymentMethods.map(method => {
      if (method.toLowerCase().includes("virement") && quote.company?.iban) {
        return `Virement bancaire sur le compte : ${quote.company.iban}`;
      }
      return method;
    });
    paymentMethodsText = methods.join(", ");
  } else {
    // Par défaut, afficher les moyens de paiement courants
    const methods = [];
    if (quote.company?.iban) {
      methods.push(`Virement bancaire sur le compte : ${quote.company.iban}`);
    } else {
      methods.push("Virement bancaire");
    }
    methods.push("Chèque");
    methods.push("Espèces");
    paymentMethodsText = methods.join(", ");
  }
  
  doc.text(paymentMethodsText, margin, yPos);

  // ============================================
  // PIED DE PAGE (INFORMATIONS LÉGALES)
  // ============================================
  const footerY = pageHeight - 12; // Réduit de 18 à 12
  doc.setFontSize(6); // Réduit de 7 à 6
  doc.setFont(undefined, "normal");
  doc.setTextColor(100, 100, 100);
  
  // Ligne de séparation pour le footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5); // Ajusté
  
  const footerLines = [];
  if (quote.company?.name) {
    const capital = quote.company?.capital ? formatCurrencyForPDF(quote.company.capital) : "0,00 €";
    footerLines.push(`${quote.company.name} au capital de ${capital}`);
  }
  
  // Afficher le RCS seulement si la ville RCS est renseignée (pas de valeur par défaut)
  if (quote.company?.rcsCity && quote.company?.siret) {
    const siretFormatted = quote.company.siret.match(/.{1,3}/g)?.join(' ') || quote.company.siret;
    footerLines.push(`RCS ${quote.company.rcsCity} n° ${siretFormatted} - Numéro de TVA : ${quote.company.vatNumber || "FR 35 698 745 365"}`);
  } else if (quote.company?.vatNumber) {
    // Afficher seulement le numéro de TVA si pas de RCS mais qu'on a un numéro de TVA
    footerLines.push(`Numéro de TVA : ${quote.company.vatNumber}`);
  }
  
  if (quote.company?.insuranceDecennale?.company && quote.company?.insuranceDecennale?.policyNumber) {
    footerLines.push(`Assurance : ${quote.company.insuranceDecennale.company} - Police n° ${quote.company.insuranceDecennale.policyNumber}`);
  } else {
    footerLines.push("Assurance : XXX");
  }
  
  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerY + (index * 3), { align: "center" }); // Réduit de 3.5 à 3
  });

  return doc;
}

/**
 * Télécharge le PDF d'un devis
 */
export function downloadQuotePDF(quote: Quote): void {
  const doc = generateQuotePDF(quote);
  const fileName = `Devis_${quote.quoteNumber || quote.id}_${(quote.client?.name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}
