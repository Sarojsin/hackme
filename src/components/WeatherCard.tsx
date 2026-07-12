import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, MapPin } from 'lucide-react';
import type { WeatherData } from '../types';

interface Props {
  weather: WeatherData;
}

const conditionIcon: Record<WeatherData['condition'], { icon: typeof Sun; label: string }> = {
  sunny: { icon: Sun, label: 'Sunny' },
  partly_cloudy: { icon: Cloud, label: 'Partly Cloudy' },
  cloudy: { icon: Cloud, label: 'Cloudy' },
  rainy: { icon: CloudRain, label: 'Rainy' },
  stormy: { icon: CloudLightning, label: 'Stormy' },
  snowy: { icon: CloudSnow, label: 'Snowy' },
  foggy: { icon: CloudFog, label: 'Foggy' },
};

export default function WeatherCard({ weather }: Props) {
  const info = conditionIcon[weather.condition] ?? conditionIcon.sunny;
  const Icon = info.icon;

  return (
    <div className="glass-surface rounded-xl p-4 mt-3 animate-slide-in-right">
      {/* Location */}
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin size={13} className="text-foreground/40" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
          {weather.city}
        </span>
      </div>

      {/* Main weather */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Icon size={36} className="text-accent" />
          <span className="text-3xl font-light text-foreground">
            {weather.temperature}°
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground/80">{info.label}</span>
          <span className="text-xs text-foreground/40">
            H: {weather.high}° &middot; L: {weather.low}°
          </span>
          <span className="text-xs text-foreground/40">
            Humidity: {weather.humidity}%
          </span>
        </div>
      </div>
    </div>
  );
}