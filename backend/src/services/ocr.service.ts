import path from 'path';
import { PayslipFields } from '../models/payslip.model';
import { logger } from '../utils/logger';

const LLM_URL   = process.env.LLM_API_URL  || 'https://llm-wrapper-741152993481.asia-south1.run.app';
const LLM_TOKEN = process.env.LLM_API_TOKEN || '';

export interface OcrResult {
  raw: string;
  fields: PayslipFields;
  confidence: number;
  missingFields: string[];
  month: string;
}

// ── LLM response shape (same multi-variant parser as llm.service.ts) ──────────
interface LlmContentBlock { type: string; text?: string; }
interface LlmRawResponse {
  content?:  LlmContentBlock[] | string;
  text?:     string;
  response?: string;
  result?:   string;
  choices?:  Array<{ message?: { content?: string }; text?: string }>;
}

function extractLlmText(data: LlmRawResponse): string {
  if (Array.isArray(data.content)) {
    const t = data.content.filter(b => b.type === 'text' && b.text).map(b => b.text!).join('\n').trim();
    if (t) return t;
  }
  if (typeof data.content  === 'string' && data.content.trim())  return data.content.trim();
  if (typeof data.text     === 'string' && data.text.trim())     return data.text.trim();
  if (typeof data.response === 'string' && data.response.trim()) return data.response.trim();
  if (typeof data.result   === 'string' && data.result.trim())   return data.result.trim();
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const t = data.choices[0].message?.content ?? data.choices[0].text ?? '';
    if (t.trim()) return t.trim();
  }
  return '';
}

// ── Prompt sent to the LLM for payslip extraction ─────────────────────────────
const EXTRACTION_PROMPT = `
You are a payslip data extraction engine. Analyse the attached payslip document and extract ALL salary fields.

Return ONLY a valid JSON object — no markdown, no explanation, no extra text — with exactly these keys (use 0 for any field not found):

{
  "basicSalary": 0,
  "hra": 0,
  "lta": 0,
  "specialAllowance": 0,
  "medicalAllowance": 0,
  "conveyanceAllowance": 0,
  "otherAllowances": 0,
  "grossEarnings": 0,
  "providentFund": 0,
  "professionalTax": 0,
  "incomeTaxTds": 0,
  "otherDeductions": 0,
  "totalDeductions": 0,
  "netPay": 0,
  "reimbursements": 0,
  "ytdGross": 0,
  "ytdTds": 0,
  "ytdNetPay": 0,
  "month": "",
  "workingDays": 0,
  "lopDays": 0
}

Rules:
- All monetary values must be plain numbers (no ₹, commas, or currency symbols).
- "month" must be in YYYY-MM format (e.g. "2024-11"). Extract from the payslip date.
- If gross earnings is not printed but components are present, sum them up.
- If total deductions is not printed, sum PF + professional tax + TDS + other deductions.
- If net pay is not printed, compute gross - total deductions + reimbursements.
- Return ONLY the JSON object. No other text.
`.trim();

