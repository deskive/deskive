import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { PageSEO } from '../../components/seo';
import { useToast } from '../../hooks/use-toast';
import { useCreateDocument, DocumentType, useDocumentTemplate } from '../../lib/api/document-api';

// Lazy load ReactQuill
const ReactQuill = lazy(() => import('react-quill-new'));
import 'react-quill-new/dist/quill.snow.css';

const DOCUMENT_TYPES = [
  {
    value: DocumentType.PROPOSAL,
    label: 'Proposal',
    icon: '📋',
    description: 'Business proposals and project pitches',
  },
  {
    value: DocumentType.CONTRACT,
    label: 'Contract',
    icon: '📄',
    description: 'Service agreements and contracts',
  },
  {
    value: DocumentType.INVOICE,
    label: 'Invoice',
    icon: '🧾',
    description: 'Invoices and billing documents',
  },
  {
    value: DocumentType.SOW,
    label: 'SOW',
    icon: '📝',
    description: 'Statement of Work documents',
  },
];

// Templates based on type
const getTemplateContent = (type: DocumentType): string => {
  const templates = {
    [DocumentType.PROPOSAL]: `<h1>Project Proposal</h1>
<h2>Executive Summary</h2>
<p>Provide a brief overview of your proposal here. Summarize the key points and value proposition.</p>

<h2>Project Overview</h2>
<p>Describe the project scope, goals, and expected outcomes.</p>

<h2>Objectives</h2>
<ul>
  <li>Primary objective</li>
  <li>Secondary objective</li>
  <li>Additional objectives as needed</li>
</ul>

<h2>Timeline & Milestones</h2>
<p>Outline your project timeline and key milestones here.</p>

<h2>Budget & Pricing</h2>
<p>Detail your pricing structure and payment terms.</p>

<h2>Terms & Conditions</h2>
<p>Include any relevant terms and conditions.</p>`,

    [DocumentType.CONTRACT]: `<h1>Service Agreement</h1>
<p>This Agreement is entered into as of [Date] by and between:</p>

<h2>Parties</h2>
<p><strong>Party A (Client):</strong><br/>
Name: ________________________<br/>
Address: ________________________<br/>
Email: ________________________</p>

<p><strong>Party B (Service Provider):</strong><br/>
Name: ________________________<br/>
Address: ________________________<br/>
Email: ________________________</p>

<h2>Scope of Services</h2>
<p>The Service Provider agrees to provide the following services:</p>
<ol>
  <li>Service item 1</li>
  <li>Service item 2</li>
  <li>Service item 3</li>
</ol>

<h2>Term & Duration</h2>
<p>This Agreement shall commence on [Start Date] and continue until [End Date].</p>

<h2>Compensation</h2>
<p>Total Amount: $________________________<br/>
Payment Schedule: ________________________</p>

<h2>Confidentiality</h2>
<p>Both parties agree to maintain confidentiality of proprietary information.</p>

<h2>Termination</h2>
<p>Either party may terminate with [X] days written notice.</p>`,

    [DocumentType.INVOICE]: `<h1>INVOICE</h1>
<p>Invoice Number: INV-________________________<br/>
Invoice Date: ________________________<br/>
Due Date: ________________________</p>

<h2>From</h2>
<p>Your Company Name<br/>
Your Address<br/>
City, State, ZIP<br/>
Phone: ________________________<br/>
Email: ________________________</p>

<h2>Bill To</h2>
<p>Client Name<br/>
Client Address<br/>
City, State, ZIP<br/>
Email: ________________________</p>

<h2>Services / Items</h2>
<table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;">
  <tr>
    <th>Description</th>
    <th>Qty</th>
    <th>Rate</th>
    <th>Amount</th>
  </tr>
  <tr>
    <td>Service/Item 1</td>
    <td>1</td>
    <td>$0.00</td>
    <td>$0.00</td>
  </tr>
  <tr>
    <td colspan="3" align="right"><strong>TOTAL:</strong></td>
    <td><strong>$0.00</strong></td>
  </tr>
</table>

<h2>Payment Terms</h2>
<p>Payment is due within [X] days of the invoice date.</p>`,

    [DocumentType.SOW]: `<h1>Statement of Work</h1>
<p>Project: ________________________<br/>
Client: ________________________<br/>
Date: ________________________</p>

<h2>1. Project Overview</h2>
<p>Describe the overall project and its purpose.</p>

<h2>2. Scope of Work</h2>
<p>Define what is included in this project:</p>
<ul>
  <li>Deliverable 1</li>
  <li>Deliverable 2</li>
  <li>Deliverable 3</li>
</ul>

<h2>3. Timeline & Milestones</h2>
<p>Phase 1: [Description] - [Timeline]<br/>
Phase 2: [Description] - [Timeline]<br/>
Phase 3: [Description] - [Timeline]</p>

<h2>4. Deliverables</h2>
<p>List all project deliverables and acceptance criteria.</p>

<h2>5. Budget</h2>
<p>Total Project Cost: $________________________<br/>
Payment Schedule: ________________________</p>

<h2>6. Assumptions</h2>
<ul>
  <li>Assumption 1</li>
  <li>Assumption 2</li>
</ul>

<h2>7. Risks</h2>
<ul>
  <li>Risk 1: Description and mitigation</li>
  <li>Risk 2: Description and mitigation</li>
</ul>`,
  };

  return templates[type] || templates[DocumentType.PROPOSAL];
};

