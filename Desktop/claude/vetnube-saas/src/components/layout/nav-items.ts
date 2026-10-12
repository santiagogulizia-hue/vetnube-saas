import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Package,
  PawPrint,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }
export type NavSection = { title?: string; items: NavItem[] }

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
      { href: '/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/clientes', label: 'Clientes', icon: Users },
      { href: '/pacientes', label: 'Pacientes', icon: PawPrint },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { href: '/ventas', label: 'Ventas y caja', icon: Receipt },
      { href: '/inventario', label: 'Inventario', icon: Package },
      { href: '/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    title: 'Clínica',
    items: [{ href: '/configuracion', label: 'Configuración', icon: Settings }],
  },
]

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

export function findNavItem(pathname: string) {
  return NAV_SECTIONS.flatMap((s) => s.items).find((item) => isActive(pathname, item.href))
}
