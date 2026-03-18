'use client';

interface WeddingCountdownProps {
  weddingDate: string;
}

export default function WeddingCountdown({ weddingDate }: WeddingCountdownProps) {
  const wedding = new Date(weddingDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = wedding.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const getMessage = () => {
    if (daysUntil < 0) return 'Your wedding day has passed!';
    if (daysUntil === 0) return "It's your wedding day!";
    if (daysUntil === 1) return 'Tomorrow is the big day!';
    if (daysUntil < 30) return 'Almost there! How exciting';
    if (daysUntil < 90) return "The home stretch! You've got this";
    if (daysUntil < 180) return 'Time to finalize the details';
    if (daysUntil <= 365) return 'Great time to lock in your key vendors';
    return 'Plenty of time to plan the perfect day';
  };

  if (daysUntil <= 0 && daysUntil !== 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-warm-gray">{getMessage()}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-3xl font-heading font-semibold tracking-tight text-charcoal">{daysUntil}</p>
      <p className="text-sm font-medium text-warm-gray mt-0.5">days to go</p>
      <p className="text-xs text-warm-gray-light mt-1">{getMessage()}</p>
    </div>
  );
}