export const NewDocument: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const templateId = searchParams.get('template');
  const createMutation = useCreateDocument(workspaceId!);

  // Load template if templateId is provided
  const { data: selectedTemplate } = useDocumentTemplate(
    workspaceId!,
    templateId || '',
  );

  // Two-step state
  const [showEditor, setShowEditor] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentType: DocumentType.PROPOSAL,
    content: '',
  });

  // Initialize from selected template or default template
  useEffect(() => {
    if (!showEditor) {
      if (selectedTemplate) {
        // Use the selected template from API
        setFormData(prev => ({
          ...prev,
          title: selectedTemplate.name,
          description: selectedTemplate.description,
          documentType: selectedTemplate.documentType,
          content: selectedTemplate.contentHtml || getTemplateContent(selectedTemplate.documentType),
        }));
      } else {
        // Use default template based on type
        const template = getTemplateContent(formData.documentType);
        setFormData(prev => ({
          ...prev,
          content: template,
          title: `New ${formData.documentType.charAt(0).toUpperCase() + formData.documentType.slice(1)}`,
        }));
      }
    }
  }, [formData.documentType, showEditor, selectedTemplate]);

  // Quill editor config
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ 'align': [] }],
      ['clean']
    ],
  }), []);

  const quillFormats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image',
    'align',
    'blockquote', 'code-block',
  ], []);

  const handleContinueToEditor = () => {
    if (!formData.title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    setShowEditor(true);
  };

  const handleCreate = async () => {
    try {
      const doc = await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        documentType: formData.documentType,
        content: {},
        contentHtml: formData.content,
        templateId: templateId || undefined,
      });

      toast({ title: 'Document created successfully' });
      navigate(`/workspaces/${workspaceId}/more/documents/${doc.id}`);
    } catch (error) {
      toast({ title: 'Failed to create document', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageSEO
        title={showEditor ? formData.title : 'New Document'}
        description="Create a new document"
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (showEditor) {
                  setShowEditor(false);
                } else {
                  navigate(`/workspaces/${workspaceId}/more/documents/create`);
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {showEditor ? formData.title : 'Create Custom Document'}
              </h1>
              <p className="text-sm text-gray-600">
                {showEditor ? 'Edit document content' : 'Setup document details'}
              </p>
            </div>
          </div>

          {showEditor && (
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Create Document'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {!showEditor ? (
            /* STEP 1: Setup Form */
            <Card>
              <CardContent className="p-8">
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl mb-8 text-center">
                  <FileText className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Create Your Own Document</h2>
                  <p className="text-sm text-gray-600">
                    Start with a professionally structured template and customize it to your needs
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Document Type Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Select Document Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {DOCUMENT_TYPES.map((type) => (
                        <div
                          key={type.value}
                          onClick={() => setFormData({ ...formData, documentType: type.value })}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            formData.documentType === type.value
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-3xl mb-2">{type.icon}</div>
                          <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                          <div className="text-xs text-gray-600">{type.description}</div>
                          {formData.documentType === type.value && (
                            <div className="mt-2">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title">
                      Document Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter a title for your document"
                      className="mt-1"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add a brief description"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Preview Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      What's Included
                    </h3>
                    <p className="text-sm text-blue-800">
                      Your {formData.documentType} will include professionally structured sections with placeholder text that you can customize.
                    </p>
                  </div>

                  {/* Continue Button */}
                  <Button
                    onClick={handleContinueToEditor}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-6"
                    size="lg"
                  >
                    Continue to Editor
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* STEP 2: Editor */
            <Card>
              <CardContent className="p-6">
                <Suspense fallback={
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-96 flex items-center justify-center">
                    <div className="text-gray-500">Loading editor...</div>
                  </div>
                }>
                  <ReactQuill
                    theme="snow"
                    value={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Edit your document content..."
                    className="bg-white"
                    style={{ height: '600px', marginBottom: '50px' }}
                  />
                </Suspense>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
