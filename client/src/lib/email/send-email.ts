import { generateQuotePDF } from '@/lib/quotes/pdf-generator';
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator';
import { Quote } from '@/lib/quotes/types';
import { Invoice } from '@/lib/invoices/types';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  pdfBase64: string;
  pdfFileName: string;
}

export async function sendQuoteByEmail(
  quote: Quote,
  recipientEmail: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Générer le PDF
    const pdfDoc = generateQuotePDF(quote);
    const pdfBlob = pdfDoc.output('blob');
    
    // Convertir en base64
    const pdfBase64 = await blobToBase64(pdfBlob);
    const fileName = `Devis_${quote.quoteNumber || quote.id}_${(quote.client?.name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    
    // Préparer le message
    const subject = `Devis ${quote.quoteNumber || quote.id} - ${quote.company?.name || 'Votre entreprise'}`;
    const body = customMessage || `Bonjour,\n\nVeuillez trouver ci-joint le devis ${quote.quoteNumber || quote.id}.\n\nCordialement,\n${quote.company?.name || ''}`;
    
    // Envoyer via l'API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        body,
        pdfBase64,
        pdfFileName: fileName,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi du devis par email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function sendInvoiceByEmail(
  invoice: Invoice,
  recipientEmail: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Générer le PDF
    const pdfDoc = generateInvoicePDF(invoice);
    const pdfBlob = pdfDoc.output('blob');
    
    // Convertir en base64
    const pdfBase64 = await blobToBase64(pdfBlob);
    const fileName = `Facture_${invoice.invoiceNumber || invoice.id}_${(invoice.client?.name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    
    // Préparer le message
    const subject = `Facture ${invoice.invoiceNumber || invoice.id} - ${invoice.company?.name || 'Votre entreprise'}`;
    const body = customMessage || `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoice.invoiceNumber || invoice.id}.\n\nCordialement,\n${invoice.company?.name || ''}`;
    
    // Envoyer via l'API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        body,
        pdfBase64,
        pdfFileName: fileName,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la facture par email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Helper pour convertir Blob en base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
