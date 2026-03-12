import jsPDF from "jspdf";
import { Quote, Company } from "./types";
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
 * Charge l'image du logo depuis le serveur public (fallback si pas de logo company)
 */
async function loadLogoImage(): Promise<string | null> {
  try {
    const response = await fetch('/logo.jpg');
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Impossible de charger le logo:', error);
    return null;
  }
}

/** Retourne le type MIME pour jsPDF (JPEG ou PNG) à partir d'un data URL base64 */
function getImageTypeFromDataUrl(dataUrl: string): 'JPEG' | 'PNG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

/**
 * Génère un PDF professionnel pour un devis selon le modèle fourni.
 * companyOverrides : signature/logo à jour (company actuelle) pour afficher la signature de l'artisan même si le devis a été créé avant.
 */
export async function generateQuotePDF(quote: Quote, companyOverrides?: Partial<Company>): Promise<jsPDF> {
  // Fusionner la company du devis avec les overrides (signature/logo à jour), ou utiliser les overrides seuls si le devis n'a pas de company
  const companyForPdf = companyOverrides
    ? (quote.company ? { ...quote.company, ...companyOverrides } : (companyOverrides as Company))
    : quote.company;
  const quoteForPdf: Quote = companyForPdf ? { ...quote, company: companyForPdf } : quote;

  const doc = new jsPDF();
  let yPos = 20;

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const accentColor = [245, 158, 11]; // Ambre RGB (#F59E0B)

  // ============================================
  // EN-TÊTE AVEC LOGO ET NUMÉRO DEVIS
  // ============================================
  // Bande colorée en haut
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo à gauche dans la bande (priorité : logo company, sinon /logo.jpg)
  const logoSize = 15;
  const logoX = margin;
  const logoY = 6;
  const logoFromCompany = quoteForPdf.company?.logo;
  const logoImage = typeof logoFromCompany === 'string' && logoFromCompany.startsWith('data:')
    ? logoFromCompany
    : await loadLogoImage();
  
  if (logoImage) {
    try {
      const format = getImageTypeFromDataUrl(logoImage);
      doc.addImage(logoImage, format, logoX, logoY, logoSize, logoSize * 1.15);
    } catch (error) {
      console.warn('Erreur lors de l\'ajout de l\'image du logo:', error);
      // Fallback sur le carré ambre avec initiale
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(logoX, logoY, logoSize, logoSize, "F");
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      const companyInitial = quoteForPdf.company?.name?.charAt(0).toUpperCase() || "C";
      doc.text(companyInitial, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" });
    }
  } else {
    // Fallback : carré ambre avec initiale
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(logoX, logoY, logoSize, logoSize, "F");
    doc.setFontSize(12); // Réduit de 14 à 12
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    const companyInitial = quoteForPdf.company?.name?.charAt(0).toUpperCase() || "C";
    doc.text(companyInitial, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" });
  }
  
  // Nom de l'entreprise à côté du logo (blanc sur bande ambre)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  const companyName = (quoteForPdf.company?.name || "VOTRE ENTREPRISE").toLowerCase();
  const maxCompanyNameWidth = pageWidth / 2 - logoX - logoSize - 8;
  const companyNameLines = doc.splitTextToSize(companyName, maxCompanyNameWidth);
  doc.text(companyNameLines, logoX + logoSize + 8, logoY + logoSize / 2 + 2);

  // Numéro de devis à droite (blanc, plus grand)
  const rightX = pageWidth - margin;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Devis n° ${quoteForPdf.quoteNumber || "N/A"}`, rightX, logoY + 4, { align: "right" });

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(220, 220, 220);
  doc.text(`Date d'émission : ${new Date(quoteForPdf.issueDate).toLocaleDateString("fr-FR")}`, rightX, logoY + 10, { align: "right" });
  doc.text(`Date d'expiration : ${new Date(quoteForPdf.expirationDate).toLocaleDateString("fr-FR")}`, rightX, logoY + 14, { align: "right" });

  // Repartir sous la bande
  yPos = 35;

  // ============================================
  // SECTION ENTREPRISE / CLIENT (DEUX COLONNES)
  // ============================================
  yPos += 12;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const leftColX = margin;
  const rightColX = pageWidth / 2 + 15;
  const colWidth = (pageWidth - 2 * margin - 30) / 2;

  // --- Calcul de la hauteur nécessaire pour chaque colonne ---
  let leftLines = 1; // nom entreprise
  if (quoteForPdf.company?.address) leftLines++;
  if (quoteForPdf.company?.postalCode && quoteForPdf.company?.city) leftLines++;
  leftLines++; // pays
  if (quoteForPdf.company?.phone) leftLines++;
  if (quoteForPdf.company?.website) leftLines++;
  if (quoteForPdf.company?.email) leftLines++;
  if (quoteForPdf.company?.rcsCity && quoteForPdf.company?.siret) leftLines++;
  if (quoteForPdf.company?.capital && quoteForPdf.company.capital > 0) leftLines++;

  let rightLines = 1; // nom client
  if (quoteForPdf.client?.billingAddress) rightLines++;
  if (quoteForPdf.client?.billingPostalCode && quoteForPdf.client?.billingCity) rightLines++;
  rightLines++; // pays
  if (quoteForPdf.client?.phone) rightLines++;
  if (quoteForPdf.client?.email) rightLines++;

  const lineHeightCoord = 5;
  const boxPaddingV = 8;
  const maxLines = Math.max(leftLines, rightLines);
  const dynamicBoxHeight = maxLines * lineHeightCoord + boxPaddingV + 4;

  doc.setFillColor(248, 248, 248);
  doc.rect(leftColX - 4, yPos - 6, colWidth + 4, dynamicBoxHeight, "F");
  doc.rect(rightColX - 2, yPos - 6, colWidth + 4, dynamicBoxHeight, "F");

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text("VOS COORDONNÉES", leftColX, yPos - 2);
  doc.text("COORDONNÉES CLIENT", rightColX, yPos - 2);

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quoteForPdf.company?.name || "VOTRE ENTREPRISE", leftColX, yPos + 3);

  let leftY = yPos + 8;
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);

  if (quoteForPdf.company?.address) {
    doc.text(quoteForPdf.company.address, leftColX, leftY);
    leftY += 5;
  }
  if (quoteForPdf.company?.postalCode && quoteForPdf.company?.city) {
    doc.text(`${quoteForPdf.company.postalCode} ${quoteForPdf.company.city}`, leftColX, leftY);
    leftY += 5;
  }
  doc.text(quoteForPdf.company?.country || "France", leftColX, leftY);
  leftY += 5;
  if (quoteForPdf.company?.phone) {
    doc.text(quoteForPdf.company.phone, leftColX, leftY);
    leftY += 5;
  }
  if (quoteForPdf.company?.website) {
    doc.text(quoteForPdf.company.website, leftColX, leftY);
    leftY += 5;
  }
  if (quoteForPdf.company?.email) {
    doc.text(quoteForPdf.company.email, leftColX, leftY);
    leftY += 5;
  }
  if (quoteForPdf.company?.rcsCity && quoteForPdf.company?.siret) {
    const siretFormatted = quoteForPdf.company.siret.match(/.{1,3}/g)?.join(' ') || quoteForPdf.company.siret;
    doc.text(`RCS ${quoteForPdf.company.rcsCity} n° ${siretFormatted}`, leftColX, leftY);
    leftY += 5;
  }
  if (quoteForPdf.company?.capital && quoteForPdf.company.capital > 0) {
    doc.text(formatCurrencyForPDF(quoteForPdf.company.capital), leftColX, leftY);
    leftY += 5;
  }

  // Colonne droite - Client
  let rightY = yPos + 8;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quoteForPdf.client?.name || "Nom du client", rightColX, yPos + 3);

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);

  if (quoteForPdf.client?.billingAddress) {
    doc.text(quoteForPdf.client.billingAddress, rightColX, rightY);
    rightY += 5;
  }
  if (quoteForPdf.client?.billingPostalCode && quoteForPdf.client?.billingCity) {
    doc.text(`${quoteForPdf.client.billingPostalCode} ${quoteForPdf.client.billingCity}`, rightColX, rightY);
    rightY += 5;
  }
  doc.text(quoteForPdf.client?.billingCountry || "France", rightColX, rightY);
  rightY += 5;
  if (quoteForPdf.client?.phone) {
    doc.text(quoteForPdf.client.phone, rightColX, rightY);
    rightY += 5;
  }
  if (quoteForPdf.client?.email) {
    doc.text(quoteForPdf.client.email, rightColX, rightY);
    rightY += 5;
  }

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
  const intitule = quoteForPdf.chantier?.name || quoteForPdf.chantier?.description || quoteForPdf.notes || "Motif ou présentation du devis";
  doc.text(`Intitulé : ${intitule}`, margin, yPos);
  yPos += 5; // Réduit de 8 à 5

  // ============================================
  // TABLEAU DES LIGNES
  // ============================================
  yPos += 3; // Réduit de 5 à 3
  
  // En-tête du tableau avec fond accent
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, yPos - 4, contentWidth, 8, "F");

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255, 255, 255);
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
  yPos += 4;

  doc.setFont(undefined, "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // Grouper par lots
  const linesByLot = (quoteForPdf.lots || []).map(lot => ({
    lot,
    lines: (quoteForPdf.lines || []).filter(l => l.lotId === lot.id),
  }));
  const linesWithoutLot = (quoteForPdf.lines || []).filter(l => !l.lotId);

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
      const lineHeight = Math.max(4, descriptionLines.length * 3.5);

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 3, contentWidth, lineHeight + 3, "F");
      }

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
    linesWithoutLot.forEach((line, index) => {
      const description = line.description || "";
      const descriptionLines = doc.splitTextToSize(description, 85);
      const lineHeight = Math.max(4, descriptionLines.length * 3.5);

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 3, contentWidth, lineHeight + 3, "F");
      }

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
  doc.text(formatCurrencyForPDF(quoteForPdf.subtotalHT || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });
  
  yPos += 4; // Réduit de 6 à 4
  
  // Total TVA (dans la colonne Prix HT)
  doc.text("Total TVA", colDesignation, yPos);
  doc.text(formatCurrencyForPDF(quoteForPdf.totalTVA || 0), colPrixHT + colPrixHTWidth, yPos, { align: "right" });

  yPos += 4;
  yPos += 2;

  // Total TTC — fond ambre sur toute la largeur (label + montant sur le fond)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, yPos - 4, contentWidth, 10, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Total TTC", colDesignation + 5, yPos);
  doc.text(formatCurrencyForPDF(quoteForPdf.totalTTC || 0), colMontantTTC + colMontantTTCWidth, yPos, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  doc.setFontSize(8);

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
  
  if (quoteForPdf.conditions?.paymentTerms) {
    const paymentLines = doc.splitTextToSize(quoteForPdf.conditions.paymentTerms, contentWidth);
    doc.text(paymentLines, margin, yPos);
    yPos += paymentLines.length * 3.5; // Réduit de 4.5 à 3.5
  } else {
    // Texte par défaut amélioré avec mention d'acompte
    doc.text("Acompte à la commande (30% recommandé). Solde à réception des travaux. Modes de paiement acceptés : virement bancaire, chèque. En cas de retard de paiement, des pénalités de retard seront appliquées au taux de 3 fois le taux d'intérêt légal.", margin, yPos);
    yPos += 5; // Ajusté pour le texte plus long
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
  
  if (quoteForPdf.conditions?.paymentMethods && quoteForPdf.conditions.paymentMethods.length > 0) {
    const methods = quoteForPdf.conditions.paymentMethods.map(method => {
      if (method.toLowerCase().includes("virement") && quoteForPdf.company?.iban) {
        return `Virement bancaire sur le compte : ${quoteForPdf.company.iban}`;
      }
      return method;
    });
    paymentMethodsText = methods.join(", ");
  } else {
    // Par défaut, afficher les moyens de paiement courants
    const methods = [];
    if (quoteForPdf.company?.iban) {
      methods.push(`Virement bancaire sur le compte : ${quoteForPdf.company.iban}`);
    } else {
      methods.push("Virement bancaire");
    }
    methods.push("Chèque");
    methods.push("Espèces");
    paymentMethodsText = methods.join(", ");
  }

  const paymentMethodsLines = doc.splitTextToSize(paymentMethodsText, contentWidth);
  doc.text(paymentMethodsLines, margin, yPos);
  yPos += (paymentMethodsLines.length - 1) * 3.5;

  // ============================================
  // BLOC SIGNATURE (ARTISAN + CLIENT)
  // ============================================
  yPos += 8;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;
  
  // Calculer les positions des colonnes
  const signatureColWidth = (pageWidth - 2 * margin) / 2;
  const signatureLeftColX = margin;
  const signatureRightColX = margin + signatureColWidth;
  const signatureStartY = yPos;
  const signatureBlockHeight = 58;

  doc.setFillColor(248, 248, 248);
  doc.rect(signatureLeftColX - 2, signatureStartY - 4, signatureColWidth - 8, signatureBlockHeight, "F");
  doc.rect(signatureRightColX - 2, signatureStartY - 4, signatureColWidth - 8, signatureBlockHeight, "F");
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(signatureLeftColX - 2, signatureStartY - 4, signatureColWidth - 8, signatureBlockHeight, "S");
  doc.rect(signatureRightColX - 2, signatureStartY - 4, signatureColWidth - 8, signatureBlockHeight, "S");

  // Colonne gauche : Signature de l'artisan
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Signature de l'artisan", signatureLeftColX, yPos);
  yPos += 8;
  
  // Image de signature (si disponible)
  if (quoteForPdf.company?.signature) {
    try {
      // Calculer la taille de l'image (max 70px de hauteur, max 200px de largeur)
      const maxHeight = 25; // ~70px en mm
      const maxWidth = 70; // ~200px en mm
      
      // Charger l'image depuis le base64
      const signatureImage = quoteForPdf.company.signature;
      doc.addImage(signatureImage, 'PNG', signatureLeftColX, yPos, maxWidth, maxHeight);
      yPos += maxHeight + 5;
    } catch (error) {
      console.warn('Erreur lors de l\'ajout de la signature:', error);
      // Afficher une ligne vide si l'image ne peut pas être chargée
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(signatureLeftColX, yPos + 10, signatureLeftColX + 60, yPos + 10);
      yPos += 20;
    }
  } else {
    // Ligne vide si pas de signature
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(signatureLeftColX, yPos + 10, signatureLeftColX + 60, yPos + 10);
    yPos += 20;
  }
  
  // Nom de l'artisan (utiliser le nom de l'entreprise ou un placeholder)
  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  const artisanName = quoteForPdf.company?.name || "Nom de l'artisan";
  doc.text(artisanName, signatureLeftColX, yPos);
  yPos += 4;

  // Date de génération
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Date : ${new Date(quoteForPdf.issueDate).toLocaleDateString("fr-FR")}`, signatureLeftColX, yPos);
  
  // Colonne droite : Bon pour accord client
  yPos = signatureStartY;
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Bon pour accord", signatureRightColX, yPos);
  yPos += 6;
  
  doc.setFontSize(8);
  doc.setFont(undefined, "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Lu et approuvé", signatureRightColX, yPos);
  yPos += 10;
  
  // Ligne signature client
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Signature :", signatureRightColX, yPos);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(signatureRightColX + 25, yPos - 2, signatureRightColX + signatureColWidth - 5, yPos - 2);
  yPos += 12;
  
  // Ligne date client
  doc.text("Date :", signatureRightColX, yPos);
  doc.line(signatureRightColX + 15, yPos - 2, signatureRightColX + signatureColWidth - 5, yPos - 2);
  
  // Ajuster yPos pour le pied de page
  yPos = Math.max(yPos + 10, signatureStartY + signatureBlockHeight);

  // ============================================
  // PIED DE PAGE (INFORMATIONS LÉGALES)
  // ============================================
  const footerY = pageHeight - 12;
  doc.setFillColor(40, 40, 40);
  doc.rect(0, footerY - 8, pageWidth, 20, "F");
  doc.setFontSize(6);
  doc.setFont(undefined, "normal");
  doc.setTextColor(180, 180, 180);

  const footerLines = [];
  if (quoteForPdf.company?.name) {
    // Afficher le capital seulement s'il est > 0
    if (quoteForPdf.company?.capital && quoteForPdf.company.capital > 0) {
      const capital = formatCurrencyForPDF(quoteForPdf.company.capital);
      footerLines.push(`${quoteForPdf.company.name} au capital de ${capital}`);
    } else {
      footerLines.push(quoteForPdf.company.name);
    }
  }
  
  // Afficher le RCS seulement si la ville RCS est renseignée (pas de valeur par défaut)
  if (quoteForPdf.company?.rcsCity && quoteForPdf.company?.siret) {
    const siretFormatted = quoteForPdf.company.siret.match(/.{1,3}/g)?.join(' ') || quoteForPdf.company.siret;
    if (quoteForPdf.company?.vatNumber) {
      footerLines.push(`RCS ${quoteForPdf.company.rcsCity} n° ${siretFormatted} - Numéro de TVA : ${quoteForPdf.company.vatNumber}`);
    } else {
      footerLines.push(`RCS ${quoteForPdf.company.rcsCity} n° ${siretFormatted}`);
    }
  } else if (quoteForPdf.company?.vatNumber) {
    // Afficher seulement le numéro de TVA si pas de RCS mais qu'on a un numéro de TVA
    footerLines.push(`Numéro de TVA : ${quoteForPdf.company.vatNumber}`);
  }
  
  if (quoteForPdf.company?.insuranceDecennale?.company && quoteForPdf.company?.insuranceDecennale?.policyNumber) {
    footerLines.push(`Assurance : ${quoteForPdf.company.insuranceDecennale.company} - Police n° ${quoteForPdf.company.insuranceDecennale.policyNumber}`);
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
export async function downloadQuotePDF(quote: Quote, companyOverrides?: Partial<Company>): Promise<void> {
  const doc = await generateQuotePDF(quote, companyOverrides);
  const fileName = `Devis_${quote.quoteNumber || quote.id}_${(quote.client?.name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}

/**
 * Génère le PDF d'un devis en base64 pour l'envoi à SignWell
 */
export async function generateQuotePDFBase64(quote: Quote, companyOverrides?: Partial<Company>): Promise<string> {
  const doc = await generateQuotePDF(quote, companyOverrides);
  return doc.output('datauristring').split(',')[1]; // Retourne seulement la partie base64
}