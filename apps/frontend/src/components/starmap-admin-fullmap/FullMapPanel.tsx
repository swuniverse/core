import { OverlayToggles } from './OverlayToggles';
import { ToolSelector } from './ToolSelector';
import { ValuePanel } from './ValuePanel';
import { FieldDetails } from './FieldDetails';

export function FullMapPanel() {
  return (
    <aside className="overflow-auto border border-swu-border bg-[#0d121c] p-2 space-y-3 min-w-0 max-md:max-h-[50vh]">
      <div className="sticky top-0 z-10 -mx-2 -mt-2 border-b border-swu-border bg-[#0d121c] p-2 shadow-[0_6px_10px_rgba(0,0,0,0.2)]">
        <FieldDetails />
      </div>
      <OverlayToggles />
      <ToolSelector />
      <ValuePanel />
    </aside>
  );
}
