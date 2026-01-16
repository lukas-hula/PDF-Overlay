"use client";
import React, { useState, useEffect } from 'react';
import { Upload, Download, Type, FileText, ChevronLeft, ChevronRight, Trash2, RefreshCw, Square, Palette } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Pomocná funkce pro převod barev pro Color Picker
const rgbToHex = (colors: [number, number, number]) => {
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(colors[0])}${toHex(colors[1])}${toHex(colors[2])}`;
};

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });
import { pdfjs } from 'react-pdf';

interface EditorElement {
  id: number;
  type: 'text' | 'shape';
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  page: number;
  fontSize?: number;
  color: [number, number, number];
  opacity?: number;
  isBold?: boolean;
}

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const setWorker = async () => {
        const pdfjs = await import('react-pdf');
        pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
    };
    setWorker();
  }, []);

  const updateElement = (id: number, updates: Partial<EditorElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addText = () => {
    const newEl: EditorElement = { id: Date.now(), type: 'text', text: "Nový text", x: 100, y: 100, page: pageNumber, fontSize: 16, color: [0, 0, 0], isBold: false };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const addShape = () => {
    const newEl: EditorElement = { id: Date.now(), type: 'shape', x: 150, y: 150, width: 100, height: 50, page: pageNumber, color: [0.9, 0.9, 0], opacity: 0.5 };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const handlePointerDown = (e: React.PointerEvent, el: EditorElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = el.x;
    const initialY = el.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      updateElement(el.id, { x: initialX + deltaX, y: initialY + deltaY });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResizeDown = (e: React.PointerEvent, el: EditorElement) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.width || 0;
    const startH = el.height || 0;

    const onResizeMove = (moveEvent: PointerEvent) => {
      updateElement(el.id, { 
        width: Math.max(20, startW + (moveEvent.clientX - startX)), 
        height: Math.max(20, startH + (moveEvent.clientY - startY)) 
      });
    };

    const onResizeUp = () => {
      window.removeEventListener('pointermove', onResizeMove);
      window.removeEventListener('pointerup', onResizeUp);
    };

    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
  };

  const downloadPDF = async () => {
    if (!pdfFile) return;
    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const fontStd = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    elements.forEach((el) => {
      const page = pages[el.page - 1];
      const { width, height } = page.getSize();
      const pdfX = (el.x * width) / 700;
      const pdfY = height - (el.y * height) / 1000;

      if (el.type === 'text') {
        page.drawText(el.text || '', { x: pdfX, y: pdfY - (el.fontSize || 16), size: el.fontSize, font: el.isBold ? fontBold : fontStd, color: rgb(el.color[0], el.color[1], el.color[2]) });
      } else if (el.type === 'shape') {
        page.drawRectangle({ x: pdfX, y: pdfY - ((el.height || 50) * height / 1000), width: (el.width || 100) * width / 700, height: (el.height || 50) * height / 1000, color: rgb(el.color[0], el.color[1], el.color[2]), opacity: el.opacity || 0.5 });
      }
    });

    const pdfBytes = await pdfDoc.save();
    const link = document.createElement("a");
    
    // Fix pro Vercel build: explicitně přetypujeme uint8array pro BlobPart
    // @ts-ignore
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `editovane_${pdfFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-2xl z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg"><FileText size={20} /></div>
          <h1 className="font-bold text-xl tracking-tight leading-none">PDF Professional Overlay</h1>
          {pdfFile && (
            <button 
              onClick={() => {
                setPdfFile(null);
                setElements([]);
                setSelectedId(null);
                setNumPages(0);
                setPageNumber(1);
              }} 
              className="ml-4 flex items-center gap-2 text-[10px] bg-slate-800 hover:bg-red-900 px-3 py-1.5 rounded-full transition-all border border-slate-700 text-slate-400 hover:text-white uppercase font-bold tracking-widest"
            >
              <RefreshCw size={12} /> Změnit PDF
            </button>
          )}
        </div>
        
        {pdfFile && (
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
                <button onClick={addText} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-md active:scale-95"><Type size={16} /> Text</button>
                <button onClick={addShape} className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-md active:scale-95"><Square size={16} /> Tvar</button>
            </div>
            <div className="h-8 w-[1px] bg-slate-700" />
            <div className="flex items-center bg-slate-800 rounded-full px-2 py-1 border border-slate-700 font-mono text-xs text-slate-300">
              <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-20 transition"><ChevronLeft /></button>
              <span className="px-4 text-[10px] tracking-widest">STRANA {pageNumber} / {numPages}</span>
              <button onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))} disabled={pageNumber >= numPages} className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-20 transition"><ChevronRight /></button>
            </div>
            <button onClick={downloadPDF} className="bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-full flex items-center gap-2 transition-all font-bold text-sm shadow-lg shadow-emerald-500/20"><Download size={18} /> Exportovat</button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 p-6 shadow-sm overflow-y-auto hidden md:block text-slate-700">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Vlastnosti</h3>
          {selectedId ? (
            <div className="space-y-6">
              {elements.filter(el => el.id === selectedId).map(el => (
                <div key={el.id} className="space-y-6">
                  {el.type === 'text' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Obsah textu</label>
                        <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={el.text} onChange={(e) => updateElement(el.id, { text: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Písmo ({el.fontSize}px)</label>
                        <input type="range" min="8" max="72" className="w-full" value={el.fontSize} onChange={(e) => updateElement(el.id, { fontSize: parseInt(e.target.value) })} />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Průhlednost: {Math.round((el.opacity || 0) * 100)}%</label>
                      <input type="range" min="0.1" max="1" step="0.1" className="w-full" value={el.opacity} onChange={(e) => updateElement(el.id, { opacity: parseFloat(e.target.value) })} />
                    </div>
                  )}
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center tracking-widest">Barva prvku</label>
                    <div className="flex justify-center gap-1.5 items-center flex-wrap">
                      {[ 
                        {n:'Černá', v:[0,0,0]}, 
                        {n:'Bílá', v:[1,1,1]}, 
                        {n:'Červená', v:[0.8,0,0]}, 
                        {n:'Modrá', v:[0,0.3,0.8]} 
                      ].map(c => (
                        <button 
                          key={c.n} 
                          onClick={() => updateElement(el.id, { color: c.v as [number,number,number] })} 
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${JSON.stringify(el.color) === JSON.stringify(c.v) ? 'border-blue-500 shadow-md' : 'border-slate-200'}`} 
                          style={{ backgroundColor: `rgb(${c.v[0]*255}, ${c.v[1]*255}, ${c.v[2]*255})` }}
                          title={c.n}
                        />
                      ))}
                      
                      <div className="relative w-7 h-7 ml-1">
                        <input 
                          type="color" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          value={rgbToHex(el.color)}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16) / 255;
                            const g = parseInt(hex.slice(3, 5), 16) / 255;
                            const b = parseInt(hex.slice(5, 7), 16) / 255;
                            updateElement(el.id, { color: [r, g, b] });
                          }}
                        />
                        <div className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-sm">
                          <Palette size={12} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {el.type === 'text' && <button onClick={() => updateElement(el.id, { isBold: !el.isBold })} className={`w-full py-2 rounded-lg border text-sm font-bold transition ${el.isBold ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'}`}>Tučné písmo</button>}
                  <button onClick={() => { setElements(elements.filter(e => e.id !== el.id)); setSelectedId(null); }} className="w-full py-2 rounded-lg text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 transition text-sm flex items-center justify-center gap-2 font-bold uppercase tracking-tighter">ODSTRANIT</button>
                </div>
              ))}
            </div>
          ) : ( <p className="text-xs text-slate-400 italic text-center py-10">Vyberte prvek na PDF</p> )}
        </aside>

        <section className="flex-1 bg-slate-200 p-8 overflow-auto flex justify-center items-start relative">
          {!pdfFile ? (
            <div className="bg-white p-12 rounded-3xl shadow-2xl text-center border-4 border-dashed border-slate-300 max-w-lg w-full flex flex-col items-center">
              <div className="bg-blue-50 p-6 rounded-full mb-4 text-blue-500"><Upload size={48} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Nahrát dokument</h2>
              <p className="text-slate-500 mb-8 text-balance font-medium">Vyberte PDF soubor, do kterého chcete přidat nové prvky.</p>
              <input type="file" accept="application/pdf" onChange={(e) => e.target.files && setPdfFile(e.target.files[0])} id="pdf-in" className="hidden" />
              <label htmlFor="pdf-in" className="cursor-pointer bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-black transition shadow-xl block uppercase tracking-wide">Vybrat soubor</label>
            </div>
          ) : (
            <div className="relative bg-white shadow-2xl border border-slate-300 rounded-sm overflow-hidden" style={{ width: '700px' }}>
              <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div className="absolute inset-0 pointer-events-none">
                {elements.filter(el => el.page === pageNumber).map((el) => (
                  <div
                    key={el.id}
                    onPointerDown={(e) => handlePointerDown(e, el)}
                    className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing border-2 transition-shadow ${selectedId === el.id ? 'border-blue-500 bg-white/10 shadow-lg' : 'border-transparent'}`}
                    style={{ left: `${el.x}px`, top: `${el.y}px`, width: el.type === 'shape' ? `${el.width}px` : 'auto', height: el.type === 'shape' ? `${el.height}px` : 'auto', zIndex: selectedId === el.id ? 100 : 10 }}
                  >
                    {el.type === 'text' ? (
                      <span style={{ fontSize: `${el.fontSize}px`, color: `rgb(${el.color[0]*255}, ${el.color[1]*255}, ${el.color[2]*255})`, fontWeight: el.isBold ? 'bold' : 'normal', whiteSpace: 'nowrap', display: 'block', userSelect: 'none' }}>{el.text}</span>
                    ) : (
                      <div className="relative w-full h-full" style={{ backgroundColor: `rgb(${el.color[0]*255}, ${el.color[1]*255}, ${el.color[2]*255})`, opacity: el.opacity }}>
                        {selectedId === el.id && (
                          <div 
                            className="absolute bottom-[-6px] right-[-6px] w-4 h-4 bg-blue-600 cursor-se-resize shadow-md border-2 border-white rounded-full z-[110]"
                            onPointerDown={(e) => handleResizeDown(e, el)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}