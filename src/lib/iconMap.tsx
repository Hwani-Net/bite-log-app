/**
 * Material Symbols → Lucide-React icon mapping utility.
 * Used during gradual migration from Material Symbols to Lucide.
 * Dynamic icon names (from API responses) can use this mapper.
 */
import {
  Home,
  Bell,
  Search,
  Settings,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Plus,
  Minus,
  X,
  Check,
  Filter,
  Share2,
  Camera,
  Mic,
  MapPin,
  Calendar,
  Timer,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Fish,
  Trophy,
  Star,
  Heart,
  Bookmark,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Radar,
  Navigation,
  Anchor,
  Compass,
  Ruler,
  Shield,
  Info,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Copy,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  User,
  Users,
  MessageCircle,
  Send,
  Inbox,
  Flame,
  Newspaper,
  Globe,
  Waves,
  Trash2,
  Lock,
  Lightbulb,
  Palette,
  Languages,
  Link2,
  SearchCheck,
  ListChecks,
  Backpack,
  ShoppingBag,
  PenLine,
  Bot,
  Loader2,
  Armchair,
  ShieldAlert,
  ScanText,
  CheckCircle,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  // Navigation
  home: Home,
  arrow_back: ArrowLeft,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  close: X,
  add: Plus,
  remove: Minus,
  check: Check,
  search: Search,
  filter_list: Filter,
  settings: Settings,

  // Actions
  notifications: Bell,
  share: Share2,
  camera_alt: Camera,
  mic: Mic,
  bookmark: Bookmark,
  favorite: Heart,
  visibility: Eye,
  visibility_off: EyeOff,
  content_copy: Copy,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  undo: RotateCcw,
  open_in_new: ExternalLink,
  send: Send,

  // Weather & Environment
  thermostat: Thermometer,
  air: Wind,
  water_drop: Droplets,
  wb_sunny: Sun,
  dark_mode: Moon,
  cloud: Cloud,
  rainy: CloudRain,
  waves: Waves,

  // Fishing
  set_meal: Fish,
  phishing: Fish,
  auto_awesome: Sparkles,
  emoji_events: Trophy,
  star: Star,
  radar: Radar,
  navigation: Navigation,
  anchor: Anchor,
  explore: Compass,
  straighten: Ruler,
  shield: Shield,
  local_fire_department: Flame,

  // Data
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  bar_chart: BarChart3,
  pie_chart: PieChart,
  analytics: BarChart3,
  insights: TrendingUp,

  // Location & Time
  location_on: MapPin,
  calendar_today: Calendar,
  timer: Timer,
  schedule: Clock,
  satellite_alt: Globe,
  public: Globe,

  // People & Social
  person: User,
  group: Users,
  chat: MessageCircle,
  forum: MessageCircle,
  inbox: Inbox,
  newspaper: Newspaper,

  // Info
  info: Info,
  warning: AlertTriangle,
  help: HelpCircle,

  // Actions (additional)
  delete: Trash2,
  lock: Lock,
  lightbulb: Lightbulb,
  calendar_month: Calendar,
  edit_note: PenLine,
  palette: Palette,
  language: Languages,
  link: Link2,
  manage_search: SearchCheck,
  checklist: ListChecks,
  backpack: Backpack,
  shopping_bag: ShoppingBag,
  smart_toy: Bot,
  progress_activity: Loader2,
  event_seat: Armchair,
  gpp_maybe: ShieldAlert,
  document_scanner: ScanText,
  check_circle: CheckCircle,
  error: CircleAlert,
};

/**
 * Get a Lucide icon component by Material Symbols name.
 * Falls back to Info icon if not mapped.
 */
export function getLucideIcon(materialName: string): LucideIcon {
  return iconMap[materialName] ?? Info;
}

/**
 * Render a Lucide icon from a Material Symbols name string.
 * Drop-in replacement for <span className="material-symbols-outlined">{name}</span>
 */
export function DynamicIcon({
  name,
  size = 16,
  className = "",
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = getLucideIcon(name);
  return <Icon size={size} className={className} {...props} />;
}
