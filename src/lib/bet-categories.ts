import { Users, Clock, Mic, CakeSlice, Gift, Heart, Music, Camera, GlassWater, Mail, Sun, CloudRain } from 'lucide-react';

export const iconMap: { [key: string]: React.ElementType } = {
  Clock,
  CakeSlice,
  Mic,
  Users,
  Gift,
  Heart,
  Music,
  Camera,
  GlassWater,
  Mail,
  Sun,
  CloudRain,
};

export const iconOptions = [
    { value: 'Users', label: 'People', icon: Users },
    { value: 'Clock', label: 'Time', icon: Clock },
    { value: 'Mic', label: 'Speeches', icon: Mic },
    { value: 'CakeSlice', label: 'Cake', icon: CakeSlice },
    { value: 'Gift', label: 'Gifts', icon: Gift },
    { value: 'Heart', label: 'Love', icon: Heart },
    { value: 'Music', label: 'Music', icon: Music },
    { value: 'Camera', label: 'Photos', icon: Camera },
    { value: 'GlassWater', label: 'Drinks', icon: GlassWater },
    { value: 'Mail', label: 'Invitations', icon: Mail },
    { value: 'Sun', label: 'Weather (Sun)', icon: Sun },
    { value: 'CloudRain', label: 'Weather (Rain)', icon: CloudRain },
];
