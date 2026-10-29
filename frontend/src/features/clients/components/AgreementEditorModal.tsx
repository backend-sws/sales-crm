import React, { useState, useEffect, useRef } from 'react';
import {
  FileEdit,
  Eye,
  Code,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Save,
  X,
  Check,
  CheckCircle2,
  Loader2,
  FileText,
  Shield,
  BookOpen,
  Pencil,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { ClientDocumentItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { phase5Api } from '@/api/phase5.api';
import { toast } from 'sonner';

interface AgreementEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
  clientCompany?: string;
  documentToEdit?: ClientDocumentItem | null;
  onSuccess: () => void;
}

interface ContractTemplate {
  id: string;
  name: string;
  type: 'contract' | 'proposal' | 'nda' | 'welcome';
  description: string;
  title: string;
  getContent: (clientName: string, company: string, dateStr: string) => string;
}

export const AgreementEditorModal: React.FC<AgreementEditorModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName = 'Client Partner',
  clientCompany = 'Partner Enterprise',
  documentToEdit,
  onSuccess,
}) => {
  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const effectiveCompany = clientCompany || clientName || 'Client Partner';
  const effectiveSigner = clientName || 'Authorized Signatory';

  // Templates definition
  const templates: ContractTemplate[] = [
    {
      id: 'msa',
      name: 'Master Services Agreement (MSA)',
      type: 'contract',
      description: 'Standard agency master contract with IP transfer, payment milestones, and warranty.',
      title: `Master Services Agreement - ${effectiveCompany}`,
      getContent: (cName, comp, dt) => `<h2>MASTER SERVICES AGREEMENT (MSA)</h2>
<p>This Master Services Agreement ("Agreement") is executed and entered into as of <strong>${dt}</strong> ("Effective Date"), by and between:</p>

<p><strong>AGENCY / SERVICE PROVIDER:</strong> SalesCRM Digital Solutions Pvt Ltd, with corporate offices at Tech Park, Sector 62, Noida, India (hereinafter referred to as "Service Provider").</p>
<p><strong>CLIENT:</strong> <strong>${comp}</strong> (represented by <strong>${cName}</strong>), having primary business operations at Registered Address (hereinafter referred to as "Client").</p>

<hr/>

<h3>1. Scope of Engagement &amp; Deliverables</h3>
<p>Service Provider agrees to perform design, engineering, software implementation, and ongoing retainer services as specified in Statements of Work (SOW) or project sprint milestones executed pursuant to this Agreement.</p>

<h3>2. Payment Terms, Retainers &amp; Taxes</h3>
<ul>
  <li><strong>Invoicing:</strong> Retainers and milestone billings will be invoiced in accordance with agreed delivery schedules.</li>
  <li><strong>Payment Timeline:</strong> Client agrees to remit payment within <strong>15 business days</strong> of invoice date.</li>
  <li><strong>Taxes:</strong> All amounts are subject to applicable GST (18%) or international withholding as per statutory law.</li>
</ul>

<h3>3. Intellectual Property Ownership &amp; Licensing</h3>
<p>Upon receipt of 100% full payment for the applicable milestone or project, all bespoke source code, UI/UX designs, and documentation developed specifically for the Client shall transfer exclusively to the Client. Service Provider retains ownership of its pre-existing core frameworks, libraries, and background tooling.</p>

<h3>4. Confidentiality &amp; Non-Disclosure</h3>
<p>Each party agrees to safeguard all proprietary business information, technical architectures, trade secrets, and customer data of the other party with the same degree of care it uses for its own confidential assets (at least reasonable care).</p>

<h3>5. Warranties &amp; SLA Bug-Fix Period</h3>
<p>Service Provider provides a <strong>30-day warranty</strong> following final production deployment during which reproducible defects shall be resolved at zero additional charge.</p>

<h3>6. Termination &amp; Governing Law</h3>
<p>Either party may terminate this Agreement by providing <strong>30 days written notice</strong>. This Agreement shall be governed by and construed under the laws of India, under exclusive jurisdiction of the courts of New Delhi.</p>

<div class="signatures-block" style="margin-top: 40px; padding-top: 25px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Service Provider:</strong><br/>
    SalesCRM Solutions Pvt Ltd<br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Authorized Signatory • Operations Director</div>
  </div>
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Client:</strong><br/>
    <strong>${comp}</strong><br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Signer: <strong>${cName}</strong> (Authorized Signatory)</div>
  </div>
</div>`,
    },
    {
      id: 'nda',
      name: 'Non-Disclosure Agreement (NDA)',
      type: 'nda',
      description: 'Mutual non-disclosure agreement protecting trade secrets, code, and confidential data.',
      title: `Mutual Non-Disclosure Agreement - ${effectiveCompany}`,
      getContent: (cName, comp, dt) => `<h2>MUTUAL NON-DISCLOSURE AGREEMENT (NDA)</h2>
<p>This Mutual Non-Disclosure Agreement ("NDA") is made effective as of <strong>${dt}</strong> by and between <strong>SalesCRM Solutions Pvt Ltd</strong> and <strong>${comp}</strong> (represented by <strong>${cName}</strong>).</p>

<hr/>

<h3>1. Definition of Confidential Information</h3>
<p>"Confidential Information" refers to any proprietary information, technical data, trade secrets, customer records, software architecture, financials, or commercial proposals disclosed by either party to the other, whether orally or in written/electronic format.</p>

<h3>2. Non-Disclosure Obligations</h3>
<p>The Receiving Party agrees to:</p>
<ul>
  <li>Hold and maintain the Disclosing Party's Confidential Information in strictest confidence.</li>
  <li>Restrain from copying, reverse-engineering, or distributing any materials without prior written consent.</li>
  <li>Restrict access only to employees or contractors with a strict "need-to-know" basis bound by equivalent confidentiality covenants.</li>
</ul>

<h3>3. Term &amp; Duration</h3>
<p>The obligations under this Agreement shall survive for a period of <strong>three (3) years</strong> from the date of disclosure of the Confidential Information.</p>

<h3>4. Return or Destruction of Materials</h3>
<p>Upon written request of the Disclosing Party, the Receiving Party shall promptly destroy or return all originals, summaries, and copies of Confidential Information within ten (10) business days.</p>

<div class="signatures-block" style="margin-top: 40px; padding-top: 25px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>Disclosing / Receiving Party:</strong><br/>
    SalesCRM Solutions Pvt Ltd<br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Authorized Signatory</div>
  </div>
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>Client Party:</strong><br/>
    <strong>${comp}</strong><br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Signer: <strong>${cName}</strong></div>
  </div>
</div>`,
    },
    {
      id: 'retainer',
      name: 'Retainer Service Level Agreement (SLA)',
      type: 'contract',
      description: 'Monthly recurring support, maintenance, sprint capacity, and guaranteed response SLAs.',
      title: `Dedicated Retainer & SLA Agreement - ${effectiveCompany}`,
      getContent: (cName, comp, dt) => `<h2>DEDICATED SERVICE RETAINER &amp; SLA CONTRACT</h2>
<p>This Monthly Retainer Agreement is established on <strong>${dt}</strong> between <strong>SalesCRM Solutions Pvt Ltd</strong> ("Agency") and <strong>${comp}</strong> ("Client").</p>

<hr/>

<h3>1. Retainer Scope &amp; Allocation</h3>
<ul>
  <li><strong>Monthly Engineering Hours:</strong> Dedicated allocation of developer and QA hours per billing cycle.</li>
  <li><strong>Continuous Maintenance:</strong> Security patching, dependency updates, uptime monitoring, and infrastructure health.</li>
  <li><strong>Sprint Planning:</strong> Bi-weekly sprint reviews and progress tracking via unified client portal.</li>
</ul>

<h3>2. Guaranteed Response Time SLAs</h3>
<ul>
  <li><strong>Critical (Severity 1 - Outage):</strong> Initial response within <strong>1 Hour</strong>; immediate mitigation dispatch.</li>
  <li><strong>Major (Severity 2 - Core Feature Issue):</strong> Initial response within <strong>4 Hours</strong>.</li>
  <li><strong>Minor / General Requests:</strong> Response within <strong>24 Hours</strong>.</li>
</ul>

<h3>3. Invoicing &amp; Billing Cadence</h3>
<p>Retainer charges are billed at the beginning of each billing cycle with Net-15 payment terms. Unused sprint hours do not roll over beyond 30 days unless mutually agreed in writing.</p>

<div class="signatures-block" style="margin-top: 40px; padding-top: 25px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Agency:</strong><br/>
    SalesCRM Solutions Pvt Ltd<br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Engineering Manager</div>
  </div>
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Client:</strong><br/>
    <strong>${comp}</strong><br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Signer: <strong>${cName}</strong></div>
  </div>
</div>`,
    },
    {
      id: 'proposal',
      name: 'Commercial Project Proposal',
      type: 'proposal',
      description: 'Project statement of work, milestone breakdown, commercial fees, and delivery schedule.',
      title: `Commercial Project Proposal - ${effectiveCompany}`,
      getContent: (cName, comp, dt) => `<h2>COMMERCIAL PROJECT PROPOSAL &amp; SOW</h2>
<p>Prepared for <strong>${comp}</strong> (Attn: <strong>${cName}</strong>) on <strong>${dt}</strong>.</p>

<hr/>

<h3>1. Executive Project Summary</h3>
<p>Development and deployment of end-to-end custom digital architecture tailored to accelerate operations, streamline communications, and maximize enterprise efficiency for <strong>${comp}</strong>.</p>

<h3>2. Key Milestones &amp; Deliverables</h3>
<ul>
  <li><strong>Milestone 1: Architecture &amp; UI/UX Design System</strong> — Wireframes, responsive prototypes, database schema approval.</li>
  <li><strong>Milestone 2: Backend API &amp; Core Functionality</strong> — Secure microservices, role-based access, automated tests.</li>
  <li><strong>Milestone 3: Client Portal &amp; Integration</strong> — White-label dashboards, payment gateway, notifications.</li>
  <li><strong>Milestone 4: Staging Deployment &amp; UAT Sign-off</strong> — User acceptance testing, performance optimization, production launch.</li>
</ul>

<h3>3. Investment &amp; Milestone Schedule</h3>
<p>Total project valuation and schedule are outlined below. Each milestone requires formal client review and sign-off before invoice generation.</p>

<div class="signatures-block" style="margin-top: 40px; padding-top: 25px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>Proposed By:</strong><br/>
    SalesCRM Digital Solutions<br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Managing Director</div>
  </div>
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>Accepted &amp; Confirmed By:</strong><br/>
    <strong>${comp}</strong><br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Signer: <strong>${cName}</strong></div>
  </div>
</div>`,
    },
    {
      id: 'blank',
      name: 'Blank Custom Agreement',
      type: 'contract',
      description: 'Start from a clean slate to write custom clauses and terms.',
      title: `Custom Agreement - ${effectiveCompany}`,
      getContent: (cName, comp, dt) => `<h2>CUSTOM LEGAL AGREEMENT</h2>
<p>This Agreement is entered into on <strong>${dt}</strong> by and between <strong>SalesCRM Solutions Pvt Ltd</strong> and <strong>${comp}</strong>.</p>

<hr/>

<h3>1. Terms &amp; Conditions</h3>
<p>Type your custom agreement clauses, deliverables, and expectations here...</p>

<div class="signatures-block" style="margin-top: 40px; padding-top: 25px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Service Provider:</strong><br/>
    SalesCRM Solutions Pvt Ltd<br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Authorized Signatory</div>
  </div>
  <div class="sig-box" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
    <strong>For Client:</strong><br/>
    <strong>${comp}</strong><br/>
    <div style="margin-top: 35px; border-bottom: 1px solid #94a3b8;"></div>
    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">Signer: <strong>${cName}</strong></div>
  </div>
</div>`,
    },
  ];

  const isEditing = Boolean(documentToEdit);

  // Editor State
  const [selectedTemplate, setSelectedTemplate] = useState<string>('msa');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'contract' | 'proposal' | 'nda' | 'welcome'>('contract');
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('visual');
  const [htmlContent, setHtmlContent] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ContentEditable ref
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const internalHtmlRef = useRef<string>('');

  // Sync content into visual editor safely
  const updateVisualEditor = (html: string) => {
    internalHtmlRef.current = html;
    setHtmlContent(html);
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== html) {
      visualEditorRef.current.innerHTML = html;
    }
  };

  // Initialize or Load for Edit
  useEffect(() => {
    if (!isOpen) return;

    if (documentToEdit) {
      // Editing existing document
      setTitle(documentToEdit.title);
      setDocType(documentToEdit.type);
      setEditorMode('visual');
      setUploadProgress(0);

      // Attempt to load existing HTML content if it's an HTML document
      if (documentToEdit.file_url) {
        setLoadingDoc(true);
        fetch(documentToEdit.file_url)
          .then((res) => res.text())
          .then((text) => {
            // If it's a full generated document, extract .content innerHTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const contentEl = doc.querySelector('.content') || doc.body;
            const extracted = contentEl ? contentEl.innerHTML : text;
            updateVisualEditor(extracted || `<p>${documentToEdit.title}</p>`);
          })
          .catch(() => {
            const fallback = `<h2>${documentToEdit.title}</h2><p>Document on file: <a href="${documentToEdit.file_url}" target="_blank">View existing file</a></p>`;
            updateVisualEditor(fallback);
          })
          .finally(() => setLoadingDoc(false));
      }
    } else {
      // Creating fresh document from default template
      const defaultTpl = templates[0];
      setSelectedTemplate('msa');
      setTitle(defaultTpl.title);
      setDocType(defaultTpl.type);
      setEditorMode('visual');
      setUploadProgress(0);
      const initial = defaultTpl.getContent(effectiveSigner, effectiveCompany, currentDateStr);
      updateVisualEditor(initial);
    }
  }, [isOpen, documentToEdit, clientName, clientCompany]);

  // Handle template switch (only in create mode)
  const handleSelectTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setSelectedTemplate(tplId);
    setTitle(tpl.title);
    setDocType(tpl.type);
    const content = tpl.getContent(effectiveSigner, effectiveCompany, currentDateStr);
    updateVisualEditor(content);
    toast.info(`Loaded '${tpl.name}' template`);
  };

  // Handle user typing/input in visual editor
  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      internalHtmlRef.current = html;
      setHtmlContent(html);
    }
  };

  // Execute rich text command on visual editor
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleVisualInput();
  };

  // Insert custom HTML snippet (like clause or signature)
  const insertSnippet = (snippetHtml: string) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    const success = document.execCommand('insertHTML', false, snippetHtml);
    if (!success && visualEditorRef.current) {
      // Fallback: append to end
      const newHtml = internalHtmlRef.current + snippetHtml;
      updateVisualEditor(newHtml);
    } else {
      handleVisualInput();
    }
  };

  // Handle mode switch between Visual, Code, and Preview
  const handleModeSwitch = (mode: 'visual' | 'code' | 'preview') => {
    if (editorMode === 'code' && mode !== 'code') {
      // Coming back from code view -> update visual editor with latest code
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = internalHtmlRef.current;
      }
    }
    setEditorMode(mode);
  };

  // Generate complete self-contained printable HTML document
  const generateFullHtmlDocument = (docTitle: string, docType: string, bodyContent: string): string => {
    const docId = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      line-height: 1.65;
      margin: 0;
      padding: 30px 15px;
      background: #f1f5f9;
    }
    .page-container {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px 55px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .header-bar {
      border-bottom: 2px solid #0d9488;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
    }
    .badge {
      display: inline-block;
      background: #f0fdfa;
      color: #0d9488;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    h1 {
      margin: 0;
      color: #0f172a;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.25;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
    }
    .content h2 {
      font-size: 18px;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .content h3 {
      font-size: 14px;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .content p {
      margin: 10px 0;
      font-size: 13.5px;
      color: #334155;
      text-align: justify;
    }
    .content ul, .content ol {
      margin: 10px 0 18px 24px;
      font-size: 13.5px;
      color: #334155;
    }
    .content li {
      margin-bottom: 6px;
    }
    .content hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
    .signatures-block {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px dashed #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .sig-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px;
      background: #f8fafc;
      font-size: 12px;
      color: #334155;
    }
    .sig-line {
      margin-top: 45px;
      border-bottom: 1px solid #94a3b8;
    }
    .sig-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 8px;
    }
    .footer {
      margin-top: 45px;
      border-top: 1px solid #f1f5f9;
      padding-top: 18px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .no-print-bar {
      max-width: 840px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .btn-print {
      background: #0d9488;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .page-container {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 12px; color: #475569; font-weight: 600;">
      📄 Official Legal Document • Ready for E-Signature
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print or Save as PDF
    </button>
  </div>

  <div class="page-container">
    <div class="header-bar">
      <div>
        <div class="badge">${docType.toUpperCase()}</div>
        <h1>${docTitle}</h1>
      </div>
      <div class="meta-box">
        <div><strong>Date:</strong> ${currentDateStr}</div>
        <div><strong>Document ID:</strong> ${docId}</div>
        <div><strong>Status:</strong> Pending E-Signature</div>
      </div>
    </div>

    <div class="content">
      ${bodyContent}
    </div>

    <div class="footer">
      <span>Compliant with IT Act 2000 &amp; ESIGN Legal Frameworks</span>
      <span>Secured via SalesCRM Cloud</span>
    </div>
  </div>
</body>
</html>`;
  };

  // Compile, upload via Presigned URL pipeline, and create/update document
  const handleSaveAndCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }
    const currentBody = internalHtmlRef.current.trim();
    if (!currentBody || currentBody === '<p><br></p>') {
      toast.error('Agreement content cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      // 1. Generate full HTML document
      const fullHtml = generateFullHtmlDocument(title.trim(), docType, currentBody);
      const safeSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const fileName = `${safeSlug}-${Date.now()}.html`;

      const htmlBlob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const file = new File([htmlBlob], fileName, { type: 'text/html' });

      setUploadProgress(30);

      // 2. Request presigned upload metadata
      const presigned = await phase5Api.requestPresignedUpload({
        file_name: file.name,
        file_type: 'text/html',
        file_size_bytes: file.size,
        folder: 'client_documents',
      });

      setUploadProgress(50);
      let finalUrl = presigned.public_url;

      // 3. Upload file via presigned pipeline (S3/R2 direct or backend multipart)
      if (presigned.mode === 's3_presigned') {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(presigned.method || 'PUT', presigned.upload_url, true);

          if (presigned.headers) {
            Object.entries(presigned.headers).forEach(([k, v]) => {
              xhr.setRequestHeader(k, v);
            });
          }

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = 50 + Math.round((evt.loaded / evt.total) * 45);
              setUploadProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Presigned upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during presigned S3 upload'));
          xhr.send(file);
        });
      } else {
        setUploadProgress(60);
        const res = await phase5Api.directUploadFile(file, 'client_documents');
        finalUrl = res.public_url;
      }

      setUploadProgress(95);

      if (isEditing && documentToEdit) {
        // Update existing document before sign
        await clientsApi.updateDocument(documentToEdit.id, {
          title: title.trim(),
          type: docType,
          file_url: finalUrl,
        });
        toast.success(`Agreement '${title}' updated successfully!`);
      } else {
        // Create new document record
        await clientsApi.uploadDocument(clientId, {
          title: title.trim(),
          type: docType,
          file_url: finalUrl,
          status: 'pending_signature',
        });
        toast.success(`Agreement '${title}' created and queued for e-signature!`);
      }

      setUploadProgress(100);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
            {isEditing ? <Pencil className="w-4 h-4" /> : <FileEdit className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Agreement (Pending Signature)' : 'WYSIWYG Agreement & Contract Editor'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {isEditing
                ? `Modify terms for #${documentToEdit?.id} before client executes legal signature`
                : 'Visual rich-text editor with templates, styling toolbar, and instant cloud upload'}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Controls: Template Selector (if creating), Title, DocType */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          {!isEditing ? (
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                <span>Load Template</span>
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 text-amber-600">
                <Info className="w-3.5 h-3.5" />
                <span>Status</span>
              </label>
              <div className="px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
                Pending Signature • Editing Allowed
              </div>
            </div>
          )}

          {/* Document Title */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Master Services Agreement (MSA) 2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Document Type */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Classification
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="contract">Master Contract</option>
              <option value="proposal">Commercial Proposal</option>
              <option value="nda">Non-Disclosure (NDA)</option>
              <option value="welcome">Welcome Kit / SLA</option>
            </select>
          </div>
        </div>

        {/* Visual WYSIWYG Toolbar (Like TinyMCE / CKEditor) */}
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left formatting controls */}
            <div className="flex flex-wrap items-center gap-1">
              {/* Undo / Redo */}
              <button
                type="button"
                onClick={() => executeCommand('undo')}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('redo')}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

              {/* Block Format Dropdown */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    executeCommand('formatBlock', e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="" disabled>Format...</option>
                <option value="<p>">Normal Paragraph</option>
                <option value="<h1>">Heading 1</option>
                <option value="<h2>">Heading 2</option>
                <option value="<h3>">Heading 3 (Clause)</option>
                <option value="<blockquote>">Quote / Callout</option>
              </select>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

              {/* Text Styles */}
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-bold"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors italic"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors underline"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('strikeThrough')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

              {/* Lists */}
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

              {/* Alignment */}
              <button
                type="button"
                onClick={() => executeCommand('justifyLeft')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyCenter')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyRight')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyFull')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Justify"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

              <button
                type="button"
                onClick={() => executeCommand('insertHorizontalRule')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Insert Divider Line"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleModeSwitch('visual')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  editorMode === 'visual'
                    ? 'bg-primary-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>WYSIWYG</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('code')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  editorMode === 'code'
                    ? 'bg-primary-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="View HTML Source Code"
              >
                <Code className="w-3.5 h-3.5" />
                <span>HTML Code</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('preview')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  editorMode === 'preview'
                    ? 'bg-primary-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Print Preview</span>
              </button>
            </div>
          </div>

          {/* Quick Legal Clause Inserters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px]">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1">
              + Insert Clause:
            </span>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<h3>Payment &amp; Invoicing Terms</h3><p>Invoices shall be payable within fifteen (15) days of issuance. Late payments incur a 1.5% monthly service charge on outstanding balance.</p>`
                )
              }
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600"
            >
              + Payment Terms
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<h3>Intellectual Property &amp; Code Handover</h3><p>Full intellectual property rights for deliverable software code, graphics, and documentation shall transfer unconditionally to Client upon receipt of 100% final invoice payment.</p>`
                )
              }
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600"
            >
              + IP Ownership
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<h3>Non-Disclosure &amp; Confidentiality</h3><p>Both parties agree to treat proprietary source code, credentials, and customer data as strictly confidential and shall not disclose without explicit written consent.</p>`
                )
              }
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600"
            >
              + Confidentiality
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  `<h3>Jurisdiction &amp; Governing Law</h3><p>This Agreement is executed under and governed by the laws of India, subject to exclusive court jurisdiction in New Delhi.</p>`
                )
              }
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600"
            >
              + Jurisdiction
            </button>
          </div>
        </div>

        {/* Loading overlay if fetching existing document */}
        {loadingDoc ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading document content...</p>
          </div>
        ) : (
          <>
            {/* 1. VISUAL WYSIWYG CANVAS */}
            <div className={editorMode === 'visual' ? 'block' : 'hidden'}>
              <div
                ref={visualEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleVisualInput}
                className="min-h-[380px] max-h-[500px] overflow-y-auto p-6 md:p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-900 dark:text-slate-100 font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-inner prose prose-slate dark:prose-invert max-w-none
                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-slate-100 dark:[&_h2]:border-zinc-800 [&_h2]:pb-1
                [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-3 [&_h3]:mb-1
                [&_p]:my-2 [&_p]:text-slate-700 dark:[&_p]:text-slate-300
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
                [&_li]:my-0.5
                [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-zinc-800
                [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:italic"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                <span>✨ Visual Mode: Type freely, format text, and add clauses without writing HTML tags.</span>
                <span>WYSIWYG Active</span>
              </div>
            </div>

            {/* 2. HTML SOURCE CODE CANVAS */}
            {editorMode === 'code' && (
              <div className="space-y-1">
                <textarea
                  rows={16}
                  value={internalHtmlRef.current}
                  onChange={(e) => {
                    internalHtmlRef.current = e.target.value;
                    setHtmlContent(e.target.value);
                  }}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-zinc-900 text-emerald-400 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-y min-h-[380px]"
                />
                <div className="text-[11px] text-slate-400 px-1">
                  &lt;&gt; Raw HTML Source Code View. Switch back to Visual mode at any time.
                </div>
              </div>
            )}

            {/* 3. PRINT PREVIEW CANVAS */}
            {editorMode === 'preview' && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-950/40 p-4 max-h-[480px] overflow-y-auto">
                <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-xl p-8 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6 text-slate-800 dark:text-slate-200 text-xs">
                  <div className="border-b-2 border-primary-600 pb-4 flex items-end justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                        {docType}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {title || 'Untitled Agreement'}
                      </h2>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <div>Date: {currentDateStr}</div>
                      <div>Status: Pending E-Signature</div>
                    </div>
                  </div>

                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_p]:text-slate-600 dark:[&_p]:text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-slate-600 dark:[&_li]:text-slate-400 [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-zinc-800"
                    dangerouslySetInnerHTML={{ __html: internalHtmlRef.current }}
                  />

                  <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 text-center flex items-center justify-between">
                    <span>Tamper-proof Digital Document • IT Act 2000 Legal Framework</span>
                    <span>Secured via SalesCRM Cloud</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Upload Progress Bar if submitting */}
        {isSubmitting && (
          <div className="space-y-1.5 p-3 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800/40">
            <div className="flex items-center justify-between text-xs font-semibold text-primary-700 dark:text-primary-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Compiling &amp; Uploading directly to Storage via Presigned Pipeline...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-primary-200 dark:bg-primary-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Client Signatory: <strong className="text-slate-800 dark:text-slate-200">{effectiveSigner}</strong> ({effectiveCompany})
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || loadingDoc}
              onClick={handleSaveAndCreate}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Updating...' : 'Compiling & Uploading...'}</span>
                </>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Agreement</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Queue for E-Signature</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
