"use client";

/**
 * @purpose Renderiza una pestaña de calibración para ajustar parámetros y tablas de voltaje en el ABDOmegaEditor.
 * @purpose_en Renders a calibration panel for adjusting parameters and voltage tables in the ABDOmegaEditor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:icb09i
 * @lastUpdated 2026-06-16T17:35:34.884Z
 */


import { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Sliders, FileSpreadsheet } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { calibrationCategories, calibrationCSVTables } from "@/data/calibration-data";

export function CalibrationPanel() {
  const [isParamsOpen, setIsParamsOpen] = useState(true);
  const [isTablesOpen, setIsTablesOpen] = useState(false);
  
  // "Abanico" state: active category inside the parameters collapsible zone
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  return (
    <div className="space-y-8 pt-16">
      {/* Introduction */}
      <div className="space-y-4">
        <h2 className="font-headline text-3xl font-black italic uppercase leading-none tracking-tighter">
          Calibración Extrema & <span className="text-primary">Circuit Bending</span>
        </h2>
        <p className="text-zinc-400 font-body text-base max-w-3xl leading-relaxed">
          Una de las características más destacables del **ABDJUNiO601** es su extrema flexibilidad física. 
          Hemos modelado el circuito componente por componente, permitiéndote alterar los valores de calibración analógica de fábrica y las tablas de voltajes mediante la WebUI integrada para lograr sonoridades únicas e inestabilidades personalizadas.
        </p>
      </div>

      {/* ZONE 1: Calibration Parameters */}
      <GlassPanel className="border-white/5 bg-white/[0.01] overflow-hidden">
        <button
          onClick={() => setIsParamsOpen(!isParamsOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group text-left"
          aria-label={isParamsOpen ? 'Collapse calibration parameters' : 'Expand calibration parameters'}
        >
          <div className="flex items-center gap-3">
            <Sliders className={`w-5 h-5 transition-colors ${isParamsOpen ? "text-primary animate-pulse" : "text-zinc-500"}`} />
            <div>
              <h3 className="font-headline font-bold uppercase tracking-wider text-base text-white">
                Parámetros de Calibración Fisiológica
              </h3>
              <p className="text-xs text-zinc-500 font-body mt-0.5">
                Modifica el comportamiento y tolerancias del DCO, VCF, VCA, ADSR, Chorus y derivas térmicas.
              </p>
            </div>
          </div>
          <div className="text-zinc-500 group-hover:text-white transition-colors">
            {isParamsOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isParamsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-6 border-t border-white/5 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Abanico: Category Selectors (Left side) */}
                <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/5 pr-0 lg:pr-6 scrollbar-thin">
                  {calibrationCategories.map((cat, idx) => {
                    const isActive = activeCategoryIndex === idx;
                    return (
                      <button
                        key={cat.title}
                        onClick={() => setActiveCategoryIndex(idx)}
                        className={`flex-shrink-0 text-left px-4 py-3 rounded transition-all duration-200 flex items-center justify-between gap-3 ${
                          isActive 
                            ? "bg-primary/10 border-l-2 border-primary text-white font-bold" 
                            : "bg-white/[0.01] hover:bg-white/[0.04] text-zinc-400 border-l-2 border-transparent"
                        }`}
                      >
                        <span className="font-headline text-[11px] uppercase tracking-widest">
                          {cat.title}
                        </span>
                        <span className="hidden md:inline text-[9px] bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                          {cat.parameters.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Parameters List (Right side) */}
                <div className="lg:col-span-9 space-y-6">
                  <div>
                    <h4 className="font-headline text-lg font-black text-primary uppercase tracking-wider">
                      {calibrationCategories[activeCategoryIndex].title}
                    </h4>
                    <p className="text-sm text-zinc-500 font-body mt-1">
                      {calibrationCategories[activeCategoryIndex].description}
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-white/5 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-headline uppercase tracking-widest text-zinc-400">
                          <th className="p-3">ID / Parámetro</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3 text-center">Defecto</th>
                          <th className="p-3 text-center">Rango (Mín/Máx)</th>
                          {calibrationCategories[activeCategoryIndex].parameters.some(p => p.step) && (
                            <th className="p-3 text-center">Paso</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-body">
                        {calibrationCategories[activeCategoryIndex].parameters.map((param) => (
                          <tr key={param.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="p-3 font-mono text-zinc-300">
                              <span className="font-headline text-[10px] font-bold text-white block group-hover:text-primary transition-colors">
                                {param.name}
                              </span>
                              <span className="text-[10px] text-zinc-500">`{param.id}`</span>
                            </td>
                            <td className="p-3 text-zinc-400 leading-relaxed max-w-xs md:max-w-sm">
                              {param.description}
                            </td>
                            <td className="p-3 text-center font-mono text-white">
                              {param.defaultValue}
                            </td>
                            <td className="p-3 text-center font-mono text-zinc-400">
                              {param.range}
                            </td>
                            {param.step !== undefined && (
                              <td className="p-3 text-center font-mono text-zinc-500">
                                {param.step}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>

      {/* ZONE 2: CSV Data Tables */}
      <GlassPanel className="border-white/5 bg-white/[0.01] overflow-hidden">
        <button
          onClick={() => setIsTablesOpen(!isTablesOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group text-left"
          aria-label={isTablesOpen ? 'Collapse CSV data tables' : 'Expand CSV data tables'}
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className={`w-5 h-5 transition-colors ${isTablesOpen ? "text-primary animate-pulse" : "text-zinc-500"}`} />
            <div>
              <h3 className="font-headline font-bold uppercase tracking-wider text-base text-white">
                Tablas de Datos Físicos (Importables/Exportables)
              </h3>
              <p className="text-xs text-zinc-500 font-body mt-0.5">
                Curvas de calibración y mapeos no lineales importables mediante archivos CSV.
              </p>
            </div>
          </div>
          <div className="text-zinc-500 group-hover:text-white transition-colors">
            {isTablesOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isTablesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-6 border-t border-white/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {calibrationCSVTables.map((table) => (
                    <GlassPanel key={table.id} className="p-5 border-white/5 bg-white/[0.02] flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h4 className="font-headline font-bold text-white uppercase text-sm">
                            {table.name}
                          </h4>
                          <span className="font-mono text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {table.id}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-body leading-relaxed">
                          <strong>Propósito:</strong> {table.purpose}
                        </p>
                        <p className="text-xs text-zinc-500 font-body">
                          <strong>Tamaño:</strong> {table.size}
                        </p>
                        <p className="text-xs text-zinc-500 font-body">
                          <strong>Defecto:</strong> {table.defaultValue}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5">
                        <span className="text-[9px] font-headline text-zinc-500 uppercase tracking-wider block mb-2">
                          Formato CSV de Ejemplo:
                        </span>
                        <pre className="font-mono text-[10px] bg-black/40 p-3 rounded text-zinc-400 overflow-x-auto select-all">
                          {table.csvFormat}
                        </pre>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </div>
  );
}
