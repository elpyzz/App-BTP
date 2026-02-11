import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasPermission, type TeamMember } from '@/lib/supabase';
import { 
  Home, 
  Building,
  Calendar,
} from 'lucide-react';

export default function TeamSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const memberData = localStorage.getItem('teamMember');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        setTeamMember(member);
      } catch (error) {
        console.error('Erreur lors du parsing des données membre:', error);
      }
    }
  }, []);

  const baseMenuItems = [
    { icon: Home, label: 'Vue d\'ensemble', path: '/team-dashboard', permission: null, active: location === '/team-dashboard' },
    { icon: Building, label: 'Mes Chantiers', path: '/team-dashboard/projects', permission: 'view_projects', active: location === '/team-dashboard/projects' },
    { icon: Calendar, label: 'Planning', path: '/team-dashboard/planning', permission: 'view_planning', active: location === '/team-dashboard/planning' },
  ];

  // Filtrer les items selon les permissions
  const authorizedMenuItems = baseMenuItems.filter(item => {
    if (!item.permission) return true; // Items sans permission sont toujours visibles
    return hasPermission(teamMember, item.permission);
  });

  return (
    <div className={cn(
      "fixed left-0 top-0 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col z-50 rounded-r-3xl",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-col">
          <span className="font-semibold text-white">Membre d'équipe</span>
          <span className="text-xs text-white/70 italic">Aos Renov</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {!collapsed && (
          <div className="text-xs font-medium text-white/60 uppercase tracking-wide mb-4">
            Navigation
          </div>
        )}
        
        {!teamMember || !teamMember.permissions || teamMember.permissions.length === 0 ? (
          <div className="text-center mt-8">
            <p className="text-white/70 text-sm">Aucune permission accordée</p>
            <p className="text-xs text-white/50 mt-2">
              Contactez votre administrateur pour obtenir l'accès aux fonctionnalités.
            </p>
          </div>
        ) : (
          authorizedMenuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 text-white",
                  collapsed && "justify-center",
                  item.active && "bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30",
                  !item.active && "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          ))
        )}
      </nav>
    </div>
  );
}

