# 💰 Financial Wellness & Tax AI Agent

A MEAN stack (MongoDB · Express · Angular · Node.js) application with full TypeScript that helps employees understand payslips, salary structures, deductions, and tax-saving opportunities using AI.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Angular)                    │
│   Login → Dashboard → Payslip Upload → Chat Interface       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────┐
│                     Backend (Express + Node)                  │
│  Auth Middleware → Route Controllers → Services              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Auth Svc   │  │ Payroll Svc  │  │    AI/LLM Svc      │  │
│  │  JWT tokens │  │ Data queries │  │ llm-wrapper API    │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Document / OCR Service (Mock)                │ │
│  │   PDF upload → Field Extraction → Grounded Prompts     │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼─────────────────────────────────┐
│                      MongoDB                                  │
│  users · payslips · payroll_records · audit_logs            │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
financial-wellness-agent/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Auth, error, upload
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express routers
│   │   ├── services/         # Business logic
│   │   └── utils/            # Helpers, tax logic
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── components/   # Angular components
│   │       ├── services/     # HTTP services
│   │       ├── models/       # TS interfaces
│   │       └── guards/       # Route guards
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- API token for the LLM wrapper

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, LLM_API_TOKEN
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:4200`, API at `http://localhost:3000`.

---

## Environment Variables

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/financial_wellness
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=8h
LLM_API_URL=https://llm-wrapper-741152993481.asia-south1.run.app
LLM_API_TOKEN=your_llm_api_token
MAX_FILE_SIZE_MB=5
```

---

## Mocked Data & Assumptions

- **OCR**: PDF uploads are processed via a mock OCR service that returns realistic payslip fields. In production, integrate Tesseract or AWS Textract.
- **Tax Logic**: Uses simplified Indian income tax (Old Regime, FY 2024-25) with standard deduction of ₹50,000 and Section 80C limit of ₹1,50,000.
- **Authentication**: JWT-based with user-scoped data isolation. Every API call validates ownership of the requested resource.
- **Seeded Users**: Two demo employees (emp001 / emp002) are seeded on startup.

---

## Security & Privacy Controls

| Control | Implementation |
|---|---|
| Authentication | JWT Bearer tokens, 8h expiry |
| Authorization | Every document/payslip query checks `userId === resource.userId` |
| Cross-user isolation | MongoDB queries always include `userId` filter |
| Sensitive field masking | PAN, account numbers masked in API responses |
| Audit logging | Every upload, query, and AI call is logged to `audit_logs` collection |
| File validation | MIME type + extension whitelist, 5 MB limit |
| Prompt grounding | AI system prompt forbids inventing salary figures |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/payroll/summary` | Monthly payroll summary |
| GET | `/api/payroll/ytd` | Year-to-date figures |
| POST | `/api/payslips/upload` | Upload & OCR a payslip PDF |
| GET | `/api/payslips` | List user's payslips |
| GET | `/api/payslips/:id` | Single payslip detail |
| POST | `/api/ai/chat` | Ask AI about payslip/payroll |
| POST | `/api/ai/tax-simulation` | Run 80C/HRA tax simulation |
| GET | `/api/ai/investment-checklist` | Get proof submission checklist |

---

## Edge Cases Handled

- **Missing payslip fields**: AI explicitly states "field not found in your payslip" instead of guessing.
- **Unauthorized access**: Returns 403 if userId in token ≠ resource owner.
- **Inconsistent OCR**: Parser validates numeric fields and falls back to 0 with a warning flag.
- **Tax simulation limits**: Caps 80C at ₹1,50,000; warns if input exceeds limit.
- **No payslip uploaded**: AI refuses payslip questions and prompts to upload first.
- **Hallucination guard**: System prompt instructs AI to say "I don't have that information" rather than estimate.

---

## Known Limitations

- OCR is mocked; real PDF text extraction not implemented.
- Tax logic covers only Old Regime (New Regime toggle is a bonus).
- No real document storage (files are processed in-memory).
- Audit logs are not paginated in the UI.
