/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { MotoVaultState, DocumentRecord, DocumentCategory } from '../types';
import { Plus, Trash2, Calendar, FileText, Upload, Eye, X, ShieldCheck, AlertCircle, Info, IndianRupee } from 'lucide-react';

interface DocumentVaultTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
}

export default function DocumentVaultTab({ state, onUpdateState }: DocumentVaultTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.DL);
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [details, setDetails] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [cost, setCost] = useState<number | ''>('');

  // Dropdown states for preview
  const [activePreviewDoc, setActivePreviewDoc] = useState<DocumentRecord | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setErrorMsg("File is too large! Please select an image or PDF under 2MB for browser compatibility.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!docNumber.trim()) {
      setErrorMsg("Document Identification Number/Reference is required.");
      return;
    }

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      category,
      docNumber: docNumber.trim(),
      expiryDate: expiryDate ? expiryDate : undefined,
      details: details.trim() || undefined,
      photoDataUrl: photoDataUrl || undefined,
      fileName: fileName || undefined,
      cost: cost !== '' ? Number(cost) : undefined
    };

    onUpdateState({
      documents: [...state.documents, newDoc]
    });

    // Reset Form
    setDocNumber('');
    setExpiryDate('');
    setDetails('');
    setPhotoDataUrl('');
    setFileName('');
    setCost('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = state.documents.filter(doc => doc.id !== id);
    onUpdateState({
      documents: updated
    });
  };

  // Check days remaining until expiry
  const getExpiryDays = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (doc: DocumentRecord) => {
    if (!doc.expiryDate) {
      if (doc.category === DocumentCategory.EMERGENCY) {
        return <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-800/10 px-1.5 py-0.5 rounded">Contact Guide</span>;
      }
      return <span className="text-[9px] font-mono text-[#888D96] bg-[#0A0B0D] border border-[#2A2D35] px-1.5 py-0.5 rounded">No Expiry Limit</span>;
    }

    const daysLeft = getExpiryDays(doc.expiryDate);
    if (daysLeft === null) return null;

    if (daysLeft < 0) {
      return (
        <span className="text-[9px] font-mono text-red-400 bg-red-950/30 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
          <AlertCircle className="h-2.5 w-2.5" /> EXPIRED
        </span>
      );
    }

    const limit = (doc.category === DocumentCategory.PUC) ? 7 : 30;
    if (daysLeft <= limit) {
      return (
        <span className="text-[9px] font-mono text-[#FF5C00] bg-[#FF5C00]/10 border border-[#FF5C00]/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <AlertCircle className="h-2.5 w-2.5" /> Expiring soon ({daysLeft} days)
        </span>
      );
    }

    return (
      <span className="text-[9px] font-mono text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <ShieldCheck className="h-2.5 w-2.5" /> Valid
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Add buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Document Vault</h2>
          <p className="font-mono text-[11px] text-[#888D96]">Secure digital glovebox for DL, RC, PUC, insurance, and medical tags</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center space-x-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-lg transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showAddForm ? 'Close panel' : 'Add Document'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex gap-2.5 rounded-xl border border-red-500/25 bg-red-950/25 p-4 text-xs font-mono text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <div>
            <p className="font-bold">Check upload rules</p>
            <p className="text-red-400/90 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Form Log Addition */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-xl space-y-4">
          <h3 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00]">
            Log New Document
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Category Tag</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
              >
                <option value={DocumentCategory.DL}>DL (Driving License)</option>
                <option value={DocumentCategory.RC}>RC (Registration Certificate)</option>
                <option value={DocumentCategory.INSURANCE}>Insurance Policy</option>
                <option value={DocumentCategory.PUC}>PUC Certificate</option>
                <option value={DocumentCategory.EMERGENCY}>Medical Tags / Blood Group</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Card / Policy Identifier Number*</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="e.g. KA03-2023-XXXX"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">
                {category === DocumentCategory.EMERGENCY ? 'Renewal / Review Date (Optional)' : 'Expiry Date (Optional)'}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Premium Cost / Fees (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="Optional expense"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Details / Particulars</label>
              <input
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={category === DocumentCategory.EMERGENCY ? "Blood group, emergency contacts etc." : "Issuer, notes, branch offices"}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            {/* Document scan data logger */}
            <div className="space-y-1 sm:col-span-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Attach Scan</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center border border-dashed border-[#2A2D35] hover:border-[#FF5C00]/50 bg-[#0A0B0D] w-full h-[38px] rounded-lg cursor-pointer transition select-none text-[#888D96] text-xs font-mono"
              >
                {fileName ? (
                  <span className="text-[#00C853] font-mono text-[10px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap block px-2">
                     Attached
                  </span>
                ) : (
                  <span className="flex items-center space-x-1">
                    <Upload className="h-3.5 w-3.5 text-zinc-550" />
                    <span>Attach scan</span>
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#2A2D35]">
            <button
              type="submit"
              className="rounded-lg bg-[#FF5C00] px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-md transition"
            >
              Verify & Save Doc
            </button>
          </div>
        </form>
      )}

      {/* Docs Grid Display Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {state.documents.map((doc) => {
          return (
            <div key={doc.id} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 space-y-4 shadow-sm relative flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#888D96] font-semibold">
                      {doc.category}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-widest uppercase font-mono break-all leading-tight">
                      {doc.docNumber}
                    </h3>
                  </div>
                  {getStatusBadge(doc)}
                </div>

                {doc.details && (
                  <p className="text-xs font-mono text-[#E0E0E0] bg-[#0A0B0D] border border-[#2A2D35] rounded-lg p-2 leading-relaxed">
                    {doc.details}
                  </p>
                )}

                {doc.cost !== undefined && doc.cost > 0 && (
                  <div className="flex items-center space-x-1.5 font-mono text-[10px] text-[#00C853] font-bold">
                    <IndianRupee className="h-3.5 w-3.5 text-[#00C853]/70 stroke-[2.5]" />
                    <span>Transaction cost / premium: <b>₹ {doc.cost.toLocaleString()}</b></span>
                  </div>
                )}

                {doc.expiryDate && (
                  <div className="flex items-center space-x-1.5 font-mono text-[10px] text-[#888D96]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Expiry limitations: <b>{doc.expiryDate}</b></span>
                  </div>
                )}
                {doc.photoDataUrl && (
                  <div 
                    onClick={() => setActivePreviewDoc(doc)}
                    className="relative w-full h-24 mt-3 rounded-lg overflow-hidden border border-[#2A2D35] cursor-pointer group"
                  >
                    <img
                      src={doc.photoDataUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
                      <div className="bg-[#0A0B0D]/80 backdrop-blur-sm border border-[#2A2D35] text-[#FF5C00] px-3 py-1.5 rounded-lg flex items-center space-x-2 font-mono text-xs font-bold uppercase tracking-wider">
                        <Eye className="h-4 w-4" />
                        <span>View Document Scan</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-[#2A2D35] pt-3 mt-1">
                {doc.photoDataUrl ? (
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-[#00C853]">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Digital scan secured</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-[#888D96]">
                    <FileText className="h-3 w-3 text-[#888D96]/60" />
                    <span className="text-[#888D96]/70">No scan attached</span>
                  </div>
                )}

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-lg bg-[#0A0B0D] hover:bg-red-500/5 hover:text-red-500 border border-[#2A2D35] p-2 text-[#888D96] transition cursor-pointer"
                  title="Remove document record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {state.documents.length === 0 && (
        <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-10 text-center">
          <p className="font-mono text-xs text-[#888D96]">No credentials or registrations logged in vault.</p>
        </div>
      )}

      {/* Embedded Document Preview Modal Drawer */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative max-w-4xl w-full rounded-2xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-2xl space-y-4">
            <button
              onClick={() => setActivePreviewDoc(null)}
              className="absolute right-4 top-4 rounded-lg bg-[#0A0B0D] border border-[#2A2D35] p-1.5 text-zinc-400 hover:text-white transition cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#888D96] font-semibold">
                {activePreviewDoc.category} preview
              </span>
              <h3 className="font-mono font-bold text-sm text-white max-w-[85%] truncate">
                {activePreviewDoc.docNumber}
              </h3>
            </div>

            <div className="border border-[#2A2D35] rounded-xl overflow-hidden bg-[#0A0B0D] flex items-center justify-center relative select-none max-h-[75vh]">
              <img
                src={activePreviewDoc.photoDataUrl}
                referrerPolicy="no-referrer"
                alt={`Scan attached to ${activePreviewDoc.docNumber}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-[#888D96] bg-[#0A0B0D] p-2.5 rounded-lg border border-[#2A2D35]">
              <span>{activePreviewDoc.fileName || 'DocumentScan.jpg'}</span>
              <span>Secure Local preview</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
