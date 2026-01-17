"use client";
import React, { useState, useEffect } from 'react';
import { Upload, Download, Type, FileText, RefreshCw, Square, Palette, Bold, Italic } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const FONT_OPTIONS = [
  { id: 'roboto', name: 'Roboto (Základní)', css: "'Roboto', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf' },
  { id: 'montserrat', name: 'Montserrat (Moderní)', css: "'Montserrat', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf' },
  { id: 'open-sans', name: 'Open Sans (Čisté)', css: "'Open Sans', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf' },
  { id: 'lato', name: 'Lato (Elegantní)', css: "'Lato', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf' },
  { id: 'poppins', name: 'Poppins (Geometrický)', css: "'Poppins', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf' },
  { id: 'playfair', name: 'Playfair (Luxusní Serif)', css: "'Playfair Display', serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf' },
  { id: 'lora', name: 'Lora (Knižní)', css: "'Lora', serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora-Regular.ttf' },
  { id: 'merriweather', name: 'Merriweather (Čtivé)', css: "'Merriweather', serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather-Regular.ttf' },
  { id: 'dancing', name: 'Dancing Script (Psací)', css: "'Dancing Script', cursive", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf' },
  { id: 'caveat', name: 'Caveat (Fixka)', css: "'Caveat', cursive", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf' },
  { id: 'pacifico', name: 'Pacifico (Retro)', css: "'Pacifico', cursive", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/pacifico/Pacifico-Regular.ttf' },
  { id: 'lobster', name: 'Lobster (Nadpis)', css: "'Lobster', cursive", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lobster/Lobster-Regular.ttf' },
  { id: 'jetbrains', name: 'JetBrains Mono (Kód)', css: "'JetBrains Mono', monospace", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf' },
  { id: 'space-mono', name: 'Space Mono (Sci-Fi)', css: "'Space Mono', monospace", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Regular.ttf' },
  { id: 'ubuntu-mono', name: 'Ubuntu Mono', css: "'Ubuntu Mono', monospace", url: 'https://raw.githubusercontent.com/google/fonts/main/ufl/ubuntumono/UbuntuMono-Regular.ttf' },
  { id: 'courier-prime', name: 'Courier Prime (Stroj)', css: "'Courier Prime', monospace", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/courierprime/CourierPrime-Regular.ttf' },
];

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

interface EditorElement {
  id: number; type: 'text' | 'shape'; text?: string; x: number; y: number; width?: number; height?: number; 
  page: number; fontSize: number; fontFamily: string; color: [number, number, number]; opacity?: number; 
  isBold: boolean; isItalic: boolean;
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

  const downloadPDF = async () => {
    if (!pdfFile) return;
    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const pages = pdfDoc.getPages();
    const fontCache: Record<string, any> = {};

    for (const el of elements) {
      const page = pages[el.page - 1];
      const { width, height } = page.getSize();
      const pdfX = (el.x * width) / 700;
      const pdfY = height - (el.y * height) / 1000;

      if (el.type === 'text') {
        const fontInfo = FONT_OPTIONS.find(f => f.id === el.fontFamily) || FONT_OPTIONS[0];
        if (!fontCache[el.fontFamily]) {
          const fontBytes = await fetch(fontInfo.url).then(res => res.arrayBuffer());
          fontCache[el.fontFamily] = await pdfDoc.embedFont(fontBytes);
        }
        page.drawText(el.text || '', {
          x: pdfX, y: pdfY - (el.fontSize), size: el.fontSize,
          font: fontCache[el.fontFamily],
          color: rgb(el.color[0], el.color[1], el.color[2]),
        });
      } else if (el.type === 'shape') {
        page.drawRectangle({
          x: pdfX, y: pdfY - ((el.height || 50) * height / 1000),
          width: (el.width || 100) * width / 700,
          height: (el.height || 50) * height / 1000,
          color: rgb(el.color[0], el.color[1], el.color[2]),
          opacity: el.opacity || 0.5,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_${pdfFile.name}`;
    link.click();
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Dancing+Script:wght@400;700&family=Caveat:wght@400;700&family=Pacifico&family=Lobster&family=Space+Mono:wght@400;700&family=Ubuntu+Mono:wght@400;700&family=Courier+Prime:wght@400;700&display=swap');
      `}} />

      <header className="bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg"><FileText size={20} /></div>
          <h1 className="font-bold text-xl tracking-tight">PDF Professional</h1>
          {pdfFile && (
            <button onClick={() => { setPdfFile(null); setElements([]); setSelectedId(null); }} className="ml-4 flex items-center gap-2 text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:text-white uppercase font-bold transition-all shadow-sm">
              <RefreshCw size={12} /> Změnit PDF
            </button>
          )}
        </div>
        
        {pdfFile && (
          <div className="flex items-center gap-4">
            <button onClick={() => {
                const newEl: EditorElement = { id: Date.now(), type: 'text', text: "Upravitelný text", x: 100, y: 100, page: pageNumber, fontSize: 24, fontFamily: 'roboto', color: [0, 0, 0], isBold: false, isItalic: false };
                setElements([...elements, newEl]); setSelectedId(newEl.id);
            }} className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:bg-blue-700 active:scale-95"><Type size={16} /> Text</button>
            <button onClick={() => {
                const newEl: EditorElement = { id: Date.now(), type: 'shape', x: 150, y: 150, width: 100, height: 50, page: pageNumber, fontSize: 0, fontFamily: 'roboto', color: [0.9, 0.9, 0], opacity: 0.5, isBold: false, isItalic: false };
                setElements([...elements, newEl]); setSelectedId(newEl.id);
            }} className="bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:bg-orange-700 active:scale-95"><Square size={16} /> Tvar</button>
            <button onClick={downloadPDF} className="bg-emerald-500 px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 ml-4 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"><Download size={18} /> Export</button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 p-6 overflow-y-auto hidden md:block shadow-inner">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Nastavení prvku</h3>
           {selectedId ? (
             <div className="space-y-6">
               {elements.filter(el => el.id === selectedId).map(el => (
                 <div key={el.id} className="space-y-5">
                   {el.type === 'text' && (
                     <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Obsah</label>
                            <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={el.text} onChange={(e) => updateElement(el.id, { text: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block font-mono">Písmo</label>
                            <select className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 outline-none" value={el.fontFamily} onChange={(e) => updateElement(el.id, { fontFamily: e.target.value })}>
                                {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => updateElement(el.id, { isBold: !el.isBold })} className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${el.isBold ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Bold size={12} className="inline mr-1" /> BOLD</button>
                            <button onClick={() => updateElement(el.id, { isItalic: !el.isItalic })} className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${el.isItalic ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Italic size={12} className="inline mr-1" /> ITALIC</button>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-tight">Velikost: {el.fontSize}px</label>
                            <input type="range" min="8" max="150" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" value={el.fontSize} onChange={(e) => updateElement(el.id, { fontSize: parseInt(e.target.value) })} />
                        </div>
                     </>
                   )}
                   {el.type === 'shape' && (
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Průhlednost: {Math.round((el.opacity || 0) * 100)}%</label>
                       <input type="range" min="0.1" max="1" step="0.1" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600" value={el.opacity} onChange={(e) => updateElement(el.id, { opacity: parseFloat(e.target.value) })} />
                     </div>
                   )}
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block text-center">Barva</label>
                     <div className="flex justify-center gap-2 flex-wrap">
                       {[[0,0,0], [1,1,1], [0.8,0,0], [0,0.3,0.8], [0.1,0.6,0.1]].map((v, i) => (
                         <button key={i} onClick={() => updateElement(el.id, { color: v as [number,number,number] })} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${JSON.stringify(el.color) === JSON.stringify(v) ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10' : 'border-slate-100'}`} style={{ backgroundColor: `rgb(${v[0]*255},${v[1]*255},${v[2]*255})` }} />
                       ))}
                       <div className="relative w-7 h-7 group">
                          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => {
                              const h = e.target.value;
                              updateElement(el.id, { color: [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255] });
                          }} />
                          <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-sm"><Palette size={12} className="text-white" /></div>
                       </div>
                     </div>
                   </div>
                   <button onClick={() => { setElements(elements.filter(e => e.id !== el.id)); setSelectedId(null); }} className="w-full py-2 bg-red-50 text-red-500 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Smazat prvek</button>
                 </div>
               ))}
             </div>
           ) : <div className="py-20 text-center opacity-20"><Type size={40} className="mx-auto mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">Vyberte prvek</p></div>}
        </aside>

        <section className="flex-1 bg-slate-200 p-8 overflow-auto flex justify-center items-start relative shadow-inner">
          {!pdfFile ? (
            <div className="bg-white p-16 rounded-[40px] shadow-2xl text-center border-4 border-dashed border-slate-300 max-w-lg w-full mt-10">
              <Upload size={48} className="mx-auto text-blue-500 mb-4" />
              <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">PDF Overlay Editor</h2>
              {/* ŠEDÝ TEXT ZDE: */}
              <p className="text-slate-400 text-sm mb-6 font-medium">Nahrajte dokument a začněte upravovat.</p>
              <input type="file" accept="application/pdf" onChange={(e) => { if(e.target.files?.[0]) setPdfFile(e.target.files[0]); }} id="pdf-in" className="hidden" />
              <label htmlFor="pdf-in" className="cursor-pointer bg-slate-900 text-white px-10 py-4 rounded-xl font-bold inline-block hover:bg-black transition-all shadow-xl uppercase tracking-widest text-xs">Vybrat dokument</label>
            </div>
          ) : (
            <div className="relative bg-white shadow-2xl border border-slate-300 mb-20" style={{ width: '700px' }}>
              <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div className="absolute inset-0 pointer-events-none">
                {elements.filter(el => el.page === pageNumber).map((el) => (
                  <div key={el.id} 
                    onPointerDown={(e) => {
                        e.stopPropagation(); setSelectedId(el.id);
                        const sX = e.clientX, sY = e.clientY, iX = el.x, iY = el.y;
                        const onMove = (mE: PointerEvent) => updateElement(el.id, { x: iX + (mE.clientX - sX), y: iY + (mE.clientY - sY) });
                        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
                    }} 
                    className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing border-2 ${selectedId === el.id ? 'border-blue-500 bg-blue-500/5 shadow-lg ring-4 ring-blue-500/10' : 'border-transparent hover:border-blue-200/50'}`} 
                    style={{ left: el.x, top: el.y, width: el.type === 'shape' ? el.width : 'auto', height: el.type === 'shape' ? el.height : 'auto', zIndex: selectedId === el.id ? 100 : 10 }}>
                    {el.type === 'text' ? (
                        <span style={{ 
                            fontSize: el.fontSize, color: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, 
                            fontFamily: FONT_OPTIONS.find(f => f.id === el.fontFamily)?.css || 'sans-serif',
                            fontWeight: el.isBold ? 'bold' : 'normal', fontStyle: el.isItalic ? 'italic' : 'normal', 
                            userSelect: 'none', whiteSpace: 'nowrap', display: 'block', lineHeight: 1
                        }}>{el.text}</span>
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, opacity: el.opacity }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center bg-white px-5 py-2 rounded-full shadow-lg border border-slate-100 text-[11px] font-bold gap-4 transition-all hover:shadow-xl">
                <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} className="hover:text-blue-500 disabled:opacity-20 uppercase tracking-tighter transition-colors" disabled={pageNumber === 1}>Předchozí</button>
                <span className="bg-slate-50 px-3 py-1 rounded-full text-slate-500 font-mono">{pageNumber} / {numPages}</span>
                <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} className="hover:text-blue-500 disabled:opacity-20 uppercase tracking-tighter transition-colors" disabled={pageNumber === numPages}>Další</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}