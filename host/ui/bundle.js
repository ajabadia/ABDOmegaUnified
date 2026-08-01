var Omega = (() => {
  // src/RPC/omega_log.ts
  var OmegaLog = class {
    static excludedTags = /* @__PURE__ */ new Set(["TELEMETRY"]);
    static filtersActive = true;
    static getTimestamp() {
      const now = /* @__PURE__ */ new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      const ms = now.getMilliseconds().toString().padStart(3, "0");
      return `[${h}:${m}:${s}.${ms}]`;
    }
    static setFilter(tag, active) {
      if (active) this.excludedTags.delete(tag.toUpperCase());
      else this.excludedTags.add(tag.toUpperCase());
      this.syncUI();
    }
    static toggleTelemetry() {
      const active = this.excludedTags.has("TELEMETRY");
      this.setFilter("TELEMETRY", active);
    }
    static syncUI() {
      const btn = document.getElementById("toggle-telemetry");
      if (btn) {
        const active = !this.excludedTags.has("TELEMETRY");
        btn.style.background = active ? "var(--neon-cyan)" : "#331111";
        btn.style.color = active ? "#000" : "#555";
        btn.style.boxShadow = active ? "0 0 10px var(--neon-cyan)" : "none";
      }
    }
    static shouldLog(tag) {
      if (!this.filtersActive) return true;
      return !this.excludedTags.has(tag.toUpperCase());
    }
    static info(tag, message, ...args) {
      if (!this.shouldLog(tag)) return;
      console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }
    static warn(tag, message, ...args) {
      if (!this.shouldLog(tag)) return;
      console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }
    static error(tag, message, ...args) {
      console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }
    static debug(tag, message, ...args) {
      if (!this.shouldLog(tag)) return;
      console.debug(`${this.getTimestamp()} [DEBUG] [${tag}] ${message}`, ...args);
    }
  };

  // src/Types/omega_types.ts
  function isRpcEnvelope(value) {
    return !!value && typeof value === "object" && "type" in value;
  }
  function normalizeIncomingEvent(value) {
    if (!isRpcEnvelope(value)) return null;
    if (value.type === "PARAM_CHANGE") {
      const raw = value;
      return {
        type: "PARAMCHANGE",
        id: String(raw.target ?? raw.id ?? ""),
        value: Number(raw.value ?? 0)
      };
    }
    return value;
  }

  // src/RPC/omega_rpc.ts
  var OmegaRPC = class {
    requestId = 1e3;
    pendingRequests = /* @__PURE__ */ new Map();
    isConnected = false;
    lastActivity = Date.now();
    healthTimer = null;
    constructor() {
      OmegaLog.info("RPC", "Aseptic Bridge Initialized");
      window.handleOmegaMessage = (json) => {
        this.lastActivity = Date.now();
        this.isConnected = true;
        this.updateHealthUI();
        try {
          const msg = typeof json === "string" ? JSON.parse(json) : json;
          const tag = msg.type === "telemetryUpdate" || msg.type === "TELEMETRY" ? "TELEMETRY" : "RPC";
          OmegaLog.debug(tag, `RECV [Type: ${msg.type}]`, msg);
          if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
            const req = this.pendingRequests.get(msg.requestId);
            clearTimeout(req.timer);
            this.pendingRequests.delete(msg.requestId);
            if (msg.type === "rpcError" || msg.type === "error") {
              req.reject(msg.payload || msg);
            } else {
              const data = msg.payload !== void 0 && msg.payload !== null ? msg.payload : msg;
              if (msg.type === "state" || msg.type === "onStateUpdate") {
                const norm = normalizeIncomingEvent(msg);
                if (norm) {
                  window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
                }
              }
              req.resolve(data);
            }
          } else {
            const norm = normalizeIncomingEvent(msg);
            if (norm) {
              window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
            }
          }
        } catch (e) {
          OmegaLog.error("RPC", "Message parsing failed", e, json);
        }
      };
      this.startHealthMonitor();
    }
    handleNativeResponse(id, payload) {
      if (this.pendingRequests.has(id)) {
        const req = this.pendingRequests.get(id);
        clearTimeout(req.timer);
        this.pendingRequests.delete(id);
        if (payload && typeof payload === "object" && "payload" in payload && "type" in payload) {
          req.resolve(payload.payload);
        } else {
          req.resolve(payload);
        }
      }
    }
    startHealthMonitor() {
      if (this.healthTimer) clearInterval(this.healthTimer);
      this.healthTimer = setInterval(() => {
        const idleTime = Date.now() - this.lastActivity;
        if (idleTime > 5e3) {
          if (this.isConnected) {
            OmegaLog.warn("RPC", "Connection idle or lost (5s)");
            this.isConnected = false;
            this.updateHealthUI();
          }
        }
      }, 2e3);
    }
    updateHealthUI() {
      const led = document.getElementById("bridge-health-led");
      if (led) {
        led.classList.toggle("active", this.isConnected);
        led.style.backgroundColor = this.isConnected ? "var(--neon-green)" : "var(--neon-dim)";
        led.style.boxShadow = this.isConnected ? "0 0 10px var(--neon-green)" : "none";
      }
    }
    async _waitForBackend(timeout = 5e3) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const win2 = window;
        if (win2.__JUCE__?.backend) return win2.__JUCE__.backend;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    }
    /**
     * Centralized Send Method: Uses Event-Based Bridge for Maximum Reliability
     */
    async send(type, payload = {}) {
      const id = this.requestId++;
      const message = { type, requestId: id, payload };
      const backend = await this._waitForBackend();
      if (!backend || !backend.emitEvent) {
        OmegaLog.error("RPC", `Backend EVENT CHANNEL UNREACHABLE for ${type}`);
        this.isConnected = false;
        this.updateHealthUI();
        return null;
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            OmegaLog.error("RPC", `Request TIMEOUT [${id}] for ${type}`);
            reject(new Error(`RPC Timeout: ${type}`));
          }
        }, 1e4);
        this.pendingRequests.set(id, { resolve, reject, timer });
        try {
          const tag = type === "subscribeTelemetry" || type === "unsubscribeTelemetry" ? "TELEMETRY" : "RPC";
          OmegaLog.debug(tag, `EMIT [ID: ${id}] ${type}`, payload);
          backend.emitEvent("omega_rpc_query", message);
        } catch (e) {
          clearTimeout(timer);
          if (this.pendingRequests.has(id)) this.pendingRequests.delete(id);
          OmegaLog.error("RPC", `Event emission CRASHED for ${type}`, e);
          reject(e);
        }
      });
    }
    /**
     * Era 7 Handshake
     */
    async ensureReady(timeout = 5e3) {
      OmegaLog.info("RPC", "Starting Era 7 Handshake...");
      const backend = await this._waitForBackend(timeout);
      if (!backend) {
        OmegaLog.error("RPC", "Handshake FAILED: Native backend unreachable");
        return false;
      }
      try {
        const state = await this.getState();
        if (state) {
          this.isConnected = true;
          this.updateHealthUI();
          OmegaLog.info("RPC", "Handshake SUCCESS: Backend is alive and state received");
          return true;
        }
      } catch (e) {
        OmegaLog.error("RPC", "Handshake FAILED: Could not retrieve initial state", e);
      }
      return false;
    }
    call(type, payload = {}) {
      return this.send(type, payload);
    }
    getState() {
      return this.send("getState");
    }
    getUiSchemas() {
      return this.send("getUiSchemas");
    }
    getSystemSettings() {
      return this.send("getSystemSettings");
    }
    uiReady() {
      return this.send("uiReady");
    }
  };
  var rpc = new OmegaRPC();
  window.omegaRPC = rpc;

  // src/Logic/RackRouter.ts
  function computeFingerprint(patchModules) {
    return patchModules.map((m) => `${m.instanceId}:${m.componentId}:${m.theme || ""}`).join("|");
  }
  function resolveRackTarget(componentId, mod, manifest) {
    const manifestRack = manifest?.rack?.slot || manifest?.rack || "";
    let rackValue = (manifestRack || mod.rack || "lower").toString().toLowerCase();
    const isCompact = manifest?.height_mode === "compact" || manifest?.metadata?.rack?.height_mode === "compact" || manifest?.rack?.height_mode === "compact";
    const isUpper = rackValue === "upper" || rackValue === "top" || isCompact;
    return { isUpper, rackType: isUpper ? "aux" : "main" };
  }
  function processRackUpdate(state, lastFingerprint) {
    const safeState = state || {};
    const patch = safeState.patch;
    if (!patch) {
      OmegaLog.info("MANAGER", "No Era 7 patch found in state. Skipping structural update.");
      return null;
    }
    const patchModules = patch.modules || [];
    const fingerprint = computeFingerprint(patchModules);
    const isRackEmpty = patchModules.length === 0;
    if (fingerprint === lastFingerprint && !isRackEmpty) {
      OmegaLog.info("MANAGER", "Structure stable (Fingerprint match). Skipping full re-render.");
      return { modules: patchModules, fingerprint, isRackEmpty, isStable: true };
    }
    OmegaLog.info("MANAGER", `Structural change detected. Rebuilding racks... (Empty: ${isRackEmpty})`);
    return { modules: patchModules, fingerprint, isRackEmpty, isStable: false };
  }

  // src/Logic/ModuleRegistry.ts
  var ModuleRegistry = class {
    static catalog = /* @__PURE__ */ new Map();
    static constructors = /* @__PURE__ */ new Map();
    static register(id, constructor) {
      this.constructors.set(id, constructor);
      OmegaLog.info("REGISTRY", `Registered Constructor: ${id}`);
    }
    static getConstructor(id) {
      return this.constructors.get(id);
    }
    static async bootstrap() {
      OmegaLog.info("REGISTRY", "Building Unified Era 7 Catalog...");
      const win2 = window;
      const inventoryStore2 = win2.inventoryStore;
      const schemaStore2 = win2.schemaStore;
      if (!inventoryStore2) {
        OmegaLog.error("REGISTRY", "InventoryStore NOT FOUND during bootstrap");
        return;
      }
      const inventory = inventoryStore2.getAllItems?.() || [];
      OmegaLog.info("REGISTRY", `Probing ${inventory.length} inventory items...`);
      this.catalog.clear();
      inventory.forEach((item) => {
        if (!item || !item.id) return;
        this.catalog.set(item.id, {
          id: item.id,
          name: item.name || item.id,
          family: item.family || "utility",
          hasInventory: true,
          hasSchema: false,
          isInstantiable: false
        });
      });
      if (schemaStore2) {
        this.catalog.forEach((entry, id) => {
          const schema = schemaStore2.getSchema?.(id);
          if (schema) {
            entry.hasSchema = true;
            entry.schema = schema;
            entry.isInstantiable = entry.hasInventory && entry.hasSchema;
          }
        });
      }
      OmegaLog.info("REGISTRY", `Catalog Ready. ${this.catalog.size} modules found, ${Array.from(this.catalog.values()).filter((m) => m.isInstantiable).length} instantiable.`);
    }
    static getModuleDescriptor(id) {
      return this.catalog.get(id);
    }
    static getInstantiableModules() {
      return Array.from(this.catalog.values()).filter((m) => m.isInstantiable);
    }
  };

  // src/Logic/ModuleHeaderBuilder.ts
  function buildModuleHeader(id, manifest) {
    const header = document.createElement("div");
    header.className = "module-header";
    header.style.display = "flex";
    header.style.flexDirection = "row";
    header.style.alignItems = "center";
    header.style.gap = "6px";
    header.appendChild(createConfigButton(id, manifest));
    header.appendChild(createMoveButton(id, "\u25C0", -1));
    header.appendChild(createMoveButton(id, "\u25B6", 1));
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    header.appendChild(spacer);
    header.appendChild(createCloseButton(id));
    return header;
  }
  function createConfigButton(id, manifest) {
    const btn = document.createElement("div");
    btn.className = "module-header-action config-btn";
    btn.innerHTML = "\u2699";
    btn.title = `Configure ${id}`;
    if (manifest) {
      btn.dataset.manifest = JSON.stringify(manifest);
    }
    btn.onclick = (e) => {
      e.stopPropagation();
      const win2 = window;
      if (win2.modulePatchModal) {
        const manifestStr = btn.dataset.manifest;
        const manifest2 = manifestStr ? JSON.parse(manifestStr) : void 0;
        win2.modulePatchModal.open(id, manifest2);
      }
    };
    return btn;
  }
  function createMoveButton(id, arrow, direction) {
    const btn = document.createElement("div");
    btn.className = "module-header-action move-btn";
    btn.innerHTML = arrow;
    btn.title = `Move ${id} ${direction > 0 ? "right" : "left"}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      window.rpcCommandDispatcher?.dispatch({
        type: "moveModule",
        payload: { instanceId: id, direction }
      });
    };
    return btn;
  }
  function createCloseButton(id) {
    const btn = document.createElement("div");
    btn.className = "module-header-action module-header-action-close";
    btn.innerHTML = "\xD7";
    btn.title = `Remove ${id}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      if (window.confirm(`Are you sure you want to remove ${id}?`)) {
        window.rpcCommandDispatcher?.dispatch({
          type: "removeModule",
          payload: { instanceId: id }
        });
      }
    };
    return btn;
  }

  // src/Logic/ModuleInstantiator.ts
  function createModuleContainer(id, type, panelClass, manifest) {
    const el = document.createElement("div");
    el.id = `mod-${id}`;
    el.className = `module module-${type} ${panelClass}`;
    const header = buildModuleHeader(id, manifest);
    el.appendChild(header);
    const content = document.createElement("div");
    content.className = "module-content";
    el.appendChild(content);
    return { el, content };
  }
  async function instantiateModule(id, className, container, options, lastState, activeModules) {
    if (!container) return null;
    const panelClass = options.manifest.panelClass || "";
    const { el, content } = createModuleContainer(id, options.layer || "main", panelClass, options.manifest);
    container.appendChild(el);
    const Factory = ModuleRegistry.getConstructor(className);
    if (!Factory) {
      console.error(`[ModuleManager] Module class not found in registry: ${className}`);
      return null;
    }
    const instance = Factory.length <= 2 ? new Factory(content, options.manifest) : new Factory(el, content, options);
    activeModules.set(id, instance);
    if (instance.init) await instance.init();
    if (instance.onStateUpdate && lastState) instance.onStateUpdate(lastState);
    return instance;
  }
  function stepParameter(id, step) {
    const win2 = window;
    if (!win2.runtimeStore || !win2.rpcCommandDispatcher) return;
    const snapshot = win2.runtimeStore.getSnapshot();
    const currentValue = snapshot.parameters?.[id] || 0;
    const delta = step * 0.01;
    const nextValue = Math.max(0, Math.min(1, currentValue + delta));
    OmegaLog.debug("MANAGER", `Stepping parameter ${id}: ${currentValue} -> ${nextValue}`);
    win2.rpcCommandDispatcher.dispatch({
      type: "setParameter",
      payload: { id, value: nextValue }
    });
  }
  function cleanupModules(activeIds, activeModules) {
    activeModules.forEach((mod, id) => {
      if (!activeIds.has(id)) {
        const el = document.getElementById(`mod-${id}`);
        if (el) el.remove();
        if (mod.dispose) mod.dispose();
        activeModules.delete(id);
      }
    });
  }

  // src/Logic/module_manager.ts
  var ModuleManager = class {
    activeModules = /* @__PURE__ */ new Map();
    lastState = null;
    isRendering = false;
    lastFingerprint = "";
    pendingState = null;
    renderGeneration = 0;
    constructor() {
      this.activeModules = /* @__PURE__ */ new Map();
      console.log("%c[!!!] MODULE_MANAGER_V7_ACTIVE [Build 2026.05.03]", "background: #00f2ff; color: #000; font-weight: bold; padding: 2px 5px;");
      OmegaLog.info("MANAGER", "ModuleManager Constructor Initialized.");
      const store = window.runtimeStore;
      if (store) {
        OmegaLog.info("MANAGER", "Subscribing to RuntimeStore...");
        store.subscribe((type) => {
          OmegaLog.debug("MANAGER", `Store Event Received. Type: ${type}`);
          if (type & 1) {
            OmegaLog.info("MANAGER", "Structural Change Detected -> updateRack()");
            this.updateRack(store.getSnapshot());
          } else if (type & 2) {
            this.activeModules.forEach((mod) => {
              if (mod.onStateUpdate) mod.onStateUpdate(store.getSnapshot());
            });
          }
        });
      } else {
        OmegaLog.error("MANAGER", "CRITICAL: RuntimeStore not found in window during initialization!");
      }
    }
    async updateRack(state) {
      OmegaLog.info("MANAGER", "updateRack entry point");
      if (this.isRendering) {
        OmegaLog.info("MANAGER", "Render in progress. Queuing next update...");
        this.pendingState = state;
        return;
      }
      this.isRendering = true;
      const currentGeneration = ++this.renderGeneration;
      this.pendingState = null;
      try {
        this.lastState = state || {};
        const result = processRackUpdate(state, this.lastFingerprint);
        if (!result) {
          this.isRendering = false;
          return;
        }
        const { modules, fingerprint, isRackEmpty, isStable } = result;
        this.lastFingerprint = fingerprint;
        if (isStable) {
          this.activeModules.forEach((mod) => {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
          });
          this.isRendering = false;
          return;
        }
        const upper = document.getElementById("upper-rack");
        const lower = document.getElementById("lower-rack");
        if (upper) upper.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
        if (lower) lower.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
        this.activeModules.clear();
        if (isRackEmpty) {
          OmegaLog.info("MANAGER", "Rack is now officially empty.");
          this.isRendering = false;
          return;
        }
        const newActiveIds = /* @__PURE__ */ new Set();
        OmegaLog.info("MANAGER", `Executing Era 7 Rendering Pipeline (${modules.length} modules)`);
        for (const mod of modules) {
          const componentId = mod.componentId || "unknown";
          const instId = `v7_${mod.instanceId}`;
          newActiveIds.add(instId);
          if (!this.activeModules.has(instId)) {
            const manifest = window.schemaStore?.getSchema(componentId);
            const { isUpper, rackType } = resolveRackTarget(componentId, mod, manifest);
            const targetRack = isUpper ? document.getElementById("upper-rack") : document.getElementById("lower-rack");
            console.log(
              `%c[!!!] ROUTING DEBUG: mod=${instId} (${componentId}) | isUpper=${isUpper} | targetFound=${!!targetRack}`,
              "color: #00f2ff; font-weight: bold;"
            );
            if (isUpper && !document.getElementById("upper-rack")) {
              console.error("%c[!!!] CRITICAL: upper-rack element not found in DOM!", "color: #ff0000; font-weight: bold;");
            }
            const className = manifest?.ui_class || "ModuleRenderer";
            if (currentGeneration !== this.renderGeneration) return;
            await instantiateModule(instId, className, targetRack, {
              label: mod.label || componentId.toUpperCase(),
              componentId,
              instanceId: mod.instanceId,
              typeId: mod.typeId,
              params: mod.parameters || mod.params || {},
              manifest: manifest || {
                id: componentId,
                name: componentId,
                ui: { dimensions: { width: 60, height: 420 }, controls: [], jacks: [], skin: "industrial" },
                registry: []
              },
              layer: rackType
            }, this.lastState, this.activeModules);
          } else {
            const module = this.activeModules.get(instId);
            if (module && module.onStateUpdate) {
              module.onStateUpdate(window.runtimeStore?.getSnapshot());
            }
          }
        }
        cleanupModules(newActiveIds, this.activeModules);
        this.isRendering = false;
      } catch (e) {
        OmegaLog.error("MANAGER", "Error during rack update:", e);
        if (e && e.stack) OmegaLog.error("MANAGER", "Stack trace:", e.stack);
      } finally {
        this.isRendering = false;
        if (this.pendingState) {
          const next = this.pendingState;
          this.pendingState = null;
          this.updateRack(next);
        }
      }
    }
    /**
     * Increments or decrements a parameter value by a single step.
     * Delegated to ModuleInstantiator.
     */
    stepParameter(id, step) {
      stepParameter(id, step);
    }
  };

  // src/Util/PhysicsEngine.ts
  var PhysicsEngine = class {
    static currentAngle = 135;
    static currentDistance = 4;
    static currentBlur = 4;
    static currentColor = "rgba(0,0,0,0.5)";
    /**
     * Injects the global shadow variables into the root document.
     */
    static updateGlobalLighting(angle, distance, blur, color) {
      if (angle !== void 0) this.currentAngle = angle;
      if (distance !== void 0) this.currentDistance = distance;
      if (blur !== void 0) this.currentBlur = blur;
      if (color !== void 0) this.currentColor = color;
      const angleRad = this.currentAngle * Math.PI / 180;
      const shadowX = Math.cos(angleRad) * this.currentDistance;
      const shadowY = Math.sin(angleRad) * this.currentDistance;
      const root = document.documentElement;
      root.style.setProperty("--omega-global-shadow-x", `${shadowX.toFixed(2)}px`);
      root.style.setProperty("--omega-global-shadow-y", `${shadowY.toFixed(2)}px`);
      root.style.setProperty("--omega-global-shadow-blur", `${this.currentBlur}px`);
      root.style.setProperty("--omega-global-shadow-color", this.currentColor);
      OmegaLog.debug("PHYSICS", `Global Lighting Updated: ${this.currentAngle}deg, Dist: ${this.currentDistance}px`);
    }
    /**
     * Synchronizes physics from a set of system settings.
     */
    static syncFromSettings(settings) {
      const angle = settings.find((s) => s.id === "rackShadowAngle")?.currentValue;
      const dist = settings.find((s) => s.id === "rackShadowDistance")?.currentValue;
      const blur = settings.find((s) => s.id === "rackShadowBlur")?.currentValue;
      if (angle !== void 0 || dist !== void 0 || blur !== void 0) {
        this.updateGlobalLighting(angle, dist, blur);
      }
    }
  };

  // src/Logic/preferences.ts
  var OMEGA_Preferences = class {
    settings = [];
    currentCategory = "GENERAL";
    constructor() {
      console.log("[Preferences] Initialized (Aseptic)");
    }
    async init() {
      await this.refresh();
      this.setupTabs();
      this.render();
    }
    setupTabs() {
      const tabs = document.querySelectorAll(".pref-tab");
      tabs.forEach((tab) => {
        tab.onclick = () => {
          const htmlTab = tab;
          tabs.forEach((t) => t.classList.remove("active"));
          htmlTab.classList.add("active");
          this.currentCategory = htmlTab.textContent?.trim().toUpperCase() || "GENERAL";
          this.render();
        };
      });
    }
    async refresh() {
      try {
        const rpc2 = window.omegaRPC;
        if (rpc2) {
          const data = await rpc2.getSystemSettings();
          this.settings = Array.isArray(data) ? data : [];
          PhysicsEngine.syncFromSettings(this.settings);
        }
      } catch (e) {
        console.error("[Preferences] Refresh failed:", e);
      }
    }
    render() {
      const container = document.getElementById("preferences-body");
      if (!container) return;
      if (this.settings.length === 0) {
        container.innerHTML = `
                <div class="pref-loading">
                    <div class="spinner"></div>
                    <span>Communicating with OMEGA Engine...</span>
                </div>`;
        return;
      }
      container.innerHTML = "";
      const catSettings = this.settings.filter(
        (s) => s.category.toUpperCase() === this.currentCategory.toUpperCase()
      );
      if (this.currentCategory === "PHYSICS") {
        this.renderAtmosphericSimulator(container, catSettings);
        return;
      }
      catSettings.forEach((s) => {
        const row = document.createElement("div");
        row.className = "pref-row";
        let controlHtml = "";
        if (s.options) {
          const sortedKeys = Object.keys(s.options).sort((a, b) => parseFloat(a) - parseFloat(b));
          controlHtml = `<select class="pref-select" data-pref-id="${s.id}">
                    ${sortedKeys.map(
            (val) => `<option value="${val}" ${Math.round(s.currentValue) == parseFloat(val) ? "selected" : ""}>${s.options[val]}</option>`
          ).join("")}
                </select>`;
        } else {
          controlHtml = `<input type="number" class="pref-input" data-pref-id="${s.id}" value="${s.currentValue}" 
                                min="${s.minValue}" max="${s.maxValue}">`;
        }
        row.innerHTML = `
                <div class="pref-info">
                    <span class="pref-label">${s.label}</span>
                    <span class="pref-tooltip">${s.tooltip}</span>
                </div>
                <div class="pref-control">
                    ${controlHtml}
                    <button class="pref-reset-btn" data-reset-id="${s.id}">RESET</button>
                </div>
            `;
        container.appendChild(row);
        const ctrl = row.querySelector(`[data-pref-id="${s.id}"]`);
        ctrl.onchange = (e) => this.update(s.id, e.target.value);
        const resetBtn = row.querySelector(`[data-reset-id="${s.id}"]`);
        resetBtn.onclick = () => this.reset(s.id);
      });
    }
    renderAtmosphericSimulator(container, settings) {
      const getSetting = (id) => settings.find((s) => s.id === id);
      const angle = getSetting("rackShadowAngle");
      const dist = getSetting("rackShadowDistance");
      const blur = getSetting("rackShadowBlur");
      const currentAngle = angle?.currentValue || 135;
      const angleRad = currentAngle * Math.PI / 180;
      const previewDist = 8;
      const shadowX = Math.cos(angleRad) * previewDist;
      const shadowY = Math.sin(angleRad) * previewDist;
      container.innerHTML = `
            <div class="atmospheric-simulator">
                <div class="simulator-title">ATMOSPHERIC SIMULATOR</div>
                <div class="simulator-preview" style="box-shadow: inset ${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.4);">
                    <div class="simulator-object"></div>
                </div>
                
                <div class="physics-grid">
                    ${this.renderPhysicsSlider(angle, "deg")}
                    ${this.renderPhysicsSlider(dist, "px")}
                    ${this.renderPhysicsSlider(blur, "px")}
                    
                    <div class="pref-slider-group">
                        <div class="pref-slider-header">
                            <label>SHADOW TINGE</label>
                            <span class="val">rgba(0,0,0,0.7)</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <div style="width:24px; height:24px; background:#000; border:1px solid #444; border-radius:2px;"></div>
                            <input type="text" class="pref-input" style="flex:1; background:#111; border:1px solid #444; color:#888; font-family:monospace; font-size:10px; padding:4px 8px;" value="rgba(0,0,0,0.7)" readonly>
                        </div>
                    </div>
                </div>
            </div>
        `;
      container.querySelectorAll(".pref-slider").forEach((slider) => {
        const id = slider.dataset.prefId;
        slider.oninput = (e) => {
          const val = parseFloat(e.target.value);
          const valLabel = e.target.closest(".pref-slider-group")?.querySelector(".val");
          if (valLabel) valLabel.textContent = `${val}${id.includes("Angle") ? "deg" : "px"}`;
          if (id === "rackShadowAngle") {
            const newRad = val * Math.PI / 180;
            const sx = Math.cos(newRad) * previewDist;
            const sy = Math.sin(newRad) * previewDist;
            const preview = container.querySelector(".simulator-preview");
            if (preview) preview.style.boxShadow = `inset ${sx}px ${sy}px 20px rgba(0,0,0,0.4)`;
          }
          this.update(id, val);
        };
      });
    }
    renderPhysicsSlider(s, unit) {
      if (!s) return "";
      return `
            <div class="pref-slider-group">
                <div class="pref-slider-header">
                    <label>${s.label.replace("Global ", "")}</label>
                    <span class="val">${s.currentValue}${unit}</span>
                </div>
                <input type="range" class="pref-slider" data-pref-id="${s.id}" 
                       min="${s.minValue}" max="${s.maxValue}" value="${s.currentValue}" step="1">
            </div>
        `;
    }
    async update(id, value) {
      const val = parseFloat(value);
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        await rpc2.send("setSystemSetting", { id, value: val });
      }
      const s = this.settings.find((x) => x.id === id);
      if (s) {
        s.currentValue = val;
        if (id.startsWith("rackShadow")) {
          PhysicsEngine.syncFromSettings(this.settings);
        }
      }
    }
    reset(id) {
      const s = this.settings.find((x) => x.id === id);
      if (s) {
        this.update(id, s.defaultValue);
        this.render();
      }
    }
  };
  var Preferences = new OMEGA_Preferences();
  window.Preferences = Preferences;

  // src/Logic/service.ts
  var OMEGA_ServiceMode = class {
    params = [];
    activeVoice = -1;
    constructor() {
      console.log("[Service] Initialized (Aseptic)");
    }
    async init() {
      try {
        await this.refreshParams();
      } catch (e) {
        console.error("[Service] Init failed:", e);
      }
      this.renderVoices();
    }
    async refreshParams() {
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        try {
          this.params = await rpc2.send("getCalibrationParams");
          this.renderParams();
        } catch (e) {
          console.error("[Service] getCalibrationParams failed:", e);
        }
      }
    }
    renderParams() {
      const container = document.getElementById("service-params-list");
      if (!container) return;
      container.innerHTML = "";
      this.params.forEach((p) => {
        const row = document.createElement("div");
        row.className = "service-param-row";
        row.innerHTML = `
                <div class="service-param-info">
                    <span class="service-param-label">${p.label}</span>
                    <span class="service-param-value" id="val-${p.id}">${p.currentValue.toFixed(2)}${p.unit}</span>
                </div>
                <input type="range" class="service-slider" 
                    min="${p.minValue}" max="${p.maxValue}" step="${p.stepSize}" 
                    value="${p.currentValue}" data-param-id="${p.id}">
            `;
        container.appendChild(row);
        const slider = row.querySelector("input");
        slider.oninput = (e) => this.updateParam(p.id, e.target.value);
      });
    }
    async updateParam(id, value) {
      const val = parseFloat(value);
      const p = this.params.find((x) => x.id === id);
      const display = document.getElementById(`val-${id}`);
      if (display && p) display.innerText = val.toFixed(2) + p.unit;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({
          type: "serviceAction",
          value: { action: "setCalibrationParam", id, value: val }
        });
      }
    }
    renderVoices() {
      const container = document.getElementById("voice-test-grid");
      if (!container) return;
      container.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        const btn = document.createElement("button");
        btn.className = "voice-test-btn";
        btn.innerText = `VOICE ${i + 1}`;
        btn.id = `btn-voice-${i}`;
        btn.onclick = () => this.toggleVoiceTest(i);
        container.appendChild(btn);
      }
    }
    async toggleVoiceTest(index) {
      const dispatcher = window.rpcCommandDispatcher;
      if (!dispatcher) return;
      if (this.activeVoice === index) {
        this.activeVoice = -1;
        await dispatcher.dispatch({ type: "serviceAction", value: { action: "stopVoiceTest" } });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
      } else {
        this.activeVoice = index;
        await dispatcher.dispatch({ type: "serviceAction", value: { action: "testVoice", voice: index } });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
        const btn = document.getElementById(`btn-voice-${index}`);
        if (btn) btn.classList.add("active");
      }
    }
    async serviceAction(action) {
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({ type: "serviceAction", value: { action } });
      }
    }
  };
  var ServiceMode = new OMEGA_ServiceMode();
  window.ServiceMode = ServiceMode;

  // src/Components/PresetBrowser.ts
  var OMEGA_PresetBrowser = class {
    data = { libraries: [] };
    selectedLibIdx = 0;
    selectedPresetIdx = -1;
    currentCategory = "All";
    searchQuery = "";
    constructor() {
      console.log("[PresetBrowser] Initialized (Aseptic)");
    }
    async init() {
      this.setupListeners();
      await this.refresh();
    }
    setupListeners() {
      const search = document.getElementById("browser-search");
      if (search) {
        search.oninput = (e) => {
          this.searchQuery = e.target.value.toLowerCase();
          this.renderPresets();
        };
      }
      const attach = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
      };
      attach("preset-saveas-btn", () => this.showSaveAsModal());
    }
    loadUserPresetsFromStorage() {
      try {
        const raw = localStorage.getItem("omega_user_presets");
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn("[PresetBrowser] Could not load user presets:", e);
      }
      return [
        { name: "MY FIRST USER PATCH", category: "User", author: "User", date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }
      ];
    }
    saveUserPreset(name) {
      try {
        const userPatches = this.loadUserPresetsFromStorage();
        userPatches.push({
          name: name.toUpperCase(),
          category: "User",
          author: "User",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        });
        localStorage.setItem("omega_user_presets", JSON.stringify(userPatches));
        const lcd = document.getElementById("lcd-text");
        if (lcd) lcd.textContent = name.toUpperCase();
        this.refresh();
        alert(`Preset "${name.toUpperCase()}" saved successfully!`);
      } catch (e) {
        console.error("[PresetBrowser] Save preset failed:", e);
      }
    }
    async refresh() {
      try {
        const rpc2 = window.omegaRPC;
        let response = null;
        if (rpc2 && rpc2.isConnected) {
          response = await rpc2.send("getBrowserData");
        }
        if (response && response.libraries && response.libraries.length > 0) {
          this.data = response;
        } else {
          this.data = {
            categories: ["All", "Factory", "User", "Bass", "Lead", "Pad", "FX"],
            libraries: [
              {
                name: "FACTORY",
                category: "Factory",
                patches: [
                  { name: "INIT PATCH", category: "Factory", author: "OMEGA", date: "2026-07-30" },
                  { name: "SUB BASS 808", category: "Bass", author: "OMEGA", date: "2026-07-30" },
                  { name: "CYBERPUNK LEAD", category: "Lead", author: "OMEGA", date: "2026-07-30" },
                  { name: "CELESTIAL PAD", category: "Pad", author: "OMEGA", date: "2026-07-30" },
                  { name: "INDUSTRIAL ACID", category: "FX", author: "OMEGA", date: "2026-07-30" }
                ]
              },
              {
                name: "USER PRESETS",
                category: "User",
                patches: this.loadUserPresetsFromStorage()
              }
            ]
          };
        }
        this.render();
      } catch (e) {
        console.error("[PresetBrowser] Refresh failed:", e);
      }
    }
    render() {
      this.renderCategories();
      this.renderLibraries();
      this.renderPresets();
    }
    renderCategories() {
      const list = document.getElementById("cat-list");
      if (!list) return;
      const system = ["All", "Factory", "User", "Favorites"];
      const custom = this.data.categories || [];
      const seen = /* @__PURE__ */ new Set();
      list.innerHTML = "";
      [...system, ...custom].forEach((cat) => {
        if (seen.has(cat)) return;
        seen.add(cat);
        const li = document.createElement("li");
        li.textContent = cat;
        if (this.currentCategory === cat) li.classList.add("active");
        li.onclick = () => this.selectCategory(cat);
        list.appendChild(li);
      });
    }
    selectCategory(cat) {
      this.currentCategory = cat;
      this.selectedLibIdx = 0;
      this.selectedPresetIdx = -1;
      this.render();
    }
    renderLibraries() {
      const list = document.getElementById("lib-list");
      if (!list) return;
      list.innerHTML = "";
      this.data.libraries.forEach((lib, idx) => {
        let shouldShow = true;
        if (this.currentCategory === "Factory") shouldShow = lib.name.toUpperCase() === "FACTORY";
        else if (this.currentCategory === "User") shouldShow = lib.name.toUpperCase() === "USER" || lib.category === "User";
        else if (this.currentCategory === "Favorites") shouldShow = lib.patches.some((p) => p.favorite);
        else if (this.currentCategory !== "All") shouldShow = lib.category === this.currentCategory;
        if (!shouldShow) return;
        const li = document.createElement("li");
        li.innerHTML = `<span>${lib.name}</span>`;
        if (this.selectedLibIdx === idx) li.classList.add("active");
        li.onclick = () => this.selectLib(idx);
        list.appendChild(li);
      });
    }
    async selectLib(idx) {
      this.selectedLibIdx = idx;
      this.selectedPresetIdx = -1;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({ type: "selectLibrary", value: idx });
      }
      this.render();
    }
    renderPresets() {
      const list = document.getElementById("preset-list");
      if (!list) return;
      list.innerHTML = "";
      const lib = this.data.libraries[this.selectedLibIdx];
      if (!lib) return;
      lib.patches.forEach((p, idx) => {
        const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
        if (!matchesSearch) return;
        const li = document.createElement("li");
        li.className = "preset-item";
        if (this.selectedPresetIdx === idx) li.classList.add("active");
        li.innerHTML = `<span class="preset-name">${p.name}</span>`;
        if (p.favorite) li.innerHTML += `<span class="preset-fav active">\u2605</span>`;
        li.onclick = () => this.selectPreset(idx);
        list.appendChild(li);
      });
    }
    async selectPreset(idx) {
      this.selectedPresetIdx = idx;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({
          type: "loadPreset",
          value: { libIdx: this.selectedLibIdx, prstIdx: idx }
        });
      }
      this.renderPresets();
      this.updateInfoPane();
    }
    updateInfoPane() {
      const lib = this.data.libraries[this.selectedLibIdx];
      const p = lib?.patches[this.selectedPresetIdx];
      if (!p) return;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      setVal("meta-name", p.name);
      setVal("meta-author", p.author || "");
      setVal("meta-tags", p.tags || "");
      setVal("meta-notes", p.notes || "");
    }
    showSaveAsModal() {
      const modal = document.getElementById("modal-saveas");
      if (modal) modal.style.display = "flex";
    }
  };
  var PresetBrowser = new OMEGA_PresetBrowser();
  window.PresetBrowser = PresetBrowser;

  // src/Logic/ControlBinder.ts
  var ControlBinder = class {
    renderer;
    values;
    constructor(renderer, currentValues) {
      this.renderer = renderer;
      this.values = currentValues;
    }
    /**
     * Binds all interactive elements within a container.
     */
    bindContainer(container, controls) {
      controls.forEach((item) => {
        const id = item.bind || item.paramId || item.source || item.portId;
        const entity = id ? this.renderer.getRegistryEntity(id) : null;
        if (!entity) return;
        const cell = container.querySelector(`[data-id="${id}"]`);
        if (!cell) return;
        const knob = cell.querySelector(".knob-container");
        if (knob) this.bindKnob(knob, entity);
        const slider = cell.querySelector(".slider-wrapper");
        if (slider) this.bindSlider(slider, entity);
        const steppers = cell.querySelectorAll(".stepper-btn, .display-btn");
        steppers.forEach((btn) => this.bindStepper(btn, id, entity));
        const sel = cell.querySelector(".industrial-select-wrapper");
        if (sel) this.bindSelect(sel, id, entity);
      });
    }
    bindKnob(knob, entity) {
      let isDragging = false;
      let startY = 0;
      let startVal = 0;
      const range = entity.range || { min: 0, max: 1, default: 0 };
      knob.addEventListener("pointerdown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startVal = this.values[entity.id] ?? range.default ?? 0;
        knob.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      knob.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const delta = (startY - e.clientY) / 150;
        let next = startVal + delta * (range.max - range.min);
        next = Math.max(range.min, Math.min(range.max, next));
        this.renderer.setParam(entity.id, next);
      });
      const onUp = (e) => {
        if (isDragging) {
          isDragging = false;
          knob.releasePointerCapture(e.pointerId);
        }
      };
      knob.addEventListener("pointerup", onUp);
      knob.addEventListener("pointercancel", onUp);
    }
    bindSlider(slider, entity) {
      let isDragging = false;
      slider.addEventListener("pointerdown", (e) => {
        isDragging = true;
        slider.setPointerCapture(e.pointerId);
        this.handleSliderMove(e, slider, entity);
        e.preventDefault();
      });
      slider.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        this.handleSliderMove(e, slider, entity);
      });
      const onUp = (e) => {
        if (isDragging) {
          isDragging = false;
          slider.releasePointerCapture(e.pointerId);
        }
      };
      slider.addEventListener("pointerup", onUp);
      slider.addEventListener("pointercancel", onUp);
    }
    handleSliderMove(e, slider, entity) {
      const rect = slider.getBoundingClientRect();
      const isHoriz = slider.classList.contains("slider-h");
      const range = entity.range || { min: 0, max: 1 };
      let norm = isHoriz ? (e.clientX - rect.left) / rect.width : 1 - (e.clientY - rect.top) / rect.height;
      norm = Math.max(0, Math.min(1, norm));
      const next = range.min + norm * (range.max - range.min);
      this.renderer.setParam(entity.id, next);
    }
    bindStepper(btn, id, entity) {
      btn.addEventListener("click", (e) => {
        const targetId = e.target.dataset.bind || id;
        const dir = parseInt(e.target.dataset.dir || "0");
        const targetEntity = this.renderer.getRegistryEntity(targetId);
        if (targetEntity) {
          const range = targetEntity.range || { min: 0, max: 1, step: 1 };
          const current = this.values[targetId] ?? range.default ?? 0;
          const stepVal = range.step || 0.01;
          let next = current + dir * stepVal;
          next = Math.max(range.min, Math.min(range.max, next));
          this.renderer.setParam(targetId, next);
        }
      });
    }
    bindSelect(sel, id, entity) {
      sel.addEventListener("click", () => {
        const options = entity.options || [];
        if (options.length === 0) return;
        const currentVal = this.values[id] || 0;
        const currentIndex = Math.floor(currentVal * options.length);
        const nextIndex = (currentIndex + 1) % options.length;
        this.renderer.setParam(id, nextIndex / options.length);
      });
    }
  };

  // ../../web/src/omega-ui-core/utils/ColorResolver.ts
  var ColorResolver = class _ColorResolver {
    /**
     * Translates a color token or value into a physical HEX color.
     */
    static resolve(col, manifest) {
      if (!col || col === "none") return "transparent";
      if (col === "transparent" || col === "white" || col === "black") return col;
      let baseColor = col;
      let alpha = 1;
      if (col.includes("/")) {
        const parts = col.split("/");
        baseColor = parts[0] || col;
        alpha = parseFloat(parts[1] || "1") || 1;
      }
      const resolveBase = (c) => {
        if (c.startsWith("#") || c.startsWith("rgba") || c.startsWith("rgb")) return c;
        const palette = manifest?.ui?.palette || {};
        const colors = manifest?.ui?.colors || {};
        if (palette[c]) return palette[c];
        if (colors[c]) return colors[c];
        return "transparent";
      };
      const resolvedHex = resolveBase(baseColor);
      const hasExplicitAlpha = col.includes("/");
      if (hasExplicitAlpha || alpha < 1) {
        if (resolvedHex.startsWith("#")) {
          const r = parseInt(resolvedHex.slice(1, 3), 16);
          const g = parseInt(resolvedHex.slice(3, 5), 16);
          const b = parseInt(resolvedHex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (resolvedHex.startsWith("rgba")) {
          return resolvedHex.replace(/[\d.]+\)$/, `${alpha})`);
        }
      }
      return resolvedHex;
    }
    /**
     * Recursively resolves all color properties in a style node.
     */
    static resolveStyle(style, manifest) {
      if (!style) return {};
      const resolved = { ...style };
      const colorProps = [
        "color",
        "indicatorColor",
        "glowColor",
        "glassColor",
        "fontColor",
        "shadowColor",
        "ambientColor",
        "specularColor",
        "warningColor",
        "borderColor",
        "backgroundColor",
        "activeColor",
        "hoverColor"
      ];
      colorProps.forEach((prop) => {
        if (typeof resolved[prop] === "string") {
          resolved[prop] = _ColorResolver.resolve(resolved[prop], manifest);
        }
      });
      return resolved;
    }
  };

  // ../../web/src/omega-ui-core/utils/styleResolverCore.ts
  function resolveNodeStyle(node, manifest) {
    const cellRef = node.cellRef || node.kind || "knob";
    const variant = node.style?.variant || "default";
    const stylesByType = manifest?.ui?.styles?.[cellRef] || [];
    const baseStyle = stylesByType.find((s) => s.id === variant)?.aesthetics || stylesByType.find((s) => s.id === "default")?.aesthetics || {};
    const mergedStyle = {
      ...baseStyle,
      ...node.style || {}
    };
    const resolvedStyle = ColorResolver.resolveStyle(mergedStyle, manifest);
    return {
      style: resolvedStyle,
      variant,
      cellRef
    };
  }

  // ../../web/src/omega-ui-core/renderers/KnobRenderer.ts
  var renderKnobHTML = (props) => {
    const {
      size,
      colorId,
      value,
      isSelected,
      isMain,
      id,
      rotationOffset = -135,
      rotationRange = 270,
      assetUrl,
      frames,
      orientation = "v",
      style: customStyle
    } = props;
    const rotation = rotationOffset + value * rotationRange;
    const selectedClass = isMain && isSelected ? "selected" : "";
    const hasAssetClass = assetUrl ? "has-asset" : "";
    const classes = [
      "knob-container",
      `size-${size}`,
      `color-${colorId}`,
      selectedClass,
      hasAssetClass
    ].filter(Boolean).join(" ");
    const markerColor = props.explicitMarkerColor || customStyle?.indicatorColor || customStyle?.color;
    const inlineStyles = [
      customStyle?.color ? `--omega-color-override: ${customStyle.color}` : "",
      markerColor ? `--omega-indicator-color: ${markerColor}` : "",
      customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : "",
      customStyle?.opacity !== void 0 ? `opacity: ${customStyle.opacity}` : ""
    ].filter(Boolean).join("; ");
    const capStyle = customStyle?.color ? `background-color: ${customStyle.color} !important;` : "";
    let assetHTML = "";
    if (assetUrl) {
      let backgroundStyle = `background-image: url(${assetUrl});`;
      if (frames && frames > 1) {
        const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
        const percent = frameIndex / (frames - 1) * 100;
        backgroundStyle += orientation === "v" ? `background-position: 0% ${percent}%;` : `background-position: ${percent}% 0%;`;
      }
      assetHTML = `<div class="knob-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
    }
    const markerStyle = `--knob-rotation: ${rotation}deg; ${markerColor ? `background-color: ${markerColor} !important;` : ""}`;
    return `
    <div class="${classes}" ${id ? `data-source="${id}"` : ""} style="${inlineStyles}">
      <div class="knob-shadow-ring"></div>
      ${assetHTML}
      <div class="knob-cap" style="${capStyle}">
        <div class="knob-specular"></div>
      </div>
      <div class="knob-marker" style="${markerStyle}"></div>
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/PortRenderer.ts
  var inferPortSignalColor = (id = "", label = "", explicitColor) => {
    if (explicitColor) return `var(--signal-${explicitColor.toLowerCase().replace("b_", "")}, var(--wb-primary))`;
    const searchStr = `${id} ${label}`.toLowerCase();
    if (searchStr.includes("midi")) return "var(--signal-midi)";
    if (searchStr.includes("gate") || searchStr.includes("trig")) return "var(--signal-gate)";
    if (searchStr.includes("cv") || searchStr.includes("mod")) return "var(--signal-cv)";
    if (searchStr.includes("pitch") || searchStr.includes("freq") || searchStr.includes("out") || searchStr.includes("in")) return "var(--signal-audio)";
    return "var(--wb-primary)";
  };
  var renderPortHTML = (props) => {
    const { size, colorId, value, isSelected, isMain, id, label, explicitColor, customSignalColor, style: customStyle } = props;
    const signalColor = customSignalColor || inferPortSignalColor(id, label, explicitColor);
    const opacity = 0.3 + value * 0.7;
    const selectedClass = isMain && isSelected ? "selected" : "";
    const classes = [
      "port-socket",
      `size-${size}`,
      `color-${colorId}`,
      selectedClass
    ].filter(Boolean).join(" ");
    const inlineStyles = [
      customStyle?.color ? `--omega-color-override: ${customStyle.color}` : "",
      customStyle?.opacity !== void 0 ? `opacity: ${customStyle.opacity}` : "",
      customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : ""
    ].filter(Boolean).join("; ");
    const ledStyle = `background-color: ${signalColor}; opacity: ${opacity};`;
    return `<div class="${classes}" ${id ? `data-source="${id}"` : ""} style="${inlineStyles}"><div class="port-inner"><div class="port-led" style="${ledStyle}"></div></div></div>`;
  };

  // ../../web/src/omega-ui-core/renderers/LedRenderer.ts
  var renderLedHTML = (props) => {
    const { size, colorId, value, id, transform, assetUrl, frames, orientation = "v" } = props;
    const isActive = value > 0.05;
    const opacity = 0.3 + value * 0.7;
    const classes = [
      "led",
      `size-${size}`,
      `color-${colorId}`,
      isActive ? "active" : "",
      assetUrl ? "has-asset" : ""
    ].filter(Boolean).join(" ");
    const style = [
      `opacity: ${opacity}`,
      props.explicitColor ? `--led-color: ${props.explicitColor}` : "",
      props.explicitColor ? `background-color: ${props.explicitColor} !important` : "",
      transform || ""
    ].filter(Boolean).join("; ");
    let assetHTML = "";
    if (assetUrl) {
      let backgroundStyle = `background-image: url(${assetUrl});`;
      if (frames && frames > 1) {
        const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
        const percent = frameIndex / (frames - 1) * 100;
        backgroundStyle += orientation === "v" ? `background-position: 0% ${percent}%;` : `background-position: ${percent}% 0%;`;
      }
      assetHTML = `<div class="led-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
    }
    return `
     <div class="${classes}" ${id ? `data-source="${id}"` : ""} style="${style}">
       ${assetHTML}
       <div class="led-glass-overlay"></div>
       <div class="led-internal-glow"></div>
     </div>
   `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/SliderRenderer.ts
  var renderSliderHTML = (props) => {
    const {
      type,
      size,
      colorId,
      value,
      id,
      style: customStyle,
      assetUrl,
      frames,
      orientation = "v"
    } = props;
    const isHoriz = type === "slider-h";
    const railStyle = isHoriz ? `width: calc(${value * 100}% - 4px)` : `height: calc(${value * 100}% - 4px)`;
    const capStyle = isHoriz ? `left: calc(${value * 90}%)` : `bottom: calc(${value * 90}%)`;
    const inlineStyles = [
      customStyle?.color ? `--omega-color-override: ${customStyle.color}` : "",
      customStyle?.indicatorColor ? `--omega-indicator-color: ${customStyle.indicatorColor}` : "",
      customStyle?.opacity !== void 0 ? `opacity: ${customStyle.opacity}` : "",
      customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : ""
    ].filter(Boolean).join("; ");
    let assetHTML = "";
    if (assetUrl) {
      let backgroundStyle = `background-image: url(${assetUrl});`;
      if (frames && frames > 1) {
        const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
        const percent = frameIndex / (frames - 1) * 100;
        backgroundStyle += orientation === "v" ? `background-position: 0% ${percent}%;` : `background-position: ${percent}% 0%;`;
      }
      assetHTML = `<div class="slider-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
    }
    return `
     <div class="slider-wrapper ${type} size-${size} color-${colorId} ${assetUrl ? "has-asset" : ""}" ${id ? `data-source="${id}"` : ""} style="${inlineStyles}">
       ${assetHTML}
       <div class="slider-rail-active" style="${railStyle}; background-color: var(--omega-indicator-color) !important;"></div>
       <div class="slider-cap" style="${capStyle}; background-color: var(--omega-color-override) !important;"></div>
     </div>
   `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/DisplayRenderer.ts
  var renderDisplayHTML = (props) => {
    const { size, colorId, mode, value, steps, id, inheritedFont, inheritedSize, inheritedColor } = props;
    const displayValue = Math.round(value * (steps || 100));
    const contentColor = props.explicitTextColor || inheritedColor;
    const contentStyle = [
      inheritedFont ? `font-family: '${inheritedFont}'` : "",
      inheritedSize ? `font-size: ${inheritedSize}px` : "",
      contentColor ? `color: ${contentColor}` : ""
    ].filter(Boolean).join("; ");
    const glassStyle = props.explicitGlassColor ? `background-color: ${props.explicitGlassColor} !important; opacity: 0.3 !important;` : "";
    return `
    <div class="mini-display variant-${mode} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="display-glass-overlay" style="${glassStyle}"></div>
      <div class="display-internal-glow"></div>
      <div class="display-scanlines"></div>
      <button class="display-btn minus" data-action="step-down">\u2212</button>
      <div class="display-value" style="${contentStyle}">${displayValue}</div>
      <button class="display-btn plus" data-action="step-up">+</button>
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/SwitchRenderer.ts
  var renderSwitchHTML = (props) => {
    const { size, colorId, value, id } = props;
    const isActive = value >= 0.5;
    return `
    <div class="switch-container size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="sw-led ${!isActive ? "active" : ""}"></div>
      <div class="sw-led ${isActive ? "active" : ""}"></div>
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/StepperRenderer.ts
  var renderStepperHTML = (props) => {
    const { type, size, colorId, value, text, id, inheritedFont, inheritedSize, inheritedColor } = props;
    const isPressed = value >= 0.5;
    const contentStyle = [
      inheritedFont ? `font-family: '${inheritedFont}'` : "",
      inheritedSize ? `font-size: ${inheritedSize}px` : "",
      inheritedColor ? `color: ${inheritedColor}` : ""
    ].filter(Boolean).join("; ");
    const content = text ? `<span class="stepper-text" style="${contentStyle}">${text.toUpperCase()}</span>` : `<div class="stepper-dot"></div>`;
    return `
    <div class="stepper-container type-${type} size-${size} color-${colorId} ${isPressed ? "pressed" : ""}" 
         ${id ? `data-source="${id}"` : ""} 
         data-type="${type}">
      ${content}
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/SelectRenderer.ts
  var renderSelectHTML = (props) => {
    const { size, colorId, value, options = [], id } = props;
    const labels = options.length > 0 ? options.map((opt) => typeof opt === "string" ? opt : opt.label) : ["NO OPTIONS"];
    const currentIndex = Math.min(labels.length - 1, Math.floor(value * labels.length));
    const currentLabel = labels[currentIndex];
    return `
    <div class="mini-select size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="select-value">${(currentLabel || "").toUpperCase()}</div>

      <div class="select-arrow">\u25BC</div>
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/ScopeRenderer.ts
  function renderScopeHTML(props) {
    const { variant, bind, size, color = "var(--scope-color, #00ff88)" } = props;
    const w = size.width || 220;
    const h = size.height || 125;
    return `
    <div class="scope-display variant-${variant}" 
         data-bind="${bind}"
         style="width: 100%; height: 100%; --scope-color: ${color};">
        <canvas class="scope-canvas" width="${w}" height="${h}"></canvas>
        <div class="scope-grid"></div>
    </div>
  `;
  }

  // ../../web/src/omega-ui-core/renderers/TerminalRenderer.ts
  function renderTerminalHTML(props) {
    const { variant, bind, color = "var(--terminal-color, #ffcc00)", font = "monospace" } = props;
    return `
    <div class="terminal-display variant-${variant}" 
         data-bind="${bind}"
         style="width: 100%; height: 100%; color: ${color}; font-family: ${font};">
        <div class="terminal-container" style="padding: 6px; font-size: 10px; opacity: 0.85; height: 100%; overflow: hidden; box-sizing: border-box;">&gt; SYS_OK: Telemetry online...</div>
    </div>
  `;
  }

  // ../../web/src/omega-ui-core/renderers/IllustrationRenderer.ts
  var renderIllustrationHTML = (props) => {
    const { assetUrl, size, id, variant = "contain" } = props;
    const width = size?.width || 40;
    const height = size?.height || 40;
    if (!assetUrl) {
      return `<div class="illustration-container illustration-missing" style="width: ${width * 1.5}px; height: ${height * 1.5}px;"></div>`;
    }
    return `
    <div 
        class="illustration-container variant-${variant}" 
        style="width: ${width * 1.5}px; height: ${height * 1.5}px;"
        ${id ? `data-source="${id}"` : ""}
    >
        <img 
          src="${assetUrl}" 
          style="width: 100%; height: 100%;" 
        />
    </div>
  `.trim();
  };

  // ../../web/src/omega-ui-core/renderers/SequenceRenderer.ts
  var renderSequenceHTML = (props) => {
    const {
      assetUrl,
      value,
      frames,
      frameWidth,
      frameHeight,
      orientation,
      opacity,
      style
    } = props;
    const renderWidth = style?.width || frameWidth;
    const renderHeight = style?.height || frameHeight;
    if (!assetUrl) {
      return `
            <div style="width: ${renderWidth}px; height: ${renderHeight}px; border: 1px dashed #555; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 6px; color: #555; font-family: monospace; font-weight: 900;">NO_SEQUENCE</span>
            </div>
        `;
    }
    const backgroundSize = orientation === "v" ? `100% auto` : `auto 100%`;
    const effectiveValue = props.style?.polarity === "inverted" ? 1 - value : value;
    const frameIndex = props.isFrameIndex ? value : Math.round(effectiveValue * (frames - 1));
    const percent = frames > 1 ? frameIndex / (frames - 1) * 100 : 0;
    const backgroundPos = orientation === "v" ? `0% ${percent}%` : `${percent}% 0%`;
    return `
        <div class="omega-sequence-layer" style="
            width: ${renderWidth}px;
            height: ${renderHeight}px;
            background-image: url('${assetUrl}');
            background-position: ${backgroundPos};
            background-size: ${backgroundSize};
            background-repeat: no-repeat;
            opacity: ${opacity};
            position: relative;
            pointer-events: none;
        ">
        </div>
    `;
  };

  // ../../web/src/omega-ui-core/renderers/AttachmentRenderer.ts
  var AttachmentRenderer = {
    renderAttachmentHTML(props) {
      const { type } = props;
      switch (type) {
        case "label":
          return this.renderLabelHTML(props);
        case "led":
          return this.renderLedHTML(props);
        case "graphic":
        case "graphic-fragment":
          return this.renderGraphicHTML(props);
        default:
          return "";
      }
    },
    renderLabelHTML(props) {
      const { text, style, manifest } = props;
      const color = ColorResolver.resolve(style?.color || style?.fontColor || "#ffffff", manifest);
      const fontSize = style?.fontSize || 8;
      const font = style?.font || "Inter";
      const weight = style?.fontWeight || "900";
      return `
          <div class="attachment-label" style="
            color: ${color}; 
            font-size: ${fontSize}px; 
            font-family: ${font}; 
            font-weight: ${weight};
            text-transform: uppercase;
            letter-spacing: 0.1em;
            pointer-events: none;
            white-space: nowrap;
          ">
            ${text || "LABEL"}
          </div>
        `;
    },
    renderLedHTML(props) {
      const { value = 0, style, manifest } = props;
      const color = ColorResolver.resolve(style?.color || "#00f2ff", manifest);
      const isActive = value > 0.5;
      const size = style?.size || 6;
      const glow = isActive ? `box-shadow: 0 0 ${size}px ${color};` : "";
      const opacity = isActive ? 1 : 0.2;
      return `
          <div class="attachment-led" style="
            width: ${size}px; 
            height: ${size}px; 
            background-color: ${color}; 
            border-radius: 50%;
            opacity: ${opacity};
            ${glow}
            transition: all 0.2s ease;
          "></div>
        `;
    },
    renderGraphicHTML(props) {
      const { style, resolveAsset } = props;
      const assetId = style?.asset;
      let assetUrl = resolveAsset ? resolveAsset(assetId) : assetId;
      if (assetId && !assetUrl && !assetId.startsWith("http") && !assetId.startsWith("/")) {
        assetUrl = `/assets/elements/cells/knobs/${assetId}.png`;
      }
      const finalOpacity = style?.opacity !== void 0 ? style.opacity : 1;
      const fitting = style?.fitting || "contain";
      const width = style?.width || 48;
      const height = style?.height || 48;
      const imageStyle = assetUrl ? `background-image: url('${assetUrl}'); background-size: ${fitting};` : "background-color: rgba(255,0,255,0.2); border: 1px dashed magenta;";
      return `
          <div class="attachment-graphic" style="
            position: absolute; 
            left: 50%; 
            top: 50%; 
            transform: translate(-50%, -50%); 
            width: ${width}px; 
            height: ${height}px;
            background-repeat: no-repeat; 
            background-position: center; 
            opacity: ${finalOpacity};
            ${imageStyle}
          ">
          </div>
        `;
    }
  };

  // ../../web/src/omega-ui-core/renderers/cellRendererMap.ts
  var COMP_RENDERER_MAP = {
    "sequence-layer": (node, _props, opt) => {
      const style = node.style || {};
      const frames = style.frames || 1;
      const frameWidth = style.frameWidth || 48;
      const frameHeight = style.frameHeight || 48;
      const orientation = style.orientation || "v";
      const opacity = style.opacity !== void 0 ? style.opacity : 1;
      return renderSequenceHTML({
        assetUrl: opt.assetUrl,
        value: opt.forceFrame !== void 0 ? opt.forceFrame : opt.runtimeValue,
        frames,
        frameWidth,
        frameHeight,
        orientation,
        opacity,
        style,
        isFrameIndex: opt.forceFrame !== void 0
      });
    },
    "graphic-fragment": (node, _props, opt) => {
      return AttachmentRenderer.renderAttachmentHTML({
        type: "graphic-fragment",
        variant: node.style?.variant || "A_default",
        text: node.meta?.label || node.id || "",
        value: opt.runtimeValue,
        steps: opt.steps,
        style: node.style,
        manifest: opt.manifest,
        resolveAsset: opt.resolveAsset
      });
    },
    "knob": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderKnobHTML({
        ...props,
        size: props.size || "A",
        colorId: node.style?.variant || "cyan",
        value: opt.runtimeValue,
        assetUrl: opt.assetUrl,
        frames: opt.assetDef?.frames,
        orientation: opt.assetDef?.orientation,
        explicitMarkerColor: resolved.style.indicatorColor || resolved.style.color,
        style: resolved.style,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedColor: resolved.style.fontColor || opt.inherited.color,
        inheritedSize: resolved.style.fontSize || opt.inherited.size
      });
    },
    "port": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderPortHTML({
        ...props,
        size: props.size || "A",
        colorId: node.style?.variant || "cyan",
        value: opt.runtimeValue,
        label: node.meta?.label || node.id || "",
        explicitColor: node.style?.variant,
        customSignalColor: resolved.style.color,
        style: resolved.style,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedColor: opt.inherited.color,
        inheritedSize: opt.inherited.size
      });
    },
    "led": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderLedHTML({
        ...props,
        size: props.size || "A",
        colorId: node.style?.variant || "cyan",
        value: opt.runtimeValue,
        explicitColor: resolved.style.color
      });
    },
    "display": (node, props, opt) => {
      const variant = node.style?.variant || "";
      const mode = variant.includes("lcd") ? "lcd" : variant.includes("led") ? "led" : "oled";
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderDisplayHTML({
        ...props,
        size: props.size || "A",
        colorId: node.style?.variant || "cyan",
        value: opt.runtimeValue,
        mode,
        steps: opt.steps,
        explicitTextColor: resolved.style.color,
        explicitGlassColor: resolved.style.glassColor,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedColor: opt.inherited.color,
        inheritedSize: opt.inherited.size
      });
    },
    "slider-v": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderSliderHTML({
        ...props,
        type: "slider-v",
        style: resolved.style,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color,
        assetUrl: opt.assetUrl,
        frames: opt.assetDef?.frames,
        orientation: opt.assetDef?.orientation
      });
    },
    "slider-h": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderSliderHTML({
        ...props,
        type: "slider-h",
        style: resolved.style,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color,
        assetUrl: opt.assetUrl,
        frames: opt.assetDef?.frames,
        orientation: opt.assetDef?.orientation
      });
    },
    "switch": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderSwitchHTML({
        ...props,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "button": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderStepperHTML({
        ...props,
        type: "button",
        text: node.meta?.label || node.id || "",
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "push": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderStepperHTML({
        ...props,
        type: "push",
        text: node.meta?.label || node.id || "",
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "stepper": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderStepperHTML({
        ...props,
        type: "stepper",
        text: node.meta?.label || node.id || "",
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "select": (node, props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderSelectHTML({
        ...props,
        options: node.meta?.options || node.style?.options || [],
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "scope": (node, _props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      const sz = node.layout?.size || { width: 220, height: 150 };
      return renderScopeHTML({
        variant: node.style?.variant || "phosphor",
        bind: node.bind || "",
        size: { width: sz.width || 220, height: sz.height || 150 },
        color: resolved.style.color || node.style?.color,
        font: resolved.style.font || node.style?.font,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "terminal": (node, _props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      const sz = node.layout?.size || { width: 220, height: 120 };
      return renderTerminalHTML({
        variant: node.style?.variant || "amber",
        bind: node.bind || "",
        size: { width: sz.width || 220, height: sz.height || 120 },
        color: resolved.style.color || node.style?.color,
        font: resolved.style.font || node.style?.font,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "illustration": (node, _props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderIllustrationHTML({
        assetUrl: opt.assetUrl,
        size: resolved.style.width && resolved.style.height ? { width: resolved.style.width, height: resolved.style.height } : { width: 40, height: 40 },
        variant: resolved.style.variant || "contain",
        id: node.id
      });
    },
    "label": (node, props, opt) => {
      const ps = props.style;
      return AttachmentRenderer.renderAttachmentHTML({
        type: "label",
        variant: node.style?.variant || "default",
        text: node.meta?.label || node.id || "",
        style: ps,
        manifest: opt.manifest,
        inherited: {
          ...opt.inherited,
          font: ps?.font || opt.inherited.font,
          size: ps?.fontSize || opt.inherited.size,
          color: ps?.fontColor || opt.inherited.color
        }
      });
    }
  };

  // ../../web/src/omega-ui-core/renderers/chassisRenderer.ts
  function renderRackHTML(node, options) {
    const { manifest, resolveAsset, activeTab = "MAIN" } = options;
    const style = node.style || {};
    const variant = style.variant || "default";
    const tabStyleId = manifest?.ui?.layout?.tabStyles?.[activeTab];
    const targetStyleId = tabStyleId || variant;
    const rackStyles = manifest?.ui?.styles?.rack || [];
    const libStyle = rackStyles.find((s) => s.id === targetStyleId) || { aesthetics: {} };
    const genetics = libStyle.aesthetics || {};
    const aesthetics = style;
    const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color || "chassis", manifest);
    const faceplateConfig = manifest?.ui?.faceplate;
    let bgAsset = aesthetics.asset || genetics.asset;
    if (!bgAsset && faceplateConfig) {
      if (typeof faceplateConfig === "string") {
        bgAsset = faceplateConfig;
      } else {
        bgAsset = faceplateConfig[activeTab] || faceplateConfig["MAIN"];
      }
    }
    const resolveBackgroundCSS = (assetId, fitting = "stretch") => {
      const url = resolveAsset ? resolveAsset(assetId) : void 0;
      if (!url) return "";
      let bgSize = "100% 100%";
      let repeat = "no-repeat";
      const position = "center";
      switch (fitting) {
        case "cover":
          bgSize = "cover";
          break;
        case "contain":
          bgSize = "contain";
          break;
        case "tile":
          bgSize = "auto";
          repeat = "repeat";
          break;
        case "center":
          bgSize = "auto";
          break;
      }
      return `background-image: url('${url}') !important; background-size: ${bgSize} !important; background-repeat: ${repeat} !important; background-position: ${position} !important;`;
    };
    const faceplateMode = manifest?.ui?.faceplate?.mode || "stretch";
    const bgStyles = resolveBackgroundCSS(bgAsset, faceplateMode);
    const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
    const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;
    const attachments = style?.attachments || [];
    const screwFragment = attachments?.find((a) => a.type === "knob" && a.variant === "rack-screw");
    const sAesthetics = screwFragment?.style || {};
    const rackScrewStyles = manifest?.ui?.styles?.["rack-screw"] || [];
    const sGenetics = rackScrewStyles.find((s) => s.id === (screwFragment?.variant || "default"))?.aesthetics || {};
    const hardware = manifest?.ui?.hardware || {};
    const screwSpacing = sAesthetics.spacing ?? sGenetics.spacing ?? 8;
    const screwCount = hardware.screwCount ?? 4;
    const screwMapping = hardware.screwMapping || [];
    const masterScrewOffset = hardware.screwOffset;
    const finalScrewSpacing = masterScrewOffset !== void 0 ? masterScrewOffset : screwSpacing;
    const positions = [];
    if (screwCount >= 4) {
      positions.push({ top: true, left: true });
      positions.push({ top: true, left: false });
      positions.push({ top: false, left: true });
      positions.push({ top: false, left: false });
    }
    if (screwCount === 6) {
      positions.push({ top: true, left: false, xPercent: 50 });
      positions.push({ top: false, left: false, xPercent: 50 });
    } else if (screwCount === 8) {
      positions.push({ top: true, left: false, xPercent: 33 });
      positions.push({ top: true, left: false, xPercent: 66 });
      positions.push({ top: false, left: false, xPercent: 33 });
      positions.push({ top: false, left: false, xPercent: 66 });
    }
    const renderScrew = (pos, idx) => {
      const posStyleId = screwMapping[idx];
      const posLibStyle = manifest?.ui?.styles?.["mounting-screw"]?.find((s) => s.id === posStyleId);
      const posAesthetics = posLibStyle?.aesthetics || {};
      const sColor = ColorResolver.resolve(posAesthetics.color || sAesthetics.color || sGenetics.color || "hardware", manifest);
      const sAssetId = posAesthetics.asset || sAesthetics.asset || sGenetics.asset;
      const sFitting = posAesthetics.fitting || sAesthetics.fitting || sGenetics.fitting || "cover";
      const sAssetCSS = resolveBackgroundCSS(sAssetId, sFitting);
      const stylePos = `
        position: absolute;
        ${pos.top ? "top" : "bottom"}: ${finalScrewSpacing}px;
        ${pos.xPercent ? `left: ${pos.xPercent}%; transform: translateX(-50%);` : (pos.left ? "left" : "right") + `: ${finalScrewSpacing}px;`}
      `;
      return `
        <div style="
          ${stylePos}
          width: 14px;
          height: 14px;
          background-color: ${sAssetCSS ? "transparent" : sColor};
          ${sAssetCSS || `
            background-image:
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 40%),
              radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 20%, transparent 60%),
              linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%) !important;
            background-size: cover !important;
          `}
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${sAssetCSS ? "" : `
            <div style="
              width: 8px;
              height: 2px;
              background-color: rgba(0,0,0,0.4);
              transform: rotate(45deg);
              border-radius: 1px;
            "></div>
          `}
        </div>
      `;
    };
    return `
      <div class="industrial-rack-chassis"
        style="position: absolute; inset: 0; background-color: ${bgColor}; ${bgStyles} border-radius: ${rounding}px; border: ${borderWidth}px solid rgba(255,255,255,0.05); overflow: hidden;">
        ${screwFragment ? positions.map((p, i) => renderScrew(p, i)).join("") : ""}
      </div>
    `.trim();
  }

  // ../../web/src/omega-ui-core/renderers/ContainerRenderer.ts
  function renderContainerHTML(node, options) {
    const { manifest, resolveAsset, isSelected, isError } = options;
    const style = node.style || {};
    const aesthetics = style;
    const variant = aesthetics.variant || "default";
    const libStyles = manifest?.ui?.styles?.container || [];
    const libStyle = libStyles.find((s) => s.id === variant) || { aesthetics: {} };
    const genetics = libStyle.aesthetics || {};
    const label = node.meta?.label || node.id || "LABEL";
    const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color, manifest);
    const borderColor = ColorResolver.resolve(aesthetics.indicatorColor || genetics.indicatorColor, manifest);
    const labelBg = ColorResolver.resolve(aesthetics.labelBg || genetics.labelBg, manifest);
    const fontColor = ColorResolver.resolve(aesthetics.fontColor || genetics.fontColor || "#ffffff", manifest);
    const bgAsset = aesthetics.asset || genetics.asset;
    const bgUrl = resolveAsset ? resolveAsset(bgAsset) : void 0;
    const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
    const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;
    const opacity = aesthetics.opacity ?? genetics.opacity ?? 1;
    const labelX = aesthetics.labelX ?? genetics.labelX ?? 0;
    const labelY = aesthetics.labelY ?? genetics.labelY ?? 0;
    const labelW = aesthetics.labelW ?? genetics.labelW ?? 0;
    const labelH = aesthetics.labelH ?? genetics.labelH ?? 0;
    const labelRounding = aesthetics.labelRounding ?? genetics.labelRounding ?? 0;
    const labelPadding = aesthetics.labelPadding ?? genetics.labelPadding ?? 4;
    const font = aesthetics.font || genetics.font || "Inter";
    const fontSize = aesthetics.fontSize || genetics.fontSize || 10;
    const alignment = aesthetics.alignment || genetics.alignment || "left";
    const flexAlign = alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";
    const spacing = aesthetics.spacing || genetics.spacing || 0;
    return `
      <div class="industrial-container-surface ${isSelected ? "selected" : ""} ${isError ? "error" : ""}"
        style="position: absolute; inset: 0; background-color: ${bgColor}; background-image: ${bgUrl ? `url(${bgUrl})` : "none"}; background-size: cover; background-position: center; border: ${borderWidth}px solid ${borderColor}; border-radius: ${rounding}px; opacity: ${opacity}; overflow: hidden;">
        <div class="container-label-fragment"
          style="position: absolute; left: ${labelX}px; top: ${labelY}px; width: ${labelW ? `${labelW}px` : "auto"}; height: ${labelH ? `${labelH}px` : "auto"}; background-color: ${labelBg}; border-radius: ${labelRounding}px; display: flex; align-items: center; justify-content: ${flexAlign}; padding: ${labelPadding}px; white-space: nowrap; z-index: 10;">
          <span style="font-family: ${font}; font-size: ${fontSize}px; color: ${fontColor}; text-align: ${alignment}; letter-spacing: ${spacing}px; width: 100%;">
            ${isError ? "\u26A0\uFE0F INTEGRITY_LEAK" : label}
          </span>
        </div>
      </div>
    `.trim();
  }

  // ../../web/src/omega-ui-core/renderers/utils/VariantParser.ts
  function parseVariant(variant) {
    const v = variant || "B_cyan";
    const parts = v.split("_");
    let size = parts[0] || "B";
    if (v.includes("_3mm")) size = "D";
    if (v.includes("_5mm")) size = "C";
    const colorId = parts.length > 1 ? parts.filter((p) => p !== size && p !== "3mm" && p !== "5mm").join("_") : "cyan";
    return { size, colorId };
  }

  // ../../web/src/omega-ui-core/renderers/utils/CellMetrics.ts
  var RADIUS_MAP = {
    knob: { A: 24, B: 18, C: 12, D: 9 },
    port: { A: 21, B: 18, C: 15, D: 12 },
    display: { A: 16.5, B: 13, C: 10, D: 7 },
    led: { A: 6, B: 4, C: 2.5, D: 1.5 },
    slider: { A: 6, B: 6, C: 6, D: 6 },
    switch: { A: 16, B: 12, C: 10, D: 8 },
    stepper: { A: 12, B: 9, C: 7, D: 6 },
    select: { A: 12, B: 12, C: 12, D: 12 }
  };
  var DEFAULT_RADIUS = 12;
  function getComponentRadius(node, manifest) {
    const variantStr = node.style?.variant || "default";
    const { size } = parseVariant(variantStr);
    const comp = node.cellRef || node.kind || "knob";
    const typeKey = comp.includes("slider") ? "slider" : comp;
    if (manifest?.ui?.sizes && size) {
      const resolvedSize = manifest.ui.sizes[size];
      if (resolvedSize !== void 0) {
        return resolvedSize;
      }
    }
    const sizeMap = RADIUS_MAP[typeKey] || RADIUS_MAP.knob;
    const radius = sizeMap ? sizeMap[size] : DEFAULT_RADIUS;
    return radius || DEFAULT_RADIUS;
  }

  // ../../web/src/omega-ui-core/renderers/utils/AttachmentStack.ts
  function renderAttachmentStackHTML(pos, attachments, options) {
    const { runtimeValue, steps, inherited, resolveAsset } = options;
    const stackItems = attachments.filter((a) => a.position === pos);
    if (stackItems.length === 0) return "";
    const itemsHTML = stackItems.map((a) => {
      const resolvedStyle = ColorResolver.resolveStyle(a.style || {}, options.manifest);
      const html = AttachmentRenderer.renderAttachmentHTML({
        type: a.type,
        variant: a.variant,
        text: a.text || "",
        value: runtimeValue,
        steps,
        style: {
          ...resolvedStyle,
          fontSize: a.fontSize,
          fontFamily: a.fontFamily,
          fontColor: a.fontColor
        },
        inherited,
        manifest: options.manifest,
        resolveAsset: resolveAsset || void 0
      });
      const s = resolvedStyle;
      const rawS = s;
      const offX = (rawS.offsetX !== void 0 ? Number(rawS.offsetX) : a.offsetX || 0) * 1.5;
      const offY = (rawS.offsetY !== void 0 ? Number(rawS.offsetY) : a.offsetY || 0) * 1.5;
      return `<div style="transform: translate(${offX}px, ${offY}px)">${html}</div>`;
    }).join("");
    return `<div class="attachment-stack stack-${pos}">${itemsHTML}</div>`;
  }

  // ../../web/src/omega-ui-core/renderers/utils/TypographyInheritance.ts
  var getInheritedTypography = (compType, manifest) => {
    const mapping = manifest?.ui?.typography;
    if (!mapping) return {};
    let cat = "labels";
    if (compType === "display" || compType === "scope" || compType === "terminal") {
      cat = "displays";
    } else if (compType === "port" || compType === "knob" || compType === "slider-v" || compType === "slider-h" || compType === "switch") {
      cat = "labels";
    } else if (compType === "stepper" || compType === "button" || compType === "push") {
      cat = "labels";
    }
    return mapping[cat] || {};
  };

  // ../../web/src/omega-ui-core/renderers/CellRenderer.ts
  var CellRenderer = class {
    /**
     * MASTER DISPATCHER
     */
    static renderCellHTML(node, options) {
      const { runtimeValue, steps, isSelected, resolveAsset, manifest } = options;
      const compType = node.cellRef || node.kind || "knob";
      if (compType === "rack") {
        return renderRackHTML(node, options);
      }
      const isArchitectural = compType === "container" || compType === "group" || compType === "face";
      if (isArchitectural) {
        return `
        <div class="architectural-cell" style="width: 100%; height: 100%; position: relative;">
          ${renderContainerHTML(node, options)}
        </div>
      `.trim();
      }
      const variant = node.style?.variant || "B_cyan";
      const parsed = parseVariant(variant);
      const size = node.style?.scale || parsed.size;
      const colorId = parsed.colorId;
      const compRadius = getComponentRadius(node, manifest);
      const resolved = resolveNodeStyle(node, manifest);
      const resolvedStyle = resolved.style;
      const assetId = resolvedStyle.asset || node.style?.asset;
      const assetDef = manifest?.resources?.assets?.find((a) => a.id === assetId);
      const assetUrl = resolveAsset ? resolveAsset(assetId) : assetId;
      const inherited = getInheritedTypography(node.kind, manifest);
      const commonProps = {
        size,
        colorId,
        value: runtimeValue,
        id: node.id,
        isSelected: !!isSelected,
        isMain: true,
        style: resolvedStyle
      };
      const renderer = COMP_RENDERER_MAP[compType];
      let mainHTML = "";
      try {
        mainHTML = renderer ? renderer(node, commonProps, {
          assetUrl,
          assetDef,
          steps,
          runtimeValue,
          inherited,
          manifest,
          forceFrame: options.forceFrame
        }) : `<div class="unsupported-renderer">NO RENDERER: ${compType}</div>`;
      } catch (err) {
        const error = err;
        console.error(`[CELL RENDERER] Fatal error in primitive ${compType}:`, error);
        mainHTML = `
        <div class="renderer-error" style="color: #ff3300; font-family: monospace; font-size: 8px; border: 1px solid #ff3300; padding: 4px; background: rgba(255,51,0,0.1);">
          ERROR: ${error.message}
        </div>
      `;
      }
      const attachments = node.style?.attachments || [];
      const stackOptions = { runtimeValue, steps, inherited, manifest, resolveAsset };
      const cellOffsetX = (node.style?.offsetX || 0) * 1.5;
      const cellOffsetY = (node.style?.offsetY || 0) * 1.5;
      const containerWidth = resolvedStyle.width !== void 0 ? resolvedStyle.width : compRadius * 2 * 1.5;
      const containerHeight = resolvedStyle.height !== void 0 ? resolvedStyle.height : compRadius * 2 * 1.5;
      return `
      <div class="control-cell variant-${variant}" style="--comp-radius: ${compRadius}px;">
        ${renderAttachmentStackHTML("top", attachments, stackOptions)}
        ${renderAttachmentStackHTML("bottom", attachments, stackOptions)}
        ${renderAttachmentStackHTML("left", attachments, stackOptions)}
        ${renderAttachmentStackHTML("right", attachments, stackOptions)}
        ${renderAttachmentStackHTML("center", attachments, stackOptions)}
        <div class="cell-main" style="width: ${containerWidth}px; height: ${containerHeight}px; transform: translate(calc(-50% + ${cellOffsetX}px), calc(-50% + ${cellOffsetY}px))">
          ${mainHTML}
        </div>
      </div>
    `.trim();
    }
  };

  // ../../web/src/omega-ui-core/typography/registry.ts
  var OMEGA_OFFICIAL_FONTS = [
    {
      id: "inter",
      name: "Inter",
      category: "ui",
      description: "Standard Industrial UI & Labeling",
      isProtected: true
    },
    {
      id: "outfit",
      name: "Outfit",
      category: "branding",
      description: "Headlines, Branding & High-Density Titles",
      isProtected: true
    },
    {
      id: "seven-segment",
      name: "Seven Segment",
      category: "digital",
      description: "LCD / LED Digital Displays",
      isProtected: true
    },
    {
      id: "microgramma",
      name: "Microgramma",
      category: "technical",
      description: "Technical Specs & Vintage Aero-Industrial Labels",
      isProtected: true
    }
  ];
  var PROTECTED_FONT_NAMES = OMEGA_OFFICIAL_FONTS.map((f) => f.name);
  var TYPOGRAPHY_CATEGORIES = [
    { id: "headings", label: "Module Headings", defaultFont: "Outfit", defaultSize: 12 },
    { id: "labels", label: "Component Labels", defaultFont: "Inter", defaultSize: 8 },
    { id: "displays", label: "Digital Displays", defaultFont: "Seven Segment", defaultSize: 14 },
    { id: "technical", label: "Technical Specs", defaultFont: "Microgramma", defaultSize: 7 }
  ];

  // src/Util/AssetResolver.ts
  var AssetResolver = class {
    /**
     * Resolves a local module path to a full virtual URL handled by the C++ host.
     * @param moduleId The canonical ID of the module.
     * @param path The relative path inside the module directory (e.g., 'illustration.svg').
     */
    static resolve(moduleId, path) {
      if (!path || !moduleId) return void 0;
      if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
        return path;
      }
      if (path.startsWith("asset://")) {
        const assetPath = path.substring(8);
        return `https://juce.localhost/modules/${moduleId}/${assetPath}`;
      }
      const cleanPath = path.startsWith("./") ? path.substring(2) : path;
      return `https://juce.localhost/modules/${moduleId}/${cleanPath}`;
    }
    /**
     * Resolves a global UI asset path.
     */
    static resolveGlobal(path) {
      return path;
    }
  };

  // src/Renderers/templates.ts
  function resolveContainerWidth(w, rackWidth) {
    if (typeof w === "number") return w;
    switch (w) {
      case "full":
        return rackWidth;
      case "1/2":
        return rackWidth * 0.5;
      default:
        return parseFloat(w) || rackWidth;
    }
  }
  function shouldRenderInTab(item, activeTab, descriptor) {
    const currentTab = activeTab || "MAIN";
    const containerId = item.presentation?.container || item.presentation?.group;
    if (containerId) {
      const container = descriptor.ui?.layout?.containers?.find((c) => c.id === containerId);
      if (container && container.tab) return container.tab === currentTab;
    }
    return (item.presentation?.tab || "MAIN") === currentTab;
  }
  function renderItemHTML(item, descriptor, values, scale) {
    const id = item.bind || item.paramId || item.source || item.portId;
    const val = values[id] ?? 0;
    const x = (item.pos?.x || 0) * scale;
    const y = (item.pos?.y || 0) * scale;
    const html = CellRenderer.renderCellHTML(item, {
      skin: descriptor.ui?.skin || "industrial",
      zoom: scale,
      runtimeValue: val,
      steps: item.steps || 100,
      isSelected: false,
      isLiveMode: true,
      manifest: descriptor,
      resolveAsset: (ref) => AssetResolver.resolve(descriptor.id, ref)
    });
    const compHeight = item.presentation?.height ?? 1;
    return `
        <div class="cell-anchor" style="position: absolute; left: ${x}px; top: ${y}px; --omega-height: ${compHeight}">
            ${html}
        </div>
    `;
  }
  function renderContainersHTML(descriptor, activeTab, scale) {
    const layout = descriptor.ui?.layout;
    if (!layout || !layout.containers) return "";
    const rackWidth = descriptor.ui?.dimensions?.width || 120;
    const currentTab = activeTab || "MAIN";
    const skin = descriptor.ui?.skin || "industrial";
    const activeContainers = layout.containers.filter((c) => !c.tab || c.tab === currentTab);
    const sorted = [...activeContainers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return sorted.map((c) => {
      const x = c.pos.x * scale;
      const y = c.pos.y * scale;
      const w = resolveContainerWidth(c.size.w, rackWidth) * scale;
      const h = c.size.h * scale;
      const variant = c.variant || "default";
      const labelConfig = TYPOGRAPHY_CATEGORIES.find((cat) => cat.id === "labels");
      const defaultSize = labelConfig?.defaultSize || 8;
      const labelSize = (c.labelFontSize || defaultSize) * scale;
      const labelFont = labelConfig?.defaultFont || "Inter";
      const style = `left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; z-index: ${c.zIndex || 0};`;
      const labelStyle = `font-family: '${labelFont}'; font-size: ${labelSize}px;`;
      return `
            <div class="layout-container container-${skin} variant-${variant}" style="${style}" data-container-id="${c.id}">
                ${c.label ? `<div class="container-label-pill" style="${labelStyle}">${c.label}</div>` : ""}
            </div>
        `;
    }).join("");
  }
  function buildPanelHTML(descriptor, activeTab, values, scale) {
    const skin = descriptor.ui?.skin || "industrial";
    const w = (descriptor.ui?.dimensions?.width || 120) * scale;
    const h = (descriptor.ui?.dimensions?.height || 420) * scale;
    const lighting = descriptor.ui?.lighting;
    const lightAngle = lighting?.shadowAngle ?? 135;
    const lightDist = lighting?.distance ?? 4;
    const lightBlur = lighting?.blur ?? 4;
    const lightColor = lighting?.shadowColor || "rgba(0,0,0,0.5)";
    const angleRad = lightAngle * Math.PI / 180;
    const shadowX = Math.cos(angleRad) * lightDist;
    const shadowY = Math.sin(angleRad) * lightDist;
    const shadowVars = `
        --omega-shadow-angle: ${lightAngle}deg;
        --omega-shadow-x: ${shadowX.toFixed(2)}px;
        --omega-shadow-y: ${shadowY.toFixed(2)}px;
        --omega-shadow-blur: ${lightBlur}px;
        --omega-shadow-color: ${lightColor};
    `.trim();
    let aestheticVars = "";
    if (descriptor.ui?.colors) {
      Object.entries(descriptor.ui.colors).forEach(([key, val]) => {
        aestheticVars += `--omega-${key}: ${val}; `;
      });
    }
    if (descriptor.ui?.typography) {
      Object.entries(descriptor.ui.typography).forEach(([key, val]) => {
        aestheticVars += `--omega-${key}: ${val}; `;
      });
    }
    const faceplate = descriptor.ui?.faceplate ? `background-image: url('${AssetResolver.resolve(descriptor.id, descriptor.ui.faceplate)}'); background-size: cover;` : "";
    const allItems = [...descriptor.ui?.controls || [], ...descriptor.ui?.jacks || []];
    const tabs = [...new Set(allItems.map((i) => i.presentation?.tab || "MAIN"))].sort();
    return `
        <div class="module-panel skin-${skin}" style="width: ${w}px; height: ${h}px; ${shadowVars} ${aestheticVars} ${faceplate}">
            <!-- Industrial Screws -->
            <div class="module-screw top-left"></div>
            <div class="module-screw top-right"></div>
            <div class="module-screw bottom-left"></div>
            <div class="module-screw bottom-right"></div>

            ${tabs.length > 1 ? `
            <div class="module-tabs">
                ${tabs.map((t) => {
      const isActive = activeTab === t;
      return `<button class="tab-btn ${isActive ? "active" : ""}" data-tab="${t}">${t}</button>`;
    }).join("")}
            </div>
            ` : ""}

            <div class="module-canvas">
                <div class="layer layer-background">${renderContainersHTML(descriptor, activeTab, scale)}</div>
                <div class="layer layer-controls">
                    ${allItems.filter((item) => shouldRenderInTab(item, activeTab, descriptor)).map((item) => renderItemHTML(item, descriptor, values, scale)).join("")}
                </div>
            </div>
        </div>
    `;
  }

  // src/Renderers/ValueFormatters.ts
  function getRegistryEntity(id) {
    return window.omegaCatalog?.[id];
  }
  function getFormattedValue(att, entity, val) {
    const precision = att?.ui_precision ?? 2;
    if (!entity) return val.toFixed(precision);
    if (entity.options) {
      const opt = entity.options.find((o) => o.value === val);
      if (opt) return opt.label;
    }
    return val.toFixed(precision);
  }
  function getEntityValueLabel(entity, value) {
    if (!entity || !entity.options) return value.toFixed(2);
    const currentIndex = Math.floor(value * entity.options.length);
    return entity.options[currentIndex]?.label || value.toFixed(2);
  }

  // src/Renderers/TelemetrySync.ts
  function subscribeToTelemetry(descriptor) {
    const pins = [];
    const allItems = [...descriptor.ui?.controls || [], ...descriptor.ui?.jacks || []];
    allItems.forEach((item) => {
      if (item.presentation?.component === "led" || item.look === "led" || item.presentation?.component === "port") {
        const id = item.source || item.bind || item.id;
        if (id) pins.push(`${descriptor.id}.${id}`);
      }
      item.presentation?.attachments?.forEach((att) => {
        if (att.type === "led" || att.type === "display") {
          const id = att.bind || item.bind || item.id;
          if (id) pins.push(`${descriptor.id}.${id}`);
        }
      });
    });
    if (pins.length > 0) {
      window.rpcCommandDispatcher.dispatch({
        type: "subscribeTelemetry",
        payload: { pins: [...new Set(pins)] }
      });
    }
  }
  function updateTelemetryUI(content, source, value) {
    const targets = content.querySelectorAll(`[data-source="${source}"]`);
    targets.forEach((el) => {
      const t = el;
      if (t.classList.contains("led") || t.classList.contains("port-led")) {
        const d = parseInt(t.style.width) || 8;
        const baseColor = t.style.backgroundColor;
        t.style.opacity = (0.3 + value * 0.7).toString();
        if (value > 0.05) {
          t.style.boxShadow = `0 0 ${d}px ${baseColor}99`;
        } else {
          t.style.boxShadow = "none";
        }
      }
      if (t.classList.contains("display-value")) {
        t.innerText = value.toFixed(2);
      }
    });
  }

  // src/Renderers/ControlUIUpdater.ts
  function updateControlUI(content, descriptor, id, value) {
    const cell = content.querySelector(`[data-id="${id}"]`);
    if (!cell) return;
    const knobMarker = cell.querySelector(".knob-marker");
    if (knobMarker) {
      const angle = -135 + value * 270;
      knobMarker.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    }
    const slider = cell.querySelector(".slider-wrapper");
    if (slider) {
      const isHoriz = slider.classList.contains("slider-h");
      const rail = slider.querySelector(".slider-rail-active");
      const cap = slider.querySelector(".slider-cap");
      if (rail) {
        if (isHoriz) rail.style.width = `calc(${value * 100}% - 4px)`;
        else rail.style.height = `calc(${value * 100}% - 4px)`;
      }
      if (cap) {
        if (isHoriz) cap.style.left = `calc(${value * 90}%)`;
        else cap.style.bottom = `calc(${value * 90}%)`;
      }
    }
    const display = cell.querySelector(".display-value");
    if (display) {
      const entity = getRegistryEntity(id);
      display.innerText = getFormattedValue(null, entity, value);
    }
    const selValue = cell.querySelector(".select-value");
    if (selValue) {
      const entity = getRegistryEntity(id);
      selValue.textContent = getEntityValueLabel(entity, value);
    }
    triggerContainerActivity(content, descriptor, id);
  }
  function triggerContainerActivity(content, descriptor, id) {
    const item = [...descriptor.ui?.controls || [], ...descriptor.ui?.jacks || []].find((i) => (i.bind || i.id) === id);
    const containerId = item?.presentation?.container || item?.presentation?.group;
    if (!containerId) return;
    const containerEl = content.querySelector(`[data-container-id="${containerId}"]`);
    if (!containerEl) return;
    containerEl.classList.remove("active-pulse");
    void containerEl.offsetWidth;
    containerEl.classList.add("active-pulse");
  }

  // src/Renderers/FontInjector.ts
  function injectResources(descriptor) {
    const fonts = descriptor.ui?.resources?.fonts;
    if (!fonts || fonts.length === 0) return;
    const styleId = `module-fonts-${descriptor.id}`;
    if (document.getElementById(styleId)) return;
    let css = "";
    fonts.forEach((font) => {
      if (PROTECTED_FONT_NAMES.includes(font.name)) {
        OmegaLog.warn("RENDERER", `Module ${descriptor.id} tried to override protected font: ${font.name}. Ignoring.`);
        return;
      }
      const url = AssetResolver.resolve(descriptor.id, font.file);
      if (url) {
        css += `
                @font-face {
                    font-family: '${font.name}';
                    src: url('${url}') format('truetype');
                    font-display: swap;
                }
                `;
      }
    });
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = css;
    document.head.appendChild(style);
    OmegaLog.info("RENDERER", `Injected ${fonts.length} custom fonts for module: ${descriptor.id}`);
  }

  // src/Renderers/Visualizers.ts
  var VisualizerEngine = class {
    visualizers = [];
    rafHandle = null;
    /**
     * Scans content for scope/terminal displays and wires terminal log listeners.
     */
    init(content) {
      this.visualizers = [];
      content.querySelectorAll(".scope-display, .terminal-display").forEach((el) => {
        const type = el.classList.contains("scope-display") ? "scope" : "terminal";
        const bindId = el.dataset.bind;
        this.visualizers.push({ id: bindId, type, el });
        if (type === "terminal") {
          this.setupTerminalListener(bindId, el);
        }
      });
    }
    start() {
      if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
      const loop = () => {
        this.updateVisualizers();
        this.rafHandle = requestAnimationFrame(loop);
      };
      this.rafHandle = requestAnimationFrame(loop);
    }
    destroy() {
      if (this.rafHandle) {
        cancelAnimationFrame(this.rafHandle);
        this.rafHandle = null;
      }
    }
    setupTerminalListener(bindId, el) {
      const container = el.querySelector(".terminal-container");
      if (!container) return;
      window.addEventListener("omega:TERMINALLOG", (e) => {
        const data = e.detail?.payload;
        if (data && data.bindId === bindId) {
          this.addTerminalLine(container, data.message);
        }
      });
    }
    addTerminalLine(container, message) {
      const line = document.createElement("div");
      line.className = "terminal-line";
      line.textContent = `> ${message}`;
      container.appendChild(line);
      while (container.children.length > 50) {
        container.removeChild(container.firstChild);
      }
      container.scrollTop = container.scrollHeight;
    }
    updateVisualizers() {
      this.visualizers.filter((v) => v.type === "scope").forEach((v) => {
        this.drawScope(v.el);
      });
    }
    drawScope(el) {
      const canvas = el.querySelector("canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bindId = el.dataset.bind;
      const buffer = window.omega_get_scope_buffer ? window.omega_get_scope_buffer(bindId) : this.getMockWaveform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = getComputedStyle(el).getPropertyValue("--scope-color").trim() || "#00ff88";
      ctx.lineWidth = 2;
      const step = canvas.width / (buffer.length - 1);
      for (let i = 0; i < buffer.length; i++) {
        const x = i * step;
        const y = (0.5 - buffer[i] * 0.4) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    getMockWaveform() {
      const points = 100;
      const result = [];
      const time = Date.now() * 5e-3;
      for (let i = 0; i < points; i++) {
        result.push(Math.sin(time + i * 0.2));
      }
      return result;
    }
  };

  // src/Renderers/ModuleRenderer.ts
  var ModuleRenderer = class {
    content;
    descriptor;
    values = {};
    isInitialized = false;
    activeTab = "MAIN";
    binder;
    visualizers;
    RENDER_SCALE = 1.5;
    constructor(content, options) {
      this.content = content;
      this.descriptor = options.manifest || options;
      this.binder = new ControlBinder(this, this.values);
      this.visualizers = new VisualizerEngine();
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      const firstWithTab = allItems.find((i) => i.presentation?.tab);
      if (firstWithTab && firstWithTab.presentation?.tab) {
        this.activeTab = firstWithTab.presentation.tab;
      }
      OmegaLog.info("RENDERER", `ModuleRenderer initialized for: ${this.descriptor.id}`);
    }
    async init() {
      injectResources(this.descriptor);
      this.render();
      this.bind();
      this.visualizers.init(this.content);
      this.isInitialized = true;
      subscribeToTelemetry(this.descriptor);
      this.syncAllFromStore();
      this.visualizers.start();
    }
    render() {
      this.content.innerHTML = buildPanelHTML(this.descriptor, this.activeTab, this.values, this.RENDER_SCALE);
      this.bind();
      this.syncAllFromStore();
    }
    getRegistryEntity(id) {
      return getRegistryEntity(id);
    }
    bind() {
      this.content.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          this.activeTab = e.target.dataset.tab || "MAIN";
          this.render();
        });
      });
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      this.binder.bindContainer(this.content, allItems);
    }
    setParam(id, value) {
      this.values[id] = value;
      const paramId = `${this.descriptor.id}.${id}`;
      window.rpcCommandDispatcher.dispatch({
        type: "setParameter",
        payload: { target: paramId, value }
      });
      this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
      updateControlUI(this.content, this.descriptor, id, value);
    }
    syncAllFromStore() {
      if (!this.isInitialized) return;
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      allItems.forEach((item) => {
        const id = item.bind || item.id || item.source;
        if (id) {
          const globalId = `${this.descriptor.id}.${id}`;
          const store = window.runtimeStore?.getSnapshot();
          if (!store || !store.parameters) return;
          const val = store.parameters[globalId];
          const tVal = store.telemetry ? store.telemetry[globalId] : void 0;
          if (val !== void 0) {
            this.values[id] = val;
            this.updateControlUI(id, val);
          }
          if (tVal !== void 0) {
            updateTelemetryUI(this.content, id, tVal.v || 0);
          }
        }
      });
    }
    onStateUpdate(state) {
      this.syncAllFromStore();
    }
    destroy() {
      this.visualizers.destroy();
    }
  };

  // src/Components/patchbay/matrixLayout.ts
  var DEFAULT_REGISTRIES = {
    midi_in: [
      { id: "midi_out", label: "MIDI DATA OUT", type: "MIDI", roles: ["output"] },
      { id: "led_act", label: "ACTIVITY LED", type: "GATE", roles: ["output"] }
    ],
    midi_trigger: [
      { id: "midi_in", label: "MIDI IN", type: "MIDI", roles: ["input"] },
      { id: "note_out", label: "NOTE V/OCT", type: "CV", roles: ["output"] },
      { id: "gate_out", label: "GATE OUT", type: "GATE", roles: ["output"] },
      { id: "trig_out", label: "TRIG OUT", type: "GATE", roles: ["output"] }
    ],
    omega_lab_monitor: [
      { id: "audio_in", label: "SIGNAL IN", type: "CV", roles: ["input"] },
      { id: "volts_in", label: "VOLTAGE IN", type: "CV", roles: ["input"] }
    ],
    oscillator_vA: [
      { id: "pitch_in", label: "PITCH V/OCT", type: "CV", roles: ["input"] },
      { id: "fm_in", label: "FM IN", type: "CV", roles: ["input"] },
      { id: "sine_out", label: "SINE OUT", type: "AUDIO", roles: ["output"] },
      { id: "saw_out", label: "SAW OUT", type: "AUDIO", roles: ["output"] }
    ],
    filter_vA: [
      { id: "audio_in", label: "AUDIO IN", type: "AUDIO", roles: ["input"] },
      { id: "cutoff_cv", label: "CUTOFF CV", type: "CV", roles: ["input"] },
      { id: "audio_out", label: "AUDIO OUT", type: "AUDIO", roles: ["output"] }
    ],
    envelope_adsr: [
      { id: "gate_in", label: "GATE IN", type: "GATE", roles: ["input"] },
      { id: "env_out", label: "ENV OUT", type: "CV", roles: ["output"] }
    ],
    vca: [
      { id: "in", label: "SIGNAL IN", type: "AUDIO", roles: ["input"] },
      { id: "cv", label: "CV IN", type: "CV", roles: ["input"] },
      { id: "out", label: "SIGNAL OUT", type: "AUDIO", roles: ["output"] }
    ],
    lfo: [
      { id: "reset_in", label: "SYNC RESET", type: "CV", roles: ["input"] },
      { id: "lfo_out", label: "LFO OUT", type: "CV", roles: ["output"] }
    ],
    test_parity: [
      { id: "p1", label: "PORT 1 IN", type: "AUDIO", roles: ["input"] },
      { id: "p2", label: "PORT 2 OUT", type: "AUDIO", roles: ["output"] }
    ]
  };
  function normalizeList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "object") return Object.values(data);
    return [];
  }
  function getNameForId(list, id) {
    if (!id) return "";
    const item = list.find((s) => s && s.id === id);
    return item ? item.name || item.label || id : "---";
  }
  function getAmountColor(val) {
    if (val <= 0.01) return "#ffffff";
    if (val <= 1) {
      const f2 = val;
      return `rgb(${Math.round(255 - f2 * 255)},${Math.round(255 - f2 * 13)},255)`;
    }
    const f = Math.min(val - 1, 1);
    return `rgb(${Math.round(f * 255)},${Math.round(242 - f * 85)},${Math.round(255 - f * 255)})`;
  }
  function getSlotSkeleton(i) {
    return `
    <div class="matrix-card aseptic-card" id="matrix-slot-${i}" data-index="${i}">
      <div class="card-header">
        <span class="card-index">${(i + 1).toString().padStart(2, "0")}</span>
        <div class="card-status"></div>
      </div>
      <div class="card-routing">
        <div class="card-source-label card-label">...</div>
        <div class="card-arrow">\u2193</div>
        <div class="card-target-label card-label">...</div>
      </div>
      <div class="bipolar-container">
        <div class="bipolar-slider-bg">
          <div class="bipolar-slider-fill gain-mode"></div>
        </div>
        <div class="bipolar-value">0.00x</div>
      </div>
      <div class="card-via-label card-label-tiny"></div>
    </div>
  `;
  }
  function generateOptions(list, current, exclude) {
    let html = '<option value="">- NONE -</option>';
    const groups = {};
    for (const opt of list) {
      const groupName = opt.instance || "Global";
      if (exclude && groupName === exclude) continue;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(opt);
    }
    for (const [group, items] of Object.entries(groups)) {
      html += `<optgroup label="${group.toUpperCase()}">`;
      items.forEach((item) => {
        const disp = item.name.replace(group, "").trim() || item.name;
        html += `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${disp}</option>`;
      });
      html += `</optgroup>`;
    }
    return html;
  }
  function buildMetadataFromInventory(components, state) {
    const sources = [];
    const targets = [];
    const mountedInstances = [];
    const activeModules = state?.patch?.modules || state?.preset?.modules || [];
    activeModules.forEach((m, idx) => {
      const typeId = m.componentId || m.typeId || m.id || m.modelId;
      const instanceId = m.instanceId || `${typeId}_${idx + 1}`;
      const name = m.name || typeId;
      if (typeId) mountedInstances.push({ typeId, instanceId, name });
    });
    if (mountedInstances.length === 0 && typeof document !== "undefined") {
      document.querySelectorAll(".aseptic-module-panel").forEach((el, idx) => {
        const typeId = el.dataset.moduleId;
        if (typeId) {
          const nameEl = el.querySelector(".card-name, span");
          const name = nameEl ? nameEl.textContent.trim() : typeId;
          const instanceId = `${typeId}_${idx + 1}`;
          mountedInstances.push({ typeId, instanceId, name });
        }
      });
    }
    const typeCounts = {};
    mountedInstances.forEach((inst) => {
      typeCounts[inst.typeId] = (typeCounts[inst.typeId] || 0) + 1;
    });
    const typeIndices = {};
    mountedInstances.forEach((inst) => {
      const comp = components.find((c) => c.id === inst.typeId) || {
        id: inst.typeId,
        name: inst.name
      };
      const registry = comp.registry || DEFAULT_REGISTRIES[inst.typeId] || [];
      typeIndices[inst.typeId] = (typeIndices[inst.typeId] || 0) + 1;
      const num = typeIndices[inst.typeId];
      const total = typeCounts[inst.typeId];
      const instanceLabel = total > 1 ? `${comp.name || inst.name} #${num}` : comp.name || inst.name;
      registry.forEach((reg) => {
        const portId = `${inst.instanceId}.${reg.id}`;
        const portName = `${instanceLabel} ${reg.label || reg.id}`;
        const item = {
          id: portId,
          name: portName,
          instance: instanceLabel,
          label: reg.label || reg.id,
          type: reg.type || "CV"
        };
        if (reg.roles?.includes("output")) sources.push(item);
        if (reg.roles?.includes("input")) targets.push(item);
      });
    });
    OmegaLog.info(
      "MATRIX",
      `Industrial Metadata Rebuilt: ${sources.length} sources, ${targets.length} targets across ${mountedInstances.length} mounted modules`
    );
    return { sources, targets };
  }
  async function syncMaxSlots(rpc2) {
    if (!rpc2) return 32;
    try {
      const settings = await rpc2.getSystemSettings();
      if (!settings || !Array.isArray(settings)) return 32;
      const maxSlotsSetting = settings.find((s) => s && s.id === "maxPatchbaySlots");
      if (maxSlotsSetting) {
        const val = Math.floor(maxSlotsSetting.currentValue || 32);
        return val > 0 ? val : 32;
      }
    } catch (e) {
      OmegaLog.warn("MATRIX", "Max slots sync failed", e);
    }
    return 32;
  }

  // src/Components/patchbay/matrixTemplates.ts
  function setupHeaderToggles(modalHeader, viewMode, onViewChange) {
    if (!modalHeader || document.getElementById("matrix-view-toggles")) return;
    const toggles = document.createElement("div");
    toggles.id = "matrix-view-toggles";
    toggles.style.cssText = "display:flex; gap:8px; margin-left:20px;";
    toggles.innerHTML = `
    <button class="aseptic-btn ${viewMode === "compose" ? "active" : ""}" id="btn-view-compose">COMPOSE</button>
    <button class="aseptic-btn ${viewMode === "overview" ? "active" : ""}" id="btn-view-overview">OVERVIEW</button>
  `;
    modalHeader.parentElement?.insertBefore(toggles, modalHeader.nextSibling);
    document.getElementById("btn-view-compose")?.addEventListener("click", () => onViewChange("compose"));
    document.getElementById("btn-view-overview")?.addEventListener("click", () => onViewChange("overview"));
  }
  function renderStructure(grid, viewMode, matrix, sources, targets, maxSlots, onAddModulation) {
    let html = "";
    if (viewMode === "compose") {
      const activeSlots = matrix.map((s, i) => ({ ...s, i })).filter(
        (s) => s.active === true || s.active === "true" || s.source !== "" && s.source !== void 0
      );
      if (activeSlots.length === 0 && sources.length === 0) {
        html = `
        <div class="empty-state-info">
          <div class="info-title">NO SIGNAL ASSETS DETECTED</div>
          <p>The system catalog is currently empty or no active modules with I/O ports were found in the rack.</p>
          <div class="metadata-warning">HANDSHAKE PENDING: Verify Era 7 Bridge Status</div>
        </div>
      `;
      } else {
        activeSlots.forEach((slot) => {
          html += getSlotSkeleton(slot.i);
        });
        if (activeSlots.length < maxSlots) {
          html += `
          <div class="matrix-card add-card" id="btn-add-modulation">
            <div class="add-icon">\uFF0B</div>
            <div class="card-label" style="text-align:center">ADD MODULATION</div>
          </div>
        `;
        }
      }
    } else {
      for (let i = 0; i < maxSlots; i++) {
        html += getSlotSkeleton(i);
      }
    }
    grid.innerHTML = html;
    document.getElementById("btn-add-modulation")?.addEventListener("click", onAddModulation);
    return html;
  }
  function syncSlotsFromState(matrix, sources, targets, selectedSlot) {
    matrix.forEach((slot, i) => {
      const el = document.getElementById(`matrix-slot-${i}`);
      if (!el) return;
      const isSelected = selectedSlot === i;
      el.classList.toggle("active", slot.active);
      el.classList.toggle("selected", isSelected);
      const sourceLabel = el.querySelector(".card-source-label");
      const targetLabel = el.querySelector(".card-target-label");
      if (sourceLabel) sourceLabel.textContent = getNameForId(sources, slot.source) || "EMPTY";
      if (targetLabel) targetLabel.textContent = getNameForId(targets, slot.target) || "---";
      const fill = el.querySelector(".bipolar-slider-fill");
      const valueDisp = el.querySelector(".bipolar-value");
      if (fill && valueDisp) {
        const amount = parseFloat(slot.amount || 0);
        const color = getAmountColor(amount);
        fill.style.width = `${Math.min(Math.abs(amount), 2) * 50}%`;
        fill.style.backgroundColor = color;
        valueDisp.textContent = `${amount.toFixed(2)}x`;
        valueDisp.style.color = color;
      }
      const viaLabel = el.querySelector(".card-via-label");
      if (viaLabel) {
        viaLabel.textContent = slot.via ? `VIA: ${getNameForId(sources, slot.via)}` : "";
      }
    });
  }
  function renderInspector(container, slotIdx, matrix, sources, targets) {
    const slot = matrix[slotIdx] || {
      active: false,
      source: "",
      target: "",
      amount: 0,
      via: "",
      viaAmount: 0
    };
    const amount = parseFloat(slot.amount || 0);
    const viaAmount = parseFloat(slot.viaAmount || 0);
    const targetInstance = slot.target?.split(".")[0] || "";
    const sourceInstance = slot.source?.split(".")[0] || "";
    container.innerHTML = `
    <div class="inspector-title">SLOT ${(slotIdx + 1).toString().padStart(2, "0")} DETAILS</div>

    <div class="control-group">
      <label>SOURCE</label>
      <select class="inspector-select" data-key="source">
        ${generateOptions(sources, slot.source, targetInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>TARGET</label>
      <select class="inspector-select" data-key="target">
        ${generateOptions(targets, slot.target, sourceInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>GAIN MULTIPLIER (0 to 2.0x)</label>
      <input type="range" class="inspector-range" data-key="amount" min="0" max="2" step="0.01" value="${amount}">
      <div class="bipolar-value" style="color: ${getAmountColor(amount)}">${amount.toFixed(2)}x</div>
    </div>

    <div class="control-group">
      <label>VIA Modulator</label>
      <select class="inspector-select" data-key="via">
        ${generateOptions(sources, slot.via, targetInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>VIA AMOUNT</label>
      <input type="range" class="inspector-range" data-key="viaAmount" min="0" max="1" step="0.05" value="${viaAmount}">
    </div>

    <div class="inspector-actions" style="margin-top: auto; display: flex; gap: 10px;">
      <button class="aseptic-btn" id="btn-clear-slot" style="flex:1">CLEAR</button>
      <button class="aseptic-btn" id="btn-init-matrix" style="flex:1">INIT ALL</button>
    </div>
  `;
  }

  // src/Components/patchbay/matrixEvents.ts
  function attachGridListeners(grid, onSelectSlot, onSendUpdate) {
    grid.querySelectorAll(".matrix-card").forEach((card) => {
      card.addEventListener("click", () => {
        onSelectSlot(parseInt(card.dataset.index || "0"));
      });
      const slider = card.querySelector(".bipolar-slider-bg");
      if (slider) {
        let isDragging = false;
        const update = (e) => {
          const rect = slider.getBoundingClientRect();
          const val = Math.max(0, Math.min(2, (e.clientX - rect.left) / rect.width * 2));
          onSendUpdate(parseInt(card.dataset.index || "0"), "amount", val);
        };
        slider.addEventListener("pointerdown", (e) => {
          isDragging = true;
          e.target.setPointerCapture(e.pointerId);
          update(e);
        });
        slider.addEventListener("pointermove", (e) => {
          if (isDragging) update(e);
        });
        slider.addEventListener("pointerup", () => {
          isDragging = false;
        });
      }
    });
  }
  function attachInspectorListeners(container, selectedSlot, onSendUpdate) {
    container.querySelectorAll(".inspector-select, .inspector-range").forEach((ctrl) => {
      ctrl.addEventListener(
        ctrl.tagName === "SELECT" ? "change" : "input",
        (e) => {
          const val = e.target.type === "range" ? parseFloat(e.target.value) : e.target.value;
          onSendUpdate(selectedSlot, e.target.dataset.key, val);
        }
      );
    });
    document.getElementById("btn-clear-slot")?.addEventListener("click", () => {
      onSendUpdate(selectedSlot, "source", "");
      onSendUpdate(selectedSlot, "target", "");
      onSendUpdate(selectedSlot, "amount", 0);
    });
  }
  function sendUpdate(slot, key, value) {
    const dispatcher = window.rpcCommandDispatcher;
    if (dispatcher) {
      dispatcher.dispatch({
        type: "updatePatchbayMatrixSlot",
        payload: { slot, key, value }
      });
    }
  }
  function triggerActivity(type, manualChangeTimer, setManualTimer) {
    const led = document.getElementById("matrix-activity-led");
    if (!led) return;
    if (type === "manual") {
      led.classList.remove("activity-general");
      led.classList.add("activity-manual");
      if (manualChangeTimer) clearTimeout(manualChangeTimer);
      const timer = setTimeout(() => {
        led.classList.remove("activity-manual");
      }, 1e3);
      setManualTimer(timer);
    } else if (!manualChangeTimer) {
      led.classList.add("activity-general");
      setTimeout(() => led.classList.remove("activity-general"), 100);
    }
  }

  // src/Components/ModulePatchbayMatrix.ts
  var ModulePatchbayMatrix = class {
    el = null;
    root = null;
    options;
    state = null;
    sources = [];
    targets = [];
    viewMode = "compose";
    manualChangeTimer = null;
    selectedSlot = 0;
    maxSlots = 32;
    structureBuilt = false;
    constructor(options = {}) {
      this.options = options;
      this.loadMetadata();
      this.refreshMaxSlots();
      const store = window.runtimeStore;
      if (store) {
        store.subscribe((type) => {
          if (type & 1) {
            this.onStateUpdate(store.getSnapshot());
          }
        });
      }
    }
    ensureElements() {
      if (this.el && this.root) return true;
      this.el = document.getElementById("modulation-modal");
      this.root = document.getElementById("modulation-workspace");
      if (!this.root && this.el) {
        const content = this.el.querySelector(".modulation-modal-content");
        if (content) {
          this.root = document.createElement("div");
          this.root.id = "modulation-workspace";
          this.root.className = "modulation-workspace";
          this.root.innerHTML = `
          <div id="matrix-grid-container" class="matrix-grid-container"></div>
          <div id="matrix-inspector-container" class="matrix-inspector-container"></div>
        `;
          const footer = content.querySelector(".modal-footer");
          content.insertBefore(this.root, footer);
        }
      }
      return !!(this.el && this.root);
    }
    async refreshMaxSlots() {
      const rpc2 = window.omegaRPC;
      const newValue = await syncMaxSlots(rpc2);
      if (newValue !== this.maxSlots) {
        OmegaLog.info("MATRIX", `Capacity updated: ${newValue}`);
        this.maxSlots = newValue;
        this.structureBuilt = false;
        if (this.isWorkspaceOpen()) this.renderWorkspace();
      }
    }
    async loadMetadata() {
      const rpc2 = window.omegaRPC;
      const inv = window.inventoryStore;
      if (inv && inv.getAllItems().length > 0) {
        const { sources, targets } = buildMetadataFromInventory(inv.getAllItems(), this.state);
        this.sources = sources;
        this.targets = targets;
        if (this.isWorkspaceOpen()) this.renderWorkspace();
      }
      if (!rpc2) return;
      setTimeout(async () => {
        try {
          const resp = await rpc2.send("getModulationMetadata", {});
          if (resp?.sources?.length > 0) {
            this.sources = normalizeList(resp.sources);
            this.targets = normalizeList(resp.targets);
            OmegaLog.info("MATRIX", `Metadata synced from backend. Sources: ${this.sources.length}`);
            if (this.isWorkspaceOpen()) this.renderWorkspace();
          } else {
            OmegaLog.debug("MATRIX", "Backend returned empty metadata, keeping InventoryStore data.");
          }
        } catch (e) {
          OmegaLog.warn("MATRIX", "Backend metadata sync failed, relying on InventoryStore", e);
        }
      }, 500);
    }
    toggleWorkspace(open) {
      if (!this.ensureElements()) return;
      const modal = this.el;
      modal.style.display = open ? "flex" : "none";
      if (open) {
        this.loadMetadata();
        this.refreshMaxSlots();
        this.renderWorkspace();
        this.notifyRouteHighlight();
      } else {
        this.notifyRouteHighlight(null);
      }
    }
    /**
     * Ruta destacada (§9): propaga el slot seleccionado a PatchCableManager
     * para que su cable brille y el resto se atenúe. Decorativo: si el manager
     * no está disponible o la UI de cables falla, nada se rompe.
     */
    notifyRouteHighlight(slot = this.selectedSlot) {
      try {
        window.patchCableManager?.highlightRoute?.(slot);
      } catch {
      }
    }
    isWorkspaceOpen() {
      if (!this.ensureElements()) return false;
      return this.el.style.display === "flex";
    }
    onStateUpdate(state) {
      const oldModules = this.state?.patch?.modules || this.state?.preset?.modules || [];
      const newModules = state?.patch?.modules || state?.preset?.modules || [];
      const structuralChange = oldModules.length !== newModules.length || JSON.stringify(oldModules.map((m) => m.id)) !== JSON.stringify(newModules.map((m) => m.id));
      this.state = state;
      const matrixData = state?.patch?.patchbayMatrix || state?.preset?.patchbayMatrix || [];
      const matrix = normalizeList(matrixData);
      const activeCount = matrix.filter(
        (s) => s.active === true || s.active === "true"
      ).length;
      const countEl = document.getElementById("matrix-active-count");
      if (countEl) countEl.innerText = activeCount.toString().padStart(2, "0");
      triggerActivity("general", this.manualChangeTimer, (t) => this.manualChangeTimer = t);
      if (this.isWorkspaceOpen()) {
        if (structuralChange) {
          OmegaLog.debug("MATRIX", "Structural change detected, rebuilding metadata...");
          this.loadMetadata();
        }
        syncSlotsFromState(matrix, this.sources, this.targets, this.selectedSlot);
      }
    }
    triggerActivity(type) {
      triggerActivity(type, this.manualChangeTimer, (t) => this.manualChangeTimer = t);
    }
    sendUpdate(slot, key, value) {
      this.triggerActivity("manual");
      sendUpdate(slot, key, value);
    }
    renderWorkspace() {
      if (!this.ensureElements()) return;
      if (!this.state && window.runtimeStore) {
        this.state = window.runtimeStore.getSnapshot();
      }
      const grid = document.getElementById("matrix-grid-container");
      const inspector = document.getElementById("matrix-inspector-container");
      if (!grid) {
        OmegaLog.error("MATRIX", "Grid container missing from DOM");
        return;
      }
      const modalHeader = document.querySelector(".modulation-modal-content .modal-title");
      setupHeaderToggles(modalHeader, this.viewMode, (mode) => {
        this.viewMode = mode;
        this.structureBuilt = false;
        this.renderWorkspace();
      });
      if (!this.structureBuilt || this.viewMode === "compose") {
        const matrixData2 = this.state?.patch?.patchbayMatrix || this.state?.preset?.patchbayMatrix || [];
        const matrix2 = normalizeList(matrixData2);
        renderStructure(
          grid,
          this.viewMode,
          matrix2,
          this.sources,
          this.targets,
          this.maxSlots,
          () => this.addModulation()
        );
        attachGridListeners(grid, (index) => {
          this.selectedSlot = index;
          this.notifyRouteHighlight();
          this.renderWorkspace();
        }, (slot, key, value) => this.sendUpdate(slot, key, value));
        this.structureBuilt = this.viewMode === "overview";
      }
      const matrixData = this.state?.patch?.patchbayMatrix || this.state?.preset?.patchbayMatrix || [];
      const matrix = normalizeList(matrixData);
      syncSlotsFromState(matrix, this.sources, this.targets, this.selectedSlot);
      if (inspector) {
        renderInspector(inspector, this.selectedSlot, matrix, this.sources, this.targets);
        attachInspectorListeners(
          inspector,
          this.selectedSlot,
          (slot, key, value) => this.sendUpdate(slot, key, value)
        );
      }
    }
    addModulation() {
      const matrix = this.state?.preset?.patchbayMatrix || [];
      let targetSlot = matrix.findIndex(
        (s, idx) => idx < this.maxSlots && !s.active && !s.source
      );
      if (targetSlot === -1 && matrix.length < this.maxSlots) targetSlot = matrix.length;
      if (targetSlot !== -1 && targetSlot < this.maxSlots) {
        this.selectedSlot = targetSlot;
        this.notifyRouteHighlight();
        this.structureBuilt = false;
        this.renderWorkspace();
        setTimeout(() => {
          const sel = document.querySelector('select[data-key="source"]');
          if (sel) sel.focus();
        }, 100);
      }
    }
  };
  window.ModulePatchbayMatrix = ModulePatchbayMatrix;

  // src/Components/ModulePatchModal.ts
  var ModulePatchModal = class {
    el = null;
    tabsContainer = null;
    viewport = null;
    currentInstanceId = "";
    activeTab = "";
    currentSchema = null;
    patchbayMatrix = [];
    maxSlots = 32;
    constructor() {
      console.log("[ModulePatchModal] Initializing Unified Era 7 UI...");
      this.init();
    }
    init() {
      this.el = document.getElementById("module-patch-modal");
      this.tabsContainer = document.getElementById("patch-tabs-container");
      this.viewport = document.getElementById("patch-tab-viewport");
      this.el?.addEventListener("click", (e) => {
        if (e.target === this.el) this.close();
      });
      this.tabsContainer?.addEventListener("click", (e) => {
        const btn = e.target.closest(".aseptic-tab-btn");
        if (btn) {
          const tabId = btn.getAttribute("data-tab");
          if (tabId) this.switchTab(tabId);
        }
      });
      if (window.runtimeStore) {
        window.runtimeStore.subscribe((type) => {
          if (type & 2 || type & 4) {
            this.updateRealtimeUI();
          }
        });
      }
    }
    async open(instanceId, schema) {
      if (!this.el) return;
      this.currentInstanceId = instanceId;
      const normalized = this.normalizeSchema(schema);
      this.currentSchema = normalized;
      this.el.style.display = "flex";
      if (!normalized || !normalized.items || normalized.items.length === 0) {
        this.renderTabs(normalized || { items: [] });
        this.switchTab("RACK");
        return;
      }
      this.renderTabs(normalized);
      const tabs = this.getTabsFromSchema(normalized);
      const defaultTab = tabs.includes("MAIN") ? "MAIN" : tabs[0] || "RACK";
      this.switchTab(defaultTab);
    }
    normalizeSchema(schema) {
      if (!schema) return null;
      if (schema.items) return schema;
      const items = [];
      if (schema.ui && schema.ui.controls) {
        schema.ui.controls.forEach((ctrl) => {
          const param = schema.parameters?.find((p) => p.id === ctrl.bind);
          items.push({
            id: ctrl.bind,
            paramId: ctrl.bind,
            label: ctrl.label || param?.label || ctrl.bind,
            tab: ctrl.presentation?.tab || "MAIN",
            group: ctrl.presentation?.container || ctrl.presentation?.group || "PARAMETERS",
            look: ctrl.type === "selector" ? "list" : "knob",
            options: param?.options || null,
            default: param?.default || 0,
            roles: param?.modulable ? ["stream"] : []
          });
        });
      }
      return { ...schema, items };
    }
    close() {
      if (this.el) this.el.style.display = "none";
    }
    renderTabs(schema) {
      if (!this.tabsContainer) return;
      this.tabsContainer.innerHTML = "";
      const tabs = this.getTabsFromSchema(schema);
      tabs.forEach((tabTitle) => {
        const btn = document.createElement("button");
        btn.className = "aseptic-tab-btn";
        btn.innerText = tabTitle.toUpperCase();
        btn.setAttribute("data-tab", tabTitle);
        this.tabsContainer.appendChild(btn);
      });
    }
    getTabsFromSchema(schema) {
      if (!schema || !schema.items) return [];
      const tabs = /* @__PURE__ */ new Set();
      schema.items.forEach((item) => {
        if (item.tab) tabs.add(item.tab);
      });
      tabs.add("RACK");
      return Array.from(tabs);
    }
    switchTab(tabId) {
      this.activeTab = tabId;
      this.tabsContainer?.querySelectorAll(".aseptic-tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });
      if (tabId === "RACK") {
        this.renderRackTab();
      } else {
        this.renderTabContent(tabId);
      }
    }
    renderRackTab() {
      if (!this.viewport) return;
      this.viewport.innerHTML = `
            <div class="aseptic-params-container">
                <div class="aseptic-group-title">RACK REORDERING</div>
                <div class="rack-reorder-actions">
                    <button class="btn-rack-action" id="btn-move-left">\u25C0 MOVE LEFT</button>
                    <button class="btn-rack-action" id="btn-move-right">MOVE RIGHT \u25B6</button>
                </div>
                <div class="aseptic-group-title">VISUAL THEME</div>
                <div class="theme-selector-container">
                    <select class="selector-control" id="theme-selector">
                        <option value="industrial">INDUSTRIAL (DEFAULT)</option>
                        <option value="carbon">CARBON (TECH)</option>
                        <option value="glass">GLASS (FUTURISTIC)</option>
                        <option value="minimal">MINIMAL (CLEAN)</option>
                    </select>
                </div>
                <div class="rack-reorder-info">
                    Instance: <span>${this.currentInstanceId}</span>
                </div>
            </div>
        `;
      const themeSel = document.getElementById("theme-selector");
      if (themeSel) {
        const currentTheme = window.runtimeStore.getSnapshot().preset?.auxiliary?.find((m) => m.instanceId === this.currentInstanceId)?.theme || "";
        themeSel.value = currentTheme;
        themeSel.addEventListener("change", (e) => {
          this.setModuleTheme(e.target.value);
        });
      }
      document.getElementById("btn-move-left")?.addEventListener("click", () => {
        this.moveModule(-1);
      });
      document.getElementById("btn-move-right")?.addEventListener("click", () => {
        this.moveModule(1);
      });
    }
    async setModuleTheme(theme) {
      console.log(`[ModulePatchModal] Setting theme for ${this.currentInstanceId} to ${theme}`);
      await window.rpcCommandDispatcher.dispatch({
        type: "setModuleTheme",
        payload: {
          instanceId: this.currentInstanceId,
          theme
        }
      });
    }
    async moveModule(direction) {
      console.log(`[ModulePatchModal] Moving module ${this.currentInstanceId} in direction ${direction}`);
      await window.rpcCommandDispatcher.dispatch({
        type: "moveModule",
        payload: {
          instanceId: this.currentInstanceId,
          direction
        }
      });
    }
    renderTabContent(tabId) {
      if (!this.viewport || !this.currentSchema) return;
      this.viewport.innerHTML = "";
      const items = this.currentSchema.items.filter((i) => i.tab === tabId);
      const form = document.createElement("div");
      form.id = "patch-params-form";
      form.className = "aseptic-params-container";
      this.viewport.appendChild(form);
      const groups = /* @__PURE__ */ new Map();
      items.forEach((item) => {
        const g = item.group || "PARAMETERS";
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(item);
      });
      groups.forEach((groupItems, groupName) => {
        const groupHeader = document.createElement("div");
        groupHeader.className = "aseptic-group-title";
        groupHeader.innerText = groupName.toUpperCase();
        form.appendChild(groupHeader);
        groupItems.forEach((item) => {
          this.renderParameterRow(form, [item]);
        });
      });
      this.setupListeners();
    }
    setupListeners() {
      if (!this.viewport) return;
      this.viewport.querySelectorAll("select.selector-control").forEach((select) => {
        select.addEventListener("change", (e) => {
          const id = select.getAttribute("data-param");
          const val = parseFloat(e.target.value);
          const paramId = `${this.currentInstanceId}.${id}`;
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramId, value: val });
        });
      });
      this.viewport.querySelectorAll(".knob-ring").forEach((ring) => {
        const id = ring.getAttribute("data-param");
        const move = (e) => {
          const rect = ring.getBoundingClientRect();
          let val = 1 - (e.clientY - rect.top) / rect.height;
          val = Math.max(0, Math.min(1, val));
          const paramId = `${this.currentInstanceId}.${id}`;
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramId, value: val });
          const knob = ring.querySelector(".knob");
          if (knob) knob.style.transform = `translateX(-50%) rotate(${val * 270 - 135}deg)`;
        };
        ring.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          ring.setPointerCapture(e.pointerId);
          move(e);
          const onMove = (ev) => move(ev);
          const onUp = () => {
            ring.removeEventListener("pointermove", onMove);
            ring.removeEventListener("pointerup", onUp);
          };
          ring.addEventListener("pointermove", onMove);
          ring.addEventListener("pointerup", onUp);
        });
      });
    }
    renderParameterRow(container, items) {
      const row = document.createElement("div");
      row.className = "aseptic-params-row";
      items.forEach((item) => {
        const cell = this.buildControlCell(item);
        row.appendChild(cell);
      });
      container.appendChild(row);
    }
    /**
     * ERA 6 STANDARD: Unified Control Cell Generator
     */
    buildControlCell(item) {
      const cell = document.createElement("div");
      const id = item.paramId || item.id;
      cell.className = "control-cell";
      cell.id = `cell-${this.currentInstanceId}-${id}`;
      cell.setAttribute("data-bind", id);
      const top = document.createElement("div");
      top.className = "cell-attachment-top";
      if (item.roles?.includes("stream")) {
        const led = document.createElement("div");
        led.className = "led led-orange";
        led.setAttribute("data-source", id);
        top.appendChild(led);
      }
      cell.appendChild(top);
      const main = document.createElement("div");
      main.className = "cell-main";
      if (item.look === "list" && item.options) {
        const select = document.createElement("select");
        select.className = "selector-control";
        select.setAttribute("data-param", id);
        item.options.forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt.value.toString();
          o.innerText = opt.label;
          select.appendChild(o);
        });
        main.appendChild(select);
      } else {
        main.innerHTML = `
                <div class="knob-ring" data-param="${id}">
                    <div class="knob"><div class="knob-marker white"></div></div>
                </div>
            `;
      }
      cell.appendChild(main);
      const info = document.createElement("div");
      info.className = "cell-info";
      const label = document.createElement("label");
      label.className = "cell-label";
      label.innerText = (item.label || id).toUpperCase();
      info.appendChild(label);
      const display = document.createElement("div");
      display.className = "cell-display";
      display.setAttribute("data-precision", (item.ui_precision ?? 2).toString());
      const currentVal = window.runtimeStore?.getValue(`${this.currentInstanceId}.${id}`, item.default || 0);
      display.innerText = currentVal.toString();
      info.appendChild(display);
      cell.appendChild(info);
      return cell;
    }
    /**
     * ERA 6: Real-time UI refresh from Aseptic Store
     */
    updateRealtimeUI() {
      if (!this.el || this.el.style.display !== "flex" || !this.viewport) return;
      this.viewport.querySelectorAll(".control-cell").forEach((cell) => {
        const id = cell.getAttribute("data-bind");
        if (!id) return;
        const val = window.runtimeStore.getValue(`${this.currentInstanceId}.${id}`);
        const knob = cell.querySelector(".knob");
        if (knob) knob.style.transform = `translateX(-50%) rotate(${val * 270 - 135}deg)`;
        const display = cell.querySelector(".cell-display");
        if (display) {
          const precision = parseInt(display.getAttribute("data-precision") || "2");
          display.innerText = val.toFixed(precision);
        }
        const select = cell.querySelector("select");
        if (select) select.value = val.toString();
        const led = cell.querySelector(".led");
        if (led) {
          const tVal = window.runtimeStore.getTelemetry(`${this.currentInstanceId}.${id}`);
          led.classList.toggle("active", tVal > 0.05);
        }
      });
    }
    renderError(reason) {
      if (!this.viewport) return;
      this.viewport.innerHTML = `
            <div class="contract-error-full">
                <div class="error-msg">CONTRACT VIOLATION</div>
                <div class="error-detail">${reason}</div>
            </div>
        `;
    }
  };

  // ../../web/src/omega-ui-core/uca/treeUtils.ts
  function mergeWithOverrides(base, overrides, policy) {
    const result = JSON.parse(JSON.stringify(base));
    for (const [path, value] of Object.entries(overrides)) {
      const matchingRules = policy.filter((p) => path === p.path || path.startsWith(p.path + ".")).sort((a, b) => b.path.length - a.path.length);
      const activeRule = matchingRules[0];
      if (activeRule) {
        if (activeRule.mode === "locked") {
          console.warn(`[UCA] Path is locked by policy: ${path}`);
          continue;
        }
        if (activeRule.mode === "hidden") {
          continue;
        }
      }
      setPathValue(result, path, value);
    }
    return result;
  }
  function setPathValue(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === void 0) continue;
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart !== void 0) {
      current[lastPart] = value;
    }
  }
  function applySlotMappings(node, mappings) {
    if (node.bind && mappings[node.bind]) {
      node.bind = mappings[node.bind] || void 0;
    }
    if (node.children) {
      node.children.forEach((child) => applySlotMappings(child, mappings));
    }
  }

  // ../../web/src/omega-ui-core/uca/ucaSemantics.ts
  function resolveNodeSemantics(node, ctx) {
    let templateBase = {};
    if (node.snapshot) {
      templateBase = JSON.parse(JSON.stringify(node.snapshot));
    } else if (node.cellRef && ctx.moduleTemplates?.[node.cellRef]) {
      const template = ctx.moduleTemplates[node.cellRef];
      if (template) {
        const baseNode = template.baseNode;
        if (baseNode) {
          const blueprint = JSON.parse(JSON.stringify(baseNode));
          templateBase = mergeWithOverrides(blueprint, node.overrides || {}, template.policy || []);
          if (node.slotMappings) {
            applySlotMappings(templateBase, node.slotMappings);
          }
        }
      }
    } else if (node.kind === "cell" && (node.cellRef || node.templateRef)) {
      const ref = node.cellRef || node.templateRef;
      const template = ctx.catalog[ref];
      if (template) {
        templateBase = JSON.parse(JSON.stringify(template.baseNode));
      }
    }
    const resolved = {
      ...templateBase,
      ...node,
      layout: {
        ...templateBase.layout,
        ...node.layout,
        // Ensure position is at least 0,0 if not provided
        pos: node.layout?.pos || templateBase.layout?.pos || { x: 0, y: 0 }
      },
      style: {
        ...templateBase.style,
        ...node.style
      },
      children: [
        ...templateBase.children || [],
        ...node.children || []
      ]
    };
    if (ctx.parentStyle) {
      resolved.style = {
        ...resolved.style,
        font: resolved.style?.font || ctx.parentStyle.font || void 0,
        fontColor: resolved.style?.fontColor || ctx.parentStyle.fontColor || void 0
      };
    }
    if (resolved.layout && !resolved.layout.size && templateBase.layout?.size) {
      resolved.layout.size = { ...templateBase.layout.size };
    }
    if (resolved.children && resolved.children.length > 0) {
      resolved.children = resolved.children.map((child, index) => {
        const childCtx = {
          ...ctx,
          parentStyle: resolved.style
        };
        const resolvedChild = resolveNodeSemantics(child, childCtx);
        if (!child.id) {
          resolvedChild.id = `${resolved.id}_child_${index}`;
        } else if (templateBase.children?.some((tc) => tc.id === child.id)) {
          resolvedChild.id = `${resolved.id}_${child.id}`;
        }
        return resolvedChild;
      });
    }
    return resolved;
  }

  // ../../web/src/omega-ui-core/uca/spatialConstraints.ts
  function getNodeSize(node) {
    return {
      width: node.layout?.size?.width || 48,
      height: node.layout?.size?.height || 48
    };
  }

  // ../../web/src/omega-ui-core/uca/layoutResolver.ts
  function resolveLayout(node, providedSize) {
    const mode = node.layout?.mode || "absolute";
    const gap = node.layout?.gap || 0;
    const padding = node.layout?.padding || 0;
    const nestedResolvedChildren = node.children ? node.children.map((c) => resolveLayout(c)) : [];
    const childrenSizes = nestedResolvedChildren.map((c) => getNodeSize(c));
    let autoWidth = 0;
    let autoHeight = 0;
    if (mode === "stack-v") {
      autoWidth = childrenSizes.reduce((max, s) => Math.max(max, s.width), 0) + 2 * padding;
      autoHeight = childrenSizes.reduce((acc, s) => acc + s.height, 0) + Math.max(0, childrenSizes.length - 1) * gap + 2 * padding;
    } else if (mode === "stack-h") {
      autoWidth = childrenSizes.reduce((acc, s) => acc + s.width, 0) + Math.max(0, childrenSizes.length - 1) * gap + 2 * padding;
      autoHeight = childrenSizes.reduce((max, s) => Math.max(max, s.height), 0) + 2 * padding;
    } else {
      autoWidth = childrenSizes.reduce((max, s, i) => {
        const childX = nestedResolvedChildren[i].layout?.pos?.x || 0;
        return Math.max(max, childX + s.width);
      }, 0) + 2 * padding;
      autoHeight = childrenSizes.reduce((max, s, i) => {
        const childY = nestedResolvedChildren[i].layout?.pos?.y || 0;
        return Math.max(max, childY + s.height);
      }, 0) + 2 * padding;
    }
    const effectiveSize = {
      width: providedSize?.width || node.layout?.size?.width || autoWidth || 80,
      height: providedSize?.height || node.layout?.size?.height || autoHeight || 80
    };
    const nodeWithEffectiveSize = {
      ...node,
      layout: {
        ...node.layout,
        pos: node.layout?.pos || { x: 0, y: 0 },
        size: effectiveSize
      }
    };
    if (!nodeWithEffectiveSize.children || nodeWithEffectiveSize.children.length === 0) return nodeWithEffectiveSize;
    if (mode === "absolute") {
      return {
        ...nodeWithEffectiveSize,
        children: nestedResolvedChildren
      };
    }
    const containerWidth = effectiveSize.width;
    const containerHeight = effectiveSize.height;
    let totalContentSize = 0;
    if (mode === "stack-v") {
      totalContentSize = childrenSizes.reduce((acc, s) => acc + s.height, 0) + Math.max(0, childrenSizes.length - 1) * gap;
    } else if (mode === "stack-h") {
      totalContentSize = childrenSizes.reduce((acc, s) => acc + s.width, 0) + Math.max(0, childrenSizes.length - 1) * gap;
    }
    const justify = nodeWithEffectiveSize.layout?.justify || "start";
    const align = nodeWithEffectiveSize.layout?.align || "start";
    let cursor = padding;
    let effectiveGap = gap;
    if (justify === "center") {
      const containerSize = mode === "stack-v" ? containerHeight : containerWidth;
      cursor = padding + Math.max(0, (containerSize - 2 * padding - totalContentSize) / 2);
    } else if (justify === "end") {
      const containerSize = mode === "stack-v" ? containerHeight : containerWidth;
      cursor = containerSize - padding - totalContentSize;
    } else if (justify === "space-between" && nestedResolvedChildren.length > 1) {
      const containerSize = mode === "stack-v" ? containerHeight : containerWidth;
      const totalChildrenSize = childrenSizes.reduce((acc, s) => acc + (mode === "stack-v" ? s.height : s.width), 0);
      effectiveGap = Math.max(0, (containerSize - 2 * padding - totalChildrenSize) / (nestedResolvedChildren.length - 1));
      cursor = padding;
    }
    const stackedChildren = nestedResolvedChildren.map((child, index) => {
      const size = childrenSizes[index];
      if (!size) return child;
      let resolvedPos = { x: 0, y: 0 };
      const resolvedSize = { ...child.layout?.size || { width: size.width, height: size.height } };
      let needsReResolve = false;
      if (mode === "stack-v") {
        let x = padding;
        if (align === "center") x = padding + (containerWidth - 2 * padding - size.width) / 2;
        else if (align === "end") x = containerWidth - padding - size.width;
        else if (align === "stretch") {
          x = padding;
          resolvedSize.width = Math.max(0, containerWidth - 2 * padding);
          if (resolvedSize.width !== size.width) needsReResolve = true;
        }
        resolvedPos = { x, y: cursor };
        cursor += size.height + effectiveGap;
      } else if (mode === "stack-h") {
        let y = padding;
        if (align === "center") y = padding + (containerHeight - 2 * padding - size.height) / 2;
        else if (align === "end") y = containerHeight - padding - size.height;
        else if (align === "stretch") {
          y = padding;
          resolvedSize.height = Math.max(0, containerHeight - 2 * padding);
          if (resolvedSize.height !== size.height) needsReResolve = true;
        }
        resolvedPos = { x: cursor, y };
        cursor += size.width + effectiveGap;
      }
      let finalChild = child;
      if (needsReResolve && child.children && child.children.length > 0) {
        finalChild = resolveLayout(child, resolvedSize);
      }
      return {
        ...finalChild,
        layout: {
          ...finalChild.layout,
          pos: resolvedPos,
          size: resolvedSize
        }
      };
    });
    return {
      ...nodeWithEffectiveSize,
      children: stackedChildren
    };
  }

  // src/Renderers/ManifestRenderer.ts
  var ManifestRenderer2 = class {
    /**
     * Render a complete module panel from its manifest.
     * Returns an HTML string ready for innerHTML injection.
     */
    static renderModulePanel(manifest, forceUpper = false) {
      if (!manifest) return "";
      const hp = manifest?.rack?.hp || manifest?.metadata?.hp || manifest?.hp || 8;
      const widthPx = Math.max(hp * 15, 120);
      const title = (manifest.name || manifest.id || "MODULE").toUpperCase();
      const slot = manifest?.rack?.slot || manifest?.slot || "";
      const isUpper = forceUpper || slot === "upper" || title.includes("MIDI") || title.includes("MONITOR") || title.includes("TRIGGER");
      const heightPx = isUpper ? 144 : 436;
      const knobSize = 32;
      const jackSize = 22;
      const tree = manifest.ui?.tree;
      if (tree) {
        const html = this.renderNode(tree, manifest, 0);
        return `
        <div class="omega-module-chassis ${isUpper ? "chassis-1u" : "chassis-3u"}" style="
          width: ${widthPx}px;
          height: ${heightPx}px;
          position: relative;
          background: linear-gradient(180deg, #1e2638 0%, #0d121d 100%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0;
          overflow: hidden;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
        ">
          ${html}
        </div>
      `.trim();
      }
      const controls = manifest?.controls || manifest?.ui?.controls || [];
      const jacks = manifest?.jacks || manifest?.ui?.jacks || [];
      let controlsHTML = "";
      controls.forEach((c) => {
        controlsHTML += `
        <div style="display:flex; flex-direction:column; align-items:center; width:${knobSize + 12}px; gap:3px;">
          <div style="width:${knobSize}px; height:${knobSize}px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #475569, #0f172a); border:2px solid #64748b; box-shadow:0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2); position:relative;">
            <div style="position:absolute; top:3px; left:${Math.floor(knobSize / 2) - 1}px; width:3px; height:${Math.floor(knobSize / 3)}px; background:var(--neon-cyan, #00f2ff); border-radius:1px;"></div>
          </div>
          <span style="font-size:8px; font-family:monospace; color:#cbd5e1; text-transform:uppercase; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-weight:bold;">${c.name || c.id}</span>
        </div>
      `;
      });
      let jacksHTML = "";
      jacks.forEach((j) => {
        const color = j.dataType === "midi" ? "#a855f7" : j.dataType === "audio" ? "#10b981" : "#06b6d4";
        jacksHTML += `
        <div class="module-jack" data-jack-id="${j.id}" data-jack-type="${j.dataType || "cv"}" data-jack-direction="${j.direction || "input"}" style="display:flex; flex-direction:column; align-items:center; width:${jackSize + 10}px; gap:3px;">
          <div class="port-socket size-A color-cyan" data-source="${j.id}" style="width:${jackSize}px; height:${jackSize}px; border-radius:50%; background:#090d16; border:2px solid ${color}; box-shadow:0 0 6px ${color}40, inset 0 0 4px #000; position:relative; display:flex; align-items:center; justify-content:center;">
            <div class="port-inner" style="width:8px; height:8px; border-radius:50%; background:#000; border:1px solid #334155;"></div>
          </div>
          <span style="font-size:8px; font-family:monospace; color:${color}; font-weight:bold; text-transform:uppercase; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">${j.name || j.id}</span>
        </div>
      `;
      });
      return `
      <div class="omega-module-chassis ${isUpper ? "chassis-1u" : "chassis-3u"}" style="
        width: ${widthPx}px;
        height: ${heightPx}px;
        position: relative;
        background: linear-gradient(180deg, #1e2638 0%, #0d121d 100%);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0;
        padding: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:4px; margin-bottom:4px;">
          <span style="font-family:'Outfit',monospace; font-size:10px; font-weight:900; color:var(--neon-cyan); letter-spacing:1px; text-transform:uppercase;">${title}</span>
          <span style="font-size:8px; font-family:monospace; color:#64748b; background:#090d16; padding:1px 5px; border-radius:3px; border:1px solid rgba(255,255,255,0.05);">${hp} HP</span>
        </div>
        
        <div style="display:flex; flex-wrap:wrap; gap:${isUpper ? "6px" : "16px"}; justify-content:center; align-items:center; flex-grow:1; padding:${isUpper ? "2px 0" : "10px 0"};">
          ${controlsHTML || '<div style="font-size:9px; color:#64748b; font-family:monospace;">DSP CORE</div>'}
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:${isUpper ? "4px" : "10px"}; justify-content:center; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:${isUpper ? "4px" : "8px"}; margin-top:4px;">
          ${jacksHTML}
        </div>
      </div>
    `.trim();
    }
    /**
     * Recursively render a single OmegaNode and its children.
     */
    static renderNode(rawNode, manifest, depth) {
      const semanticNode = resolveNodeSemantics(rawNode, { catalog: manifest.moduleTemplates || {} });
      const node = resolveLayout(semanticNode);
      if (node.visible === false) return "";
      const posX = node.layout?.pos?.x || 0;
      const posY = node.layout?.pos?.y || 0;
      const width = node.layout?.size?.width;
      const height = node.layout?.size?.height;
      if (node.kind === "rack" || node.kind === "face" || node.kind === "container" || node.kind === "group") {
        const childrenHtml = (node.children || []).map((child) => this.renderNode(child, manifest, depth + 1)).join("");
        return `
        <div class="omega-node-${node.kind}" style="
          position: absolute;
          left: ${posX}px;
          top: ${posY}px;
          ${width ? `width: ${width}px;` : ""}
          ${height ? `height: ${height}px;` : ""}
        ">
          ${childrenHtml}
        </div>
      `;
      }
      const cellOptions = {
        isMain: node.kind === "main_display" || node.kind === "potentiometer",
        isSelected: false,
        value: 0.5
      };
      return CellRenderer.renderCellHTML(node, cellOptions);
    }
  };
  if (typeof window !== "undefined") {
    window.ManifestRenderer = ManifestRenderer2;
  }

  // src/Catalog/AcemmCatalog.ts
  var ACEMM_CATALOG = {
    "midi_in": {
      id: "midi_in",
      name: "Global MIDI Input",
      rack: { slot: "upper", hp: 6 },
      controls: [{ id: "channel", name: "Ch Select", type: "knob" }, { id: "vel", name: "Vel Curve", type: "knob" }],
      jacks: [{ id: "midi_out", name: "MIDI Out", dataType: "midi", direction: "output" }, { id: "gate_out", name: "Gate Out", dataType: "cv", direction: "output" }]
    },
    "midi_trigger": {
      id: "midi_trigger",
      name: "MIDI Trigger & Gate",
      rack: { slot: "upper", hp: 6 },
      controls: [{ id: "mode", name: "Trig Mode", type: "knob" }, { id: "len", name: "Pulse Len", type: "knob" }],
      jacks: [
        { id: "midi_in", name: "MIDI In", dataType: "midi", direction: "input" },
        { id: "trig_out", name: "Trig Out", dataType: "cv", direction: "output" },
        { id: "gate_out", name: "Gate Out", dataType: "cv", direction: "output" },
        { id: "note_out", name: "Note V/Oct", dataType: "cv", direction: "output" }
      ]
    },
    "omega_lab_monitor": {
      id: "omega_lab_monitor",
      name: "Omega Telemetry Monitor",
      rack: { slot: "upper", hp: 8 },
      controls: [{ id: "timebase", name: "Timebase", type: "knob" }, { id: "scale", name: "V/Div Scale", type: "knob" }],
      jacks: [{ id: "sig_in", name: "Signal In", dataType: "audio", direction: "input" }, { id: "cv_in", name: "CV In", dataType: "cv", direction: "input" }]
    },
    "test_parity": {
      id: "test_parity",
      name: "Era 7 Parity Test",
      rack: { slot: "lower", hp: 12 },
      controls: [{ id: "freq", name: "Frequency", type: "knob" }, { id: "resonance", name: "Resonance", type: "knob" }, { id: "drive", name: "Drive", type: "knob" }],
      jacks: [{ id: "audio_in", name: "Audio In", dataType: "audio", direction: "input" }, { id: "audio_out", name: "Audio Out", dataType: "audio", direction: "output" }]
    },
    "oscillator_vA": {
      id: "oscillator_vA",
      name: "Analog Oscillator (VCO)",
      rack: { slot: "lower", hp: 10 },
      controls: [
        { id: "pitch", name: "Coarse Pitch", type: "knob" },
        { id: "fine", name: "Fine Tune", type: "knob" },
        { id: "shape", name: "Wave Shape", type: "knob" },
        { id: "fm_depth", name: "FM Depth", type: "knob" }
      ],
      jacks: [
        { id: "pitch_in", name: "V/OCT In", dataType: "cv", direction: "input" },
        { id: "fm_in", name: "FM CV", dataType: "cv", direction: "input" },
        { id: "sine_out", name: "Sine Out", dataType: "audio", direction: "output" },
        { id: "saw_out", name: "Saw Out", dataType: "audio", direction: "output" }
      ]
    },
    "filter_vA": {
      id: "filter_vA",
      name: "Ladder VCF Filter",
      rack: { slot: "lower", hp: 10 },
      controls: [
        { id: "cutoff", name: "Cutoff Freq", type: "knob" },
        { id: "resonance", name: "Resonance", type: "knob" },
        { id: "drive", name: "Overdrive", type: "knob" },
        { id: "env_amount", name: "Env Modulation", type: "knob" }
      ],
      jacks: [
        { id: "audio_in", name: "Audio In", dataType: "audio", direction: "input" },
        { id: "cutoff_cv", name: "Cutoff CV", dataType: "cv", direction: "input" },
        { id: "audio_out", name: "Audio Out", dataType: "audio", direction: "output" }
      ]
    },
    "envelope_adsr": {
      id: "envelope_adsr",
      name: "ADSR Envelope Generator",
      rack: { slot: "lower", hp: 8 },
      controls: [
        { id: "attack", name: "Attack", type: "knob" },
        { id: "decay", name: "Decay", type: "knob" },
        { id: "sustain", name: "Sustain", type: "knob" },
        { id: "release", name: "Release", type: "knob" }
      ],
      jacks: [
        { id: "gate_in", name: "Gate In", dataType: "cv", direction: "input" },
        { id: "env_out", name: "Env Out", dataType: "cv", direction: "output" }
      ]
    },
    "vca": {
      id: "vca",
      name: "Dual Linear VCA",
      rack: { slot: "lower", hp: 6 },
      controls: [
        { id: "gain", name: "Initial Gain", type: "knob" },
        { id: "cv_amt", name: "CV Amount", type: "knob" }
      ],
      jacks: [
        { id: "in", name: "Signal In", dataType: "audio", direction: "input" },
        { id: "cv", name: "CV In", dataType: "cv", direction: "input" },
        { id: "out", name: "Signal Out", dataType: "audio", direction: "output" }
      ]
    },
    "lfo": {
      id: "lfo",
      name: "Multi-Wave LFO",
      rack: { slot: "lower", hp: 6 },
      controls: [
        { id: "rate", name: "LFO Speed", type: "knob" },
        { id: "depth", name: "Output Depth", type: "knob" }
      ],
      jacks: [
        { id: "reset_in", name: "Sync Reset", dataType: "cv", direction: "input" },
        { id: "lfo_out", name: "LFO Out", dataType: "cv", direction: "output" }
      ]
    }
  };
  async function getOrFetchManifest(id) {
    if (!id) return null;
    const win2 = window;
    let manifest = win2.schemaStore?.getSchema(id);
    if (!manifest && ACEMM_CATALOG[id]) {
      manifest = ACEMM_CATALOG[id];
      if (win2.schemaStore && typeof win2.schemaStore.registerSchema === "function") {
        win2.schemaStore.registerSchema(id, manifest);
      }
    }
    if (!manifest) {
      manifest = {
        id,
        name: id.toUpperCase(),
        rack: { slot: resolveRackTarget(id, {}, null).isUpper ? "upper" : "lower", hp: 8 },
        controls: [{ id: "param1", name: "Param 1", type: "knob" }],
        jacks: [{ id: "in1", name: "In 1", dataType: "audio", direction: "input" }, { id: "out1", name: "Out 1", dataType: "audio", direction: "output" }]
      };
    }
    return manifest;
  }
  if (typeof window !== "undefined") {
    window.ACEMM_CATALOG = ACEMM_CATALOG;
    window.getOrFetchManifest = getOrFetchManifest;
  }

  // src/Components/ModuleBrowser.ts
  var ModuleBrowser = class {
    el = null;
    grid = null;
    categories = null;
    detail = null;
    gallery = null;
    searchInput = null;
    catalog = [];
    currentFilter = "ALL";
    currentSearch = "";
    selectedModule = null;
    constructor() {
      this.setupListeners();
    }
    ensureElements() {
      if (this.el) return true;
      this.el = document.getElementById("module-browser-modal");
      this.grid = document.getElementById("module-registry-grid");
      this.categories = document.getElementById("module-category-list");
      this.detail = document.getElementById("module-detail-panel");
      this.gallery = document.getElementById("module-gallery-strip");
      this.searchInput = document.getElementById("module-search");
      return !!(this.el && this.grid && this.categories && this.detail && this.gallery && this.searchInput);
    }
    async open() {
      if (!this.ensureElements()) return;
      if (this.el) this.el.style.display = "flex";
      await this.fetchCatalog();
      this.renderCategories();
      this.renderGrid();
      if (this.catalog.length > 0) {
        this.selectModule(this.catalog[0]);
      }
    }
    async fetchCatalog() {
      console.log("[ModuleBrowser] fetchCatalog starting...");
      const inv = window.inventoryStore;
      if (inv) {
        await inv.ensureLoaded();
        this.catalog = inv.getAllItems();
        console.log(`[ModuleBrowser] Catalog items in store: ${this.catalog.length}`);
      } else {
        console.warn("[ModuleBrowser] inventoryStore not found on window");
      }
    }
    renderCategories() {
      if (!this.categories) return;
      const cats = ["ALL", "OSC", "FLT", "ENV", "AMP", "MOD", "IO", "UTILITY"];
      this.categories.innerHTML = cats.map((c) => `
            <div class="cat-item ${this.currentFilter === c ? "active" : ""}" data-cat="${c}">
                ${c}
            </div>
        `).join("");
      this.categories.querySelectorAll(".cat-item").forEach((el) => {
        el.addEventListener("click", () => {
          this.currentFilter = el.dataset.cat || "ALL";
          this.renderCategories();
          this.renderGrid();
        });
      });
    }
    renderGrid() {
      if (!this.grid) return;
      console.log(`[ModuleBrowser] renderGrid. Total items: ${this.catalog.length}, Filter: ${this.currentFilter}`);
      const filtered = this.catalog.filter((m) => {
        const matchesCategory = this.currentFilter === "ALL" || (m.category || m.family) === this.currentFilter;
        const matchesSearch = !this.currentSearch || m.name.toLowerCase().includes(this.currentSearch.toLowerCase()) || m.id.toLowerCase().includes(this.currentSearch.toLowerCase());
        return matchesCategory && matchesSearch;
      });
      if (filtered.length === 0) {
        this.grid.innerHTML = '<div style="color: #64748b; font-family: monospace; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 40px;">No se encontraron m\xF3dulos</div>';
        return;
      }
      this.grid.innerHTML = filtered.map((m) => `
            <div class="reg-card ${this.selectedModule?.id === m.id ? "selected" : ""}" data-id="${m.id}">
                <div class="card-icon">
                    ${this.getIconForModule(m)}
                </div>
                <div class="card-name">${m.name}</div>
                <div class="card-family">${m.category || m.family || "DSP"} \u2022 ${m.hp || 8} HP</div>
            </div>
        `).join("");
      this.grid.querySelectorAll(".reg-card").forEach((card) => {
        card.addEventListener("click", () => {
          const id = card.dataset.id;
          const m = this.catalog.find((item) => item.id === id);
          if (m) this.selectModule(m);
        });
      });
    }
    selectModule(m) {
      this.selectedModule = m;
      this.grid?.querySelectorAll(".reg-card").forEach((c) => {
        c.classList.toggle("selected", c.dataset.id === m.id);
      });
      this.renderDetail(m);
    }
    renderDetail(m) {
      if (!this.detail) return;
      const hp = m.hp || 8;
      const widthMm = Math.round(hp * 5.08);
      this.detail.innerHTML = `
            <div class="detail-header">
                <h3>${m.name}</h3>
                <div class="detail-meta">
                    <span class="meta-tag family">${m.category || m.family || "DSP"}</span>
                    <span class="meta-tag version">ERA 7</span>
                    <span class="meta-author">ID: ${m.id}</span>
                </div>
            </div>
            
            <div class="detail-specs">
                <div class="spec-item"><label>ANCHO</label><span>${hp} HP (${widthMm}mm)</span></div>
                <div class="spec-item"><label>EST\xC1NDAR</label><span>EURORACK 3U/1U</span></div>
                <div class="spec-item"><label>+12V RAIL</label><span>${m.current12V || 45} mA</span></div>
                <div class="spec-item"><label>-12V RAIL</label><span>${m.currentMinus12V || 15} mA</span></div>
            </div>

            <div class="detail-description">${m.description || "M\xF3dulo sintetizador de alta fidelidad Era 7 con procesamiento DSP acelerado."}</div>

            <div class="add-action-container">
                <button class="btn-add-to-rack" id="btn-add-module-exec">
                    \uFF0B AGREGAR AL RACK
                </button>
            </div>
        `;
      if (!this.gallery) return;
      const images = m.images || [];
      if (images.length === 0) {
        this.gallery.innerHTML = `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_front.png')"></div>
                    <label>FRONT</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_angle.png')"></div>
                    <label>ANGLE</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('assets/modules/${m.id}/mockup_detail.png')"></div>
                    <label>DETAIL</label>
                </div>
            `;
      } else {
        this.gallery.innerHTML = images.map((img) => `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${img}')"></div>
                </div>
            `).join("");
      }
      const addBtn = document.getElementById("btn-add-module-exec");
      if (addBtn) {
        addBtn.onclick = () => this.addModule(m.id);
      }
    }
    getIconForModule(m) {
      const id = m.id || m.componentId;
      const logoPath = AssetResolver.resolve(id, "module_logo.svg");
      const icons = {
        "osc-analog": "\u{1F50A}",
        "midi-util": "\u{1F3B9}",
        "filter-standard": "\u{1F30A}",
        "env-standard": "\u{1F4D0}"
      };
      const emoji = icons[m.icon] || "\u{1F4E6}";
      const illustrationPath = AssetResolver.resolve(id, "illustration.svg");
      return `<img src="${logoPath}" class="card-illustration" alt="${m.name}" 
                     onerror="this.src='${illustrationPath}'; this.onerror=function(){ this.style.display='none'; this.nextElementSibling.style.display='block'; };">
                <div class="card-icon-fallback" style="display:none; font-size: 2rem;">${emoji}</div>`;
    }
    setupListeners() {
      setTimeout(() => {
        if (!this.ensureElements()) return;
        this.searchInput?.addEventListener("input", (e) => {
          this.currentSearch = e.target.value;
          this.renderGrid();
        });
      }, 500);
    }
    async addModule(componentId) {
      const m = this.selectedModule;
      if (!m) return;
      const btn = document.getElementById("btn-add-module-exec");
      const originalHTML = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.style.pointerEvents = "none";
        btn.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border:2px solid rgba(255,255,255,0.3); border-top-color:#00f2ff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span> PROCESANDO...`;
      }
      try {
        const meta = m.metadata || m;
        const hp = meta.hp || meta.rack?.hp || m.hp || 8;
        const cardWidth = Math.max(hp * 15, 60);
        const getFn = window.getOrFetchManifest || getOrFetchManifest;
        const resolveFn = window.resolveRackTarget || resolveRackTarget;
        const renderer = window.ManifestRenderer || ManifestRenderer2;
        let renderedHTML = "";
        let manifest = null;
        try {
          if (getFn) manifest = await getFn(componentId);
        } catch (e) {
          console.warn(`[ModuleBrowser] Manifest fetch failed for ${componentId}:`, e);
        }
        const targetRackInfo = resolveFn ? resolveFn(componentId, m, manifest) : { isUpper: false };
        if (manifest && renderer) {
          try {
            renderedHTML = renderer.renderModulePanel(manifest, targetRackInfo.isUpper);
            console.log(`[ModuleBrowser] Rendered module "${componentId}" with ManifestRenderer (IsUpper: ${targetRackInfo.isUpper})`);
          } catch (e) {
            console.warn(`[ModuleBrowser] ManifestRenderer failed for ${componentId}:`, e);
          }
        }
        const targetContainer = document.getElementById(targetRackInfo.isUpper ? "upper-rack" : "lower-rack") || document.getElementById("lower-rack");
        if (targetContainer) {
          const modCard = document.createElement("div");
          modCard.className = "aseptic-module-panel";
          modCard.dataset.moduleId = componentId;
          modCard.style.cssText = `position: relative; flex-shrink: 0; z-index: 30; margin: 0;`;
          if (renderedHTML) {
            modCard.innerHTML = `
                        <div style="position:relative;">
                            <button class="btn-remove-module" style="position:absolute; top:4px; right:6px; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4); border-radius:3px; font-size:10px; cursor:pointer; width:16px; height:16px; display:flex; align-items:center; justify-content:center; z-index:50; font-weight:bold;" onclick="this.closest('.aseptic-module-panel').remove(); window.modulePatchbayMatrix?.loadMetadata?.();">&times;</button>
                            ${renderedHTML}
                        </div>
                    `;
          } else {
            modCard.style.cssText = `width: ${cardWidth}px; min-height: 200px; background: #111827; border: 1px solid #1e293b; border-radius: 0; padding: 14px; margin: 0; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 20px rgba(0,0,0,0.6); flex-shrink: 0; position: relative; z-index: 30;`;
            modCard.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                            <span style="font-family:monospace; font-size:11px; font-weight:900; color:var(--neon-cyan); text-transform:uppercase; letter-spacing:0.5px;">${m.name}</span>
                            <span style="font-size:9px; color:#64748b; font-family:monospace; background:#0f172a; padding:2px 6px; border-radius:4px;">${hp} HP</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin:10px 0; line-height:1.4; flex-grow:1;">${m.description || "M\xF3dulo Sintetizador OMEGA"}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#0b0f19; padding:8px 10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top:8px;">
                            <span style="font-size:10px; color:#22c55e; font-family:monospace; font-weight:bold;">\u25CF ONLINE</span>
                            <button style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold; transition:all 0.2s;" onclick="this.closest('.aseptic-module-panel').remove(); window.modulePatchbayMatrix?.loadMetadata?.();">QUITAR</button>
                        </div>
                    `;
          }
          targetContainer.appendChild(modCard);
          window.modulePatchbayMatrix?.loadMetadata?.();
        }
        const slot = targetRackInfo.isUpper ? "upper" : "lower";
        if (window.rpcCommandDispatcher) {
          try {
            await window.rpcCommandDispatcher.dispatch({
              type: "addModule",
              payload: { componentId, slot }
            });
          } catch (e) {
            console.warn("[ModuleBrowser] RPC Dispatch skipped in web standalone mode.");
          }
        }
        const modalEl = document.getElementById("module-browser-modal");
        if (modalEl) modalEl.style.display = "none";
        if (this.el) this.el.style.display = "none";
        this.showToast(`M\xD3DULO "${m.name}" A\xD1ADIDO AL RACK (${slot.toUpperCase()})`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.style.pointerEvents = "";
          btn.innerHTML = originalHTML;
        }
      }
    }
    showToast(message) {
      let toast = document.getElementById("omega-ui-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "omega-ui-toast";
        toast.style.cssText = `position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: var(--neon-cyan); border: 1px solid var(--neon-cyan); padding: 12px 20px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: bold; z-index: 99999; box-shadow: 0 10px 30px rgba(0,242,255,0.2); transition: all 0.3s ease; opacity: 0; transform: translateY(10px);`;
        document.body.appendChild(toast);
      }
      toast.textContent = `\u2713 ${message}`;
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
      setTimeout(() => {
        if (toast) {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(10px)";
        }
      }, 3e3);
    }
  };
  if (typeof window !== "undefined") {
    window.ModuleBrowser = ModuleBrowser;
  }

  // src/Logic/runtimeStores.ts
  var BaseStore = class {
    listeners = /* @__PURE__ */ new Set();
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    notify(type = 15 /* All */) {
      this.listeners.forEach((cb) => cb(type));
    }
  };
  var RuntimeStore = class extends BaseStore {
    state = {
      patch: null,
      preset: null,
      params: {},
      telemetry: {},
      modulation: null,
      schemaVersion: null,
      systemInfo: {
        version: "0.0.0",
        build: "0",
        lcdText: "INITIALIZING..."
      }
    };
    getSnapshot() {
      return this.state;
    }
    getValue(paramKey, defaultValue = 0) {
      return this.state.params[paramKey] ?? defaultValue;
    }
    getTelemetry(paramKey) {
      const sample = this.state.telemetry[paramKey];
      return sample ? sample.v ?? 0 : 0;
    }
    applyState(payload) {
      if (!payload) return;
      const isV7 = payload.schemaVersion === "7.0";
      if (isV7) {
        const v7 = payload;
        OmegaLog.info("STORE", `Applying Era 7 Patch: ${v7.patch.name || "Untitled"}`);
        this.state = {
          ...this.state,
          schemaVersion: "7.0",
          patch: v7.patch,
          params: this.syncLegacyParams(v7.patch)
        };
        this.notify(1 /* Structure */ | 2 /* Parameters */);
      } else {
        OmegaLog.warn("STORE", `REJECTED: Non-Era 7 payload received (Version: ${payload.schemaVersion}). Pure Era 7 environment enforced.`);
      }
    }
    syncLegacyParams(patch) {
      const legacy = {};
      const modules = patch.modules || [];
      for (const mod of modules) {
        const params = mod.parameters || mod.params || {};
        for (const [id, val] of Object.entries(params)) {
          legacy[`${mod.instanceId}.${id}`] = val;
        }
      }
      return legacy;
    }
    applyParamChange(event) {
      this.state = {
        ...this.state,
        params: {
          ...this.state.params,
          [event.id]: event.value
        }
      };
      this.notify(2 /* Parameters */);
    }
    applyTelemetryFrame(payload) {
      if (!payload) return;
      const nextTelemetry = { ...this.state.telemetry };
      for (const [key, value] of Object.entries(payload)) {
        if (key === "schemaVersion") continue;
        if (value && typeof value === "object") {
          nextTelemetry[key] = value;
        }
      }
      this.state = {
        ...this.state,
        schemaVersion: payload.schemaVersion || this.state.schemaVersion,
        telemetry: nextTelemetry
      };
      this.notify(4 /* Telemetry */);
    }
    applyModulation(payload) {
      this.state = {
        ...this.state,
        modulation: payload
      };
      this.notify(1 /* Structure */);
    }
    reduceEvent(event) {
      if (!event) return;
      switch (event.type) {
        case "PARAMCHANGE":
          this.applyParamChange(event);
          return;
        case "onStateUpdate":
        case "state":
          this.applyState(event.payload || event);
          return;
        case "telemetryUpdate":
          this.applyTelemetryFrame(event.payload || event);
          return;
        case "onLCDUpdate":
          this.state = {
            ...this.state,
            systemInfo: { ...this.state.systemInfo, lcdText: event.detail || event.payload || event }
          };
          this.notify(8 /* System */);
          return;
        case "onVersionUpdate":
          const vData = event.detail || event.payload || event;
          this.state = {
            ...this.state,
            systemInfo: {
              ...this.state.systemInfo,
              version: vData.version || this.state.systemInfo.version,
              build: vData.build || this.state.systemInfo.build
            }
          };
          this.notify(8 /* System */);
          return;
      }
    }
  };
  var GraphStore = class extends BaseStore {
    state = {
      schemaVersion: null,
      graph: null
    };
    getSnapshot() {
      return this.state;
    }
    setGraph(graph, schemaVersion) {
      this.state = {
        schemaVersion: schemaVersion ?? this.state.schemaVersion,
        graph
      };
      this.notify();
    }
  };
  var SessionStore = class extends BaseStore {
    state = {
      selectedModuleId: null,
      focusedBinding: null,
      activeWorkspace: null,
      openPanels: []
    };
    constructor() {
      super();
      this.loadFromStorage();
    }
    loadFromStorage() {
      const saved = localStorage.getItem("omega_session");
      if (saved) {
        try {
          this.state = { ...this.state, ...JSON.parse(saved) };
        } catch (e) {
        }
      }
    }
    persist() {
      localStorage.setItem("omega_session", JSON.stringify(this.state));
      this.notify();
    }
    getSnapshot() {
      return this.state;
    }
    setSelectedModule(moduleId) {
      this.state = { ...this.state, selectedModuleId: moduleId };
      this.persist();
    }
    setFocusedBinding(binding) {
      this.state = { ...this.state, focusedBinding: binding };
      this.persist();
    }
    setActiveWorkspace(workspace) {
      this.state = { ...this.state, activeWorkspace: workspace };
      this.persist();
    }
    openPanel(panelId) {
      if (this.state.openPanels.includes(panelId)) return;
      this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
      this.persist();
    }
    closePanel(panelId) {
      this.state = { ...this.state, openPanels: this.state.openPanels.filter((id) => id !== panelId) };
      this.persist();
    }
  };

  // src/Logic/InventoryStore.ts
  var InventoryStore = class extends BaseStore {
    items = /* @__PURE__ */ new Map();
    isLoaded = false;
    loadPromise = null;
    async ensureLoaded() {
      console.log("[InventoryStore] ensureLoaded called. isLoaded:", this.isLoaded);
      if (this.isLoaded) return true;
      if (this.loadPromise) return this.loadPromise;
      this.loadPromise = (async () => {
        console.log("[InventoryStore] Starting fetch via RPC...");
        try {
          const rpc2 = window.omegaRPC;
          if (!rpc2) {
            console.error("[InventoryStore] RPC Bridge NOT FOUND!");
            return false;
          }
          console.log("[InventoryStore] Sending 'getInventory' command...");
          const response = await rpc2.send("getInventory", {});
          console.log("[InventoryStore] RAW RESPONSE:", response);
          const rawData = response.payload || response;
          const components = rawData.components || rawData.items || (Array.isArray(rawData) ? rawData : null);
          if (components && Array.isArray(components) && components.length > 0) {
            console.log(`[InventoryStore] Success. Loaded ${components.length} components.`);
            this.items.clear();
            components.forEach((item) => {
              this.items.set(item.id, item);
            });
            this.isLoaded = true;
            this.notify();
            return true;
          } else {
            console.warn("[InventoryStore] RPC returned no components. Falling back to Web Standalone Module Registry.");
            this.populateWebFallbackCatalog();
            this.isLoaded = true;
            this.notify();
            return true;
          }
        } catch (e) {
          console.error("[InventoryStore] Load error, using Web Standalone Catalog:", e);
          this.populateWebFallbackCatalog();
          this.isLoaded = true;
          this.notify();
          return true;
        } finally {
          this.loadPromise = null;
        }
      })();
      return this.loadPromise;
    }
    populateWebFallbackCatalog() {
      const fallbackItems = [
        { id: "midi_in", name: "GLOBAL MIDI INPUT", category: "IO", family: "IO", hp: 4, description: "Entrada global de eventos MIDI y telemetr\xEDa LED." },
        { id: "midi_trigger", name: "MIDI TRIGGER & GATE CONVERTER", category: "IO", family: "IO", hp: 6, description: "Conversor de notas MIDI a impulsos Trigger y se\xF1ales Gate de 10V." },
        { id: "omega_lab_monitor", name: "OMEGA LAB TELEMETRY MONITOR", category: "UTILITY", family: "UTILITY", hp: 8, description: "Osciloscopio y monitor de telemetr\xEDa de se\xF1ales CV/Audio en tiempo real." },
        { id: "test_parity", name: "00-TEST-PARITY", category: "UTILITY", family: "UTILITY", hp: 24, description: "Manifiesto de referencia para pruebas de paridad visual Era 7." },
        { id: "oscillator_vA", name: "VIRTUAL ANALOG OSCILLATOR", category: "OSC", family: "OSC", hp: 8, description: "Oscilador anal\xF3gico virtual multi-onda (Sine, Saw, Pulse, Triangle)." },
        { id: "filter_vA", name: "VIRTUAL ANALOG LADDER FILTER", category: "FLT", family: "FLT", hp: 6, description: "Filtro resonante de escalera transistorizada de 24dB/octava." },
        { id: "envelope_adsr", name: "ADSR ENVELOPE GENERATOR", category: "ENV", family: "ENV", hp: 4, description: "Generador de envolvente cu\xE1druple Attack, Decay, Sustain, Release." },
        { id: "vca", name: "DUAL LINEAR VCA", category: "AMP", family: "AMP", hp: 6, description: "Amplificador controlado por voltaje lineal duplo para audio y CV." },
        { id: "lfo", name: "MULTI-WAVE LFO", category: "MOD", family: "MOD", hp: 6, description: "Oscilador de baja frecuencia multifunci\xF3n con reset de fase." }
      ];
      this.items.clear();
      fallbackItems.forEach((item) => {
        this.items.set(item.id, item);
      });
    }
    getItem(id) {
      return this.items.get(id);
    }
    getAllItems() {
      return Array.from(this.items.values());
    }
  };
  window.inventoryStore = new InventoryStore();

  // src/RPC/RpcCommandDispatcher.ts
  var RpcCommandDispatcher = class _RpcCommandDispatcher {
    rpc;
    constructor() {
      this.rpc = window.omegaRPC;
      OmegaLog.info("DISPATCH", "RpcCommandDispatcher Initialized");
    }
    static CORE_COMMANDS = /* @__PURE__ */ new Set([
      "setParameter",
      "loadPreset",
      "savePreset",
      "newPreset",
      "updatePatchbayMatrixSlot",
      "subscribeTelemetry",
      "getUiSchemas",
      "getSystemSettings",
      "serviceAction",
      "setSystemSetting",
      "uiReady",
      "exit",
      "clearRack",
      "undo",
      "redo",
      "listAce",
      "listPresets",
      "getBrowserData",
      "getHistory",
      "addModule",
      "removeModule",
      "moveModule",
      "getModulationMetadata",
      "getTelemetry",
      "getTelemetrySources",
      "getModConnections",
      "getScopeState",
      "setScopeState",
      "getState",
      "triggerNote",
      "systemAction",
      "getAceSchema",
      "getMetadata",
      "getSampleRate",
      "getTempo",
      "getInventory"
    ]);
    async dispatch(cmd) {
      OmegaLog.debug("DISPATCH", `${cmd.type}`, cmd.payload || "");
      if (!this.rpc) {
        OmegaLog.error("DISPATCH", "RPC Bridge missing! Command aborted.");
        return;
      }
      try {
        if (_RpcCommandDispatcher.CORE_COMMANDS.has(cmd.type)) {
          return await this.handleCoreCommand(cmd);
        }
        return await this.handleDynamicCommand(cmd);
      } catch (e) {
        OmegaLog.error("DISPATCH", `Failed to execute ${cmd.type}`, e);
      }
    }
    async handleCoreCommand(cmd) {
      switch (cmd.type) {
        case "setParameter":
          const p = cmd.payload;
          if (!p.target && (p.instanceId === void 0 || p.paramId === void 0)) {
            throw new Error("setParameter missing target or numeric IDs");
          }
          break;
      }
      return await this.rpc.send(cmd.type, cmd.payload);
    }
    async handleDynamicCommand(cmd) {
      const method = cmd.target || cmd.method || cmd.type;
      const params = cmd.payload || cmd.value || cmd.data || {};
      if (method && method !== "systemAction") {
        OmegaLog.warn("DISPATCH", `DYNAMIC ROUTE: Using unverified RPC method: ${method}. This is deprecated in Era 7.`, params);
        return await this.rpc.send(method, params);
      }
      const errorMsg = `CONTRACT VIOLATION: Unknown command structure for type '${cmd.type}'`;
      OmegaLog.error("DISPATCH", errorMsg);
      throw new Error(errorMsg);
    }
  };
  window.rpcCommandDispatcher = new RpcCommandDispatcher();

  // src/Logic/SchemaStore.ts
  var SchemaStore = class {
    schemas = /* @__PURE__ */ new Map();
    isLoaded = false;
    async ensureLoaded() {
      if (this.isLoaded) return true;
      return this.reload();
    }
    async reload() {
      try {
        const rpc2 = window.omegaRPC;
        if (!rpc2) return false;
        const response = await rpc2.send("getUiSchemas", {});
        console.log("[SchemaStore] RAW RESPONSE:", response);
        const rawData = response.payload || response;
        const schemas = rawData.schemas || (Array.isArray(rawData) ? rawData : null);
        if (schemas && Array.isArray(schemas)) {
          schemas.forEach((s) => {
            this.schemas.set(s.id, this.normalizeSchema(s));
          });
          this.isLoaded = true;
          console.log(`[SchemaStore] Success. Loaded ${schemas.length} schemas.`);
          return true;
        }
      } catch (e) {
        console.error("[SchemaStore] Load error:", e);
      }
      return false;
    }
    normalizeSchema(schema) {
      if (!schema) return schema;
      const isEra7 = schema.version >= 7 || schema.ui !== void 0;
      if (isEra7) {
        console.log(`[SchemaStore] Detected Era 7 Module: ${schema.id}. Preserving industrial integrity.`);
        this.validateIntegrity(schema);
        if (schema.metadata) {
          schema.name = schema.name || schema.metadata.name;
          schema.hp = schema.hp || schema.metadata.rack?.hp;
          schema.rack = schema.rack || schema.metadata.rack?.slot;
        }
        return schema;
      }
      return schema;
    }
    validateIntegrity(schema) {
      if (!schema.compliance) {
        schema.compliance = { status: "ok", issues: [], firmwareHash: "" };
      }
      const ids = /* @__PURE__ */ new Set();
      const duplicates = /* @__PURE__ */ new Set();
      if (schema.registry && Array.isArray(schema.registry)) {
        schema.registry.forEach((item) => {
          if (ids.has(item.id)) {
            duplicates.add(item.id);
          }
          ids.add(item.id);
        });
      }
      if (schema.ui && schema.ui.controls) {
        schema.ui.controls.forEach((ctrl) => {
        });
      }
      if (duplicates.size > 0) {
        schema.compliance.status = "invalid";
        duplicates.forEach((id) => {
          const issue = {
            severity: "invalid",
            code: "DoubleIdentity",
            scope: "registry",
            message: `ID collision detected: '${id}' is defined multiple times in the registry. Each entity must have a unique canonical ID.`
          };
          schema.compliance.issues.push(issue);
          console.error(`[GOVERNANCE] [${schema.id}] ${issue.message}`);
        });
      }
    }
    getSchema(id) {
      return this.schemas.get(id);
    }
    getSchemaForComponent(id) {
      return this.getSchema(id);
    }
    getAllSchemas() {
      return Array.from(this.schemas.values());
    }
  };
  window.schemaStore = new SchemaStore();

  // src/Util/RuntimeEventHub.ts
  var RuntimeEventHub = class {
    static initialized = false;
    static init() {
      if (this.initialized) return;
      this.initialized = true;
      OmegaLog.info("HUB", "Initializing Unified Event Pipeline...");
      const handle = (e) => {
        const ce = e;
        if (window.runtimeStore) {
          window.runtimeStore.reduceEvent(ce.detail);
        }
      };
      window.addEventListener("omega:onStateUpdate", handle);
      window.addEventListener("omega:PARAMCHANGE", handle);
      window.addEventListener("omega:telemetryUpdate", handle);
      window.addEventListener("omega:onLCDUpdate", handle);
      window.addEventListener("omega:onVersionUpdate", handle);
      window.addEventListener("omega:state", handle);
      OmegaLog.info("HUB", "Pipeline Active. All native events are now routed through RuntimeStore.");
    }
  };

  // src/Components/cables/cableConstants.ts
  var CABLE_PHYSICS = {
    /** Caída mínima en píxeles (cable corto entre jacks cercanos) */
    BASE_SAG: 40,
    /** Factor de caída según distancia (más lejos → más cuelga) */
    SAG_FACTOR: 0.15,
    /** Máxima caída permitida (para que cables muy largos no se salgan del rack) */
    MAX_SAG: 200,
    /** Grosor del cable en píxeles */
    STROKE_WIDTH: 4,
    /** Radio del círculo "plug" en los extremos del cable */
    PLUG_RADIUS: 5
  };
  var CABLE_TENSION = {
    /** Tensión por defecto: 0 = "espagueti" (máximo sag, look actual). */
    DEFAULT: 0,
    /**
     * Fracción de sag que conserva un cable al 100% de tensión ("tenso").
     * 1 = el sag no cambia; 0 = cable completamente recto.
     */
    MIN_SAG_RATIO: 0.2
  };
  var globalTension = CABLE_TENSION.DEFAULT;
  function getGlobalTension() {
    return globalTension;
  }
  function setGlobalTension(tension) {
    globalTension = Math.min(1, Math.max(0, tension));
  }
  var SIGNAL_COLORS = {
    audio: "#10b981",
    // Verde esmeralda
    cv: "#06b6d4",
    // Cian neón
    gate: "#ef4444",
    // Rojo carmesí
    midi: "#a855f7"
    // Violeta neón
  };
  var INTERACTION = {
    /** Radio en px alrededor del cursor para activar ghosting */
    GHOST_DETECTION_RADIUS: 80,
    /** Opacidad del cable en modo ghost */
    GHOST_OPACITY: 0.12,
    /** Puntos a muestrear en la curva Bézier para detección de colisión */
    CURVE_SAMPLES: 20,
    /** Tiempo de debounce para resize/scroll (ms) */
    DEBOUNCE_MS: 50,
    /** Clase CSS aplicada a cables en modo ghost */
    GHOST_CLASS: "ghosted",
    /** Clase CSS del overlay cuando los cables están ocultos ([H]) */
    HIDDEN_CLASS: "cables-hidden",
    /**
     * Pulso de señal (Fase 5, §8.3 — OPCIONAL).
     * Animación de "flujo" sobre los cables activos.
     * DESACTIVADO por defecto: sin telemetría por slot no hay forma de
     * distinguir un patch guardado de uno sonando, y pulsa todos los cables.
     * Activarlo: INTERACTION.SIGNAL_PULSE = true.
     */
    SIGNAL_PULSE: false,
    /* ── Estrategia C: Repulsión elástica (§7.3, AVANZADO) ── */
    /** Distancia (px) bajo la cual el cable empieza a deformarse del cursor */
    REPULSION_RADIUS: 60,
    /** Desplazamiento lateral MÁXIMO de los puntos de control (px) */
    REPULSION_STRENGTH: 90,
    /** Puntos a muestrear por cable para hallar el punto más cercano al cursor */
    REPULSION_SAMPLES: 20
  };
  var DRAG_TO_PATCH = {
    /** Distancia mínima (px) antes de que el pointerdown se considere drag */
    MIN_DRAG_DISTANCE: 6,
    /** Clase CSS del path de preview colgante */
    CABLE_PREVIEW_CLASS: "cable-drag-preview",
    /** Clase CSS del jack de origen mientras hay drag */
    DRAG_ACTIVE_JACK_CLASS: "drag-active-jack",
    /** Clase CSS de los jacks de entrada válidos mientras hay drag */
    TARGET_HIGHLIGHT_CLASS: "target-highlight",
    /**
     * Límite de slots de la matrix a respetar al buscar slot libre
     * (el modal UI usa 32; el backend admite hasta 64).
     */
    MATRIX_SLOT_LIMIT: 32
  };
  var SignalTypeResolver = class {
    signalMap = /* @__PURE__ */ new Map();
    /**
     * Refresca el mapa { qualifiedId -> tipo de señal } a partir
     * del estado actual de la inventory + snapshot de runtimeStore.
     */
    refresh(inventoryStore2, state) {
      const next = /* @__PURE__ */ new Map();
      try {
        const items = inventoryStore2?.getAllItems?.() || [];
        const { sources, targets } = buildMetadataFromInventory(items, state);
        for (const item of [...sources, ...targets]) {
          next.set(item.id, String(item.type || "cv"));
        }
      } catch (err) {
        OmegaLog.warn("CABLES", "SignalTypeResolver.refresh() failed:", err);
      }
      this.signalMap = next;
    }
    /**
     * Devuelve el tipo de señal en minúsculas ('audio', 'cv', 'gate', 'midi').
     * Por defecto 'cv' si el qualifiedId no existe en el metadata.
     */
    getSignalType(id) {
      const type = this.signalMap.get(id);
      return type ? type.toLowerCase() : "cv";
    }
  };

  // src/Components/cables/JackRegistry.ts
  var JackRegistry = class {
    jacks = /* @__PURE__ */ new Map();
    /**
     * (Re)escanea el DOM del rack y reconstruye el registro de jacks.
     * Debe llamarse tras cambios de estructura (addModule/removeModule),
     * en init() y en cada syncCablesFromState().
     */
    refresh() {
      const jacks = /* @__PURE__ */ new Map();
      const rackEl = document.getElementById("omega-rack");
      if (rackEl) {
        rackEl.querySelectorAll('.module[id^="mod-v7_"]').forEach((modEl) => {
          const instanceId = modEl.id.replace(/^mod-v7_/, "");
          this.scanPortSockets(modEl, instanceId, jacks);
        });
        rackEl.querySelectorAll(".aseptic-module-panel").forEach((panelEl) => {
          const typeId = panelEl.dataset.moduleId || "module";
          const idx = this.countPanelsOfType(panelEl);
          const instanceId = `${typeId}_${idx}`;
          this.scanPortSockets(panelEl, instanceId, jacks);
        });
      }
      this.jacks = jacks;
      OmegaLog.info("CABLES", `JackRegistry.refresh(): ${jacks.size} jacks`);
    }
    getJack(id) {
      return this.jacks.get(id);
    }
    /** Número de jacks registrados (utilidad de verificación). */
    get count() {
      return this.jacks.size;
    }
    /** Coordenadas del jack RELATIVAS al rack, o null si no existe. */
    getPosition(id) {
      const jack = this.jacks.get(id);
      return jack ? { x: jack.x, y: jack.y } : null;
    }
    getAll() {
      return this.jacks;
    }
    /** Devuelve todos los qualifiedIds registrados (utilidad de verificación). */
    getAllIds() {
      return Array.from(this.jacks.keys());
    }
    /* ───────────────────────── internos ───────────────────────── */
    /** Cuenta cuántos paneles del mismo typeId hay ANTES que el dado. */
    countPanelsOfType(current) {
      const rackEl = document.getElementById("omega-rack");
      if (!rackEl) return 1;
      const typeId = current.dataset.moduleId || "";
      let idx = 0;
      rackEl.querySelectorAll(".aseptic-module-panel").forEach((el) => {
        if (el === current) return;
        if ((el.dataset.moduleId || "") === typeId) idx += 1;
      });
      return idx + 1;
    }
    /** Escanea los port-sockets de un módulo y registra cada jack. */
    scanPortSockets(moduleEl, instanceId, out) {
      const rackEl = document.getElementById("omega-rack");
      if (!rackEl) return;
      const rackRect = rackEl.getBoundingClientRect();
      moduleEl.querySelectorAll(".port-socket[data-source]").forEach((el) => {
        const dataSource = el.dataset.source || "";
        if (!dataSource) return;
        const qualifiedId = `${instanceId}.${dataSource}`;
        const r = el.getBoundingClientRect();
        out.set(qualifiedId, {
          id: qualifiedId,
          el,
          x: r.left + r.width / 2 - rackRect.left,
          y: r.top + r.height / 2 - rackRect.top,
          type: "cv"
          // se resuelve vía SignalTypeResolver
        });
      });
    }
  };

  // src/Components/cables/CableRenderer.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  var CableRenderer = class _CableRenderer {
    /**
     * Calcula el string "d" del path SVG para un cable colgante.
     *
     * PASO A PASO:
     * 1. Distancia euclidiana entre los dos jacks.
     * 2. Cuánto debe colgar: sag = BASE_SAG + distancia * SAG_FACTOR
     *    (limitado a MAX_SAG para que no se salga del rack).
     * 3. Puntos de control DEBAJO de cada jack (Y + sag).
     * 4. String SVG: "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"
     *
     * `deform` (opcional, Fase 7.3 repulsión elástica) desplaza AMBOS puntos
     * de control lateralmente para que el cable "se aparte" del cursor.
     */
    static calculatePath(ep, deform) {
      const { x1, y1, x2, y2 } = ep;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const baseSag = Math.min(
        CABLE_PHYSICS.BASE_SAG + distance * CABLE_PHYSICS.SAG_FACTOR,
        CABLE_PHYSICS.MAX_SAG
      );
      const tension = getGlobalTension();
      const sag = baseSag * (CABLE_TENSION.MIN_SAG_RATIO + (1 - CABLE_TENSION.MIN_SAG_RATIO) * (1 - tension));
      const offX = deform?.x ?? 0;
      const offY = deform?.y ?? 0;
      const cx1 = x1 + offX;
      const cy1 = y1 + sag + offY;
      const cx2 = x2 + offX;
      const cy2 = y2 + sag + offY;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
    /**
     * Crea un nuevo elemento <path> SVG para un cable.
     *
     * ATENCIÓN: usar createElementNS, NO createElement.
     * Los elementos SVG necesitan el namespace SVG para renderizarse.
     * Con createElement('path') el navegador NO lo dibuja.
     */
    static createCablePath(slotIndex, endpoints, signalType) {
      const svg = document.getElementById("patch-cables-overlay");
      if (!svg) throw new Error("[CableRenderer] SVG overlay #patch-cables-overlay not found");
      const path = document.createElementNS(SVG_NS, "path");
      path.classList.add("patch-cable", "entering");
      path.setAttribute("data-slot", String(slotIndex));
      path.setAttribute("data-signal", signalType);
      path.setAttribute("d", _CableRenderer.calculatePath(endpoints));
      svg.appendChild(path);
      setTimeout(() => path.classList.remove("entering"), 600);
      return path;
    }
    /**
     * Actualiza la posición de un cable existente.
     * Se llama al hacer scroll, resize o mover módulos.
     * `deform` opcional: desplazamiento de repulsión (se preserva en redraws).
     */
    static updateCablePath(path, endpoints, deform) {
      path.setAttribute("d", _CableRenderer.calculatePath(endpoints, deform));
    }
    /**
     * Elimina un cable del SVG con animación de fade-out.
     * El elemento se destruye 300ms después de empezar la animación.
     */
    static removeCablePath(path) {
      path.style.transition = "opacity 0.3s ease";
      path.style.opacity = "0";
      setTimeout(() => path.remove(), 300);
    }
    /**
     * Crea los círculos "plug" en los extremos del cable.
     * Simula visualmente el conector enchufado en el jack.
     */
    static createPlugs(x1, y1, x2, y2, color) {
      const svg = document.getElementById("patch-cables-overlay");
      if (!svg) throw new Error("[CableRenderer] SVG overlay not found");
      const group = document.createElementNS(SVG_NS, "g");
      group.classList.add("cable-plugs");
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        const plug = document.createElementNS(SVG_NS, "circle");
        plug.classList.add("cable-plug");
        plug.setAttribute("cx", String(x));
        plug.setAttribute("cy", String(y));
        plug.setAttribute("r", String(CABLE_PHYSICS.PLUG_RADIUS));
        plug.setAttribute("fill", color);
        plug.setAttribute("stroke", "#000");
        plug.setAttribute("stroke-width", "1.5");
        group.appendChild(plug);
      }
      svg.appendChild(group);
      return group;
    }
    /**
     * Mueve los plugs de un cable existente a las nuevas coordenadas.
     * Se usa en redraws por scroll/resize para no crear/destruir nodos.
     */
    static updatePlugs(group, ep) {
      const plugs = group.querySelectorAll("circle");
      if (plugs.length >= 1) {
        plugs[0].setAttribute("cx", String(ep.x1));
        plugs[0].setAttribute("cy", String(ep.y1));
      }
      if (plugs.length >= 2) {
        plugs[1].setAttribute("cx", String(ep.x2));
        plugs[1].setAttribute("cy", String(ep.y2));
      }
    }
  };

  // src/Components/cables/CableInteraction.ts
  function setupCableGhosting() {
    const rack = document.getElementById("omega-rack");
    if (!rack) return;
    let ghostingActive = false;
    rack.addEventListener("mousemove", (e) => {
      const target = e.target;
      if (!target?.closest) return;
      const isOverControl = target.closest("[data-source]") !== null;
      if (isOverControl) {
        const modulePanel = target.closest(".module, .aseptic-module-panel");
        if (!modulePanel) return;
        ghostingActive = true;
        const moduleRect = modulePanel.getBoundingClientRect();
        const rackRect = rack.getBoundingClientRect();
        const area = {
          left: moduleRect.left - rackRect.left,
          top: moduleRect.top - rackRect.top,
          right: moduleRect.right - rackRect.left,
          bottom: moduleRect.bottom - rackRect.top
        };
        document.querySelectorAll(".patch-cable").forEach((cable) => {
          const path = cable;
          path.classList.toggle("ghosted", doesCableCrossArea(path, area));
        });
      } else if (ghostingActive) {
        ghostingActive = false;
        clearGhosting();
      }
    });
    rack.addEventListener("mouseleave", () => {
      ghostingActive = false;
      clearGhosting();
    });
  }
  function clearGhosting() {
    document.querySelectorAll(".patch-cable.ghosted").forEach((c) => {
      c.classList.remove("ghosted");
    });
  }
  function doesCableCrossArea(path, area) {
    let totalLength;
    try {
      totalLength = path.getTotalLength();
    } catch {
      return false;
    }
    if (!totalLength || !Number.isFinite(totalLength) || totalLength <= 0) return false;
    const samples = INTERACTION.CURVE_SAMPLES;
    for (let i = 0; i <= samples; i++) {
      const point = path.getPointAtLength(i / samples * totalLength);
      if (point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom) {
        return true;
      }
    }
    return false;
  }
  function setupCableVisibilityToggle() {
    document.addEventListener("keydown", (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        const overlay = document.getElementById("patch-cables-overlay");
        if (overlay) {
          overlay.classList.toggle("cables-hidden");
          OmegaLog.info("CABLES", `[H] cables ${overlay.classList.contains("cables-hidden") ? "ocultos" : "visibles"}`);
        }
      }
    });
  }
  function setupCableSoloMode() {
    const rack = document.getElementById("omega-rack");
    if (!rack) {
      return {
        isActive: () => false,
        dispose: () => {
        }
      };
    }
    const btn = document.getElementById("cable-solo-toggle");
    const isActive = () => rack.classList.contains("cables-only");
    const apply = (active) => {
      rack.classList.toggle("cables-only", active);
      btn?.classList.toggle("active", active);
      OmegaLog.info("CABLES", `Modo solo-cables ${active ? "activado" : "desactivado"}`);
    };
    const onClick = () => apply(!isActive());
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "s" || e.key === "S") {
        apply(!isActive());
      }
    };
    btn?.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return {
      isActive,
      dispose: () => {
        btn?.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
      }
    };
  }
  function computeRepulsionOffset(path, cursorX, cursorY) {
    let totalLength;
    try {
      totalLength = path.getTotalLength();
    } catch {
      return null;
    }
    if (!totalLength || !Number.isFinite(totalLength) || totalLength <= 0) return null;
    let minDistance = Infinity;
    let closestX = cursorX;
    let closestY = cursorY;
    const samples = INTERACTION.REPULSION_SAMPLES;
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength(i / samples * totalLength);
      const d = Math.hypot(p.x - cursorX, p.y - cursorY);
      if (d < minDistance) {
        minDistance = d;
        closestX = p.x;
        closestY = p.y;
      }
    }
    if (minDistance > INTERACTION.REPULSION_RADIUS) return null;
    let dx = closestX - cursorX;
    let dy = closestY - cursorY;
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    const falloff = 1 - minDistance / INTERACTION.REPULSION_RADIUS;
    const scale = INTERACTION.REPULSION_STRENGTH * falloff;
    return { x: dx * scale, y: dy * scale };
  }
  function setupCableRepulsion(manager2) {
    const rack = document.getElementById("omega-rack");
    if (!rack) return () => {
    };
    let frameScheduled = false;
    let cursorX = 0;
    let cursorY = 0;
    let disposed = false;
    const applyRepulsion = () => {
      if (disposed) return;
      frameScheduled = false;
      const cables = manager2.getActiveCablePaths();
      for (const { slotIndex, pathElement } of cables) {
        const offset = computeRepulsionOffset(pathElement, cursorX, cursorY);
        manager2.setCableDeform(slotIndex, offset);
      }
    };
    const onMove = (e) => {
      const rect = rack.getBoundingClientRect();
      cursorX = e.clientX - rect.left;
      cursorY = e.clientY - rect.top;
      if (!frameScheduled) {
        frameScheduled = true;
        requestAnimationFrame(applyRepulsion);
      }
    };
    const onLeave = () => manager2.resetAllDeforms();
    rack.addEventListener("mousemove", onMove, { passive: true });
    rack.addEventListener("mouseleave", onLeave);
    return () => {
      disposed = true;
      rack.removeEventListener("mousemove", onMove);
      rack.removeEventListener("mouseleave", onLeave);
      manager2.resetAllDeforms();
    };
  }
  function buildJackRoles() {
    const outputs = /* @__PURE__ */ new Set();
    const inputs = /* @__PURE__ */ new Set();
    const win2 = window;
    try {
      const items = win2.inventoryStore?.getAllItems?.() || [];
      const { sources, targets } = buildMetadataFromInventory(
        items,
        win2.runtimeStore?.getSnapshot?.()
      );
      for (const item of sources) outputs.add(item.id);
      for (const item of targets) inputs.add(item.id);
    } catch (err) {
      OmegaLog.warn("CABLES", "buildJackRoles() failed:", err);
    }
    return { outputs, inputs };
  }
  function isOutputSocket(socket, roles) {
    const dir = socket.closest(".module-jack")?.getAttribute("data-jack-direction");
    if (dir) return dir === "output" || dir === "out";
    const qualifiedId = socket.getAttribute("data-source") || "";
    return roles.outputs.has(qualifiedId);
  }
  function isInputSocket(socket, roles) {
    const dir = socket.closest(".module-jack")?.getAttribute("data-jack-direction");
    if (dir) return dir === "input" || dir === "in";
    const qualifiedId = socket.getAttribute("data-source") || "";
    return roles.inputs.has(qualifiedId);
  }
  function resolveQualifiedId(manager2, socket) {
    const attr = socket.getAttribute("data-source");
    if (attr) return attr;
    for (const jack of manager2.jackRegistry.getAll().values()) {
      if (jack.el === socket) return jack.id;
    }
    return "";
  }
  function getJackPoint(manager2, socket, rack) {
    const qualifiedId = resolveQualifiedId(manager2, socket);
    const pos = qualifiedId ? manager2.jackRegistry.getPosition(qualifiedId) : null;
    if (pos) return pos;
    const rect = socket.getBoundingClientRect();
    const rackRect = rack.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - rackRect.left,
      y: rect.top + rect.height / 2 - rackRect.top
    };
  }
  function commitPatch(manager2, sourceId, targetId) {
    if (!sourceId || !targetId) return;
    const slot = manager2.getFreeMatrixSlot();
    if (slot < 0) {
      OmegaLog.warn("CABLES", "Drag-to-patch: no hay slot libre en la matrix");
      return;
    }
    sendUpdate(slot, "source", sourceId);
    sendUpdate(slot, "target", targetId);
    sendUpdate(slot, "amount", 1);
    sendUpdate(slot, "active", true);
    OmegaLog.info("CABLES", `Drag-to-patch: slot ${slot} \u2190 ${sourceId} \u2192 ${targetId}`);
  }
  function setupDragToPatch(manager2) {
    const rack = document.getElementById("omega-rack");
    if (!rack) return { dispose: () => {
    } };
    const overlay = document.getElementById("patch-cables-overlay");
    const svg = overlay?.querySelector("svg");
    let pending = null;
    let preview = null;
    let activeJack = null;
    const clearHighlight = () => {
      activeJack?.classList.remove(DRAG_TO_PATCH.DRAG_ACTIVE_JACK_CLASS);
      activeJack = null;
      document.querySelectorAll(`.${DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS}`).forEach((el) => el.classList.remove(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS));
    };
    const removePreview = () => {
      preview?.remove();
      preview = null;
    };
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      const socket = e.target?.closest(".port-socket[data-source]");
      if (!socket) return;
      const roles = buildJackRoles();
      if (!isOutputSocket(socket, roles)) return;
      pending = {
        sourceSocket: socket,
        sourceId: resolveQualifiedId(manager2, socket),
        sourcePoint: getJackPoint(manager2, socket, rack),
        startX: e.clientX,
        startY: e.clientY,
        roles
      };
    };
    const onPointerMove = (e) => {
      if (!pending) return;
      const dx = e.clientX - pending.startX;
      const dy = e.clientY - pending.startY;
      if (!preview && Math.hypot(dx, dy) < DRAG_TO_PATCH.MIN_DRAG_DISTANCE) return;
      if (!preview) {
        if (!svg) {
          endDrag();
          return;
        }
        preview = document.createElementNS(SVG_NS, "path");
        preview.classList.add(DRAG_TO_PATCH.CABLE_PREVIEW_CLASS);
        preview.setAttribute("data-signal", "cv");
        svg.appendChild(preview);
        activeJack = pending.sourceSocket;
        activeJack.classList.add(DRAG_TO_PATCH.DRAG_ACTIVE_JACK_CLASS);
      }
      const rect = rack.getBoundingClientRect();
      preview.setAttribute(
        "d",
        CableRenderer.calculatePath({
          x1: pending.sourcePoint.x,
          y1: pending.sourcePoint.y,
          x2: e.clientX - rect.left,
          y2: e.clientY - rect.top
        })
      );
      const hit = document.elementFromPoint?.(e.clientX, e.clientY)?.closest(".port-socket[data-source]") || e.target?.closest(".port-socket[data-source]");
      document.querySelectorAll(`.${DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS}`).forEach((el) => el.classList.remove(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS));
      if (hit && hit !== pending.sourceSocket && isInputSocket(hit, pending.roles)) {
        hit.classList.add(DRAG_TO_PATCH.TARGET_HIGHLIGHT_CLASS);
      }
    };
    const onPointerUp = (e) => {
      if (!pending) return;
      const hit = document.elementFromPoint?.(e.clientX, e.clientY)?.closest(".port-socket[data-source]") || e.target?.closest(".port-socket[data-source]");
      if (preview && hit && hit !== pending.sourceSocket && isInputSocket(hit, pending.roles)) {
        commitPatch(
          manager2,
          pending.sourceId,
          resolveQualifiedId(manager2, hit)
        );
      }
      endDrag();
    };
    const endDrag = () => {
      pending = null;
      removePreview();
      clearHighlight();
    };
    rack.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return {
      dispose: () => {
        endDrag();
        rack.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      }
    };
  }

  // src/Components/cables/PatchCableManager.ts
  var PatchCableManager = class {
    jackRegistry = new JackRegistry();
    signalTypeResolver = new SignalTypeResolver();
    activeCables = /* @__PURE__ */ new Map();
    debounceTimer = null;
    pendingRedraw = false;
    mutationObserver = null;
    unsubscribeStore = null;
    disposeRepulsion = null;
    disposeDragToPatch = null;
    /** Slot destacado por la Ruta destacada (§9), o null si no hay ninguno. */
    highlightedSlot = null;
    init() {
      this.jackRegistry.refresh();
      this.signalTypeResolver.refresh(
        window.inventoryStore,
        window.runtimeStore?.getSnapshot?.()
      );
      this.setupLayoutListeners();
      setupCableGhosting();
      setupCableVisibilityToggle();
      setupCableSoloMode();
      this.disposeRepulsion = setupCableRepulsion(this);
      this.disposeDragToPatch = setupDragToPatch(this);
      this.subscribeStructureChanges();
      requestAnimationFrame(() => this.syncCablesFromState());
      OmegaLog.info(
        "CABLES",
        `[PatchCableManager] Initialized. Jacks registered: ${this.jackRegistry.count}`
      );
    }
    dispose() {
      if (this.mutationObserver) this.mutationObserver.disconnect();
      this.mutationObserver = null;
      if (this.unsubscribeStore) this.unsubscribeStore();
      this.unsubscribeStore = null;
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      if (this.disposeRepulsion) {
        this.disposeRepulsion();
        this.disposeRepulsion = null;
      }
      if (this.disposeDragToPatch) {
        this.disposeDragToPatch();
        this.disposeDragToPatch = null;
      }
      this.removeAllCables();
    }
    /**
     * NÚCLEO: lee la Matrix y sincroniza los cables SVG.
     * Se llama al arranque, tras cambios estructurales y al iniciar.
     */
    syncCablesFromState() {
      this.jackRegistry.refresh();
      this.signalTypeResolver.refresh(
        window.inventoryStore,
        window.runtimeStore?.getSnapshot?.()
      );
      const matrix = this.readMatrix();
      const activeSlotIndices = /* @__PURE__ */ new Set();
      matrix.forEach((slot, index) => {
        const isActive = slot?.active === true || slot?.active === 1 || slot?.active === "true";
        const hasRoute = slot?.source && slot?.target;
        if (!isActive || !hasRoute) return;
        activeSlotIndices.add(index);
        const sourcePos = this.jackRegistry.getPosition(slot.source);
        const targetPos = this.jackRegistry.getPosition(slot.target);
        if (!sourcePos || !targetPos) return;
        const endpoints = {
          x1: sourcePos.x,
          y1: sourcePos.y,
          x2: targetPos.x,
          y2: targetPos.y
        };
        const existing = this.activeCables.get(index);
        const routeChanged = existing && (existing.sourceId !== slot.source || existing.targetId !== slot.target);
        if (existing && !routeChanged) {
          existing.base = endpoints;
          CableRenderer.updateCablePath(
            existing.pathElement,
            endpoints,
            existing.deform ?? void 0
          );
          if (existing.plugsElement) {
            CableRenderer.updatePlugs(existing.plugsElement, endpoints);
          }
        } else {
          if (existing && routeChanged) {
            this.removeCableAt(index);
          }
          const signalType = this.signalTypeResolver.getSignalType(slot.source);
          const color = SIGNAL_COLORS[signalType] || SIGNAL_COLORS.cv;
          const pathElement = CableRenderer.createCablePath(
            index,
            endpoints,
            signalType
          );
          if (INTERACTION.SIGNAL_PULSE) {
            setTimeout(() => pathElement.classList.add("signal-active"), 600);
          }
          const plugsElement = CableRenderer.createPlugs(
            sourcePos.x,
            sourcePos.y,
            targetPos.x,
            targetPos.y,
            color
          );
          this.activeCables.set(index, {
            slotIndex: index,
            sourceId: slot.source,
            targetId: slot.target,
            signalType,
            pathElement,
            plugsElement,
            base: endpoints,
            deform: null
          });
        }
      });
      for (const [slotIndex, cable] of this.activeCables) {
        if (!activeSlotIndices.has(slotIndex)) {
          this.removeCableAt(slotIndex, cable);
        }
      }
      this.applyRouteHighlight();
    }
    /** Conteo de enlaces activos en la matrix (utilidad de verificación). */
    getActiveCableCount() {
      return this.readMatrix().filter(
        (slot) => slot?.active === true || slot?.active === 1 || slot?.active === "true"
      ).length;
    }
    /* ── Fase 7 (§9): API pública del drag-to-patch ── */
    /**
     * Devuelve el primer slot de la matrix sin ruta activa (libre para
     * crear un parche por drag-to-patch). Respeta el límite del modal UI
     * (DRAG_TO_PATCH.MATRIX_SLOT_LIMIT). -1 si no hay hueco.
     */
    getFreeMatrixSlot() {
      const matrix = this.readMatrix();
      for (let i = 0; i < DRAG_TO_PATCH.MATRIX_SLOT_LIMIT; i++) {
        const slot = matrix[i];
        const isActive = slot?.active === true || slot?.active === 1 || slot?.active === "true";
        if (!isActive) return i;
      }
      return -1;
    }
    /** Número de cables SVG actualmente en pantalla. */
    get cableCount() {
      return this.activeCables.size;
    }
    /* ── Fase 7.3 (§7.3): API pública para la repulsión elástica ── */
    /**
     * Devuelve los cables activos para la repulsión elástica.
     * El slotIndex permite a CableInteraction escribir de vuelta
     * sin acoplarse al estado interno del manager.
     */
    getActiveCablePaths() {
      const result = [];
      for (const cable of this.activeCables.values()) {
        result.push({ slotIndex: cable.slotIndex, pathElement: cable.pathElement });
      }
      return result;
    }
    /**
     * Aplica (o limpia) el desplazamiento de repulsión a un cable.
     * `offset = null` restaura la forma base. No-op si el cable no existe
     * o el offset no ha cambiado (evita escribir el SVG en cada frame).
     */
    setCableDeform(slotIndex, offset) {
      const cable = this.activeCables.get(slotIndex);
      if (!cable) return;
      const unchanged = (cable.deform?.x ?? null) === (offset?.x ?? null) && (cable.deform?.y ?? null) === (offset?.y ?? null);
      if (unchanged) return;
      cable.deform = offset;
      CableRenderer.updateCablePath(
        cable.pathElement,
        cable.base,
        offset ?? void 0
      );
    }
    /** Restaura todos los cables a su forma base (cursor fuera del rack). */
    resetAllDeforms() {
      for (const cable of this.activeCables.values()) {
        if (!cable.deform) continue;
        cable.deform = null;
        CableRenderer.updateCablePath(cable.pathElement, cable.base);
      }
    }
    /**
     * Aplica la tensión global del cable (0 = espagueti, 1 = tenso) y
     * redibuja todos los cables con el nuevo sag. §9 — Noodlerack/VCV Rack.
     * Conserva cualquier deformación de repulsión activa (§7.3).
     */
    applyGlobalTension(tension) {
      setGlobalTension(tension);
      this.redrawAllCables();
    }
    /* ── Fase 9 (§9): API pública de la Ruta destacada ── */
    /**
     * Destaca el cable del slot seleccionado en la Matrix (añade
     * `.route-highlight`) y atenúa el resto (`.route-dimmed`).
     * `slotIndex = null` restaura todos los cables a su apariencia normal.
     * Decorativo: no-op seguro si no hay cables o el slot no existe.
     */
    highlightRoute(slotIndex) {
      this.highlightedSlot = slotIndex;
      this.applyRouteHighlight();
    }
    /** Devuelve el slot actualmente destacado, o null si no hay ninguno. */
    getHighlightedSlot() {
      return this.highlightedSlot;
    }
    /**
     * Aplica las clases de la Ruta destacada a todos los cables.
     * Se invoca en cada sync para que los cables recién creados
     * (o los slots que cambiaron de ruta) respeten el estado actual.
     */
    applyRouteHighlight() {
      for (const cable of this.activeCables.values()) {
        const isHighlighted = this.highlightedSlot !== null && cable.slotIndex === this.highlightedSlot;
        const isDimmed = this.highlightedSlot !== null && !isHighlighted;
        cable.pathElement.classList.toggle("route-highlight", isHighlighted);
        cable.pathElement.classList.toggle("route-dimmed", isDimmed);
        if (cable.plugsElement) {
          cable.plugsElement.classList.toggle("route-highlight", isHighlighted);
          cable.plugsElement.classList.toggle("route-dimmed", isDimmed);
        }
      }
    }
    /* ───────────────────────── internos ───────────────────────── */
    /** Lee la matrix como array (soporta array y objeto mapeado). */
    readMatrix() {
      const win2 = window;
      const state = win2.runtimeStore?.getSnapshot?.();
      const matrixData = state?.patch?.patchbayMatrix || state?.preset?.patchbayMatrix || [];
      return Array.isArray(matrixData) ? matrixData : matrixData && Object.values(matrixData) || [];
    }
    /** Elimina un cable del mapa y del SVG (con fade-out). */
    removeCableAt(slotIndex, cable) {
      const active = cable || this.activeCables.get(slotIndex);
      if (!active) return;
      CableRenderer.removeCablePath(active.pathElement);
      if (active.plugsElement) {
        active.plugsElement.style.transition = "opacity 0.3s";
        active.plugsElement.style.opacity = "0";
        setTimeout(() => active.plugsElement?.remove(), 300);
      }
      this.activeCables.delete(slotIndex);
    }
    removeAllCables() {
      for (const [slotIndex] of this.activeCables) {
        this.removeCableAt(slotIndex);
      }
    }
    /** Redibuja todos los cables sin crear ni eliminar (scroll/resize). */
    redrawAllCables() {
      this.jackRegistry.refresh();
      for (const [, cable] of this.activeCables) {
        const sourcePos = this.jackRegistry.getPosition(cable.sourceId);
        const targetPos = this.jackRegistry.getPosition(cable.targetId);
        if (sourcePos && targetPos) {
          const endpoints = {
            x1: sourcePos.x,
            y1: sourcePos.y,
            x2: targetPos.x,
            y2: targetPos.y
          };
          cable.base = endpoints;
          CableRenderer.updateCablePath(
            cable.pathElement,
            endpoints,
            cable.deform ?? void 0
          );
          if (cable.plugsElement) {
            CableRenderer.updatePlugs(cable.plugsElement, endpoints);
          }
        }
      }
    }
    /**
     * Programa un redibujado agrupado en el siguiente frame.
     * Evita redibujar 60 veces por segundo durante un resize.
     */
    scheduleRedraw() {
      if (this.pendingRedraw) return;
      this.pendingRedraw = true;
      requestAnimationFrame(() => {
        this.redrawAllCables();
        this.pendingRedraw = false;
      });
    }
    /**
     * Escucha resize + scroll de los racks (debounced).
     * El scroll interno de los racks mueve los jacks: hay que re-posicionar.
     */
    setupLayoutListeners() {
      const win2 = window;
      win2.addEventListener?.("resize", () => this.scheduleRedraw());
      const debouncedRefresh = () => {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.debounceTimer = null;
          this.scheduleRedraw();
        }, INTERACTION.DEBOUNCE_MS);
      };
      for (const id of ["upper-rack", "lower-rack"]) {
        document.getElementById(id)?.addEventListener("scroll", debouncedRefresh, { passive: true });
      }
      const rackEl = document.getElementById("omega-rack");
      if (rackEl && "MutationObserver" in window) {
        this.mutationObserver = new MutationObserver(debouncedRefresh);
        this.mutationObserver.observe(rackEl, { childList: true, subtree: true });
      }
    }
    /**
     * Suscribe cambios estructurales del runtimeStore y redibuja.
     * Se espera UN FRAME para que el DOM se actualice antes de escanear jacks.
     */
    subscribeStructureChanges() {
      const store = window.runtimeStore;
      if (!store?.subscribe) return;
      this.unsubscribeStore = store.subscribe((changeType) => {
        if (changeType & 1) {
          requestAnimationFrame(() => this.syncCablesFromState());
        }
      });
    }
  };

  // src/index.ts
  var win = window;
  var runtimeStore = win.runtimeStore || new RuntimeStore();
  var schemaStore = win.schemaStore || new SchemaStore();
  var graphStore = win.graphStore || new GraphStore();
  var sessionStore = win.sessionStore || new SessionStore();
  var inventoryStore = win.inventoryStore || new InventoryStore();
  var rpcCommandDispatcher = win.rpcCommandDispatcher || new RpcCommandDispatcher();
  win.runtimeStore = runtimeStore;
  win.schemaStore = schemaStore;
  win.graphStore = graphStore;
  win.sessionStore = sessionStore;
  win.inventoryStore = inventoryStore;
  win.rpcCommandDispatcher = rpcCommandDispatcher;
  win.omegaRPC = rpc;
  win.OmegaLog = OmegaLog;
  var manager = new ModuleManager();
  win.moduleManager = manager;
  ModuleRegistry.register("ModuleRenderer", ModuleRenderer);
  ModuleRegistry.register("ModulePatchbayMatrix", ModulePatchbayMatrix);
  ModuleRegistry.register("ModuleBrowser", ModuleBrowser);
  win.Preferences = Preferences;
  win.ServiceMode = ServiceMode;
  win.ModuleRenderer = ModuleRenderer;
  win.ManifestRenderer = ManifestRenderer;
  win.getOrFetchManifest = getOrFetchManifest;
  win.ACEMM_CATALOG = ACEMM_CATALOG;
  document.addEventListener("DOMContentLoaded", () => {
    if (window.__omegaBooted) {
      OmegaLog.warn("BOOT", "Bootstrap ABORTED: System already booted.");
      return;
    }
    window.__omegaBooted = true;
    RuntimeEventHub.init();
    const juceKeys = Object.keys(window).filter((k) => k.toLowerCase().includes("juce") || k.toLowerCase().includes("omega"));
    OmegaLog.debug("DIAG", "Window Bridge Keys:", juceKeys);
    if (window.__JUCE__) {
      const j = window.__JUCE__;
      OmegaLog.debug("DIAG", "__JUCE__ keys:", Object.keys(j));
      if (j.backend) OmegaLog.debug("DIAG", "__JUCE__.backend keys:", Object.keys(j.backend));
    }
    if (window.juce) OmegaLog.debug("DIAG", "juce found:", Object.keys(window.juce));
    const buildId = window.OMEGA_BUILD_ID || "DEV";
    OmegaLog.info("BOOT", `Booting Era 7 Aseptic UI [BUILD #${buildId}]`);
    try {
      Preferences.init();
      PresetBrowser.init();
      const matrixHub = new ModulePatchbayMatrix();
      win.patchbayHub = matrixHub;
      const configModal = new ModulePatchModal();
      win.modulePatchModal = configModal;
      const cableManager = new PatchCableManager();
      cableManager.init();
      win.patchCableManager = cableManager;
      win.CableRenderer = CableRenderer;
      const tensionSlider = document.getElementById("cable-tension");
      if (tensionSlider) {
        tensionSlider.oninput = () => {
          const t = (parseFloat(tensionSlider.value) || 0) / 100;
          win.patchCableManager?.applyGlobalTension(t);
        };
      }
      win.setGlobalCableTension = setGlobalTension;
      win.getGlobalCableTension = getGlobalTension;
      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
      };
      const showModal = (id) => {
        const m = document.getElementById(id);
        if (m) m.style.display = "flex";
      };
      const handleAction = async (action, id) => {
        OmegaLog.debug("UI", `Executing Action: ${action} [ID: ${id || "none"}]`);
        switch (action) {
          case "toggle_matrix":
            matrixHub.toggleWorkspace(true);
            break;
          case "toggle_preferences_modal":
            await Preferences.init();
            showModal("preferences-modal");
            break;
          case "toggle_presets_modal":
            if (win.presetBrowser) {
              await win.presetBrowser.refresh();
            }
            showModal("presets-modal");
            break;
          case "toggle_module_browser":
            if (!win.activePresetName) {
              const createFirst = confirm("A\xFAn no has creado ning\xFAn Preset.\n\n\xBFDeseas crear un nuevo Preset ahora antes de a\xF1adir m\xF3dulos?");
              if (createFirst) {
                await handleAction("new_preset");
              }
            }
            if (win.moduleBrowser) {
              await win.moduleBrowser.open();
            } else {
              showModal("module-browser-modal");
            }
            break;
          case "about":
            showModal("about-modal");
            break;
          case "toggle_console":
            const consoleEl = document.getElementById("debug-console");
            if (consoleEl) consoleEl.style.display = consoleEl.style.display === "none" ? "block" : "none";
            break;
          case "clear_rack":
            if (confirm("\xBFVaciar el rack de m\xF3dulos e inicializar?")) {
              const upper = document.getElementById("upper-rack");
              const lower = document.getElementById("lower-rack");
              if (upper) upper.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
              if (lower) lower.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
              const lcd = document.getElementById("lcd-text");
              if (lcd) lcd.textContent = "INIT PATCH";
            }
            break;
          case "new_preset":
          case "save_preset":
            const defaultName = win.activePresetName || "NUEVO PARCHE SINTETIZADOR";
            const presetNameInput = prompt(`Introduce el nombre para el ${action === "new_preset" ? "Nuevo Preset" : "Preset"}:`, defaultName);
            if (presetNameInput && presetNameInput.trim().length > 0) {
              const nameClean = presetNameInput.trim();
              win.activePresetName = nameClean;
              const lcd = document.getElementById("lcd-text");
              if (lcd) lcd.textContent = nameClean.toUpperCase();
              if (action === "new_preset") {
                const upper = document.getElementById("upper-rack");
                const lower = document.getElementById("lower-rack");
                if (upper) upper.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
                if (lower) lower.querySelectorAll(".module, .aseptic-module-panel").forEach((el) => el.remove());
              }
              if (win.presetBrowser) {
                win.presetBrowser.saveUserPreset(nameClean);
              }
              OmegaLog.info("PRESET", `Preset '${nameClean}' guardado y activado.`);
              alert(`\xA1Preset '${nameClean}' listo!

Ahora puedes usar 'Add Module...' en el men\xFA EDIT para agregar m\xF3dulos al rack.`);
            }
            const rpcCmd = action === "new_preset" ? "newPreset" : action === "save_preset" ? "savePreset" : action;
            try {
              rpcCommandDispatcher.dispatch({ type: rpcCmd });
            } catch (e) {
            }
            break;
          case "undo":
          case "redo":
          case "exit":
            rpcCommandDispatcher.dispatch({ type: action });
            break;
          case "step-up":
          case "step-down":
            if (id && win.moduleManager) {
              const step = action === "step-up" ? 1 : -1;
              win.moduleManager.stepParameter(id, step);
            }
            break;
          default:
            OmegaLog.warn("UI", `Unknown action requested: ${action}`);
        }
      };
      bind("btn-global-matrix", () => handleAction("toggle_matrix"));
      document.addEventListener("click", (e) => {
        const target = e.target;
        const action = target.getAttribute("data-action");
        if (action) {
          const id = target.getAttribute("data-id") || target.closest("[data-source]")?.getAttribute("data-source");
          handleAction(action, id);
        }
      });
      const moduleBrowser = new ModuleBrowser();
      win.moduleBrowser = moduleBrowser;
      document.addEventListener("patch-request", (e) => {
        const detail = e.detail;
        const { type, instanceId, componentId } = detail;
        if (type === "add_module") {
          rpcCommandDispatcher.dispatch({
            type: "addModule",
            payload: { componentId }
          });
          return;
        }
        const schema = schemaStore.getSchema(componentId);
        configModal.open(instanceId, schema);
      });
    } catch (e) {
      OmegaLog.error("BOOT", "Component shell init failed:", e);
    }
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      setTimeout(() => {
        splash.style.display = "none";
      }, 600);
    }
    const rack = document.getElementById("omega-rack");
    if (rack) {
      rack.style.opacity = "1";
      rack.style.pointerEvents = "auto";
      rack.style.display = "flex";
      rack.classList.add("visible");
      OmegaLog.info("BOOT", "Rack visibility forced & splash dismissed.");
    }
    const backgroundLoad = async () => {
      try {
        OmegaLog.info("BOOT", "Background data load started...");
        const ready = await rpc.ensureReady(3e3);
        if (!ready) {
          OmegaLog.warn("BOOT", "Handshake delayed. Continuing background load...");
        }
        await Promise.all([
          schemaStore.ensureLoaded(),
          inventoryStore.ensureLoaded()
        ]);
        OmegaLog.info("BOOT", "Stores loaded. Bootstrapping Registry...");
        await ModuleRegistry.bootstrap();
        OmegaLog.info("BOOT", "Background initialization COMPLETED.");
      } catch (e) {
        OmegaLog.error("BOOT", "Background boot failure:", e);
      }
    };
    backgroundLoad();
  });
})();
