import Link from 'next/link';

export default async function HomeLauncher({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  const currentLocale = locale || 'en';

  return (
    <div className="min-h-screen w-screen bg-[#0b0f19] text-white font-sans flex flex-col justify-between p-8 overflow-x-hidden">
      
      {/* Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-[#202b46] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/25">
            Ω
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-white">ABDOmega Unified Platform</h1>
            <p className="text-xs text-slate-400">Portal Lanzador Central • Era 8</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            ● LOCAL DEV SERVER (PORT 6789)
          </span>
        </div>
      </header>

      {/* Main Apps Selection Grid */}
      <main className="max-w-6xl w-full mx-auto my-auto py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white mb-2">¿Qué aplicación deseas abrir?</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Selecciona la herramienta con la que quieres trabajar. Todas comparten la misma carpeta limpia de módulos C++ y manifiestos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD 1: ABDOmega Web Synthesizer (Real Host Web UI) */}
          <a 
            href="/host-ui/index.html"
            className="group relative bg-[#131b2e] border border-[#202b46] hover:border-cyan-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🎹
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 font-mono">Host Nativo UI</span>
                <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-cyan-300 transition-colors">
                  ABDOmega Host UI
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Interfaz web nativa original de ABDOmega (host/ui) con el sistema industrial omega-ui-core.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Host UI</span>
              <span>→</span>
            </div>
          </a>

          {/* CARD 2: Web Rack Sandbox (/player) */}
          <Link 
            href={`/${currentLocale}/player`}
            className="group relative bg-[#131b2e] border border-[#202b46] hover:border-purple-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🎛️
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 font-mono">Banco de Pruebas</span>
                <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-purple-300 transition-colors">
                  Rack Sandbox Player
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Visualizador de la estantería /modules con lectura dinámica de manifiestos .acemm y contratos WASM.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Rack Sandbox</span>
              <span>→</span>
            </div>
          </Link>

          {/* CARD 3: ABDOmegaEditor */}
          <Link 
            href={`/${currentLocale}/editor`}
            className="group relative bg-[#131b2e] border border-[#202b46] hover:border-blue-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                ✏️
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 font-mono">Diseñador Visual</span>
                <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-blue-300 transition-colors">
                  ABDOmegaEditor
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Taller de maquetación visual de paneles a rejilla de 5px, matriz de modulación SVG y editor de manifiestos .acemm.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Editor Visual</span>
              <span>→</span>
            </div>
          </Link>

          {/* CARD 4: Roadmap & Dashboard */}
          <a 
            href="/roadmap/index.html"
            target="_blank"
            rel="noreferrer"
            className="group relative bg-[#131b2e] border border-[#202b46] hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📊
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 font-mono">Gestión de Proyecto</span>
                <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-emerald-300 transition-colors">
                  Roadmap & Handoff
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Panel de control local interactivo con seguimiento de tareas, hitos completados y registros de relevo.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Ver Dashboard</span>
              <span>↗</span>
            </div>
          </a>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-[#202b46] flex flex-wrap justify-between items-center text-xs text-slate-500 gap-4">
        <span>© 2026 OMEGA Unified Suite • Sistema de 3 Cajas Aisladas</span>
        <div className="flex gap-4">
          <span>Carpeta: <code className="text-slate-400">ABDOmegaUnified</code></span>
        </div>
      </footer>

    </div>
  );
}
