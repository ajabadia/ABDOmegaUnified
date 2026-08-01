/**
 * @purpose Proporciona interfaces de TypeScript para la estructura de datos en la documentación de ayuda del editor OMEGA.
 * @purpose_en Defines TypeScript interfaces for the structure of data in the OMEGA manifest editor's help documentation.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:ctv2d1
 * @lastUpdated 2026-06-19T18:48:04.855Z
 */

export interface HelpSubsection {
  id: string;
  title: string;
  content: string;
  technical_params?: string[];
  category?: string;
  code?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  category: 'user' | 'developer';
  subsections?: HelpSubsection[];
}
