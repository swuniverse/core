import { OverlayToggles } from './OverlayToggles';
import { ToolSelector } from './ToolSelector';
import { ValuePanel } from './ValuePanel';
import { FieldDetails } from './FieldDetails';

export function FullMapPanel() {
  return (
    <aside className="overflow-auto border border-swu-border bg-[#0d121c] p-2 space-y-3 min-w-0 max-md:max-h-[50vh]">
      <OverlayToggles />
      <ToolSelector />
      <ValuePanel />
      <FieldDetails />
    </aside>
  );
}
