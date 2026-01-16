"use client";
import React, { useState, useEffect } from 'react';
import { Upload, Download, Type, FileText, ChevronLeft, ChevronRight, Trash2, RefreshCw, Square, Palette } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const rgbToHex = (colors: [number, number, number]) => {
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(colors[0])}${toHex(colors[1])}${toHex(colors[2])}`;
};

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

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

  const logAction = async (action: string, details: any = {}) => {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, fileName: pdfFile?.name || 'no-file', details }),
      });
    } catch (err) { console.error("Log error"); }
  };

  const updateElement = (id: number, updates: Partial<EditorElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addText = () => {
    const newEl: EditorElement = { id: Date.now(), type: 'text', text: "Nový text", x: 100, y: 100, page: pageNumber, fontSize: 16, color: [0, 0, 0], isBold: false };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    logAction("ADD_TEXT");
  };

  const addShape = () => {
    const newEl: EditorElement = { id: Date.now(), type: 'shape', x: 150, y: 150, width: 100, height: 50, page: pageNumber, color: [0.9, 0.9, 0], opacity: 0.5 };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    logAction("ADD_SHAPE");
  };

  const handlePointerDown = (e: React.PointerEvent, el: EditorElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = el.x;
    const initialY = el.y;
    const onMove = (mE: PointerEvent) => updateElement(el.id, { x: initialX + (mE.clientX - startX), y: initialY + (mE.clientY - startY) });
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      logAction("MOVE_ELEMENT");
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
    // @ts-ignore
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `editované_${pdfFile.name}`;
    link.click();
    logAction("EXPORT_PDF");
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg"><FileText size={20} /></div>
          <h1 className="font-bold text-xl">PDF Professional Overlay</h1>
          {pdfFile && (
            <button onClick={() => { setPdfFile(null); setElements([]); setSelectedId(null); }} className="ml-4 flex items-center gap-2 text-[10px] bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-white uppercase font-bold tracking-widest transition-all">
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
            <div className="flex items-center bg-slate-800 rounded-full px-2 py-1 border border-slate-700 font-mono text-xs text-slate-300">
              <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-20"><ChevronLeft /></button>
              <span className="px-4">STRANA {pageNumber} / {numPages}</span>
              <button onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))} disabled={pageNumber >= numPages} className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-20"><ChevronRight /></button>
            </div>
            <button onClick={downloadPDF} className="bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-full flex items-center gap-2 transition-all font-bold text-sm shadow-lg"><Download size={18} /> Exportovat</button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 p-6 overflow-y-auto hidden md:block">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Vlastnosti</h3>
          {selectedId ? (
            <div className="space-y-6">
              {elements.filter(el => el.id === selectedId).map(el => (
                <div key={el.id} className="space-y-6">
                  {el.type === 'text' ? (
                    <>
                      <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={el.text} onChange={(e) => updateElement(el.id, { text: e.target.value })} />
                      <input type="range" min="8" max="72" className="w-full" value={el.fontSize} onChange={(e) => updateElement(el.id, { fontSize: parseInt(e.target.value) })} />
                    </>
                  ) : (
                    <input type="range" min="0.1" max="1" step="0.1" className="w-full" value={el.opacity} onChange={(e) => updateElement(el.id, { opacity: parseFloat(e.target.value) })} />
                  )}
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {[{n:'Black',v:[0,0,0]},{n:'White',v:[1,1,1]},{n:'Red',v:[0.8,0,0]},{n:'Blue',v:[0,0.3,0.8]}].map(c => (
                      <button key={c.n} onClick={() => updateElement(el.id, { color: c.v as [number,number,number] })} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: `rgb(${c.v[0]*255}, ${c.v[1]*255}, ${c.v[2]*255})` }} />
                    ))}
                    <div className="relative w-7 h-7">
                      <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                        const h = e.target.value;
                        updateElement(el.id, { color: [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255] });
                      }} />
                      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-pink-500"><Palette size={12} className="text-white" /></div>
                    </div>
                  </div>
                  <button onClick={() => { setElements(elements.filter(e => e.id !== el.id)); setSelectedId(null); }} className="w-full py-2 rounded-lg text-red-500 border border-red-100 bg-red-50 font-bold text-xs uppercase transition-all hover:bg-red-100">Odstranit</button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-400 italic text-center py-10">Vyberte prvek</p>}
        </aside>

        <section className="flex-1 bg-slate-200 p-8 overflow-auto flex justify-center items-start">
          {!pdfFile ? (
            <div className="bg-white p-12 rounded-3xl shadow-2xl text-center border-4 border-dashed border-slate-300 max-w-lg w-full flex flex-col items-center">
              <div className="bg-blue-50 p-6 rounded-full mb-4 text-blue-500"><Upload size={48} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Nahrát dokument</h2>
              <p className="text-slate-500 mb-8 font-medium">Vyberte PDF soubor pro vložení prvků.</p>
              <input type="file" accept="application/pdf" onChange={(e) => { if(e.target.files?.[0]) { setPdfFile(e.target.files[0]); logAction("UPLOAD_PDF"); } }} id="pdf-in" className="hidden" />
              <label htmlFor="pdf-in" className="cursor-pointer bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-black transition-all shadow-xl block uppercase tracking-wide">Vybrat soubor</label>
            </div>
          ) : (
            <div className="relative bg-white shadow-2xl border border-slate-300 rounded-sm overflow-hidden" style={{ width: '700px' }}>
              <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div className="absolute inset-0 pointer-events-none">
                {elements.filter(el => el.page === pageNumber).map((el) => (
                  <div key={el.id} onPointerDown={(e) => handlePointerDown(e, el)} className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing border-2 ${selectedId === el.id ? 'border-blue-500 bg-white/10 shadow-lg' : 'border-transparent'}`} style={{ left: el.x, top: el.y, width: el.type === 'shape' ? el.width : 'auto', height: el.type === 'shape' ? el.height : 'auto', zIndex: selectedId === el.id ? 100 : 10 }}>
                    {el.type === 'text' ? <span style={{ fontSize: el.fontSize, color: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, fontWeight: el.isBold ? 'bold' : 'normal', userSelect: 'none' }}>{el.text}</span> : <div className="w-full h-full" style={{ backgroundColor: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, opacity: el.opacity }} />}
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

interface EditorElement { id: number; type: 'text' | 'shape'; text?: string; x: number; y: number; width?: number; height?: number; page: number; fontSize?: number; color: [number, number, number]; opacity?: number; isBold?: boolean; }