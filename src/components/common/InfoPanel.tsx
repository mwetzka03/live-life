interface InfoPanelProps {
  items: string[];
  className?: string;
}

export function InfoPanel({ items, className = '' }: InfoPanelProps) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return null;

  return (
    <div className={`ll-info-panel${className ? ` ${className}` : ''}`}>
      <ul>
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
