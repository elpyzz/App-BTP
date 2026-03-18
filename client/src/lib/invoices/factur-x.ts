import { PDFDocument, AFRelationship } from "pdf-lib";
import type { Invoice } from "./types";
import type { Company } from "@/lib/quotes/types";
import { generateInvoicePDF } from "./pdf-generator";

const NS = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";
const NS_QDT = "urn:un:unece:uncefact:data:standard:QualifiedDataType:100";
const NS_UDT = "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100";
const NS_RAM = "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100";

function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateYmd(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Construit le XML Factur-X EN 16931 profil MINIMUM à partir d'une Invoice.
 * Toute donnée manquante est remplacée par "" pour ne pas faire planter.
 */
function buildFacturXXml(invoice: Invoice): string {
  const company = invoice.company ?? ({} as Invoice["company"]);
  const client = invoice.client ?? ({} as Invoice["client"]);
  const sellerName = escapeXml(company.name ?? "");
  const sellerId = escapeXml(company.siret ?? "");
  const buyerName = escapeXml(client.name ?? "");
  const invoiceNumber = escapeXml(invoice.invoiceNumber ?? "");
  const issueDate = formatDateYmd(invoice.issueDate ?? "");
  const dueDate = formatDateYmd(invoice.dueDate ?? "");
  const totalHT = Number(invoice.totalHT) || 0;
  const totalTVA = Number(invoice.totalTVA) || 0;
  const totalTTC = Number(invoice.totalTTC) || 0;
  const specialVatMention = escapeXml(invoice.specialVatMention ?? "");

  const noteXml = specialVatMention
    ? `<ram:IncludedNote><ram:Content>${specialVatMention}</ram:Content></ram:IncludedNote>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="${NS}" xmlns:ram="${NS_RAM}" xmlns:udt="${NS_UDT}" xmlns:qdt="${NS_QDT}">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoiceNumber}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issueDate}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${sellerName}</ram:Name>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
        ${sellerId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="0002">${sellerId}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${noteXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>${totalHT.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totalTVA.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalTTC.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalTTC.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

async function getPdfArrayBuffer(doc: Awaited<ReturnType<typeof generateInvoicePDF>>): Promise<ArrayBuffer> {
  const blob = doc.output("blob");
  return blob.arrayBuffer();
}

/**
 * Génère un PDF Factur-X (PDF visuel + XML embarqué) à partir d'une Invoice.
 * Retourne le binaire du PDF. En cas d'erreur, la fonction lance pour que l'appelant puisse faire fallback.
 */
export async function generateFacturX(invoice: Invoice, companyOverrides?: Partial<Company>): Promise<Uint8Array> {
  const doc = await generateInvoicePDF(invoice, companyOverrides);
  const pdfArrayBuffer = await getPdfArrayBuffer(doc);
  const xmlString = buildFacturXXml(invoice);
  const xmlBytes = new TextEncoder().encode(xmlString);

  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  await pdfDoc.attach(xmlBytes, "factur-x.xml", {
    mimeType: "application/xml",
    afRelationship: AFRelationship.Alternative,
  });

  const bytes = await pdfDoc.save();
  return bytes;
}
