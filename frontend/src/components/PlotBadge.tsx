import { FileText, Users, Clock, Eye, AlertCircle } from 'lucide-react';

export interface Plot {
  id: number;
  title: string;
  description?: string;
  isActive?: boolean;
  messageCount?: number;
  creator?: {
    username: string;
    factionName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface PlotBadgeProps {
  plot: Plot;
  variant?: 'default' | 'compact' | 'detailed' | 'inline';
  showIcon?: boolean;
  showStatus?: boolean;
  showStats?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function PlotBadge({
  plot,
  variant = 'default',
  showIcon = true,
  showStatus = false,
  showStats = false,
  onClick,
  className = ''
}: PlotBadgeProps) {
  const isClickable = !!onClick;
  const isInactive = plot.isActive === false;

  // Base classes for all variants
  const baseClasses = `
    inline-flex items-center font-mono tracking-wider transition-all backdrop-blur-sm
    ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''}
    ${isInactive ? 'opacity-60' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Variant-specific styling
  const variantStyles = {
    // Inline badge for messages (existing style)
    inline: `
      gap-1 px-2 py-1 bg-gradient-to-r from-purple-900/40 to-violet-800/30
      border border-purple-500/30 rounded text-xs text-purple-300
      ${isClickable ? 'hover:from-purple-800/50 hover:to-violet-700/40 hover:border-purple-400/40' : ''}
    `,

    // Compact badge for lists
    compact: `
      gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-950/50 to-violet-900/40
      border border-purple-500/40 rounded text-xs text-purple-200
      ${isClickable ? 'hover:from-purple-900/60 hover:to-violet-800/50 hover:border-purple-400/60' : ''}
    `,

    // Default badge
    default: `
      gap-2 px-3 py-2 bg-gradient-to-r from-purple-950/40 to-violet-900/30
      border border-purple-500/40 rounded text-sm text-purple-100
      ${isClickable ? 'hover:from-purple-900/50 hover:to-violet-800/40 hover:border-purple-400/60' : ''}
    `,

    // Detailed badge with more information
    detailed: `
      gap-3 px-4 py-3 bg-gradient-to-br from-slate-950/60 to-purple-950/40
      border border-purple-500/40 rounded-lg text-sm text-purple-100
      ${isClickable ? 'hover:from-slate-900/70 hover:to-purple-900/50 hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-500/10' : ''}
    `
  };

  const Component = isClickable ? 'button' : 'div';

  if (variant === 'detailed') {
    return (
      <Component
        onClick={onClick}
        className={`${baseClasses} ${variantStyles.detailed}`}
        {...(isClickable && { type: 'button' })}
      >
        <div className="flex-shrink-0">
          {showIcon && (
            <div className="p-1.5 bg-purple-900/40 border border-purple-500/40 rounded">
              <FileText size={14} className="text-purple-400" />
            </div>
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-purple-100 truncate">
              {plot.title.toUpperCase()}
            </span>
            {showStatus && isInactive && (
              <div className="flex-shrink-0 p-0.5 bg-orange-900/40 border border-orange-500/40 rounded">
                <AlertCircle size={10} className="text-orange-400" />
              </div>
            )}
          </div>

          {plot.description && (
            <p className="text-xs text-purple-300/70 line-clamp-1 mb-2">
              {plot.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-purple-400/70">
            {plot.creator && (
              <div className="flex items-center gap-1.5">
                <span>{plot.creator.username}</span>
                <span className="px-1.5 py-0.5 bg-purple-900/30 border border-purple-500/30 rounded text-purple-300">
                  {plot.creator.factionName}
                </span>
              </div>
            )}

            {showStats && plot.messageCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users size={10} />
                <span>{plot.messageCount}</span>
              </div>
            )}

            {plot.updatedAt && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>
                  {new Date(plot.updatedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {isClickable && (
          <div className="flex-shrink-0 text-purple-400/60">
            <Eye size={12} />
          </div>
        )}
      </Component>
    );
  }

  // Standard badge variants (inline, compact, default)
  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${variantStyles[variant as keyof typeof variantStyles]}`}
      {...(isClickable && { type: 'button' })}
    >
      {showIcon && (
        <FileText
          size={variant === 'inline' ? 12 : variant === 'compact' ? 13 : 14}
          className="text-purple-400 flex-shrink-0"
        />
      )}

      <span className={`truncate ${variant === 'inline' ? 'max-w-[120px]' : 'max-w-[200px]'}`}>
        {variant === 'inline' ? 'RPG: ' : ''}{plot.title.toUpperCase()}
      </span>

      {showStatus && isInactive && (
        <div className="flex-shrink-0 p-0.5 bg-orange-900/40 border border-orange-500/40 rounded">
          <AlertCircle size={variant === 'inline' ? 8 : 10} className="text-orange-400" />
        </div>
      )}

      {showStats && plot.messageCount !== undefined && (
        <div className="flex items-center gap-1 text-purple-400/60 flex-shrink-0">
          <Users size={variant === 'inline' ? 8 : 10} />
          <span>{plot.messageCount}</span>
        </div>
      )}

      {isClickable && variant !== 'inline' && (
        <div className="flex-shrink-0 text-purple-400/60">
          <Eye size={variant === 'compact' ? 10 : 12} />
        </div>
      )}
    </Component>
  );
}

// Pre-configured component variations for common use cases
export const InlinePlotBadge = ({ plot, onClick, className }: {
  plot: Plot;
  onClick?: () => void;
  className?: string;
}) => (
  <PlotBadge
    plot={plot}
    variant="inline"
    onClick={onClick}
    className={className}
  />
);

export const CompactPlotBadge = ({ plot, onClick, showStats, className }: {
  plot: Plot;
  onClick?: () => void;
  showStats?: boolean;
  className?: string;
}) => (
  <PlotBadge
    plot={plot}
    variant="compact"
    showStats={showStats}
    onClick={onClick}
    className={className}
  />
);

export const DetailedPlotBadge = ({ plot, onClick, showStats = true, className }: {
  plot: Plot;
  onClick?: () => void;
  showStats?: boolean;
  className?: string;
}) => (
  <PlotBadge
    plot={plot}
    variant="detailed"
    showIcon={true}
    showStatus={true}
    showStats={showStats}
    onClick={onClick}
    className={className}
  />
);