// ── MIME → LLM body builder ───────────────────────────────────────────────────
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
const IMAGE_MIMES = new Set<string>(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function buildLlmBody(
  base64: string,
  mimeType: string,
  prompt: string
): Record<string, unknown> {
  if (mimeType === 'application/pdf') {
    return { prompt, pdfBase64: base64 };
  }
  if (IMAGE_MIMES.has(mimeType)) {
    return { prompt, imageBase64: base64, imageMediaType: mimeType as ImageMediaType };
  }
  // Fallback — treat as PDF
  return { prompt, pdfBase64: base64 };
}

// ── Call the LLM wrapper ──────────────────────────────────────────────────────
async function callLlmForExtraction(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const base64 = fileBuffer.toString('base64');
  const body   = buildLlmBody(base64, mimeType, EXTRACTION_PROMPT);

  const res = await fetch(`${LLM_URL}/llm/query`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${LLM_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM extraction API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as LlmRawResponse;
  logger.debug('LLM extraction response keys: ' + Object.keys(data).join(', '));
  return extractLlmText(data);
}

// ── Parse the JSON the LLM returned into PayslipFields ───────────────────────
function parseExtractedJson(raw: string, fallbackMonth: string): {
  fields: PayslipFields;
  missingFields: string[];
} {
  // Strip markdown fences if the model wrapped the JSON anyway
  const cleaned = raw.replace(/```json|```/gi, '').trim();

  let parsed: Partial<PayslipFields> = {};
  try {
    parsed = JSON.parse(cleaned) as Partial<PayslipFields>;
  } catch {
    logger.warn('LLM returned non-JSON for payslip extraction: ' + raw.slice(0, 200));
    // Return zeroed fields; missingFields will flag everything important
  }

  const n = (key: keyof PayslipFields) =>
    typeof parsed[key] === 'number' ? (parsed[key] as number) : 0;

  const s = (key: keyof PayslipFields) =>
    typeof parsed[key] === 'string' ? (parsed[key] as string) : '';

  // Resolve month: prefer extracted, fall back to caller's value
  const month = (s('month') || fallbackMonth).trim();

  // Compute derived fields if missing
  const basicSalary         = n('basicSalary');
  const hra                 = n('hra');
  const lta                 = n('lta');
  const specialAllowance    = n('specialAllowance');
  const medicalAllowance    = n('medicalAllowance');
  const conveyanceAllowance = n('conveyanceAllowance');
  const otherAllowances     = n('otherAllowances');
  const reimbursements      = n('reimbursements');

  const grossEarnings = n('grossEarnings') ||
    (basicSalary + hra + lta + specialAllowance + medicalAllowance + conveyanceAllowance + otherAllowances);

  const providentFund   = n('providentFund');
  const professionalTax = n('professionalTax');
  const incomeTaxTds    = n('incomeTaxTds');
  const otherDeductions = n('otherDeductions');

  const totalDeductions = n('totalDeductions') ||
    (providentFund + professionalTax + incomeTaxTds + otherDeductions);

  const netPay = n('netPay') || (grossEarnings - totalDeductions + reimbursements);

  const fields: PayslipFields = {
    basicSalary,
    hra,
    lta,
    specialAllowance,
    medicalAllowance,
    conveyanceAllowance,
    otherAllowances,
    grossEarnings,
    providentFund,
    professionalTax,
    incomeTaxTds,
    otherDeductions,
    totalDeductions,
    netPay,
    reimbursements,
    ytdGross:   n('ytdGross'),
    ytdTds:     n('ytdTds'),
    ytdNetPay:  n('ytdNetPay'),
    month,
    workingDays: n('workingDays') || 22,
    lopDays:     n('lopDays'),
  };

  // Detect genuinely missing critical fields
  const missingFields: string[] = [];
  if (!fields.basicSalary)   missingFields.push('basicSalary');
  if (!fields.grossEarnings) missingFields.push('grossEarnings');
  if (!fields.netPay)        missingFields.push('netPay');

  return { fields, missingFields };
}

// ── Resolve month from filename (fallback when LLM returns empty month) ────────
function resolveMonthFromFilename(fileName: string): string {
  const match = fileName.match(/(\d{4})[_\-](\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Infer MIME type from filename extension ────────────────────────────────────
function inferMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    '.pdf':  'application/pdf',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
  };
  return map[ext] ?? 'application/pdf';
}

// ── Public service ─────────────────────────────────────────────────────────────
export class OcrService {
  async extractPayslip(
    fileBuffer: Buffer,
    fileName: string,
    month?: string
  ): Promise<OcrResult> {
    const fallbackMonth = month || resolveMonthFromFilename(fileName);
    const mimeType      = inferMimeType(fileName);

    if (!LLM_TOKEN) {
      logger.warn('LLM_API_TOKEN not set — returning mock payslip extraction');
      return this.mockExtraction(fallbackMonth);
    }

    logger.info(`Extracting payslip via LLM API (${mimeType}, ${(fileBuffer.length / 1024).toFixed(1)} KB)`);

    const rawText = await callLlmForExtraction(fileBuffer, mimeType);
    logger.debug('LLM extraction raw text: ' + rawText.slice(0, 300));

    const { fields, missingFields } = parseExtractedJson(rawText, fallbackMonth);

    // Confidence: 1.0 if all critical fields present, lower if missing
    const confidence = missingFields.length === 0 ? 0.97 : Math.max(0.6, 0.97 - missingFields.length * 0.12);

    return {
      raw:  rawText,
      fields,
      confidence,
      missingFields,
      month: fields.month,
    };
  }

  /** Used when LLM_API_TOKEN is absent (dev/test without credentials) */
  private mockExtraction(month: string): OcrResult {
    const v = () => Math.floor((Math.random() - 0.5) * 500);
    const basicSalary         = 45000 + v();
    const hra                 = Math.round(basicSalary * 0.4);
    const lta                 = 2500;
    const specialAllowance    = 12000 + v();
    const medicalAllowance    = 1250;
    const conveyanceAllowance = 1600;
    const otherAllowances     = 500;
    const reimbursements      = 3000;
    const grossEarnings       = basicSalary + hra + lta + specialAllowance + medicalAllowance + conveyanceAllowance + otherAllowances;
    const providentFund       = Math.round(basicSalary * 0.12);
    const professionalTax     = 200;
    const incomeTaxTds        = Math.round(grossEarnings * 0.08);
    const totalDeductions     = providentFund + professionalTax + incomeTaxTds;
    const netPay              = grossEarnings - totalDeductions + reimbursements;

    const fields: PayslipFields = {
      basicSalary, hra, lta, specialAllowance, medicalAllowance,
      conveyanceAllowance, otherAllowances, grossEarnings,
      providentFund, professionalTax, incomeTaxTds,
      otherDeductions: 0, totalDeductions, netPay, reimbursements,
      ytdGross: grossEarnings * 6, ytdTds: incomeTaxTds * 6, ytdNetPay: netPay * 6,
      month, workingDays: 22, lopDays: 0,
    };

    return { raw: '[MOCK] LLM_API_TOKEN not set', fields, confidence: 0.95, missingFields: [], month };
  }
}

export const ocrService = new OcrService();