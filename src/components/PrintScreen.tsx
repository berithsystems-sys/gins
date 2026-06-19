import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  FileText,
  Settings,
  Eye,
  Download,
  Mail,
  Share2,
  X,
  Search,
  Check,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  PrintData,
  PrintConfig,
  DEFAULT_PRINT_CONFIG,
  generateTallyPrintHTML
} from '../lib/PrintUtils';

interface PrintScreenProps {
  onBack: () => void;
  currentScreen: string;
  printData?: PrintData;
}

interface ConfigItem {
  id: keyof PrintConfig;
  label: string;
  category: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'enum';
  options?: string[];
}

const CONFIG_SCHEMA: ConfigItem[] = [
  // Printer Setup
  { id: 'printerSelection', label: 'Printer Selection', category: 'Printer Setup', description: 'Choose the destination printer', type: 'enum', options: ['Save as PDF (Tally Virtual)', 'System Default Printer', 'Epson LQ-310 Dot Matrix', 'HP LaserJet Pro M404'] },
  { id: 'paperSize', label: 'Paper Size', category: 'Printer Setup', description: 'Standard paper dimensions', type: 'enum', options: ['A4', 'Letter', 'Legal', 'A5'] },
  { id: 'orientation', label: 'Orientation', category: 'Printer Setup', description: 'Page layout direction', type: 'enum', options: ['Portrait', 'Landscape'] },
  { id: 'scaling', label: 'Print Scaling', category: 'Printer Setup', description: 'Fit document to sheet size', type: 'enum', options: ['Fit to Page', 'Actual Size'] },
  { id: 'marginTop', label: 'Margin Top (mm)', category: 'Printer Setup', description: 'Top margin spacing in mm', type: 'number' },
  { id: 'marginBottom', label: 'Margin Bottom (mm)', category: 'Printer Setup', description: 'Bottom margin spacing in mm', type: 'number' },
  { id: 'marginLeft', label: 'Margin Left (mm)', category: 'Printer Setup', description: 'Left margin spacing in mm', type: 'number' },
  { id: 'marginRight', label: 'Margin Right (mm)', category: 'Printer Setup', description: 'Right margin spacing in mm', type: 'number' },
  
  // Invoice & Paper settings
  { id: 'printFormat', label: 'Print Format', category: 'Invoice Settings', description: 'Optimization mode for printer type', type: 'enum', options: ['Neat Mode', 'Dot Matrix Format', 'Quick/Draft Mode'] },
  { id: 'paperType', label: 'Paper Type', category: 'Invoice Settings', description: 'Stationery selection', type: 'enum', options: ['Plain Paper', 'Pre-printed Paper'] },
  
  // Copies
  { id: 'numberOfCopies', label: 'Number of Copies', category: 'Copies', description: 'How many copies to print', type: 'number' },
  { id: 'copyType', label: 'Copy Type', category: 'Copies', description: 'Voucher print copying style', type: 'enum', options: ['Original', 'Duplicate', 'Triplicate', 'Voucher-wise'] },
  
  // Company Details
  { id: 'showCompanyName', label: 'Show Company Name', category: 'Company Details', description: 'Print company legal name at header', type: 'boolean' },
  { id: 'showCompanyAddress', label: 'Show Address', category: 'Company Details', description: 'Print company registered address', type: 'boolean' },
  { id: 'showPhone', label: 'Show Phone Number', category: 'Company Details', description: 'Print phone contact info', type: 'boolean' },
  { id: 'showEmail', label: 'Show Email Address', category: 'Company Details', description: 'Print email info', type: 'boolean' },
  { id: 'showWebsite', label: 'Show Website URL', category: 'Company Details', description: 'Print corporate website link', type: 'boolean' },
  { id: 'showGSTIN', label: 'Show GSTIN/VAT Registration', category: 'Company Details', description: 'Print taxation registration number', type: 'boolean' },
  { id: 'showLogo', label: 'Show Brand Logo / Emblem', category: 'Company Details', description: 'Print visual logo symbol at top', type: 'boolean' },
  
  // Customer Details
  { id: 'showPartyName', label: 'Show Customer/Party Name', category: 'Customer Details', description: 'Print customer client name', type: 'boolean' },
  { id: 'showBillingAddress', label: 'Show Billing Address', category: 'Customer Details', description: 'Print customer billing details', type: 'boolean' },
  { id: 'showShippingAddress', label: 'Show Shipping Address', category: 'Customer Details', description: 'Print customer delivery destination', type: 'boolean' },
  { id: 'showPartyGSTIN', label: 'Show Customer GSTIN', category: 'Customer Details', description: 'Print customer tax reference', type: 'boolean' },
  
  // Invoice & Report Content
  { id: 'showItemDescription', label: 'Show Item Details', category: 'Report Content', description: 'Show item description / particulars', type: 'boolean' },
  { id: 'showItemCode', label: 'Show Stock Codes', category: 'Report Content', description: 'Include internal item reference / codes', type: 'boolean' },
  { id: 'showHSN', label: 'Show HSN/SAC Codes', category: 'Report Content', description: 'Include tax system categorization codes', type: 'boolean' },
  { id: 'showBatch', label: 'Show Batch Numbers', category: 'Report Content', description: 'Include inventory batch info', type: 'boolean' },
  { id: 'showExpiry', label: 'Show Product Expiry', category: 'Report Content', description: 'Print product expiry dates', type: 'boolean' },
  { id: 'showQuantity', label: 'Show Quantities', category: 'Report Content', description: 'Show numerical quantity columns', type: 'boolean' },
  { id: 'showRate', label: 'Show Item Rates', category: 'Report Content', description: 'Show item unit pricing rates', type: 'boolean' },
  { id: 'showDiscount', label: 'Show Applied Discounts', category: 'Report Content', description: 'Show individual item discounts', type: 'boolean' },
  { id: 'showTaxBreakup', label: 'Show Tax Breakup Grid', category: 'Report Content', description: 'Include itemized tax calculation table', type: 'boolean' },
  { id: 'showNarration', label: 'Show Narration', category: 'Report Content', description: 'Include voucher narration note', type: 'boolean' },
  { id: 'showTerms', label: 'Show Terms & Conditions', category: 'Report Content', description: 'Print terms and legal footnotes', type: 'boolean' },
  { id: 'showDeclaration', label: 'Show Declaration Text', category: 'Report Content', description: 'Print statutory business declaration', type: 'boolean' },
  { id: 'showQRCode', label: 'Show e-Invoice QR Code', category: 'Report Content', description: 'Include quick-scan verification code', type: 'boolean' },
  { id: 'showSignatureSpace', label: 'Show Signature Blocks', category: 'Report Content', description: 'Draw authorized signature blanks at footer', type: 'boolean' },

  // Typography & Titles
  { id: 'reportTitle', label: 'Custom Report Title', category: 'Titles', description: 'Override default report title header', type: 'string' },
  { id: 'reportSubtitle', label: 'Custom Subtitle', category: 'Titles', description: 'Override default subtitle period', type: 'string' },
  { id: 'showDate', label: 'Print Date & Time Stamp', category: 'Titles', description: 'Show timestamp at top/bottom of report', type: 'boolean' },
  { id: 'fontSize', label: 'Font Size (pt)', category: 'Titles', description: 'Adjust printable font size point', type: 'number' },
  { id: 'boldHeaders', label: 'Bold Headers', category: 'Titles', description: 'Make table headings bold text', type: 'boolean' },
  { id: 'lineSpacing', label: 'Line Spacing factor', category: 'Titles', description: 'Set vertical row line spacing', type: 'number' },
];

