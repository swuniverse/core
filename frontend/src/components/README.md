# HoloNet RPG Plot UI Components

Imperial Command Terminal styled components for HoloNet RPG plot management in Star Wars Universe.

## Components

### 1. PlotSelector
A sophisticated dropdown for selecting RPG plots with Imperial terminal aesthetics.

```tsx
import PlotSelector from './PlotSelector';

<PlotSelector
  selectedPlotId={selectedPlotId}
  onPlotSelect={setSelectedPlotId}
  onCreatePlotClick={() => setShowCreateModal(true)}
  className="w-full"
/>
```

**Features:**
- Custom styled dropdown (not native select)
- Loads plots dynamically when opened
- Create new plot integration
- Click-outside closing
- Loading and error states
- Imperial Command Terminal styling

### 2. PlotCreationModal
Comprehensive modal for creating new RPG plots with member management.

```tsx
import PlotCreationModal from './PlotCreationModal';

<PlotCreationModal
  isOpen={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  onPlotCreated={(newPlot) => {
    // Handle new plot creation
    setSelectedPlotId(newPlot.id);
  }}
/>
```

**Features:**
- Plot title and description fields
- Player search and member selection
- Form validation
- Loading states
- Error handling
- Sophisticated Imperial military interface styling

### 3. PlotBadge
Versatile badge component with multiple variants for different contexts.

```tsx
import { InlinePlotBadge, CompactPlotBadge, DetailedPlotBadge } from './PlotBadge';

// For inline use in messages (replaces existing hardcoded badge)
<InlinePlotBadge plot={message.plot} />

// For compact lists
<CompactPlotBadge
  plot={plot}
  onClick={() => selectPlot(plot.id)}
  showStats={true}
/>

// For detailed management interfaces
<DetailedPlotBadge
  plot={plot}
  onClick={() => viewPlot(plot.id)}
  showStats={true}
/>
```

**Variants:**
- `inline` - Maintains existing message badge appearance
- `compact` - For lists and tight spaces
- `default` - Standard badge size
- `detailed` - Card-like display with full information

## Integration Example

See `HoloNetPlotManager.tsx` for a complete integration example showing all components working together.

## Design Principles

These components follow the Imperial Command Terminal aesthetic established in the Star Wars Universe game:

- **Color Palette**: Purple/violet gradients for RPG elements, cyan for general UI
- **Typography**: Monospace fonts with letter tracking, uppercase labels
- **Backgrounds**: Gradient backgrounds with backdrop blur effects
- **Borders**: Subtle borders with proper opacity
- **Interactions**: Smooth transitions, proper hover states
- **Layout**: 4px grid system, symmetrical padding

## Existing Dashboard Integration

The Dashboard has been updated to use the new `InlinePlotBadge` component, replacing the previous hardcoded badge implementation while maintaining the exact same appearance.

## API Integration

Components integrate with existing HoloNet API endpoints:
- `GET /api/holonet/plots` - Load available plots
- `POST /api/holonet/plots` - Create new plot
- `GET /api/player/search` - Search players for plot members

## Usage Notes

1. **PlotSelector** automatically loads plots when opened for performance
2. **PlotCreationModal** handles form validation and API integration
3. **PlotBadge** supports both static display and interactive modes
4. All components use consistent Imperial Command Terminal styling
5. Error handling and loading states are built into each component

## Future Enhancements

- Plot member management interface
- Plot status controls (activate/deactivate)
- Message filtering by plot
- Plot analytics and statistics
- Enhanced player search with faction filtering