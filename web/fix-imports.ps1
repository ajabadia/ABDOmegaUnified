$filesWithManifestEntity = @(
  "src\features\manifest-editor\components\primitives\Knob.tsx",
  "src\features\manifest-editor\components\primitives\KnobPrimitive.tsx",
  "src\features\manifest-editor\components\primitives\Label.tsx",
  "src\features\manifest-editor\components\primitives\Led.tsx",
  "src\features\manifest-editor\components\primitives\Port.tsx",
  "src\features\manifest-editor\components\primitives\PrimitiveFactory.tsx",
  "src\features\manifest-editor\components\primitives\Select.tsx",
  "src\features\manifest-editor\components\primitives\SignalScope.tsx",
  "src\features\manifest-editor\components\primitives\Slider.tsx",
  "src\features\manifest-editor\components\primitives\Stepper.tsx",
  "src\features\manifest-editor\components\primitives\Switch.tsx",
  "src\features\manifest-editor\components\primitives\Terminal.tsx",
  "src\features\manifest-editor\components\rack\ModulationCables.tsx",
  "src\features\manifest-editor\components\rack\RackHUD.tsx",
  "src\features\manifest-editor\components\rack\RackScrews.tsx",
  "src\features\manifest-editor\components\inspector\shared\StyleEditorModal.tsx"
)

foreach ($file in $filesWithManifestEntity) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace "import \{ OMEGA_Manifest, ManifestEntity \}", "import type { OMEGA_Manifest, ManifestEntity }"
    $content = $content -replace "import \{ ManifestEntity, OMEGA_Manifest \}", "import type { ManifestEntity, OMEGA_Manifest }"
    $content = $content -replace "import \{ ManifestEntity \}", "import type { ManifestEntity }"
    $content = $content -replace "import \{ OMEGA_Manifest \}", "import type { OMEGA_Manifest }"
    $content = $content -replace "import \{ OMEGA_Manifest, ManifestEntity, StyleVariant, LayoutContainer, OmegaStyleNode \}", "import type { OMEGA_Manifest, ManifestEntity, StyleVariant, LayoutContainer, OmegaStyleNode }"
    $content = $content -replace "import \{ OMEGA_Manifest, ManifestEntity, TabName \}", "import type { OMEGA_Manifest, ManifestEntity, TabName }"
    $content = $content -replace "import \{ ManifestEntity, TabName \}", "import type { ManifestEntity, TabName }"
    Set-Content $file -Value $content -NoNewline
  }
}

$filesWithOthers = @(
  "src\features\manifest-editor\components\inspector\shared\aesthetic\SequenceAnatomyInspector.tsx",
  "src\features\manifest-editor\components\inspector\shared\aesthetic\SequenceGovernance.tsx",
  "src\features\manifest-editor\components\inspector\shared\EmptyState.tsx",
  "src\features\manifest-editor\components\inspector\shared\FontSelector.tsx",
  "src\features\manifest-editor\components\inspector\shared\IndustrialButton.tsx",
  "src\features\manifest-editor\components\inspector\shared\InfoBlock.tsx",
  "src\features\manifest-editor\components\inspector\shared\SmartColorPicker.tsx",
  "src\features\manifest-editor\components\inspector\shared\TabSelector.tsx",
  "src\features\manifest-editor\components\layout\ModuleHub.tsx",
  "src\features\manifest-editor\components\layout\MultiTabHeader.tsx",
  "src\features\manifest-editor\components\layout\WorkbenchSidebar.tsx",
  "src\features\manifest-editor\components\modulation\ModulationCell.tsx",
  "src\features\manifest-editor\components\modulation\ModulationGrid.tsx",
  "src\features\manifest-editor\components\primitives\IndustrialField.tsx",
  "src\features\manifest-editor\components\rack\SignalInjector.tsx",
  "src\features\manifest-editor\components\shared\ComplianceBadge.tsx",
  "src\features\manifest-editor\components\viewport\SourceViewer.tsx",
  "src\features\manifest-editor\components\views\SourceView.tsx"
)

foreach ($file in $filesWithOthers) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace "import \{ OmegaStyleNode \}", "import type { OmegaStyleNode }"
    $content = $content -replace "import \{ LucideIcon \}", "import type { LucideIcon }"
    $content = $content -replace "import \{ OMEGA_Manifest \}", "import type { OMEGA_Manifest }"
    $content = $content -replace "import \{ Info, LucideIcon \}", "import { Info, type LucideIcon }"
    $content = $content -replace "import \{ TabName \}", "import type { TabName }"
    $content = $content -replace "import \{ OmegaContract \}", "import type { OmegaContract }"
    $content = $content -replace "import \{ X, LucideIcon \}", "import { X, type LucideIcon }"
    $content = $content -replace "import \{ WorkbenchTab, WorkbenchPaneId \}", "import type { WorkbenchTab, WorkbenchPaneId }"
    $content = $content -replace "import \{ Diagnostic \}", "import type { Diagnostic }"
    $content = $content -replace "import \{ OMEGA_Modulation \}", "import type { OMEGA_Modulation }"
    $content = $content -replace "import \{ OMEGA_Manifest, OMEGA_Modulation \}", "import type { OMEGA_Manifest, OMEGA_Modulation }"
    $content = $content -replace "import \{ Info, Lock, AlertTriangle, LucideIcon \}", "import { Info, Lock, AlertTriangle, type LucideIcon }"
    $content = $content -replace "import \{ inputSignalService, SignalType, VirtualSignal \}", "import { inputSignalService, type SignalType, type VirtualSignal }"
    $content = $content -replace "import \{ AuditResult \}", "import type { AuditResult }"
    $content = $content -replace "import Editor, \{ OnMount \} from '@monaco-editor/react'", "import Editor, { type OnMount } from '@monaco-editor/react'"
    $content = $content -replace "import \{ TabDiagnostics \}", "import type { TabDiagnostics }"
    Set-Content $file -Value $content -NoNewline
  }
}

Write-Host "Verbatim Module Syntax imports fixed!"
