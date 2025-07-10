import React from 'react'
import { 
  Music, 
  Sparkles, 
  Star, 
  Heart, 
  Globe, 
  Calendar,
  Download,
  Share2,
  Play,
  Pause,
  Eye,
  Trash2,
  BarChart3,
  LogIn,
  Menu,
  X,
  ArrowRight,
  Copy,
  Plus,
  RefreshCw,
  Clock,
  Award,
  TrendingUp,
  Settings,
  User,
  CreditCard,
  Shield,
  CheckCircle,
  PartyPopper,
  Cake,
  Music2
} from 'lucide-react'

export interface IconProps {
  className?: string
  size?: number
}

// Основные иконки приложения
export const AppIcon = ({ className = "w-6 h-6", size }: IconProps) => (
  <Music className={className} size={size} />
)

export const CreateIcon = ({ className = "w-5 h-5", size }: IconProps) => (
  <Sparkles className={className} size={size} />
)

export const PremiumIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Star className={className} size={size} />
)

export const BasicIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Music className={className} size={size} />
)

export const PublicIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Globe className={className} size={size} />
)

export const DashboardIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <BarChart3 className={className} size={size} />
)

export const ExamplesIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Music className={className} size={size} />
)

export const LoginIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <LogIn className={className} size={size} />
)

export const MenuIcon = ({ className = "w-5 h-5", size }: IconProps) => (
  <Menu className={className} size={size} />
)

export const CloseIcon = ({ className = "w-5 h-5", size }: IconProps) => (
  <X className={className} size={size} />
)

export const ArrowIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <ArrowRight className={className} size={size} />
)

// Иконки действий
export const PlayIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Play className={className} size={size} />
)

export const PauseIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Pause className={className} size={size} />
)

export const DownloadIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Download className={className} size={size} />
)

export const ShareIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Share2 className={className} size={size} />
)

export const ViewIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Eye className={className} size={size} />
)

export const DeleteIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Trash2 className={className} size={size} />
)

export const CopyIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Copy className={className} size={size} />
)

export const AddIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Plus className={className} size={size} />
)

export const RefreshIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <RefreshCw className={className} size={size} />
)

// Иконки для типов событий
export const BirthdayIcon = ({ className = "w-5 h-5 text-pink-500", size }: IconProps) => (
  <Cake className={className} size={size} />
)

export const HolidayIcon = ({ className = "w-5 h-5 text-purple-500", size }: IconProps) => (
  <PartyPopper className={className} size={size} />
)

export const CalendarIcon = ({ className = "w-5 h-5 text-blue-500", size }: IconProps) => (
  <Calendar className={className} size={size} />
)

// Иконки для статистики
export const StatsIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <TrendingUp className={className} size={size} />
)

export const AwardIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Award className={className} size={size} />
)

export const TimeIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Clock className={className} size={size} />
)

// Иконки для пользователя
export const UserIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <User className={className} size={size} />
)

export const SettingsIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Settings className={className} size={size} />
)

// Иконки для оплаты
export const PaymentIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <CreditCard className={className} size={size} />
)

export const SecurityIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Shield className={className} size={size} />
)

export const SuccessIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <CheckCircle className={className} size={size} />
)

// Иконки для музыки
export const MusicStyleIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Music2 className={className} size={size} />
)

export const MoodIcon = ({ className = "w-4 h-4", size }: IconProps) => (
  <Heart className={className} size={size} />
)

// Экспорт всех иконок одним объектом для удобства
export const Icons = {
  App: AppIcon,
  Create: CreateIcon,
  Premium: PremiumIcon,
  Basic: BasicIcon,
  Public: PublicIcon,
  Dashboard: DashboardIcon,
  Examples: ExamplesIcon,
  Login: LoginIcon,
  Menu: MenuIcon,
  Close: CloseIcon,
  Arrow: ArrowIcon,
  Play: PlayIcon,
  Pause: PauseIcon,
  Download: DownloadIcon,
  Share: ShareIcon,
  View: ViewIcon,
  Delete: DeleteIcon,
  Copy: CopyIcon,
  Add: AddIcon,
  Refresh: RefreshIcon,
  Birthday: BirthdayIcon,
  Holiday: HolidayIcon,
  Calendar: CalendarIcon,
  Stats: StatsIcon,
  Award: AwardIcon,
  Time: TimeIcon,
  User: UserIcon,
  Settings: SettingsIcon,
  Payment: PaymentIcon,
  Security: SecurityIcon,
  Success: SuccessIcon,
  MusicStyle: MusicStyleIcon,
  Mood: MoodIcon
} 