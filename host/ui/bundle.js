(() => {
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

  // ../../web/src/omega-ui-core/uca/panelGeometry.ts
  var RACK_UNIT_HEIGHT_PX = 48;
  var RACK_HP_WIDTH_PX = 15;
  var MIN_CHASSIS_WIDTH_PX = 60;
  var DEFAULT_SKIN = "industrial";
  var DEFAULT_ZOOM = 1;
  var DEFAULT_RUNTIME_VALUE = 0.5;
  var DEFAULT_STEPS = 100;
  var DEFAULT_PANEL_WIDTH = 120;
  var DEFAULT_PANEL_HEIGHT = 420;
  var DEFAULT_RACK_HP = 12;
  function rackHeightForUnits(units) {
    const u = String(units || "3U");
    if (u.startsWith("1U")) return RACK_UNIT_HEIGHT_PX * 3;
    if (u.startsWith("2U")) return RACK_UNIT_HEIGHT_PX * 4;
    if (u.startsWith("3U")) return RACK_UNIT_HEIGHT_PX * 9;
    if (u.startsWith("4U")) return RACK_UNIT_HEIGHT_PX * 12;
    if (u.startsWith("5U")) return RACK_UNIT_HEIGHT_PX * 15;
    if (u.startsWith("6U")) return RACK_UNIT_HEIGHT_PX * 18;
    if (u.startsWith("7U")) return RACK_UNIT_HEIGHT_PX * 21;
    if (u.startsWith("8U")) return RACK_UNIT_HEIGHT_PX * 24;
    return RACK_UNIT_HEIGHT_PX * 9;
  }
  function resolvePanelGeometry(manifest, options = {}) {
    const rack = manifest?.metadata?.rack;
    const hp = Number(rack?.hp ?? DEFAULT_RACK_HP);
    const units = rack?.units ?? "3U";
    const declaredUpper = units.startsWith("1U");
    const isUpper = options.forceUpper === true || declaredUpper;
    const widthPx = Math.max(hp * RACK_HP_WIDTH_PX, MIN_CHASSIS_WIDTH_PX);
    const heightPx = isUpper ? rackHeightForUnits("1U") : rackHeightForUnits(units);
    return {
      hp,
      units,
      widthPx,
      heightPx,
      slotType: isUpper ? "1U" : "3U",
      rackSlot: rack ? isUpper ? "upper" : "lower" : void 0,
      isUpper
    };
  }
  function resolveRenderOptions(manifest, options = {}) {
    return {
      skin: options.skin ?? manifest?.ui?.skin ?? DEFAULT_SKIN,
      zoom: options.zoom ?? manifest?.ui?.layout?.zoom ?? DEFAULT_ZOOM,
      runtimeValue: options.runtimeValue ?? DEFAULT_RUNTIME_VALUE,
      steps: options.steps ?? DEFAULT_STEPS,
      activeTab: options.activeTab ?? resolveActiveTab(manifest),
      resolveAsset: options.resolveAsset,
      forceUpper: options.forceUpper
    };
  }
  function resolveActiveTab(manifest) {
    const items = [
      ...manifest?.ui?.controls || [],
      ...manifest?.ui?.jacks || []
    ];
    const firstWithTab = items.find((i) => i.presentation?.tab);
    return firstWithTab?.presentation?.tab;
  }

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

  // ../../web/src/omega-ui-core/utils/styleResolverDistill.ts
  var CANONICAL_PALETTE_KEYS = {
    primary: "#00f2ff",
    secondary: "#ff8c00",
    utility: "#a0a0a0",
    feedback: "#32cd32",
    surface: "#121416",
    hardware: "#777777",
    chassis: "#1a1a1a",
    text: "#ffffff",
    glow: "#00f2ff",
    glass: "rgba(255,255,255,0.05)",
    warning: "#ff3300",
    highlight: "#ffffff",
    weak: "#555555"
  };

  // src/Catalog/acemmCatalog.generated.ts
  var GENERATED_ACEMM_CATALOG = {
    "440demo": {
      "id": "440demo",
      "name": "440 DEMO",
      "description": "",
      "metadata": {
        "name": "440 DEMO",
        "family": "utility",
        "version": "1.0.0",
        "rack": {
          "hp": 4,
          "units": "1U",
          "slot": "upper"
        }
      },
      "rack": {
        "slot": "upper",
        "hp": 4
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "405064857271ef6072636e0a2223fce5290367dde2433b72a97db7b16d873a93",
        "size": 2372
      },
      "wasmUrl": "modules/440demo/440demo.wasm",
      "manifestUrl": "modules/440demo/440demo.acemm",
      "params": {
        "enabled": {
          "label": "Enable Tone",
          "min": 0,
          "max": 1,
          "default": 1,
          "choices": [
            {
              "label": "OFF",
              "value": 0
            },
            {
              "label": "ON",
              "value": 1
            }
          ]
        },
        "amplitude": {
          "label": "Amplitude",
          "min": 0,
          "max": 1,
          "default": 0.5,
          "exponent": 2,
          "units": ""
        },
        "led_rate": {
          "label": "LED Rate",
          "min": 1,
          "max": 30,
          "default": 8,
          "exponent": 1,
          "units": "hz"
        }
      },
      "ui": {
        "dimensions": {
          "width": 60,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "Tone",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 50,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "sw_enable",
            "bind": "enabled",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "switch",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 40
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "ON"
                }
              ]
            }
          },
          {
            "id": "led_act",
            "bind": "led_activity",
            "pos": {
              "x": 30,
              "y": 75
            },
            "presentation": {
              "container": "main",
              "component": "led",
              "variant": "orange",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "ACT"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "audio_out",
            "pos": {
              "x": 30,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "k_amplitude",
            "bind": "amplitude",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_led_rate",
            "bind": "led_rate",
            "pos": {
              "x": 30,
              "y": 140
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "adsr": {
      "id": "adsr",
      "name": "Omega ADSR Envelope",
      "description": "",
      "metadata": {
        "name": "Omega ADSR Envelope",
        "family": "control",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "32146482ef8e649946c9c1becf1ade9c1d5e438f4c2fd6d149b190cfaeca01f9",
        "size": 3255
      },
      "wasmUrl": "modules/adsr/adsr.wasm",
      "manifestUrl": "modules/adsr/adsr.acemm",
      "params": {
        "attack": {
          "label": "Attack",
          "min": 0.5,
          "max": 1e4,
          "default": 5,
          "exponent": 3,
          "units": "ms"
        },
        "decay": {
          "label": "Decay",
          "min": 1,
          "max": 1e4,
          "default": 200,
          "exponent": 3,
          "units": "ms"
        },
        "sustain": {
          "label": "Sustain",
          "min": 0,
          "max": 1,
          "default": 0.6,
          "exponent": 1,
          "units": ""
        },
        "release": {
          "label": "Release",
          "min": 1,
          "max": 1e4,
          "default": 400,
          "exponent": 3,
          "units": "ms"
        },
        "depth": {
          "label": "Depth",
          "min": 0,
          "max": 1,
          "default": 1,
          "exponent": 1,
          "units": ""
        }
      },
      "ui": {
        "dimensions": {
          "width": 120,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "ADSR",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 110,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "knob_attack",
            "bind": "attack",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "A"
                }
              ]
            }
          },
          {
            "id": "knob_decay",
            "bind": "decay",
            "pos": {
              "x": 60,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "D"
                }
              ]
            }
          },
          {
            "id": "knob_sustain",
            "bind": "sustain",
            "pos": {
              "x": 90,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "S"
                }
              ]
            }
          },
          {
            "id": "knob_release",
            "bind": "release",
            "pos": {
              "x": 30,
              "y": 55
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "R"
                }
              ]
            }
          },
          {
            "id": "port_gate",
            "bind": "gate_in",
            "pos": {
              "x": 30,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "GATE"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "out",
            "pos": {
              "x": 60,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "k_depth",
            "bind": "depth",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "lfo": {
      "id": "lfo",
      "name": "Omega LFO",
      "description": "",
      "metadata": {
        "name": "Omega LFO",
        "family": "control",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "25440833bfe9a2e28e5faf229261e6d777423ccc1937de1cd6fb40fc0ce94598",
        "size": 2664
      },
      "wasmUrl": "modules/lfo/lfo.wasm",
      "manifestUrl": "modules/lfo/lfo.acemm",
      "params": {
        "rate": {
          "label": "Rate",
          "min": 0.01,
          "max": 30,
          "default": 2,
          "exponent": 2,
          "units": "hz"
        },
        "shape": {
          "label": "Shape",
          "min": 0,
          "max": 4,
          "default": 0,
          "choices": [
            {
              "label": "Sine",
              "value": 0
            },
            {
              "label": "Triangle",
              "value": 1
            },
            {
              "label": "Saw",
              "value": 2
            },
            {
              "label": "Square",
              "value": 3
            },
            {
              "label": "S&H",
              "value": 4
            }
          ]
        },
        "amount": {
          "label": "Amount",
          "min": 0,
          "max": 1,
          "default": 0.5,
          "exponent": 2,
          "units": ""
        },
        "sync_to_gate": {
          "label": "Sync to Gate",
          "min": 0,
          "max": 1,
          "default": 0,
          "choices": [
            {
              "label": "OFF",
              "value": 0
            },
            {
              "label": "ON",
              "value": 1
            }
          ]
        }
      },
      "ui": {
        "dimensions": {
          "width": 60,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "LFO",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 50,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "knob_rate",
            "bind": "rate",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "RATE"
                }
              ]
            }
          },
          {
            "id": "knob_shape",
            "bind": "shape",
            "pos": {
              "x": 30,
              "y": 55
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "SHAPE"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "out",
            "pos": {
              "x": 30,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "k_amount",
            "bind": "amount",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_sync",
            "bind": "sync_to_gate",
            "pos": {
              "x": 30,
              "y": 140
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "midi_2_cv": {
      "id": "midi_2_cv",
      "name": "MIDI 2 CV",
      "description": "",
      "metadata": {
        "name": "MIDI 2 CV",
        "family": "control",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "1U",
          "slot": "upper"
        }
      },
      "rack": {
        "slot": "upper",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "3d74a6bbc1056ebbc2a82acf18d6711bc8d139ce58de2ecc056257a67fa404bd",
        "size": 3391
      },
      "wasmUrl": "modules/midi_2_cv/midi_2_cv.wasm",
      "manifestUrl": "modules/midi_2_cv/midi_2_cv.acemm",
      "params": {},
      "ui": {
        "dimensions": {
          "width": 120,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "CV/GATE",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 110,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "port_cv_out",
            "bind": "cv_out",
            "pos": {
              "x": 10,
              "y": 65
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 22,
                "h": 22
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CV"
                }
              ]
            }
          },
          {
            "id": "port_gate_out",
            "bind": "gate_out",
            "pos": {
              "x": 40,
              "y": 65
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "silver",
              "size": {
                "w": 22,
                "h": 22
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "GATE"
                }
              ]
            }
          },
          {
            "id": "port_vel_out",
            "bind": "vel_out",
            "pos": {
              "x": 70,
              "y": 65
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 22,
                "h": 22
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "VEL"
                }
              ]
            }
          },
          {
            "id": "port_at_out",
            "bind": "at_out",
            "pos": {
              "x": 100,
              "y": 65
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 22,
                "h": 22
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "AT"
                }
              ]
            }
          },
          {
            "id": "k_midi_channel",
            "bind": "midi_channel",
            "pos": {
              "x": 10,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_glide_mode",
            "bind": "glide_mode",
            "pos": {
              "x": 20,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_glide_time",
            "bind": "glide_time",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_bend_range",
            "bind": "bend_range",
            "pos": {
              "x": 40,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_at_mode",
            "bind": "at_mode",
            "pos": {
              "x": 50,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "midi_in": {
      "id": "midi_in",
      "name": "GLOBAL MIDI INPUT",
      "description": "",
      "metadata": {
        "name": "GLOBAL MIDI INPUT",
        "family": "io",
        "version": "1.0.0",
        "rack": {
          "hp": 4,
          "units": "1U",
          "slot": "upper"
        }
      },
      "rack": {
        "slot": "upper",
        "hp": 4
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "43c8d528b2197f8592cad04a2b3412b3ad1021a3d8b48a61ae0b734b1a007007",
        "size": 864
      },
      "wasmUrl": "modules/midi_in/midi_in.wasm",
      "manifestUrl": "modules/midi_in/midi_in.acemm",
      "params": {},
      "ui": {
        "dimensions": {
          "width": 60,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "Bridge",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 50,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "port_out",
            "bind": "midi_out",
            "pos": {
              "x": 25,
              "y": 20
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "industrial",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "DATA"
                }
              ]
            }
          },
          {
            "id": "led_act",
            "bind": "led_activity",
            "pos": {
              "x": 25,
              "y": 75
            },
            "presentation": {
              "container": "main",
              "component": "led",
              "variant": "orange",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "ACT"
                }
              ]
            }
          }
        ]
      }
    },
    "midi_trigger": {
      "id": "midi_trigger",
      "name": "MIDI TRIGGER",
      "description": "",
      "metadata": {
        "name": "MIDI TRIGGER",
        "family": "midi",
        "version": "1.0.0",
        "rack": {
          "hp": 12,
          "units": "1U",
          "slot": "upper"
        }
      },
      "rack": {
        "slot": "upper",
        "hp": 12
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "5e826d5c94d176fe485c6f4e32a01b6af7f045593fb3d64e1da7d94ceb34ce85",
        "size": 1718
      },
      "wasmUrl": "modules/midi_trigger/midi_trigger.wasm",
      "manifestUrl": "modules/midi_trigger/midi_trigger.acemm",
      "params": {},
      "ui": {
        "dimensions": {
          "width": 180,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "left",
              "label": "Displays",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 80,
                "h": 130
              },
              "variant": "inset"
            },
            {
              "id": "right",
              "label": "Performance",
              "pos": {
                "x": 90,
                "y": 5
              },
              "size": {
                "w": 85,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "d_note",
            "bind": "note_idx",
            "pos": {
              "x": 5,
              "y": 15
            },
            "presentation": {
              "container": "left",
              "component": "display",
              "variant": "oled",
              "size": {
                "w": 70,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "NOTE"
                }
              ]
            }
          },
          {
            "id": "d_oct",
            "bind": "octave",
            "pos": {
              "x": 5,
              "y": 65
            },
            "presentation": {
              "container": "left",
              "component": "display",
              "variant": "led",
              "size": {
                "w": 70,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OCTAVE"
                }
              ]
            }
          },
          {
            "id": "b_trig",
            "bind": "trigger",
            "pos": {
              "x": 8,
              "y": 15
            },
            "presentation": {
              "container": "right",
              "component": "button",
              "variant": "cyan",
              "size": {
                "w": 34,
                "h": 34
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "TRIG"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "midi_out",
            "pos": {
              "x": 10,
              "y": 70
            },
            "presentation": {
              "container": "right",
              "component": "port",
              "variant": "industrial",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "MIDI"
                }
              ]
            }
          },
          {
            "id": "s_vel",
            "bind": "velocity",
            "pos": {
              "x": 55,
              "y": 15
            },
            "presentation": {
              "container": "right",
              "component": "slider-v",
              "variant": "industrial",
              "size": {
                "w": 18,
                "h": 85
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "VEL"
                }
              ]
            }
          }
        ]
      }
    },
    "omega_lab_monitor": {
      "id": "omega_lab_monitor",
      "name": "OMEGA LAB TELEMETRY MONITOR",
      "description": "",
      "metadata": {
        "name": "OMEGA LAB TELEMETRY MONITOR",
        "family": "utility",
        "version": "1.0.0",
        "rack": {
          "hp": 16,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 16
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "fdb207b98c43a6086688b5e769281548ec30d5454e44226882f7f486da3c8a6d",
        "size": 3385
      },
      "wasmUrl": "modules/omega_lab_monitor/omega_lab_monitor.wasm",
      "manifestUrl": "modules/omega_lab_monitor/omega_lab_monitor.acemm",
      "params": {
        "timebase": {
          "label": "Time/Div",
          "min": 0.1,
          "max": 10,
          "default": 1,
          "exponent": 1,
          "units": "x"
        },
        "gain": {
          "label": "Volt/Div",
          "min": 0.1,
          "max": 10,
          "default": 1,
          "exponent": 1,
          "units": "v"
        },
        "offset": {
          "label": "Offset",
          "min": -1,
          "max": 1,
          "default": 0,
          "units": "v"
        },
        "mode": {
          "label": "Mode",
          "min": 0,
          "max": 3,
          "default": 0,
          "choices": [
            {
              "label": "Scope",
              "value": 0
            },
            {
              "label": "Spectrum",
              "value": 1
            },
            {
              "label": "XY",
              "value": 2
            },
            {
              "label": "Meter",
              "value": 3
            }
          ]
        }
      },
      "ui": {
        "dimensions": {
          "width": 240,
          "height": 420
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "scope_sec",
              "label": "Oscilloscope Waveform Display",
              "pos": {
                "x": 5,
                "y": 10
              },
              "size": {
                "w": 230,
                "h": 185
              },
              "variant": "inset"
            },
            {
              "id": "meter_sec",
              "label": "Digital Meter & Voltage Telemetry",
              "pos": {
                "x": 5,
                "y": 200
              },
              "size": {
                "w": 230,
                "h": 65
              },
              "variant": "panel"
            },
            {
              "id": "ctrl_sec",
              "label": "Input Jacks & Calibration",
              "pos": {
                "x": 5,
                "y": 270
              },
              "size": {
                "w": 230,
                "h": 140
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "scope_1",
            "bind": "audio_in",
            "pos": {
              "x": 5,
              "y": 10
            },
            "presentation": {
              "container": "scope_sec",
              "component": "scope",
              "variant": "phosphor",
              "size": {
                "w": 220,
                "h": 165
              }
            }
          },
          {
            "id": "d_volts",
            "bind": "signal_telemetry",
            "pos": {
              "x": 5,
              "y": 12
            },
            "presentation": {
              "container": "meter_sec",
              "component": "display",
              "variant": "oled",
              "size": {
                "w": 150,
                "h": 42
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "VOLTAGE / FREQ"
                }
              ]
            }
          },
          {
            "id": "led_clip",
            "bind": "clip_status",
            "pos": {
              "x": 165,
              "y": 20
            },
            "presentation": {
              "container": "meter_sec",
              "component": "led",
              "variant": "orange",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CLIP"
                }
              ]
            }
          },
          {
            "id": "port_audio",
            "bind": "audio_in",
            "pos": {
              "x": 10,
              "y": 15
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "port",
              "variant": "audio",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "AUDIO"
                }
              ]
            }
          },
          {
            "id": "port_cv",
            "bind": "cv_in",
            "pos": {
              "x": 60,
              "y": 15
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "port",
              "variant": "cv",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CV IN"
                }
              ]
            }
          },
          {
            "id": "port_thru",
            "bind": "thru_out",
            "pos": {
              "x": 10,
              "y": 75
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "port",
              "variant": "industrial",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "THRU"
                }
              ]
            }
          },
          {
            "id": "port_trig",
            "bind": "trig_in",
            "pos": {
              "x": 60,
              "y": 75
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "port",
              "variant": "industrial",
              "size": {
                "w": 30,
                "h": 30
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "TRIG"
                }
              ]
            }
          },
          {
            "id": "k_time",
            "bind": "timebase",
            "pos": {
              "x": 110,
              "y": 15
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 36,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "TIME/DIV"
                }
              ]
            }
          },
          {
            "id": "k_volt",
            "bind": "gain",
            "pos": {
              "x": 170,
              "y": 15
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "knob",
              "variant": "white",
              "size": {
                "w": 36,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "VOLT/DIV"
                }
              ]
            }
          },
          {
            "id": "k_offset",
            "bind": "offset",
            "pos": {
              "x": 110,
              "y": 75
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "knob",
              "variant": "default",
              "size": {
                "w": 36,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OFFSET"
                }
              ]
            }
          },
          {
            "id": "k_mode",
            "bind": "mode",
            "pos": {
              "x": 170,
              "y": 75
            },
            "presentation": {
              "container": "ctrl_sec",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 36,
                "h": 36
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "MODE"
                }
              ]
            }
          }
        ]
      }
    },
    "test_parity": {
      "id": "test_parity",
      "name": "00-TEST-PARITY",
      "description": "Visual Parity Reference Manifest.",
      "metadata": {
        "name": "00-TEST-PARITY",
        "family": "utility",
        "version": "1.0.0",
        "rack": {
          "hp": 24,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 24
      },
      "assets": {
        "source": false,
        "wasm": false
      },
      "artifact": null,
      "wasmUrl": null,
      "manifestUrl": "modules/test_parity/test_parity.acemm",
      "params": {},
      "ui": {
        "skin": "industrial",
        "dimensions": {
          "width": 360,
          "height": 420
        },
        "layout": {
          "containers": [
            {
              "id": "c_prim",
              "label": "PRIMITIVES",
              "pos": {
                "x": 10,
                "y": 10
              },
              "size": {
                "w": 340,
                "h": 120
              },
              "variant": "panel"
            },
            {
              "id": "c_att",
              "label": "ATTACHMENTS",
              "pos": {
                "x": 10,
                "y": 140
              },
              "size": {
                "w": 340,
                "h": 120
              },
              "variant": "section"
            }
          ]
        },
        "controls": [
          {
            "id": "k1",
            "bind": "k_main",
            "pos": {
              "x": 40,
              "y": 40
            },
            "presentation": {
              "component": "knob",
              "variant": "A_cyan",
              "container": "c_prim"
            }
          },
          {
            "id": "p1",
            "bind": "p_in",
            "pos": {
              "x": 100,
              "y": 40
            },
            "presentation": {
              "component": "port",
              "variant": "B_audio",
              "container": "c_prim"
            }
          },
          {
            "id": "k_att",
            "bind": "k_main",
            "pos": {
              "x": 40,
              "y": 40
            },
            "presentation": {
              "component": "knob",
              "variant": "B_white",
              "container": "c_att",
              "attachments": [
                {
                  "type": "label",
                  "text": "TOP",
                  "position": "top"
                },
                {
                  "type": "label",
                  "text": "BOTTOM",
                  "position": "bottom"
                }
              ]
            }
          }
        ]
      }
    },
    "vca": {
      "id": "vca",
      "name": "Omega VCA",
      "description": "",
      "metadata": {
        "name": "Omega VCA",
        "family": "utility",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "0c3c1c71b684962c3e4aafda6ca79f193664a1d9e13b3e0024b400f23e92b7c5",
        "size": 2379
      },
      "wasmUrl": "modules/vca/vca.wasm",
      "manifestUrl": "modules/vca/vca.acemm",
      "params": {
        "level": {
          "label": "Level",
          "min": 0,
          "max": 1,
          "default": 0.8,
          "exponent": 2,
          "units": ""
        },
        "env_depth": {
          "label": "Env Depth",
          "min": 0,
          "max": 1,
          "default": 1,
          "exponent": 1,
          "units": ""
        },
        "curve": {
          "label": "Curve",
          "min": 0,
          "max": 1,
          "default": 0.5,
          "exponent": 1,
          "units": ""
        },
        "velocity": {
          "label": "Velocity",
          "min": 0,
          "max": 1,
          "default": 0,
          "exponent": 1,
          "units": ""
        }
      },
      "ui": {
        "dimensions": {
          "width": 120,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "VCA",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 110,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "knob_level",
            "bind": "level",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "LVL"
                }
              ]
            }
          },
          {
            "id": "knob_curve",
            "bind": "curve",
            "pos": {
              "x": 60,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CURVE"
                }
              ]
            }
          },
          {
            "id": "port_in",
            "bind": "in",
            "pos": {
              "x": 30,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "IN"
                }
              ]
            }
          },
          {
            "id": "port_gate",
            "bind": "gate_in",
            "pos": {
              "x": 90,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "GATE"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "out",
            "pos": {
              "x": 60,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "k_env_depth",
            "bind": "env_depth",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_velocity",
            "bind": "velocity",
            "pos": {
              "x": 30,
              "y": 140
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "vcf": {
      "id": "vcf",
      "name": "Omega VCF (ZDF Ladder)",
      "description": "",
      "metadata": {
        "name": "Omega VCF (ZDF Ladder)",
        "family": "filter",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "1fef7cb3144a666b6a764562e3f4e821526ac3747136bc65b8e877e29ebe1744",
        "size": 5959
      },
      "wasmUrl": "modules/vcf/vcf.wasm",
      "manifestUrl": "modules/vcf/vcf.acemm",
      "params": {
        "cutoff": {
          "label": "Cutoff",
          "min": 20,
          "max": 2e4,
          "default": 1e3,
          "exponent": 3,
          "units": "hz"
        },
        "resonance": {
          "label": "Resonance",
          "min": 0,
          "max": 1,
          "default": 0.25,
          "exponent": 2,
          "units": ""
        },
        "mode": {
          "label": "Mode",
          "min": 0,
          "max": 3,
          "default": 0,
          "choices": [
            {
              "label": "LP",
              "value": 0
            },
            {
              "label": "HP",
              "value": 1
            },
            {
              "label": "BP",
              "value": 2
            },
            {
              "label": "Notch",
              "value": 3
            }
          ]
        },
        "keytrack": {
          "label": "Key Track",
          "min": 0,
          "max": 1,
          "default": 0.5,
          "exponent": 1,
          "units": ""
        },
        "cutoff_cv": {
          "label": "Cutoff CV",
          "min": 0,
          "max": 1,
          "default": 0.5,
          "exponent": 1,
          "units": ""
        },
        "res_cv": {
          "label": "Res CV",
          "min": 0,
          "max": 1,
          "default": 0,
          "exponent": 1,
          "units": ""
        }
      },
      "ui": {
        "dimensions": {
          "width": 120,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "VCF",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 110,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "knob_cutoff",
            "bind": "cutoff",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CUT"
                }
              ]
            }
          },
          {
            "id": "knob_res",
            "bind": "resonance",
            "pos": {
              "x": 60,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "RES"
                }
              ]
            }
          },
          {
            "id": "knob_mode",
            "bind": "mode",
            "pos": {
              "x": 90,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "MODE"
                }
              ]
            }
          },
          {
            "id": "port_in",
            "bind": "in",
            "pos": {
              "x": 30,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "IN"
                }
              ]
            }
          },
          {
            "id": "port_cutoff_cv",
            "bind": "cutoff_cv",
            "pos": {
              "x": 60,
              "y": 95
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "CV"
                }
              ]
            }
          },
          {
            "id": "port_res_cv",
            "bind": "res_cv",
            "pos": {
              "x": 90,
              "y": 95
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "RES"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "out",
            "pos": {
              "x": 60,
              "y": 110
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "k_keytrack",
            "bind": "keytrack",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_cutoff_cv",
            "bind": "cutoff_cv",
            "pos": {
              "x": 30,
              "y": 140
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_res_cv",
            "bind": "res_cv",
            "pos": {
              "x": 30,
              "y": 150
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    },
    "vco": {
      "id": "vco",
      "name": "Omega VCO (PolyBLEP)",
      "description": "",
      "metadata": {
        "name": "Omega VCO (PolyBLEP)",
        "family": "oscillator",
        "version": "1.0.0",
        "rack": {
          "hp": 8,
          "units": "3U",
          "slot": "lower"
        }
      },
      "rack": {
        "slot": "lower",
        "hp": 8
      },
      "assets": {
        "source": true,
        "wasm": true
      },
      "artifact": {
        "sha256": "34bae781982024548b5d01cdc4aa8f2b3f61716152360b1e931e006b014d203b",
        "size": 5718
      },
      "wasmUrl": "modules/vco/vco.wasm",
      "manifestUrl": "modules/vco/vco.acemm",
      "params": {
        "waveform": {
          "label": "Waveform",
          "min": 0,
          "max": 4,
          "default": 0,
          "choices": [
            {
              "label": "Sine",
              "value": 0
            },
            {
              "label": "Triangle",
              "value": 1
            },
            {
              "label": "Saw",
              "value": 2
            },
            {
              "label": "Square",
              "value": 3
            },
            {
              "label": "Pulse",
              "value": 4
            }
          ]
        },
        "coarse": {
          "label": "Coarse",
          "min": -12,
          "max": 12,
          "default": 0,
          "exponent": 1,
          "units": "st"
        },
        "fine": {
          "label": "Fine",
          "min": -100,
          "max": 100,
          "default": 0,
          "exponent": 1,
          "units": "ct"
        },
        "pulse_width": {
          "label": "Pulse Width",
          "min": 0.05,
          "max": 0.95,
          "default": 0.5,
          "exponent": 1,
          "units": "pw"
        },
        "fm_amount": {
          "label": "FM Amount",
          "min": 0,
          "max": 1,
          "default": 0,
          "exponent": 2,
          "units": ""
        },
        "pwm_amount": {
          "label": "PWM Amount",
          "min": 0,
          "max": 1,
          "default": 0,
          "exponent": 2,
          "units": ""
        },
        "sub_on": {
          "label": "Sub Osc",
          "min": 0,
          "max": 1,
          "default": 1,
          "choices": [
            {
              "label": "OFF",
              "value": 0
            },
            {
              "label": "ON",
              "value": 1
            }
          ]
        },
        "drift": {
          "label": "Drift",
          "min": 0,
          "max": 1,
          "default": 0.15,
          "exponent": 2,
          "units": ""
        }
      },
      "ui": {
        "dimensions": {
          "width": 120,
          "height": 140
        },
        "skin": "industrial",
        "layout": {
          "containers": [
            {
              "id": "main",
              "label": "VCO",
              "pos": {
                "x": 5,
                "y": 5
              },
              "size": {
                "w": 110,
                "h": 130
              },
              "variant": "panel"
            }
          ]
        },
        "controls": [
          {
            "id": "knob_waveform",
            "bind": "waveform",
            "pos": {
              "x": 30,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "WAVE"
                }
              ]
            }
          },
          {
            "id": "knob_coarse",
            "bind": "coarse",
            "pos": {
              "x": 60,
              "y": 15
            },
            "presentation": {
              "container": "main",
              "component": "knob",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "COARSE"
                }
              ]
            }
          },
          {
            "id": "port_v_oct",
            "bind": "v_oct",
            "pos": {
              "x": 30,
              "y": 95
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "V/OCT"
                }
              ]
            }
          },
          {
            "id": "port_fm",
            "bind": "fm",
            "pos": {
              "x": 60,
              "y": 95
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "FM"
                }
              ]
            }
          },
          {
            "id": "port_pwm",
            "bind": "pwm",
            "pos": {
              "x": 90,
              "y": 95
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "PWM"
                }
              ]
            }
          },
          {
            "id": "port_sync",
            "bind": "sync",
            "pos": {
              "x": 30,
              "y": 115
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "SYNC"
                }
              ]
            }
          },
          {
            "id": "port_out",
            "bind": "out",
            "pos": {
              "x": 60,
              "y": 115
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "OUT"
                }
              ]
            }
          },
          {
            "id": "port_sub_out",
            "bind": "sub_out",
            "pos": {
              "x": 90,
              "y": 115
            },
            "presentation": {
              "container": "main",
              "component": "port",
              "variant": "cyan",
              "size": {
                "w": 24,
                "h": 24
              },
              "attachments": [
                {
                  "type": "label",
                  "text": "SUB"
                }
              ]
            }
          },
          {
            "id": "k_fine",
            "bind": "fine",
            "pos": {
              "x": 30,
              "y": 130
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_pulse_width",
            "bind": "pulse_width",
            "pos": {
              "x": 30,
              "y": 140
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_fm_amount",
            "bind": "fm_amount",
            "pos": {
              "x": 30,
              "y": 150
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_pwm_amount",
            "bind": "pwm_amount",
            "pos": {
              "x": 30,
              "y": 160
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_sub_on",
            "bind": "sub_on",
            "pos": {
              "x": 30,
              "y": 170
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          },
          {
            "id": "k_drift",
            "bind": "drift",
            "pos": {
              "x": 30,
              "y": 180
            },
            "presentation": {
              "container": "main",
              "component": "hidden",
              "variant": "default"
            }
          }
        ]
      }
    }
  };

  // src/Catalog/AcemmCatalog.ts
  var LEGACY_ACEMM_ENTRIES = {
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
  var ACEMM_CATALOG = {
    ...LEGACY_ACEMM_ENTRIES,
    ...GENERATED_ACEMM_CATALOG
  };
  async function hydrateCatalogFromServer() {
    try {
      const res = await fetch("/api/modules", { cache: "no-store" });
      if (!res.ok) {
        OmegaLog.warn("catalog", `hydrateCatalogFromServer: /api/modules -> HTTP ${res.status}; usando cat\xE1logo embebido.`);
        return;
      }
      const raw = await res.json();
      const liveIds = Object.keys(raw);
      if (liveIds.length === 0) return;
      for (const id of liveIds) {
        ACEMM_CATALOG[id] = raw[id];
      }
      if (typeof window !== "undefined") {
        window.ACEMM_CATALOG = ACEMM_CATALOG;
      }
      OmegaLog.info("catalog", `hydrateCatalogFromServer: ${liveIds.length} m\xF3dulos en vivo (${liveIds.join(", ")})`);
    } catch (e) {
      OmegaLog.warn("catalog", `hydrateCatalogFromServer: fallback a cat\xE1logo embebido (${String(e?.message || e)})`);
    }
  }
  var CONTROL_COMPONENTS = {
    knob: "knob",
    slider: "slider-v",
    "slider-v": "slider-v",
    "slider-h": "slider-h",
    button: "button",
    switch: "switch",
    toggle: "toggle",
    led: "led",
    display: "display",
    stepper: "stepper",
    fader: "fader"
  };
  function layoutItems(items, width, height, opts) {
    const n = items.length || 0;
    if (n === 0) return [];
    const cols = opts.cols ?? n;
    const rows = Math.max(1, Math.ceil(n / cols));
    const perRow = Math.ceil(n / rows);
    return items.map((item, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const colsInRow = Math.min(perRow, n - row * perRow);
      const xStep = width / (colsInRow + 1);
      const size = opts.size;
      const component = typeof opts.component === "function" ? opts.component(item) : opts.component;
      return {
        ...item,
        role: opts.role,
        type: opts.type,
        pos: { x: Math.round(xStep * (col + 1) - size / 2), y: Math.round(opts.startY + row * opts.rowStep) },
        presentation: {
          component,
          size: { width: size, height: size }
        }
      };
    });
  }
  function ensureCanonicalPalette(ui) {
    if (ui.palette && Object.keys(ui.palette).length > 0) return;
    const existing = ui.colors || {};
    ui.palette = { ...CANONICAL_PALETTE_KEYS, ...existing };
  }
  function normalizeCatalogManifest(entry) {
    if (!entry) return entry;
    if (entry.ui && (entry.ui.tree || Array.isArray(entry.ui.controls) || Array.isArray(entry.ui.jacks) || Array.isArray(entry.ui.items))) {
      ensureCanonicalPalette(entry.ui);
      return entry;
    }
    const slot = entry.rack?.slot === "upper" ? "upper" : "lower";
    const hp = Number(entry.rack?.hp) || 8;
    const units = slot === "upper" ? "1U" : "3U";
    const width = Math.max(hp * 15, MIN_CHASSIS_WIDTH_PX);
    const height = slot === "upper" ? 144 : 432;
    const controls = layoutItems(entry.controls || [], width, height, {
      cols: slot === "upper" ? entry.controls?.length || 1 : 3,
      startY: slot === "upper" ? height - 52 : height - 320,
      rowStep: slot === "upper" ? 40 : 56,
      size: slot === "upper" ? 24 : 28,
      component: (c) => CONTROL_COMPONENTS[c.type] || "knob"
    });
    const jacks = layoutItems(entry.jacks || [], width, height, {
      cols: entry.jacks?.length || 1,
      startY: slot === "upper" ? height - 24 : height - 42,
      rowStep: 0,
      size: slot === "upper" ? 18 : 20,
      component: "port",
      role: "io",
      type: "jack"
    });
    return {
      ...entry,
      metadata: {
        ...entry.metadata || {},
        rack: { hp, units, slot }
      },
      ui: {
        skin: entry.ui?.skin || DEFAULT_SKIN,
        palette: { ...CANONICAL_PALETTE_KEYS, ...entry.ui?.palette || {}, ...entry.ui?.colors || {} },
        dimensions: { width, height },
        controls,
        jacks,
        layout: { width, height, gridSnap: 1, containers: [] }
      }
    };
  }
  async function getOrFetchManifest(id) {
    if (!id) return null;
    const win2 = window;
    let manifest = win2.schemaStore?.getSchema(id);
    if (!manifest && ACEMM_CATALOG[id]) {
      manifest = ACEMM_CATALOG[id];
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
    manifest = normalizeCatalogManifest(manifest);
    if (win2.schemaStore && typeof win2.schemaStore.registerSchema === "function") {
      win2.schemaStore.registerSchema(id, manifest);
    }
    return manifest;
  }
  if (typeof window !== "undefined") {
    window.ACEMM_CATALOG = ACEMM_CATALOG;
    window.getOrFetchManifest = getOrFetchManifest;
    window.hydrateCatalogFromServer = hydrateCatalogFromServer;
    void hydrateCatalogFromServer();
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
            const manifest = await getOrFetchManifest(componentId);
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
                ui: { dimensions: { width: MIN_CHASSIS_WIDTH_PX, height: DEFAULT_PANEL_HEIGHT }, controls: [], jacks: [], skin: DEFAULT_SKIN },
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
        const isFactory = lib.name.toUpperCase() === "FACTORY" || p.category === "Factory";
        if (!isFactory) {
          const delBtn = document.createElement("button");
          delBtn.className = "preset-delete";
          delBtn.title = "Delete preset";
          delBtn.textContent = "\u{1F5D1}";
          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.deletePreset(p.name);
          });
          li.appendChild(delBtn);
        }
        li.onclick = () => this.selectPreset(idx);
        list.appendChild(li);
      });
    }
    /**
     * [P2-4] Elimina un preset de usuario del disco (RPC deletePreset →
     * PatchRepository::remove). Los patches de fábrica no tienen botón.
     */
    async deletePreset(name) {
      if (!confirm(`\xBFEliminar el preset "${name}"?`)) return;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({ type: "deletePreset", payload: { target: name } });
      }
      this.selectedPresetIdx = -1;
      await this.refresh();
    }
    async selectPreset(idx) {
      this.selectedPresetIdx = idx;
      const lib = this.data.libraries[this.selectedLibIdx];
      const patch = lib?.patches[idx];
      if (!patch) return;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({
          type: "loadPreset",
          payload: { target: patch.name }
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
    const zoom = 1.5;
    const w = size.width * zoom;
    const h = size.height * zoom;
    return `
    <div class="scope-display variant-${variant}" 
         data-bind="${bind}"
         style="--scope-width: ${w}px; --scope-height: ${h}px; --scope-color: ${color};">
        <canvas class="scope-canvas" width="${w}" height="${h}"></canvas>
        <div class="scope-grid"></div>
    </div>
  `;
  }

  // ../../web/src/omega-ui-core/renderers/TerminalRenderer.ts
  function renderTerminalHTML(props) {
    const { variant, bind, size, color = "var(--terminal-color, #ffcc00)", font = "monospace" } = props;
    const zoom = 1.5;
    const w = size.width * zoom;
    const h = size.height * zoom;
    return `
    <div class="terminal-display variant-${variant}" 
         data-bind="${bind}"
         style="--terminal-width: ${w}px; --terminal-height: ${h}px; color: ${color}; font-family: ${font};">
        <div class="terminal-container"></div>
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
      return renderScopeHTML({
        variant: node.style?.variant || "default",
        bind: node.bind || "",
        size: node.style?.width && node.style?.height ? { width: node.style.width, height: node.style.height } : { width: 100, height: 100 },
        color: resolved.style.color || node.style?.color,
        font: resolved.style.font || node.style?.font,
        inheritedFont: resolved.style.font || opt.inherited.font,
        inheritedSize: resolved.style.fontSize || opt.inherited.size,
        inheritedColor: resolved.style.fontColor || opt.inherited.color
      });
    },
    "terminal": (node, _props, opt) => {
      const resolved = resolveNodeStyle(node, opt.manifest);
      return renderTerminalHTML({
        variant: node.style?.variant || "default",
        bind: node.bind || "",
        size: node.style?.width && node.style?.height ? { width: node.style.width, height: node.style.height } : { width: 100, height: 100 },
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
  function renderRackHTML(node, options, nodeId = "") {
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
      <div class="industrial-rack-chassis" data-node-id="${nodeId}"
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
      const nodeId = node.id || "";
      if (compType === "rack") {
        return renderRackHTML(node, options, nodeId);
      }
      const isArchitectural = compType === "container" || compType === "group" || compType === "face";
      if (isArchitectural) {
        return `
        <div class="architectural-cell" data-node-id="${nodeId}" style="width: 100%; height: 100%; position: relative;">
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
      <div class="control-cell variant-${variant}" data-node-id="${nodeId}" style="--comp-radius: ${compRadius}px;">
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

  // ../../web/src/omega-ui-core/renderers/cellOptions.ts
  function buildCellOptions(manifest, input = {}) {
    const base = resolveRenderOptions(manifest, input);
    return {
      skin: base.skin ?? DEFAULT_SKIN,
      zoom: base.zoom ?? DEFAULT_ZOOM,
      runtimeValue: base.runtimeValue ?? DEFAULT_RUNTIME_VALUE,
      steps: base.steps ?? DEFAULT_STEPS,
      activeTab: base.activeTab,
      resolveAsset: base.resolveAsset,
      manifest,
      isSelected: input.isSelected ?? false,
      isLiveMode: input.isLiveMode ?? false,
      isError: input.isError,
      forceFrame: input.forceFrame,
      recipe: input.recipe
    };
  }

  // ../../web/src/omega-ui-core/uca/converters/flatToTree.ts
  function toNumber(v, rackWidth) {
    if (v === void 0 || v === null || v === "") return void 0;
    if (typeof v === "number") return isFinite(v) ? v : void 0;
    const s = v.trim();
    if (s === "full" || s === "100%") return rackWidth;
    if (s === "1/2" || s === "50%") return rackWidth * 0.5;
    const n = parseFloat(s);
    return isFinite(n) ? n : void 0;
  }
  function toDimensions(size, rackWidth) {
    if (!size) return void 0;
    const width = toNumber(size.width ?? size.w, rackWidth);
    const height = toNumber(size.height ?? size.h, rackWidth);
    if (width === void 0 || height === void 0) return void 0;
    return { width, height };
  }
  function toPos(pos, x, y) {
    return { x: pos?.x ?? x ?? 0, y: pos?.y ?? y ?? 0 };
  }
  function indexTree(tree, out = /* @__PURE__ */ new Map()) {
    if (!tree) return out;
    out.set(tree.id, tree);
    (tree.children || []).forEach((child) => indexTree(child, out));
    return out;
  }
  function assetLayers(attachments, existing) {
    const existingChildren = existing?.children?.filter((c) => c.kind === "asset-layer");
    if (existingChildren && existingChildren.length > 0) return existingChildren;
    if (!attachments || attachments.length === 0) return void 0;
    return attachments.map((a) => ({
      id: a.id,
      kind: "asset-layer",
      role: a.role || "decor",
      bind: a.bind || void 0,
      layout: {
        pos: { x: a.offsetX ?? a.pos?.x ?? 0, y: a.offsetY ?? a.pos?.y ?? 0 }
      },
      style: {
        ...a.style,
        font: a.fontFamily || a.style?.font,
        fontSize: a.fontSize || a.style?.fontSize,
        fontColor: a.fontColor || a.style?.fontColor
      }
    }));
  }
  function flatToTree(manifest, existingTree) {
    const ui = manifest?.ui || {};
    const rackWidth = toNumber(ui.dimensions?.width ?? ui.layout?.width, DEFAULT_PANEL_WIDTH) || DEFAULT_PANEL_WIDTH;
    const rackHeight = toNumber(ui.dimensions?.height ?? ui.layout?.height, DEFAULT_PANEL_HEIGHT) || DEFAULT_PANEL_HEIGHT;
    const existingById = indexTree(existingTree);
    const existingMainFace = existingTree?.children?.find((c) => c.id === "MAIN_FACE");
    const root = {
      id: manifest?.id || "anonymous_rack",
      kind: "rack",
      role: "root",
      layout: {
        pos: existingTree?.layout?.pos || { x: 0, y: 0 },
        size: existingTree?.layout?.size || { width: rackWidth, height: rackHeight }
      },
      children: []
    };
    const mainFace = {
      id: "MAIN_FACE",
      kind: "face",
      role: "presentation",
      layout: {
        pos: existingMainFace?.layout?.pos || { x: 0, y: 0 },
        size: existingMainFace?.layout?.size || { width: rackWidth, height: rackHeight }
      },
      children: []
    };
    root.children?.push(mainFace);
    const containerMap = /* @__PURE__ */ new Map();
    (ui.layout?.containers || []).forEach((c) => {
      const existing = existingById.get(c.id || "");
      const node = {
        id: c.id || `container_${containerMap.size}`,
        kind: "container",
        role: "infrastructure",
        layout: {
          pos: existing?.layout?.pos || toPos(c.pos),
          size: existing?.layout?.size || toDimensions(c.size, rackWidth),
          zIndex: existing?.layout?.zIndex ?? c.zIndex
        },
        style: existing?.style || {
          color: c.color || void 0,
          indicatorColor: c.indicatorColor || void 0,
          rounding: c.rounding || void 0,
          borderWidth: c.borderWidth || void 0,
          variant: c.variant || void 0
        },
        children: existing?.children || []
      };
      containerMap.set(node.id, node);
      mainFace.children?.push(node);
    });
    const allEntities = [...ui.controls || [], ...ui.jacks || []];
    allEntities.forEach((entity, idx) => {
      const fallbackId = entity.bind || entity.paramId || entity.source || entity.portId || `entity_${idx}`;
      const id = entity.id || fallbackId;
      const existing = existingById.get(id);
      const component = entity.presentation?.component;
      const isJack = entity.role === "io" || entity.type?.startsWith?.("jack") || component === "port";
      const cellRef = isJack ? "port" : component || entity.type || fallbackId;
      const node = {
        id,
        kind: "cell",
        role: existing?.role || entity.role || (isJack ? "io" : "control"),
        bind: entity.bind || entity.paramId || entity.source || entity.portId || id,
        layout: {
          pos: existing?.layout?.pos || toPos(entity.pos, entity.x, entity.y),
          size: existing?.layout?.size || toDimensions(entity.presentation?.size, rackWidth) || toDimensions({ width: entity.width ?? entity.w, height: entity.height ?? entity.h }, rackWidth),
          zIndex: existing?.layout?.zIndex ?? entity.presentation?.style?.zIndex ?? entity.zIndex
        },
        style: existing?.style || {
          ...entity.presentation?.style,
          variant: entity.presentation?.variant ?? entity.presentation?.style?.variant
        },
        cellRef,
        meta: existing?.meta ?? (entity.label ? { label: entity.label } : void 0),
        children: assetLayers(entity.attachments, existing)
      };
      const containerId = entity.presentation?.container || entity.presentation?.group;
      const targetParent = containerId ? containerMap.get(containerId) : mainFace;
      if (targetParent) {
        targetParent.children = targetParent.children || [];
        targetParent.children.push(node);
      } else {
        mainFace.children?.push(node);
      }
    });
    return root;
  }

  // src/Util/AssetResolver.ts
  var AssetResolver = class {
    /**
     * Resolves a local module path to a full virtual URL handled by the C++ host or web standalone.
     * @param moduleId The canonical ID of the module.
     * @param path The relative path inside the module directory (e.g., 'illustration.svg').
     */
    static resolve(moduleId, path) {
      if (!path || !moduleId) return void 0;
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
        return path;
      }
      const cleanPath = path.startsWith("./") ? path.substring(2) : path;
      const assetPath = path.startsWith("asset://") ? path.substring(8) : cleanPath;
      const isJuce = typeof window !== "undefined" && (!!window.__JUCE__ || window.location.hostname === "juce.localhost");
      if (isJuce) {
        return `https://juce.localhost/modules/${moduleId}/${assetPath}`;
      }
      if (assetPath.startsWith("assets/modules/") || assetPath.startsWith("modules/")) {
        return `/${assetPath.replace(/^\/+/, "")}`;
      }
      return `/modules/${moduleId}/${assetPath}`;
    }
    /**
     * Resolves a global UI asset path.
     */
    static resolveGlobal(path) {
      if (!path) return "";
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("/")) {
        return path;
      }
      return `/${path}`;
    }
  };

  // src/Renderers/ManifestRenderer.ts
  var ManifestRenderer = class {
    /**
     * Render a complete module panel from its manifest.
     * Returns an HTML string ready for innerHTML injection.
     */
    static renderModulePanel(manifest, forceUpper = false) {
      if (!manifest) return "";
      const geometry = resolvePanelGeometry(manifest, { forceUpper });
      const { widthPx, heightPx, isUpper } = geometry;
      const tree = manifest.ui?.tree ?? flatToTree(manifest);
      if (!tree) return "";
      const html = this.renderNode(tree, manifest, 0);
      const chassisNode = {
        id: manifest.id,
        kind: "rack",
        style: {},
        children: []
      };
      const chassisOptions = buildCellOptions(manifest, {
        isLiveMode: true,
        resolveAsset: (ref) => AssetResolver.resolve(manifest.id, ref)
      });
      const chassisHTML = renderRackHTML(chassisNode, chassisOptions, manifest.id);
      return `
      <div class="omega-module-chassis ${isUpper ? "chassis-1u" : "chassis-3u"}" style="
        width: ${widthPx}px;
        height: ${heightPx}px;
        position: relative;
        overflow: hidden;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
      ">
        ${chassisHTML}
        <div class="module-loader-overlay" style="
          position: absolute;
          inset: 0;
          background: rgba(10, 14, 23, 0.94);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          transition: opacity 0.4s ease-out;
        ">
          <div style="
            width: 26px;
            height: 26px;
            border: 3px solid rgba(0, 240, 255, 0.2);
            border-top-color: #00f0ff;
            border-radius: 50%;
            animation: omega-spinner-rotate 0.8s linear infinite;
            box-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
          "></div>
          <span style="
            margin-top: 8px;
            font-family: 'Space Mono', monospace, sans-serif;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #00f0ff;
            text-transform: uppercase;
          ">CARGANDO...</span>
        </div>
        ${html}
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
      const cellOptions = buildCellOptions(manifest, {
        isLiveMode: true
      });
      const cellHTML = CellRenderer.renderCellHTML(node, cellOptions);
      if (!cellHTML.includes("left:")) {
        return cellHTML.replace(
          /(<div class="control-cell[^"]*" data-node-id="[^"]*" style=")([^"]*?);?\s*(">)/,
          `$1$2; left: ${posX}px; top: ${posY}px;$3`
        );
      }
      return cellHTML;
    }
  };
  if (typeof window !== "undefined") {
    window.ManifestRenderer = ManifestRenderer;
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

  // src/Util/moduleLoader.ts
  function dismissLoaderOverlay(root) {
    const loader = root.querySelector(".module-loader-overlay");
    if (!loader) return;
    const imgs = Array.from(root.querySelectorAll("img"));
    let pending = imgs.length;
    const dismiss = () => {
      loader.style.opacity = "0";
      loader.style.pointerEvents = "none";
      setTimeout(() => loader.remove(), 400);
    };
    if (pending === 0) {
      setTimeout(dismiss, 200);
      return;
    }
    const checkDone = () => {
      pending--;
      if (pending <= 0) dismiss();
    };
    imgs.forEach((img) => {
      if (img.complete) checkDone();
      else {
        img.addEventListener("load", checkDone, { once: true });
        img.addEventListener("error", checkDone, { once: true });
      }
    });
    setTimeout(dismiss, 600);
  }

  // src/Renderers/ModuleRenderer.ts
  var ModuleRenderer = class {
    content;
    descriptor;
    values = {};
    isInitialized = false;
    activeTab = "MAIN";
    binder;
    visualizers;
    constructor(content, options) {
      this.content = content;
      this.descriptor = normalizeCatalogManifest(options.manifest || options);
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
      this.visualizers.init(this.content);
      this.isInitialized = true;
      subscribeToTelemetry(this.descriptor);
      this.syncAllFromStore();
      this.visualizers.start();
    }
    render() {
      this.content.innerHTML = ManifestRenderer.renderModulePanel(this.descriptor);
      try {
        this.bind();
        this.syncAllFromStore();
      } finally {
        this.dismissLoader();
      }
    }
    dismissLoader() {
      dismissLoaderOverlay(this.content);
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
  var CABLE_PALETTE = [
    "#10b981",
    // Verde esmeralda (audio)
    "#06b6d4",
    // Cian neón (CV)
    "#ef4444",
    // Rojo carmesí (gate)
    "#a855f7",
    // Violeta neón (midi)
    "#f59e0b",
    // Ámbar
    "#ec4899",
    // Rosa neón
    "#22c55e",
    // Verde lima
    "#3b82f6",
    // Azul
    "#f97316",
    // Naranja
    "#e5e7eb"
    // Blanco grisáceo
  ];
  function normalizeCableColor(color) {
    if (typeof color !== "string") return null;
    const c = color.trim().toLowerCase();
    if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/.test(c)) return c;
    return null;
  }
  function resolveCableColor(slotColor, signalType) {
    return normalizeCableColor(slotColor) || SIGNAL_COLORS[signalType] || SIGNAL_COLORS.cv;
  }
  var CABLE_BUNDLE = {
    /**
     * Separación lateral (px) entre cables consecutivos de un mazo.
     * Se aplica a los puntos de control de la Bézier; el centro de
     * la curva recibe ~0.75× ese desplazamiento, que con stroke de
     * 4px mantiene los cables del mazo casi tocándose en el centro.
     */
    SPREAD: 10
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
  var TOOLTIP = {
    /** Tecla modificadora que activa el hover-inspect del cable */
    MODIFIER_KEY: "Alt",
    /**
     * Radio (px) alrededor del cursor que cuenta un cable como "hovered".
     * El stroke del cable mide 4px, así que con 8 hay margen cómodo.
     */
    HOVER_RADIUS: 8,
    /** Puntos a muestrear por cable para hallar el más cercano al cursor */
    CURVE_SAMPLES: 20,
    /** Clase CSS del tooltip */
    TOOLTIP_CLASS: "cable-tooltip",
    /** Desplazamiento (px) del tooltip respecto al cursor */
    OFFSET_X: 14,
    OFFSET_Y: 14,
    /** Prefijo del rótulo de slot (ej: "CABLE 04") */
    SLOT_PREFIX: "CABLE"
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
  function renderCableSwatches(currentColor) {
    const normalized = normalizeCableColor(currentColor) || "";
    const resetActive = normalized === "" ? " active" : "";
    let html = `
    <button type="button" class="cable-swatch reset${resetActive}"
      data-key="color" data-value="" title="Default (por tipo de se\xF1al)"
      aria-label="Default cable color"></button>
  `;
    for (const hex of CABLE_PALETTE) {
      const isActive = normalized === hex ? " active" : "";
      html += `
      <button type="button" class="cable-swatch${isActive}"
        data-key="color" data-value="${hex}" style="background: ${hex}"
        title="${hex}" aria-label="Cable color ${hex}"></button>
    `;
    }
    return html;
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

    <div class="control-group">
      <label>CABLE COLOR</label>
      <div class="cable-swatches" data-key="color">
        ${renderCableSwatches(slot.color || "")}
      </div>
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
    container.querySelectorAll(".cable-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        const value = e.currentTarget.dataset.value || "";
        const group = e.currentTarget.closest(".cable-swatches");
        group?.querySelectorAll(".cable-swatch").forEach(
          (s) => s.classList.toggle("active", s === e.currentTarget)
        );
        onSendUpdate(selectedSlot, e.currentTarget.dataset.key, value);
      });
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
        const frontImg = AssetResolver.resolve(m.id, "mockup_front.png") || "";
        const angleImg = AssetResolver.resolve(m.id, "mockup_angle.png") || "";
        const detailImg = AssetResolver.resolve(m.id, "mockup_detail.png") || "";
        this.gallery.innerHTML = `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${frontImg}')"></div>
                    <label>FRONT</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${angleImg}')"></div>
                    <label>ANGLE</label>
                </div>
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${detailImg}')"></div>
                    <label>DETAIL</label>
                </div>
            `;
      } else {
        this.gallery.innerHTML = images.map((img) => {
          const resolved = AssetResolver.resolve(m.id, img) || img;
          return `
                <div class="gallery-item">
                    <div class="gallery-image" style="background-image: url('${resolved}')"></div>
                </div>
            `;
        }).join("");
      }
      const addBtn = document.getElementById("btn-add-module-exec");
      if (addBtn) {
        addBtn.onclick = () => this.addModule(m.id);
      }
    }
    getIconForModule(m) {
      const id = m.id || m.componentId;
      const icons = {
        "osc-analog": "\u{1F50A}",
        "midi-util": "\u{1F3B9}",
        "filter-standard": "\u{1F30A}",
        "env-standard": "\u{1F4D0}"
      };
      const emoji = icons[m.icon] || "\u{1F4E6}";
      const illustrationPath = AssetResolver.resolve(id, "illustration.svg") || "";
      return `<img src="${illustrationPath}" class="card-illustration" alt="${m.name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
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
        const renderer = window.ManifestRenderer || ManifestRenderer;
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
          dismissLoaderOverlay(modCard);
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

  // src/Components/GlobalFxStrip.ts
  var GLOBAL_FX_PARAM_META = [
    { id: "200", label: "MIX", max: 1 },
    { id: "201", label: "FEEDBACK", max: 1 },
    { id: "202", label: "TIME", max: 1 },
    { id: "203", label: "SPEED", max: 1 },
    { id: "204", label: "INTENSITY", max: 1 }
  ];
  function readGlobalFxParams(patch) {
    if (!patch || typeof patch !== "object") return {};
    const fx = patch.globalFxParams;
    if (!fx || typeof fx !== "object") return {};
    const out = {};
    for (const [key, val] of Object.entries(fx)) {
      if (typeof val === "number" && Number.isFinite(val)) out[key] = val;
    }
    return out;
  }
  function formatFxValue(value) {
    return `${Math.round((value || 0) * 100)}%`;
  }
  var GlobalFxStrip = class {
    el = null;
    unsubscribe = null;
    lastRendered = {};
    constructor() {
    }
    init() {
      this.el = document.getElementById("global-fx-strip");
      if (!this.el) {
        OmegaLog.warn("GLOBALFX", "#global-fx-strip container not found; strip disabled.");
        return;
      }
      const store = window.runtimeStore;
      if (store?.subscribe) {
        this.unsubscribe = store.subscribe(() => this.syncFromStore());
      }
      this.render();
      this.syncFromStore();
    }
    destroy() {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      this.el = null;
    }
    render() {
      if (!this.el) return;
      const rows = GLOBAL_FX_PARAM_META.map(
        (meta) => `
            <div class="global-fx-param" data-fx-id="${meta.id}">
                <span class="global-fx-label">${meta.label}</span>
                <input type="range" class="global-fx-slider" data-fx-id="${meta.id}"
                       min="0" max="${meta.max}" step="0.01" value="0" />
                <span class="global-fx-value" data-fx-id="${meta.id}">0%</span>
            </div>`
      ).join("");
      this.el.innerHTML = `
            <div class="global-fx-strip">
                <div class="global-fx-title">GLOBAL FX</div>
                ${rows}
            </div>`;
      this.el.querySelectorAll(".global-fx-slider").forEach((slider) => {
        slider.addEventListener("input", () => {
          const id = slider.dataset.fxId || "";
          const value = Number(slider.value) || 0;
          const valLabel = this.el?.querySelector(`.global-fx-value[data-fx-id="${id}"]`);
          if (valLabel) valLabel.textContent = formatFxValue(value);
          window.rpcCommandDispatcher?.dispatch({
            type: "setParameter",
            payload: { target: `globalFx.${id}`, value }
          });
        });
      });
    }
    syncFromStore() {
      if (!this.el) return;
      const store = window.runtimeStore;
      const snapshot = store?.getSnapshot?.();
      const params = readGlobalFxParams(snapshot?.patch);
      const unchanged = GLOBAL_FX_PARAM_META.every(
        (meta) => (this.lastRendered[meta.id] ?? 0) === (params[meta.id] ?? 0)
      );
      if (unchanged && Object.keys(this.lastRendered).length > 0) return;
      this.lastRendered = { ...params };
      GLOBAL_FX_PARAM_META.forEach((meta) => {
        const value = params[meta.id] ?? 0;
        const slider = this.el?.querySelector(
          `.global-fx-slider[data-fx-id="${meta.id}"]`
        );
        const valLabel = this.el?.querySelector(`.global-fx-value[data-fx-id="${meta.id}"]`);
        if (slider) slider.value = String(value);
        if (valLabel) valLabel.textContent = formatFxValue(value);
      });
      OmegaLog.debug("GLOBALFX", `Synced global FX params:`, params);
    }
  };

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
    /**
     * Parámetros FX globales del patch actual (Era 7.2.3).
     * Keyed por id-string del ParamId (p. ej. "200") -> valor 0..1.
     */
    getGlobalFxParams() {
      return this.state.patch?.globalFxParams || {};
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
    /**
     * Mapea el `family` crudo (canónico en modules/) a una de las categorías
     * que filtra el ModuleBrowser (OSC/FLT/ENV/AMP/MOD/IO/UTILITY).
     */
    categoryForFamily(family) {
      const known = {
        "osc": "OSC",
        "oscillator": "OSC",
        "vco": "OSC",
        "flt": "FLT",
        "filter": "FLT",
        "vcf": "FLT",
        "env": "ENV",
        "envelope": "ENV",
        "adsr": "ENV",
        "amp": "AMP",
        "vca": "AMP",
        "mod": "MOD",
        "lfo": "MOD",
        "io": "IO",
        "midi": "IO",
        "control": "IO",
        "utility": "UTILITY"
      };
      const f = (family || "").toLowerCase();
      return known[f] || "UTILITY";
    }
    /**
     * Catálogo web standalone derivado de ACEMM_CATALOG (fuente única):
     * canónicos desde modules/ (generado en build) + legacy planos. NO es una
     * lista hardcodeada: cualquier módulo nuevo en modules/ aparece aquí solo
     * con regenerar el catálogo.
     */
    populateWebFallbackCatalog() {
      const items = Object.values(ACEMM_CATALOG).map((entry) => {
        const family = entry.metadata?.family || entry.family || "utility";
        return {
          id: entry.id,
          name: entry.metadata?.name || entry.name || entry.id.toUpperCase(),
          description: entry.metadata?.description || entry.description,
          category: this.categoryForFamily(family),
          family: String(family).toUpperCase(),
          hp: Number(entry.metadata?.rack?.hp ?? entry.rack?.hp) || 8
        };
      });
      this.items.clear();
      items.forEach((item) => {
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
      "deletePreset",
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
  function computeBundleSpread(ep, position, groupSize) {
    const dx = ep.x2 - ep.x1;
    const dy = ep.y2 - ep.y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const offset = (position - (groupSize - 1) / 2) * CABLE_BUNDLE.SPREAD;
    return { x: nx * offset, y: ny * offset };
  }
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
     * `bundle` (opcional, §9 mazo) desplaza ambos puntos de control
     * perpendicularmente al eje para que cables del mismo par de módulos
     * corran paralelos. Ambos offsets se suman.
     */
    static calculatePath(ep, deform, bundle) {
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
      const offX = (deform?.x ?? 0) + (bundle?.x ?? 0);
      const offY = (deform?.y ?? 0) + (bundle?.y ?? 0);
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
    static createCablePath(slotIndex, endpoints, signalType, color) {
      const svg = document.getElementById("patch-cables-overlay");
      if (!svg) throw new Error("[CableRenderer] SVG overlay #patch-cables-overlay not found");
      const path = document.createElementNS(SVG_NS, "path");
      path.classList.add("patch-cable", "entering");
      path.setAttribute("data-slot", String(slotIndex));
      path.setAttribute("data-signal", signalType);
      path.setAttribute("d", _CableRenderer.calculatePath(endpoints));
      if (color) path.style.stroke = color;
      svg.appendChild(path);
      setTimeout(() => path.classList.remove("entering"), 600);
      return path;
    }
    /**
     * Aplica (o quita) el color personalizado de un cable ya existente.
     * `color = null` borra el override inline y vuelve al CSS [data-signal].
     */
    static setCableColor(path, color) {
      if (color) {
        path.style.stroke = color;
      } else {
        path.style.removeProperty("stroke");
      }
    }
    /**
     * Actualiza la posición de un cable existente.
     * Se llama al hacer scroll, resize o mover módulos.
     * `deform` opcional: desplazamiento de repulsión (se preserva en redraws).
     * `bundle` opcional: offset lateral del mazo (§9) (se preserva en redraws).
     */
    static updateCablePath(path, endpoints, deform, bundle) {
      path.setAttribute("d", _CableRenderer.calculatePath(endpoints, deform, bundle));
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
    /**
     * Recolorea los plugs de un cable existente (fill). Se usa cuando
     * el color personalizado del slot cambia (§9 Color Picker).
     */
    static setPlugsColor(group, color) {
      group.querySelectorAll("circle").forEach((plug) => plug.setAttribute("fill", color));
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
  function closestDistanceToPath(path, cursorX, cursorY) {
    let totalLength;
    try {
      totalLength = path.getTotalLength();
    } catch {
      return null;
    }
    if (!totalLength || !Number.isFinite(totalLength) || totalLength <= 0) return null;
    let min = Infinity;
    const samples = TOOLTIP.CURVE_SAMPLES;
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength(i / samples * totalLength);
      const d = Math.hypot(p.x - cursorX, p.y - cursorY);
      if (d < min) min = d;
    }
    return min;
  }
  function findCableAtPoint(manager2, cursorX, cursorY) {
    let best = null;
    for (const { slotIndex, pathElement } of manager2.getActiveCablePaths()) {
      const distance = closestDistanceToPath(pathElement, cursorX, cursorY);
      if (distance === null || distance > TOOLTIP.HOVER_RADIUS) continue;
      if (!best || distance < best.distance) {
        best = { slotIndex, pathElement, distance };
      }
    }
    return best;
  }
  function buildPortNameMap() {
    const sourceNames = /* @__PURE__ */ new Map();
    const targetNames = /* @__PURE__ */ new Map();
    const win2 = window;
    try {
      const items = win2.inventoryStore?.getAllItems?.() || [];
      const { sources, targets } = buildMetadataFromInventory(
        items,
        win2.runtimeStore?.getSnapshot?.()
      );
      for (const item of sources) sourceNames.set(item.id, item.name);
      for (const item of targets) targetNames.set(item.id, item.name);
    } catch (err) {
      OmegaLog.warn("CABLES", "buildPortNameMap() failed:", err);
    }
    return { sourceNames, targetNames };
  }
  function setupCableTooltip(manager2) {
    const rack = document.getElementById("omega-rack");
    if (!rack) return { dispose: () => {
    } };
    let altDown = false;
    let disposed = false;
    let tooltip = null;
    let currentSlot = null;
    let lastClientX = 0;
    let lastClientY = 0;
    const ensureTooltip = () => {
      if (tooltip) return tooltip;
      tooltip = document.createElement("div");
      tooltip.className = TOOLTIP.TOOLTIP_CLASS;
      tooltip.setAttribute("role", "tooltip");
      document.body.appendChild(tooltip);
      return tooltip;
    };
    const hide = () => {
      currentSlot = null;
      if (tooltip) tooltip.style.display = "none";
    };
    const position = (el, clientX, clientY) => {
      el.style.left = `${clientX + TOOLTIP.OFFSET_X}px`;
      el.style.top = `${clientY + TOOLTIP.OFFSET_Y}px`;
    };
    const updateTooltip = (clientX, clientY) => {
      if (disposed) return;
      lastClientX = clientX;
      lastClientY = clientY;
      if (!altDown) {
        hide();
        return;
      }
      const rect = rack.getBoundingClientRect();
      const hit = findCableAtPoint(manager2, clientX - rect.left, clientY - rect.top);
      if (!hit) {
        hide();
        return;
      }
      if (hit.slotIndex === currentSlot) {
        if (tooltip) position(tooltip, clientX, clientY);
        return;
      }
      const slot = manager2.getSlotData(hit.slotIndex);
      if (!slot) {
        hide();
        return;
      }
      currentSlot = hit.slotIndex;
      const names = buildPortNameMap();
      const el = ensureTooltip();
      el.innerHTML = `
            <div class="cable-tooltip-title">${TOOLTIP.SLOT_PREFIX} ${String(hit.slotIndex + 1).padStart(2, "0")}</div>
            <div class="cable-tooltip-route">
                <span class="cable-tooltip-port cable-tooltip-source"></span>
                <span class="cable-tooltip-arrow">\u2192</span>
                <span class="cable-tooltip-port cable-tooltip-target"></span>
            </div>
            <div class="cable-tooltip-meta">
                <span class="cable-tooltip-signal"></span>
                <span class="cable-tooltip-amount"></span>
            </div>
        `;
      el.querySelector(".cable-tooltip-source").textContent = names.sourceNames.get(slot.source) || slot.source;
      el.querySelector(".cable-tooltip-target").textContent = names.targetNames.get(slot.target) || slot.target;
      el.querySelector(".cable-tooltip-signal").textContent = String(hit.pathElement.getAttribute("data-signal") || "cv").toUpperCase();
      el.querySelector(".cable-tooltip-amount").textContent = `\xD7${slot.amount.toFixed(2)}`;
      el.style.display = "block";
      position(el, clientX, clientY);
    };
    const onKeyDown = (e) => {
      if (e.key === "Alt") {
        altDown = true;
        updateTooltip(lastClientX, lastClientY);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "Alt") {
        altDown = false;
        hide();
      }
    };
    const onBlur = () => {
      altDown = false;
      hide();
    };
    const onMouseMove = (e) => {
      if (disposed) return;
      updateTooltip(e.clientX, e.clientY);
    };
    const onMouseLeave = () => hide();
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    rack.addEventListener("mousemove", onMouseMove, { passive: true });
    rack.addEventListener("mouseleave", onMouseLeave);
    return {
      dispose: () => {
        disposed = true;
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", onBlur);
        rack.removeEventListener("mousemove", onMouseMove);
        rack.removeEventListener("mouseleave", onMouseLeave);
        tooltip?.remove();
        tooltip = null;
        currentSlot = null;
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
    disposeCableTooltip = null;
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
      this.disposeCableTooltip = setupCableTooltip(this);
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
        this.disposeDragToPatch.dispose();
        this.disposeDragToPatch = null;
      }
      if (this.disposeCableTooltip) {
        this.disposeCableTooltip.dispose();
        this.disposeCableTooltip = null;
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
        const signalType = this.signalTypeResolver.getSignalType(slot.source);
        const customColor = normalizeCableColor(slot.color);
        const resolvedColor = resolveCableColor(customColor, signalType);
        const existing = this.activeCables.get(index);
        const routeChanged = existing && (existing.sourceId !== slot.source || existing.targetId !== slot.target);
        if (existing && !routeChanged) {
          existing.base = endpoints;
          this.updateCablePathWithOffsets(existing);
          if (existing.plugsElement) {
            CableRenderer.updatePlugs(existing.plugsElement, endpoints);
          }
          this.applyCableColor(existing, signalType, slot.color);
        } else {
          if (existing && routeChanged) {
            this.removeCableAt(index);
          }
          const pathElement = CableRenderer.createCablePath(
            index,
            endpoints,
            signalType,
            customColor ?? void 0
          );
          if (INTERACTION.SIGNAL_PULSE) {
            setTimeout(() => pathElement.classList.add("signal-active"), 600);
          }
          const plugsElement = CableRenderer.createPlugs(
            sourcePos.x,
            sourcePos.y,
            targetPos.x,
            targetPos.y,
            resolvedColor
          );
          this.activeCables.set(index, {
            slotIndex: index,
            sourceId: slot.source,
            targetId: slot.target,
            signalType,
            pathElement,
            plugsElement,
            color: customColor,
            base: endpoints,
            deform: null,
            bundle: null
          });
        }
      });
      for (const [slotIndex, cable] of this.activeCables) {
        if (!activeSlotIndices.has(slotIndex)) {
          this.removeCableAt(slotIndex, cable);
        }
      }
      this.applyCableBundles();
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
    /* ── Fase 5 (§8.2): API pública del tooltip del cable ── */
    /**
     * Datos de un slot activo para el tooltip: source, target, multiplicador
     * (amount) y estado. Devuelve null si el slot no existe o no está activo.
     * El amount se normaliza a número (el backend puede emitir string).
     */
    getSlotData(slotIndex) {
      const slot = this.readMatrix()[slotIndex];
      if (!slot) return null;
      const isActive = slot?.active === true || slot?.active === 1 || slot?.active === "true";
      if (!isActive) return null;
      const amount = Number(slot.amount);
      return {
        source: String(slot.source || ""),
        target: String(slot.target || ""),
        amount: Number.isFinite(amount) ? amount : 1,
        active: true
      };
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
      this.updateCablePathWithOffsets(cable);
    }
    /** Restaura todos los cables a su forma base (cursor fuera del rack). */
    resetAllDeforms() {
      for (const cable of this.activeCables.values()) {
        if (!cable.deform) continue;
        cable.deform = null;
        this.updateCablePathWithOffsets(cable);
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
    /**
     * Aplica el color a un cable existente (path + plugs).
     * El stroke inline solo se escribe cuando hay color personalizado válido;
     * en caso contrario se limpia para que el CSS [data-signal] mande.
     * Los plugs siempre reciben el fill resuelto. No-op si nada cambió.
     */
    applyCableColor(cable, signalType, slotColor) {
      const customColor = normalizeCableColor(slotColor);
      if (cable.color === customColor && cable.signalType === signalType) return;
      cable.color = customColor;
      cable.signalType = signalType;
      CableRenderer.setCableColor(cable.pathElement, customColor);
      if (cable.plugsElement) {
        CableRenderer.setPlugsColor(
          cable.plugsElement,
          resolveCableColor(customColor, signalType)
        );
      }
    }
    /**
     * Redibuja el path de un cable con TODOS sus offsets: repulsión (§7.3)
     * + mazo (§9). Los plugs NO se ven afectados por el mazo (cada cable
     * sigue enchufado a su jack).
     */
    updateCablePathWithOffsets(cable) {
      CableRenderer.updateCablePath(
        cable.pathElement,
        cable.base,
        cable.deform ?? void 0,
        cable.bundle ?? void 0
      );
    }
    /** instanceId de un qualifiedId ("1.saw_out" → "1"). */
    instanceOf(id) {
      const dot = id.indexOf(".");
      return dot >= 0 ? id.slice(0, dot) : id;
    }
    /** Clave de agrupación del mazo: par de módulos (sin orden). */
    cableGroupKey(cable) {
      const a = this.instanceOf(cable.sourceId);
      const b = this.instanceOf(cable.targetId);
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    }
    /**
     * Agrupa los cables por par de módulos y asigna el offset lateral del
     * mazo (§9). Los cables que comparten módulos reciben un spread
     * perpendicular al eje; los que van sueltos se limpian. Solo se
     * redibuja el cable si su offset cambió (evita escribir el SVG siempre).
     */
    applyCableBundles() {
      const groups = /* @__PURE__ */ new Map();
      for (const cable of this.activeCables.values()) {
        const key = this.cableGroupKey(cable);
        const list = groups.get(key) ?? [];
        list.push(cable);
        groups.set(key, list);
      }
      for (const group of groups.values()) {
        if (group.length < 2) {
          for (const cable of group) this.setCableBundle(cable, null);
          continue;
        }
        group.sort((a, b) => a.slotIndex - b.slotIndex);
        group.forEach((cable, position) => {
          this.setCableBundle(
            cable,
            computeBundleSpread(cable.base, position, group.length)
          );
        });
      }
    }
    /** Asigna (o limpia) el offset del mazo y redibuja solo si cambió. */
    setCableBundle(cable, spread) {
      const unchanged = (cable.bundle?.x ?? null) === (spread?.x ?? null) && (cable.bundle?.y ?? null) === (spread?.y ?? null);
      if (unchanged) return;
      cable.bundle = spread;
      this.updateCablePathWithOffsets(cable);
    }
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
          if (cable.plugsElement) {
            CableRenderer.updatePlugs(cable.plugsElement, endpoints);
          }
        }
      }
      this.applyCableBundles();
      for (const [, cable] of this.activeCables) {
        this.updateCablePathWithOffsets(cable);
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
  win.GlobalFxStrip = GlobalFxStrip;
  win.RuntimeEventHub = RuntimeEventHub;
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
    const buildId = "DEV";
    OmegaLog.info("BOOT", `Booting Era 7 Aseptic UI [BUILD #${buildId}]`);
    try {
      Preferences.init();
      PresetBrowser.init();
      const matrixHub = new ModulePatchbayMatrix();
      win.patchbayHub = matrixHub;
      const globalFxStrip = new GlobalFxStrip();
      globalFxStrip.init();
      win.globalFxStrip = globalFxStrip;
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
              const rpcCmd = action === "new_preset" ? "newPreset" : "savePreset";
              try {
                rpcCommandDispatcher.dispatch({ type: rpcCmd, payload: { name: nameClean } });
              } catch (e) {
              }
              OmegaLog.info("PRESET", `Preset '${nameClean}' guardado y activado.`);
              alert(`\xA1Preset '${nameClean}' listo!

Ahora puedes usar 'Add Module...' en el men\xFA EDIT para agregar m\xF3dulos al rack.`);
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
