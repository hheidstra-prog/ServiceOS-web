import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Shield,
  Heart,
  Star,
  Check,
  Rocket,
  Target,
  Users,
  Clock,
  Globe,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Award,
  Lock,
  Eye,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BarChart3,
  Settings,
  Search,
  ArrowRight,
  ThumbsUp,
  Headphones,
  Cpu,
  Layers,
  Puzzle,
  Wrench,
  DollarSign,
  BrainCircuit,
  Leaf,
  Palette,
  Camera,
  Code,
  Database,
  CloudCog,
  ShieldCheck,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  shield: Shield,
  heart: Heart,
  star: Star,
  check: Check,
  rocket: Rocket,
  target: Target,
  users: Users,
  clock: Clock,
  globe: Globe,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  "trending-up": TrendingUp,
  trendingup: TrendingUp,
  award: Award,
  lock: Lock,
  eye: Eye,
  "message-circle": MessageCircle,
  messagecircle: MessageCircle,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  mappin: MapPin,
  calendar: Calendar,
  "bar-chart": BarChart3,
  barchart: BarChart3,
  "bar-chart-3": BarChart3,
  settings: Settings,
  search: Search,
  "arrow-right": ArrowRight,
  arrowright: ArrowRight,
  "thumbs-up": ThumbsUp,
  thumbsup: ThumbsUp,
  headphones: Headphones,
  cpu: Cpu,
  layers: Layers,
  puzzle: Puzzle,
  wrench: Wrench,
  "dollar-sign": DollarSign,
  dollarsign: DollarSign,
  "brain-circuit": BrainCircuit,
  braincircuit: BrainCircuit,
  brain: BrainCircuit,
  leaf: Leaf,
  palette: Palette,
  camera: Camera,
  code: Code,
  database: Database,
  "cloud-cog": CloudCog,
  cloudcog: CloudCog,
  cloud: CloudCog,
  "shield-check": ShieldCheck,
  shieldcheck: ShieldCheck,
};

export function BlockIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name.toLowerCase().trim()];
  if (Icon) return <Icon className={className} />;

  // Fallback: if it looks like an emoji (starts with non-ASCII), render as text
  if (/^\p{Emoji}/u.test(name)) {
    return <span className={className}>{name}</span>;
  }

  // Final fallback: generic icon
  return <Sparkles className={className} />;
}
