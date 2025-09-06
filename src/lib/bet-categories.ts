import { Heart, GlassWater, CakeSlice, Users, Clock, Mic, Gift, Music, Camera, Mail, Sun, CloudRain } from 'lucide-react';

export const iconMap: { [key: string]: React.ElementType } = {
  Ceremony: Heart,
  Cocktail: GlassWater,
  Reception: CakeSlice,
  // Keep old icons for now to avoid breaking existing bets if any
  Clock,
  Mic,
  Users,
  Gift,
  Heart,
  Music,
  Camera,
  Mail,
  Sun,
  CloudRain,
};

export const iconOptions = [
    { value: 'Ceremony', label: 'Ceremony', icon: Heart },
    { value: 'Cocktail', label: 'Cocktail', icon: GlassWater },
    { value: 'Reception', label: 'Reception', icon: CakeSlice },
];
