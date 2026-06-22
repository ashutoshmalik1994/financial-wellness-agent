import { PayslipFields } from '../models/payslip.model';
import { TaxDeclaration } from '../models/payroll.model';
import { logger } from '../utils/logger';

const LLM_URL = process.env.LLM_API_URL || 'https://llm-wrapper-741152993481.asia-south1.run.app';
const LLM_TOKEN = process.env.LLM_API_TOKEN || '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// The llm-wrapper may return different shapes. Handle all known variants.
interface LlmContentBlock {
  type: string;
  text?: string;
}

interface LlmResponse {
  // Anthropic-style: { content: [{type:'text', text:'...'}] }
  content?: LlmContentBlock[] | string;
  // Simple wrapper: { text: '...' } or { response: '...' } or { result: '...' }
  text?: string;
  response?: string;
  result?: string;
  // OpenAI-style: { choices: [{message:{content:'...'}}] }
  choices?: Array<{ message?: { content?: string }; text?: string }>;
}

/**
 * Extracts assistant text from any known LLM wrapper response shape.
 */
function extractText(data: LlmResponse): string {
  // 1. Anthropic content array: [{type:'text', text:'...'}]
  if (Array.isArray(data.content)) {
    const text = data.content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text!)
      .join('\n')
      .trim();
    if (text) return text;
  }

  // 2. content is already a plain string
  if (typeof data.content === 'string' && data.content.trim()) {
    return data.content.trim();
  }

  // 3. { text: '...' }
  if (typeof data.text === 'string' && data.text.trim()) {
    return data.text.trim();
  }

  // 4. { response: '...' }
  if (typeof data.response === 'string' && data.response.trim()) {
    return data.response.trim();
  }

  // 5. { result: '...' }
  if (typeof data.result === 'string' && data.result.trim()) {
    return data.result.trim();
  }

  // 6. OpenAI-style: { choices: [{message:{content:'...'}}] }
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    const text = choice.message?.content ?? choice.text ?? '';
    if (text.trim()) return text.trim();
  }

  logger.warn('LLM response did not match any known shape: ' + JSON.stringify(data).slice(0, 300));
  return 'I was unable to generate a response. Please try again.';
}

async function callLlm(prompt: string, traceId?: string): Promise<string> {
  if (!LLM_TOKEN) {
    logger.warn('LLM_API_TOKEN not set – returning mock response');
    return `[MOCK AI RESPONSE] I analyzed your payslip data. ${prompt.slice(0, 100)}... (Configure LLM_API_TOKEN for real AI responses.)`;
  }

  const body: Record<string, unknown> = { prompt };
  if (traceId) body.metadata = { client: 'financial-wellness-agent', traceId };

  const res = await fetch(`${LLM_URL}/llm/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as LlmResponse;
  logger.debug('LLM response keys: ' + Object.keys(data).join(', '));

  return extractText(data);
}

// ── System context builder ────────────────────────────────────────────────────

function buildPayslipContext(fields: PayslipFields): string {
  return `
PAYSLIP DATA (${fields.month}):
Earnings: Basic=₹${fields.basicSalary}, HRA=₹${fields.hra}, LTA=₹${fields.lta}, Special Allowance=₹${fields.specialAllowance}, Medical=₹${fields.medicalAllowance}, Conveyance=₹${fields.conveyanceAllowance}, Others=₹${fields.otherAllowances}, Reimbursements=₹${fields.reimbursements}
Gross Earnings: ₹${fields.grossEarnings}
Deductions: PF=₹${fields.providentFund}, Prof Tax=₹${fields.professionalTax}, TDS=₹${fields.incomeTaxTds}, Others=₹${fields.otherDeductions}
Total Deductions: ₹${fields.totalDeductions}
Net Pay: ₹${fields.netPay}
YTD: Gross=₹${fields.ytdGross}, TDS=₹${fields.ytdTds}, Net=₹${fields.ytdNetPay}
Working Days: ${fields.workingDays}, LOP Days: ${fields.lopDays}
`.trim();
}

function buildTaxContext(decl: TaxDeclaration): string {
  return `
TAX DECLARATION:
Section 80C: ₹${decl.section80C}, 80D: ₹${decl.section80D}, HRA Exemption: ₹${decl.hraExemption}
LTA Exemption: ₹${decl.ltaExemption}, NPS 80CCD(1B): ₹${decl.npsContribution}
Home Loan Interest (24b): ₹${decl.homeLoanInterest}
Proof Submitted: ${decl.proofSubmitted ? 'Yes' : 'No'}
Pending Proofs: ${decl.proofPendingFields.length > 0 ? decl.proofPendingFields.join(', ') : 'None'}
`.trim();
}

const GROUNDING_INSTRUCTIONS = `
You are a Financial Wellness Assistant for employees. STRICT RULES:
1. ONLY use data explicitly provided in the PAYSLIP DATA and TAX DECLARATION sections below.
2. NEVER invent, estimate, or hallucinate salary figures, tax amounts, or financial values.
3. If a specific value is not in the data, say "That information is not available in your current payslip."
4. Explain salary components in simple, friendly language (avoid jargon unless explaining it).
5. When explaining deductions, clarify why they are beneficial (e.g., PF builds retirement savings).
6. For tax questions, always state your assumptions clearly.
7. Do not provide legal or investment advice; recommend consulting a financial advisor for major decisions.
8. Keep responses concise and employee-friendly. Use ₹ symbol for amounts.
`.trim();

// ── Public service methods ────────────────────────────────────────────────────

export class LlmService {
  async chat(
    question: string,
    payslipFields: PayslipFields | null,
    taxDecl: TaxDeclaration | null,
    history: ChatMessage[],
    traceId: string
  ): Promise<string> {
    const payslipCtx = payslipFields
      ? buildPayslipContext(payslipFields)
      : 'No payslip uploaded yet. Please upload your payslip first.';

    const taxCtx = taxDecl
      ? buildTaxContext(taxDecl)
      : 'No tax declaration data available.';

    const historyText = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Employee' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `
${GROUNDING_INSTRUCTIONS}

${payslipCtx}
${taxCtx}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}
Employee Question: ${question}

Answer (be concise, friendly, and grounded only in the data above):
`.trim();

    return callLlm(prompt, traceId);
  }

  async explainComponent(
    component: string,
    payslipFields: PayslipFields,
    traceId: string
  ): Promise<string> {
    const ctx = buildPayslipContext(payslipFields);
    const prompt = `
${GROUNDING_INSTRUCTIONS}

${ctx}

Explain the salary component "${component}" to the employee using their actual value from the payslip above.
Include: what it is, why it exists, and any tax implications. Keep it under 150 words.
`.trim();
    return callLlm(prompt, traceId);
  }

  async generateInvestmentChecklist(
    taxDecl: TaxDeclaration,
    payslipFields: PayslipFields,
    traceId: string
  ): Promise<string> {
    const ctx = buildPayslipContext(payslipFields);
    const tctx = buildTaxContext(taxDecl);
    const prompt = `
${GROUNDING_INSTRUCTIONS}

${ctx}
${tctx}

Based ONLY on the employee's declared deductions and pending proof fields above, generate a personalized investment proof submission checklist.
List only the proofs that are declared but not yet submitted. Format as a numbered checklist with brief instructions.
If all proofs are submitted, confirm that clearly.
`.trim();
    return callLlm(prompt, traceId);
  }
}

export const llmService = new LlmService();