export default function PrintScreen({ onBack, currentScreen, printData }: PrintScreenProps) {
  const [config, setConfig] = useState<PrintConfig>(() => {
    const saved = localStorage.getItem('tally_print_config');
    return saved ? JSON.parse(saved) : DEFAULT_PRINT_CONFIG;
  });

  const [mode, setMode] = useState<'MENU' | 'PREVIEW' | 'CONFIG'>('MENU');
  const [isPrinting, setIsPrinting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Prompt dialog states
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState<((val: string) => void) | null>(null);
  
  // Notification States
  const [notification, setNotification] = useState<string | null>(null);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-save configs
  useEffect(() => {
    localStorage.setItem('tally_print_config', JSON.stringify(config));
  }, [config]);

  // Update Preview iframe when mode/config changes
  useEffect(() => {
    if (mode === 'PREVIEW' && previewIframeRef.current && printData) {
      const html = generateTallyPrintHTML(printData, config);
      const doc = previewIframeRef.current.contentDocument || previewIframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [mode, config, printData]);

  // Helper to show notification
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Custom values prompts
  const openPrompt = (title: string, defaultValue: string, callback: (val: string) => void) => {
    setActivePrompt(title);
    setPromptValue(defaultValue);
    setPromptCallback(() => callback);
  };

  const handlePromptSubmit = () => {
    if (promptCallback) {
      promptCallback(promptValue);
    }
    setActivePrompt(null);
    setPromptValue('');
    setPromptCallback(null);
  };

  // Keyboard Shortcuts (Tally style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside search input or active values dialog
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.id !== 'tally-print-dummy') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (activePrompt) {
        if (e.key === 'Escape') {
          setActivePrompt(null);
        } else if (e.key === 'Enter') {
          handlePromptSubmit();
        }
        return;
      }

      // Escape navigation
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'PREVIEW') {
          setMode('MENU');
        } else if (mode === 'CONFIG') {
          setMode('MENU');
        } else {
          onBack();
        }
        return;
      }

      // Main keyboard actions
      if (mode === 'MENU') {
        const key = e.key.toLowerCase();
        if (key === 'p' || e.key === 'Enter') {
          e.preventDefault();
          handlePrint();
        } else if (key === 'i') {
          e.preventDefault();
          setMode('PREVIEW');
        } else if (key === 'c') {
          e.preventDefault();
          setMode('CONFIG');
        } else if (e.key === 'F12') {
          e.preventDefault();
          setMode('CONFIG');
        } else if (key === 'e' || (e.altKey && key === 'e')) {
          e.preventDefault();
          handleExportPDF();
        } else if (key === 'm' || (e.altKey && key === 'm')) {
          e.preventDefault();
          handleEmail();
        } else if (key === 'w') {
          e.preventDefault();
          handleWhatsApp();
        } else if (e.key === 'F5') {
          e.preventDefault();
          openPrompt('Enter Number of Copies', String(config.numberOfCopies), (val) => {
            const num = Math.max(1, parseInt(val) || 1);
            setConfig(c => ({ ...c, numberOfCopies: num }));
            showNotice(`Copies set to: ${num}`);
          });
        } else if (e.key === 'F6') {
          e.preventDefault();
          const items = CONFIG_SCHEMA.find(x => x.id === 'printerSelection')?.options || [];
          openPrompt(`Enter Printer Select (1-${items.length})`, '1', (val) => {
            const idx = (parseInt(val) || 1) - 1;
            if (items[idx]) {
              setConfig(c => ({ ...c, printerSelection: items[idx] }));
              showNotice(`Printer set to: ${items[idx]}`);
            }
          });
        } else if (e.key === 'F7') {
          e.preventDefault();
          openPrompt('Enter Custom Title', config.reportTitle, (val) => {
            setConfig(c => ({ ...c, reportTitle: val }));
            showNotice(`Custom Title set`);
          });
        } else if (e.key === 'F8') {
          e.preventDefault();
          // Toggle format
          const formats: PrintConfig['printFormat'][] = ['Neat Mode', 'Dot Matrix Format', 'Quick/Draft Mode'];
          const nextIdx = (formats.indexOf(config.printFormat) + 1) % formats.length;
          setConfig(c => ({ ...c, printFormat: formats[nextIdx] }));
          showNotice(`Print Format set to: ${formats[nextIdx]}`);
        } else if (e.key === 'F9') {
          e.preventDefault();
          // Toggle paper type
          const paperTypes: PrintConfig['paperType'][] = ['Plain Paper', 'Pre-printed Paper'];
          const nextIdx = (paperTypes.indexOf(config.paperType) + 1) % paperTypes.length;
          setConfig(c => ({ ...c, paperType: paperTypes[nextIdx] }));
          showNotice(`Paper Type set to: ${paperTypes[nextIdx]}`);
        } else if (e.key === 'F10') {
          e.preventDefault();
          showNotice(`Pages to print: All Pages`);
        } else if (e.altKey && e.key.toLowerCase() === 'f7') {
          e.preventDefault();
          // Toggle company details
          setConfig(c => {
            const next = !c.showCompanyName;
            showNotice(`Company Name Header: ${next ? 'ENABLED' : 'DISABLED'}`);
            return { ...c, showCompanyName: next };
          });
        }
      } else if (mode === 'PREVIEW') {
        const key = e.key.toLowerCase();
        if (key === 'p' || e.key === 'Enter') {
          e.preventDefault();
          handlePrint();
        } else if (e.key === '+' || key === '=') {
          e.preventDefault();
          setZoom(z => Math.min(200, z + 10));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(z => Math.max(50, z - 10));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [mode, config, printData, activePrompt, promptValue, promptCallback]);

  if (!printData) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-tally-bg p-8 text-center uppercase">
        <p className="text-sm font-bold text-tally-teal uppercase tracking-widest">No report loaded for printing</p>
        <p className="text-[11px] text-gray-500 mt-2">Open Balance Sheet, P&amp;L, Trial Balance, Day Book, or Cash Book and press Alt+P.</p>
        <button onClick={onBack} className="mt-6 bg-tally-teal text-white px-6 py-1.5 text-xs font-bold border border-tally-hotkey hover:bg-teal-700">ESC: Back</button>
      </div>
    );
  }

  // Trigger browser print
  const handlePrint = async () => {
    setIsPrinting(true);
    showNotice("Preparing pages for print spooler...");
    await new Promise(resolve => setTimeout(resolve, 800));

    const html = generateTallyPrintHTML(printData, config);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Give it time to load fonts/styling
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 500);
    } else {
      setIsPrinting(false);
      alert("Popup blocked! Enable popups to allow print spooling.");
    }
  };

  // Simulate PDF Download
  const handleExportPDF = async () => {
    showNotice("Compiling PDF bytes...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate direct download
    const element = document.createElement('a');
    const file = new Blob([generateTallyPrintHTML(printData, config)], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    const docTitle = (config.reportTitle || printData.type).replace(/\s+/g, '_').toLowerCase();
    element.download = `${docTitle}_invoice_${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showNotice("PDF file downloaded successfully!");
  };

  // Simulate Email Direct
  const handleEmail = () => {
    openPrompt('Enter Destination Email Address', 'accounts@berithsystems.com', async (email) => {
      if (!email || !email.includes('@')) {
        alert("Invalid email format.");
        return;
      }
      showNotice(`Formatting attachment & connecting to SMTP...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      showNotice(`Email successfully sent to: ${email}`);
    });
  };

  // Simulate WhatsApp Direct
  const handleWhatsApp = () => {
    openPrompt('Enter WhatsApp Number (with country code)', '+919876543210', async (num) => {
      if (!num || num.length < 8) {
        alert("Invalid phone format.");
        return;
      }
      showNotice(`Encrypting document & sending via Tally WhatsApp gateway...`);
      await new Promise(resolve => setTimeout(resolve, 1800));
      showNotice(`Document successfully shared with: ${num}`);
    });
  };

  // Config toggler / editor
  const handleToggleConfig = (item: ConfigItem) => {
    if (item.type === 'boolean') {
      setConfig(c => ({ ...c, [item.id]: !c[item.id] }));
      showNotice(`${item.label} set to: ${!config[item.id] ? 'YES' : 'NO'}`);
    } else if (item.type === 'number') {
      openPrompt(`Enter value for ${item.label}`, String(config[item.id]), (val) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          setConfig(c => ({ ...c, [item.id]: num }));
          showNotice(`${item.label} set to: ${num}`);
        }
      });
    } else if (item.type === 'string') {
      openPrompt(`Enter text for ${item.label}`, String(config[item.id] || ''), (val) => {
        setConfig(c => ({ ...c, [item.id]: val }));
        showNotice(`${item.label} updated`);
      });
    } else if (item.type === 'enum' && item.options) {
      const idx = item.options.indexOf(String(config[item.id]));
      const nextIdx = (idx + 1) % item.options.length;
      setConfig(c => ({ ...c, [item.id]: item.options![nextIdx] }));
      showNotice(`${item.label} set to: ${item.options![nextIdx]}`);
    }
  };

  // Filtered configurations for F12 screen
  const filteredConfigs = CONFIG_SCHEMA.filter(item => {
    if (!searchQuery) return true;
    return (
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full bg-tally-bg select-none relative uppercase font-mono">
      {/* Hidden dummy input to catch cursor focus */}
      <input id="tally-print-dummy" autoFocus className="opacity-0 absolute top-0 left-0 w-0 h-0" />

      {/* Header Bar */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey shrink-0">
        <span className="text-[12px] font-bold flex items-center gap-2">
          <Printer className="w-4 h-4 text-tally-accent" />
          TallyPrime Printing Hub: {printData.companyName}
        </span>
        <span className="text-[10px] text-tally-accent italic">
          {mode === 'PREVIEW' ? 'Press ESC to close preview' : mode === 'CONFIG' ? 'Press ESC to save config' : 'Press ESC to go back'}
        </span>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold text-[11px] px-6 py-2 shadow-lg z-[200] border-2 border-black"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Value Input Dialog Modal */}
      <AnimatePresence>
        {activePrompt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[210] backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-[350px] border-4 border-tally-teal shadow-2xl overflow-hidden uppercase text-black"
            >
              <div className="bg-tally-teal text-white px-3 py-1.5 text-[10px] font-bold flex justify-between items-center">
                <span>{activePrompt}</span>
                <button onClick={() => setActivePrompt(null)} className="hover:text-red-300 text-xs">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  className="w-full border-2 border-tally-teal p-2 text-xs outline-none bg-blue-50/50 uppercase font-bold text-center"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handlePromptSubmit}
                    className="bg-tally-teal text-white px-4 py-1 text-[11px] font-bold"
                  >
                    Accept (Enter)
                  </button>
                  <button
                    onClick={() => setActivePrompt(null)}
                    className="bg-gray-200 text-black px-4 py-1 text-[11px] font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Render Main Print Menu Dashboard */}
      {mode === 'MENU' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Summary & Printer Settings */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="bg-white border-2 border-tally-teal p-4 tally-shadow">
              <h3 className="text-xs font-bold text-tally-teal border-b border-tally-teal/20 pb-1.5 mb-3 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                Printer Configuration Status
              </h3>
              
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-[11px] font-semibold text-black">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Printer Destination:</span>
                  <span className="text-blue-800 font-bold">{config.printerSelection}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Paper Dimensions:</span>
                  <span className="text-blue-800 font-bold">{config.paperSize} ({config.orientation})</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Number of Copies:</span>
                  <span className="text-blue-800 font-bold">{config.numberOfCopies} ({config.copyType} style)</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Scaling Factor:</span>
                  <span className="text-blue-800 font-bold">{config.scaling}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Print Margins (L/R/T/B):</span>
                  <span className="text-blue-800 font-bold">
                    {config.marginLeft}/{config.marginRight}/{config.marginTop}/{config.marginBottom} mm
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">Stationery Paper:</span>
                  <span className="text-blue-800 font-bold">{config.paperType}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1 col-span-2">
                  <span className="text-gray-400">Active Printer Output Format:</span>
                  <span className="text-yellow-600 font-black">{config.printFormat}</span>
                </div>
              </div>
            </div>

            {/* Document Data Details */}
            <div className="bg-white border-2 border-tally-teal p-4 tally-shadow">
              <h3 className="text-xs font-bold text-tally-teal border-b border-tally-teal/20 pb-1.5 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Print Job Target Details
              </h3>
              
              <div className="space-y-2 text-[11px] font-bold text-black">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subject Entity:</span>
                  <span>{printData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Print Layout Type:</span>
                  <span className="text-tally-teal">{printData.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-400">Default Title:</span>
                  <span>{config.reportTitle || (printData.type === 'voucher' ? `${printData.voucherType} Voucher` : `${printData.type} statement`)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar Menu (Tally style) */}
          <aside className="w-[200px] bg-tally-teal text-white flex flex-col shrink-0 border-l border-tally-hotkey">
            <button onClick={handlePrint} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">P: Print</span>
              <span className="text-[9px] text-teal-200 italic">Spool to printer</span>
            </button>
            <button onClick={() => setMode('PREVIEW')} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">I: Preview</span>
              <span className="text-[9px] text-teal-200 italic">Live layout review</span>
            </button>
            <button onClick={() => setMode('CONFIG')} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">C: Configure (F12)</span>
              <span className="text-[9px] text-teal-200 italic">Toggle layouts/details</span>
            </button>
            <button onClick={handleExportPDF} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">E: Export PDF</span>
              <span className="text-[9px] text-teal-200 italic">Save document to disk</span>
            </button>
            <button onClick={handleEmail} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">M: E-mail Direct</span>
              <span className="text-[9px] text-teal-200 italic">Mail PDF attachment</span>
            </button>
            <button onClick={handleWhatsApp} className="hotkey-btn flex flex-col items-start gap-0.5 justify-center py-2 px-3 border-b border-white/5 hover:bg-tally-hotkey">
              <span className="text-[12px] font-bold">W: WhatsApp Share</span>
              <span className="text-[9px] text-teal-200 italic">Share digital invoice</span>
            </button>
            
            <div className="h-4 bg-black/10"></div>
            
            {/* Quick helper shortcuts in Sidebar */}
            <div className="p-2 space-y-1.5 text-[9px] text-teal-100 opacity-85">
              <div><b className="text-yellow-300">F5:</b> Copies ({config.numberOfCopies})</div>
              <div><b className="text-yellow-300">F6:</b> Printer setup</div>
              <div><b className="text-yellow-300">F7:</b> Title change</div>
              <div><b className="text-yellow-300">F8:</b> {config.printFormat}</div>
              <div><b className="text-yellow-300">F9:</b> {config.paperType}</div>
              <div><b className="text-yellow-300">F10:</b> Pages Range</div>
            </div>

            <button onClick={onBack} className="hotkey-btn mt-auto bg-red-800 text-white font-bold py-2 px-3 text-center border-t border-red-700 hover:bg-red-700">
              Esc: Cancel
            </button>
          </aside>
        </div>
      )}

      {/* Render Searchable Config Panel (F12 Screen) */}
      {mode === 'CONFIG' && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden text-black p-4">
          <div className="flex items-center gap-3 border-b-2 border-tally-teal pb-3 mb-3 shrink-0">
            <Settings className="w-5 h-5 text-tally-teal" />
            <h2 className="text-sm font-bold text-tally-teal">Print Configuration Panel (F12)</h2>
            <div className="flex-1 max-w-[300px] relative ml-auto">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 outline-none bg-blue-50/50 uppercase font-semibold"
              />
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-red-500 font-bold hover:underline">
                Clear
              </button>
            )}
          </div>

          {/* Configs Scroll List */}
          <div className="flex-1 overflow-y-auto border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 text-left sticky top-0 z-10 border-b border-gray-300">
                  <th className="p-2 w-[180px]">Category</th>
                  <th className="p-2 w-[220px]">Option Name</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 w-[160px] text-right">Value / Toggle</th>
                </tr>
              </thead>
              <tbody>
                {filteredConfigs.length > 0 ? (
                  filteredConfigs.map((item) => {
                    const val = config[item.id];
                    let displayVal = '';
                    if (item.type === 'boolean') displayVal = val ? 'YES' : 'NO';
                    else displayVal = String(val);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleConfig(item)}
                        className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer font-semibold transition-colors"
                      >
                        <td className="p-2 text-gray-400 font-bold uppercase">{item.category}</td>
                        <td className="p-2 text-tally-teal bold">{item.label}</td>
                        <td className="p-2 text-gray-600 font-normal italic lowercase">{item.description}</td>
                        <td className="p-2 text-right">
                          <span className={`px-3 py-0.5 rounded font-black ${
                            item.type === 'boolean'
                              ? val
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {displayVal}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                      No configurations match your query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end gap-3 border-t pt-3 shrink-0">
            <button
              onClick={() => setMode('MENU')}
              className="bg-tally-teal text-white px-6 py-1.5 text-xs font-bold hover:bg-teal-700"
            >
              ESC: Save &amp; Return
            </button>
          </div>
        </div>
      )}

      {/* Render Live HTML iframe Preview Mode */}
      {mode === 'PREVIEW' && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden text-black">
          {/* Zoom controls & back */}
          <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode('MENU')}
                className="bg-gray-200 hover:bg-gray-300 text-black px-4 py-1 text-xs font-bold border border-gray-400 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> ESC: Close Preview
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="bg-tally-teal hover:bg-teal-700 text-white px-4 py-1 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> {isPrinting ? 'Printing...' : 'Print Now (Enter)'}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                className="p-1 hover:bg-gray-200 rounded border"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(200, z + 10))}
                className="p-1 hover:bg-gray-200 rounded border"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* IFrame Preview container */}
          <div className="flex-1 bg-gray-600 overflow-auto p-8 flex justify-center items-start">
            <div
              className="bg-white shadow-2xl origin-top transition-transform"
              style={{
                width: config.orientation === 'Landscape' ? '297mm' : '210mm',
                minHeight: config.orientation === 'Landscape' ? '210mm' : '297mm',
                transform: `scale(${zoom / 100})`,
                margin: '0 auto',
                padding: '20px'
              }}
            >
              <iframe
                ref={previewIframeRef}
                className="w-full border-none"
                style={{
                  height: config.orientation === 'Landscape' ? '190mm' : '270mm',
                }}
                title="Tally Print Live Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
