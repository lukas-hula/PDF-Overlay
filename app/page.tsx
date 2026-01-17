"use client";
import React, { useState, useEffect } from 'react';
import { Upload, Download, Type, FileText, RefreshCw, Square, Palette, Bold, Italic } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const FONT_OPTIONS = [
  { id: 'roboto', name: 'Roboto', css: "'Roboto', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf' },
  { id: 'montserrat', name: 'Montserrat', css: "'Montserrat', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf' },
  { id: 'open-sans', name: 'Open Sans', css: "'Open Sans', sans-serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf' },
  { id: 'playfair', name: 'Playfair', css: "'Playfair Display', serif", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf' },
  { id: 'dancing', name: 'Dancing Script', css: "'Dancing Script', cursive", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf' },
  { id: 'jetbrains', name: 'JetBrains Mono', css: "'JetBrains Mono', monospace", url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf' },
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
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    setIsClient(true);
    const setWorker = async () => {
        const pdfjs = await import('react-pdf');
        pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
    };
    setWorker();

    // Dynamický výpočet šířky pro mobily
    const handleResize = () => {
      const width = Math.min(window.innerWidth - 40, 700);
      setContainerWidth(width);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      // Přepočet souřadnic z relativního kontejneru na reálnou velikost PDF
      const pdfX = (el.x * width) / containerWidth;
      const pdfY = height - (el.y * height) / (containerWidth * (height/width));

      if (el.type === 'text') {
        const fontInfo = FONT_OPTIONS.find(f => f.id === el.fontFamily) || FONT_OPTIONS[0];
        if (!fontCache[el.fontFamily]) {
          const fontBytes = await fetch(fontInfo.url).then(res => res.arrayBuffer());
          fontCache[el.fontFamily] = await pdfDoc.embedFont(fontBytes);
        }
        page.drawText(el.text || '', {
          x: pdfX, y: pdfY - (el.fontSize * (width/containerWidth)), 
          size: el.fontSize * (width/containerWidth),
          font: fontCache[el.fontFamily],
          color: rgb(el.color[0], el.color[1], el.color[2]),
        });
      } else if (el.type === 'shape') {
        page.drawRectangle({
          x: pdfX, y: pdfY - ((el.height || 50) * height / (containerWidth * (height/width))),
          width: (el.width || 100) * width / containerWidth,
          height: (el.height || 50) * height / (containerWidth * (height/width)),
          color: rgb(el.color[0], el.color[1], el.color[2]),
          opacity: el.opacity || 0.5,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `edit_${pdfFile.name}`;
    link.click();
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto&family=Montserrat&family=Playfair+Display&family=JetBrains+Mono&family=Dancing+Script&display=swap');
      `}} />

      <header className="bg-slate-900 text-white p-3 md:p-4 flex justify-between items-center z-50 shadow-xl sticky top-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-blue-500 p-1.5 rounded-lg hidden sm:block"><FileText size={18} /></div>
          <h1 className="font-bold text-sm md:text-xl tracking-tight truncate max-w-[100px] sm:max-w-none">PDF Pro</h1>
          {pdfFile && (
            <button onClick={() => { setPdfFile(null); setElements([]); setSelectedId(null); }} className="flex items-center gap-1 text-[9px] bg-slate-800 px-2 py-1 rounded-full border border-slate-700 text-slate-300 transition-all shadow-sm">
              <RefreshCw size={10} /> <span className="hidden xs:inline uppercase">Změnit</span>
            </button>
          )}
        </div>
        
        {pdfFile && (
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => {
                const newEl: EditorElement = { id: Date.now(), type: 'text', text: "Text", x: 20, y: 20, page: pageNumber, fontSize: 20, fontFamily: 'roboto', color: [0, 0, 0], isBold: false, isItalic: false };
                setElements([...elements, newEl]); setSelectedId(newEl.id);
            }} className="bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Type size={14} /> <span className="hidden md:inline">Text</span></button>
            <button onClick={() => {
                const newEl: EditorElement = { id: Date.now(), type: 'shape', x: 40, y: 40, width: 80, height: 40, page: pageNumber, fontSize: 0, fontFamily: 'roboto', color: [0.9, 0.9, 0], opacity: 0.5, isBold: false, isItalic: false };
                setElements([...elements, newEl]); setSelectedId(newEl.id);
            }} className="bg-orange-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Square size={14} /> <span className="hidden md:inline">Tvar</span></button>
            <button onClick={downloadPDF} className="bg-emerald-500 px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"><Download size={16} /> <span className="hidden sm:inline">Export</span></button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* SIDEBAR - Na mobilu dole nebo skrytý, na desktopu vlevo */}
        <aside className={`${selectedId ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-white border-t md:border-t-0 md:border-r border-slate-200 p-4 md:p-6 overflow-y-auto z-40 max-h-[40vh] md:max-h-none order-2 md:order-1 shadow-2xl md:shadow-none`}>
           <div className="w-full">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Nastavení</h3>
           {selectedId ? (
             <div className="space-y-4">
               {elements.filter(el => el.id === selectedId).map(el => (
                 <div key={el.id} className="space-y-4">
                   {el.type === 'text' && (
                     <>
                        <textarea className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={el.text} onChange={(e) => updateElement(el.id, { text: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                            <select className="border rounded-lg p-2 text-[10px] bg-slate-50" value={el.fontFamily} onChange={(e) => updateElement(el.id, { fontFamily: e.target.value })}>
                                {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <input type="number" className="border rounded-lg p-2 text-xs" value={el.fontSize} onChange={(e) => updateElement(el.id, { fontSize: parseInt(e.target.value) })} />
                        </div>
                     </>
                   )}
                   <div className="flex justify-center gap-2 flex-wrap">
                       {[[0,0,0], [1,1,1], [0.8,0,0], [0,0.3,0.8]].map((v, i) => (
                         <button key={i} onClick={() => updateElement(el.id, { color: v as [number,number,number] })} className={`w-6 h-6 rounded-full border-2 ${JSON.stringify(el.color) === JSON.stringify(v) ? 'border-blue-500' : 'border-slate-100'}`} style={{ backgroundColor: `rgb(${v[0]*255},${v[1]*255},${v[2]*255})` }} />
                       ))}
                       <input type="color" className="w-6 h-6 rounded-full overflow-hidden p-0 border-0 cursor-pointer" onChange={(e) => {
                          const h = e.target.value;
                          updateElement(el.id, { color: [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255] });
                       }} />
                   </div>
                   <button onClick={() => { setElements(elements.filter(e => e.id !== el.id)); setSelectedId(null); }} className="w-full py-2 bg-red-50 text-red-500 border border-red-100 rounded-lg text-[10px] font-black uppercase">Smazat</button>
                 </div>
               ))}
             </div>
           ) : <p className="text-[10px] uppercase font-bold text-center opacity-30">Vyberte prvek</p>}
           </div>
        </aside>

        {/* NÁHLED PDF */}
        <section className="flex-1 bg-slate-200 p-2 sm:p-4 md:p-8 overflow-auto flex justify-center items-start order-1 md:order-2">
          {!pdfFile ? (
            <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl text-center border-2 border-dashed border-slate-300 max-w-sm w-full mt-10">
              <Upload size={40} className="mx-auto text-blue-500 mb-3" />
              <h2 className="text-xl font-black text-slate-800 mb-1">Editor</h2>
              <p className="text-slate-400 text-xs mb-6 font-medium leading-relaxed">Vyberte dokument PDF <br className="hidden sm:block"/> a začněte upravovat.</p>
              <input type="file" accept="application/pdf" onChange={(e) => { if(e.target.files?.[0]) setPdfFile(e.target.files[0]); }} id="pdf-in" className="hidden" />
              <label htmlFor="pdf-in" className="cursor-pointer bg-slate-900 text-white px-8 py-3 rounded-xl font-bold inline-block hover:bg-black transition-all shadow-xl uppercase text-[10px] tracking-widest">Nahrát PDF</label>
            </div>
          ) : (
            <div className="relative bg-white shadow-2xl border border-slate-300 touch-none mb-10" style={{ width: `${containerWidth}px` }}>
              <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} width={containerWidth} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {elements.filter(el => el.page === pageNumber).map((el) => (
                  <div key={el.id} 
                    onPointerDown={(e) => {
                        e.stopPropagation(); setSelectedId(el.id);
                        const sX = e.clientX, sY = e.clientY, iX = el.x, iY = el.y;
                        const onMove = (mE: PointerEvent) => updateElement(el.id, { x: iX + (mE.clientX - sX), y: iY + (mE.clientY - sY) });
                        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
                    }} 
                    className={`absolute pointer-events-auto cursor-move border-2 ${selectedId === el.id ? 'border-blue-500 bg-blue-500/5 shadow-lg' : 'border-transparent'}`} 
                    style={{ left: el.x, top: el.y, width: el.type === 'shape' ? el.width : 'auto', height: el.type === 'shape' ? el.height : 'auto', zIndex: selectedId === el.id ? 100 : 10 }}>
                    {el.type === 'text' ? (
                        <span style={{ 
                            fontSize: el.fontSize * (containerWidth/700), color: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, 
                            fontFamily: FONT_OPTIONS.find(f => f.id === el.fontFamily)?.css || 'sans-serif',
                            fontWeight: el.isBold ? 'bold' : 'normal', fontStyle: el.isItalic ? 'italic' : 'normal', 
                            userSelect: 'none', whiteSpace: 'nowrap', display: 'block', lineHeight: 1
                        }}>{el.text}</span>
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: `rgb(${el.color[0]*255},${el.color[1]*255},${el.color[2]*255})`, opacity: el.opacity }} />
                    )}
                    {selectedId === el.id && el.type === 'shape' && (
                        <div 
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                const sX = e.clientX, sY = e.clientY, iW = el.width || 0, iH = el.height || 0;
                                const onMove = (mE: PointerEvent) => updateElement(el.id, { width: Math.max(10, iW + (mE.clientX - sX)), height: Math.max(10, iH + (mE.clientY - sY)) });
                                const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                                window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
                            }}
                            className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 cursor-nwse-resize rounded-tl shadow-md flex items-center justify-center border-2 border-white"
                        />
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center bg-white px-4 py-1.5 rounded-full shadow-lg border border-slate-100 text-[10px] font-bold gap-4">
                <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} className="hover:text-blue-500 disabled:opacity-20" disabled={pageNumber === 1}>Předchozí</button>
                <span className="text-slate-400">{pageNumber} / {numPages}</span>
                <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} className="hover:text-blue-500 disabled:opacity-20" disabled={pageNumber === numPages}>Další</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}