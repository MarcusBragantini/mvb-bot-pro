import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Key, 
  Plus, 
  Trash2, 
  Monitor,
  Shield,
  CheckCircle,
  UserX,
  XCircle,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  license_id?: number | null;
  license_key?: string | null;
  license_type?: string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
  days_remaining?: number | null;
  license_status?: 'sem_licenca' | 'ativa' | 'expirando' | 'expirada';
}

interface License {
  id: number;
  user_id: number;
  license_key: string;
  license_type: string;
  expires_at: string;
  max_devices: number;
  is_active: boolean;
  email: string;
  name: string;
  active_devices: number;
  days_remaining: number;
}

// ✅ Tipos de licença pré-definidos
const LICENSE_TYPES = {
  test: { 
    name: 'Teste (5 minutos)', 
    days: 5, // 5 minutos (para licenças free)
    type: 'free', // Tipo correto para API
    maxDevices: 1,
    color: 'bg-gray-100 text-gray-800'
  },
  trial: { 
    name: 'Trial (7 dias)', 
    days: 7,
    type: 'trial',
    maxDevices: 1,
    color: 'bg-blue-100 text-blue-800'
  },
  basic: { 
    name: 'Básico (30 dias)', 
    days: 30,
    type: 'basic',
    maxDevices: 1,
    color: 'bg-green-100 text-green-800'
  },
  premium: { 
    name: 'Premium (180 dias)', 
    days: 180,
    type: 'premium',
    maxDevices: 3,
    color: 'bg-purple-100 text-purple-800'
  },
  lifetime: { 
    name: 'Vitalícia (Sem expiração)', 
    days: 36500, // 100 anos
    type: 'lifetime',
    maxDevices: 5,
    color: 'bg-yellow-100 text-yellow-800'
  }
};

export default function Admin() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0
  });
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newLicense, setNewLicense] = useState({
    user_id: '',
    license_type: 'trial',
    duration_days: 7,
    max_devices: 1
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashboardData, usersData, licensesData] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getUsers(),
        apiClient.getLicenses()
      ]);
      
      setStats(dashboardData.stats);
      setUsers(usersData);
      setLicenses(licensesData);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados administrativos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    try {
      await apiClient.updateUserStatus(userId, status);
      toast({
        title: "Status atualizado",
        description: "Status do usuário alterado com sucesso"
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive"
      });
    }
  };

  const handleRemoveInactiveUsers = async () => {
    try {
      const inactiveUsers = users.filter(user => 
        user.status === 'suspended' || user.status === 'expired'
      );
      
      if (inactiveUsers.length === 0) {
        toast({
          title: "Nenhum usuário inativo",
          description: "Não há usuários inativos para remover"
        });
        return;
      }

      const confirmed = window.confirm(
        `Tem certeza que deseja remover ${inactiveUsers.length} usuário(s) inativo(s)? Esta ação não pode ser desfeita.`
      );

      if (confirmed) {
        await apiClient.removeInactiveUsers();
        toast({
          title: "Usuários removidos",
          description: `${inactiveUsers.length} usuário(s) inativo(s) removido(s) com sucesso`
        });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover usuários inativos",
        variant: "destructive"
      });
    }
  };

  const handleCreateLicense = async () => {
    try {
      if (!newLicense.user_id) {
        toast({
          title: "Usuário obrigatório",
          description: "Selecione um usuário para criar a licença",
          variant: "destructive"
        });
        return;
      }

      await apiClient.createLicense({
        user_id: Number(newLicense.user_id),
        license_type: newLicense.license_type,
        duration_days: newLicense.duration_days,
        max_devices: newLicense.max_devices
      });

      toast({
        title: "Licença criada",
        description: "Nova licença gerada com sucesso"
      });

      setIsCreateDialogOpen(false);
      setNewLicense({
        user_id: '',
        license_type: 'trial',
        duration_days: 7,
        max_devices: 1
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a licença",
        variant: "destructive"
      });
    }
  };

  const handleDeactivateLicense = async (licenseId: number) => {
    try {
      await apiClient.deactivateLicense(licenseId);
      toast({
        title: "Licença desativada",
        description: "Licença foi desativada com sucesso"
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível desativar a licença",
        variant: "destructive"
      });
    }
  };

  const handleExtendLicense = async (licenseId: number, days: number) => {
    try {
      await apiClient.extendLicense(licenseId, days);
      toast({
        title: "Licença estendida",
        description: `Licença estendida por ${days} dias`
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível estender a licença",
        variant: "destructive"
      });
    }
  };

  const handleCleanupExpiredLicenses = async () => {
    try {
      const result = await apiClient.cleanupExpiredLicenses();
      toast({
        title: "Limpeza concluída",
        description: `${result.count} licença(s) expirada(s) removida(s) com sucesso`
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível limpar licenças expiradas",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      active: 'default',
      suspended: 'destructive',
      expired: 'secondary'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getLicenseStatusColor = (license: License): "default" | "destructive" | "outline" | "secondary" => {
    if (license.days_remaining <= 0) return 'destructive';
    if (license.days_remaining <= 7) return 'secondary';
    return 'default';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Acesso negado. Você precisa de privilégios de administrador para acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-red-600 to-pink-600 rounded-lg">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-xl font-bold text-slate-100">Admin</h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Zeus - Sistema de Trading</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Badge variant="destructive" className="text-xs">ADMIN</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  logout();
                  navigate('/dashboard');
                }}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/90">Usuários</p>
                  <p className="text-lg font-bold text-white">{stats.totalUsers}</p>
                </div>
                <Users className="h-5 w-5 text-white/80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/90">Licenças</p>
                  <p className="text-lg font-bold text-white">{stats.totalLicenses}</p>
                </div>
                <Key className="h-5 w-5 text-white/80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/90">Ativas</p>
                  <p className="text-lg font-bold text-white">{stats.activeLicenses}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-white/80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/90">Expiradas</p>
                  <p className="text-lg font-bold text-white">{stats.expiredLicenses}</p>
                </div>
                <XCircle className="h-5 w-5 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="licenses" className="text-xs sm:text-sm">Licenças</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="block sm:hidden">
                  {users.map((user) => {
                    const isExpiring = user.license_status === 'expirando' || user.license_status === 'expirada';
                    return (
                      <div key={user.id} className={`p-3 border-b ${isExpiring ? 'bg-orange-50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{user.name}</h3>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <p className="text-xs text-gray-400">ID: {user.id}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {user.license_type ? (
                              <Badge className={`text-xs ${Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.color || 'bg-gray-100 text-gray-800'}`}>
                                {Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.name || user.license_type.toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-400">Sem Licença</Badge>
                            )}
                            {user.license_status === 'ativa' && (
                              <Badge className="text-xs bg-green-100 text-green-800">✓ Ativa</Badge>
                            )}
                            {user.license_status === 'expirando' && (
                              <Badge className="text-xs bg-orange-100 text-orange-800">⚠ Expirando</Badge>
                            )}
                            {user.license_status === 'expirada' && (
                              <Badge className="text-xs bg-red-100 text-red-800">✗ Expirada</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            {user.expires_at && user.license_type !== 'lifetime' && user.days_remaining > 0 && (
                              <span>
                                {user.license_type === 'free' ? 
                                  `${user.days_remaining} min` : 
                                  `${user.days_remaining} dias`
                                }
                              </span>
                            )}
                            {user.license_type === 'lifetime' && (
                              <span className="font-semibold text-yellow-600">∞ Vitalícia</span>
                            )}
                          </div>
                          <Select
                            value={user.status}
                            onValueChange={(value) => handleUpdateUserStatus(user.id, value)}
                          >
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="suspended">Suspenso</SelectItem>
                              <SelectItem value="expired">Expirado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 text-sm font-semibold">Usuário</th>
                        <th className="text-left p-3 text-sm font-semibold">Email</th>
                        <th className="text-left p-3 text-sm font-semibold hidden md:table-cell">Data Cadastro</th>
                        <th className="text-left p-3 text-sm font-semibold">Tipo Licença</th>
                        <th className="text-left p-3 text-sm font-semibold">Status Licença</th>
                        <th className="text-left p-3 text-sm font-semibold hidden lg:table-cell">Expira em</th>
                        <th className="text-left p-3 text-sm font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isExpiring = user.license_status === 'expirando' || user.license_status === 'expirada';
                        const rowClass = isExpiring ? 'border-b hover:bg-orange-50 bg-orange-50/30' : 'border-b hover:bg-gray-50';
                        
                        return (
                          <tr key={user.id} className={rowClass}>
                            <td className="p-2 sm:p-3">
                              <div>
                                <div className="font-medium text-sm sm:text-base">{user.name}</div>
                                <div className="text-xs text-gray-500">ID: {user.id}</div>
                                <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 hidden sm:table-cell">{user.email}</td>
                            <td className="p-2 sm:p-3 hidden md:table-cell">
                              <div className="text-xs sm:text-sm">
                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3">
                              {user.license_type ? (
                                <Badge className={`text-xs ${Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.color || 'bg-gray-100 text-gray-800'}`}>
                                  {Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.name || user.license_type.toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-gray-400">Sem Licença</Badge>
                              )}
                            </td>
                            <td className="p-2 sm:p-3">
                              {user.license_status === 'sem_licenca' && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  Sem Licença
                                </Badge>
                              )}
                              {user.license_status === 'ativa' && (
                                <Badge className="text-xs bg-green-100 text-green-800">
                                  ✓ Ativa
                                </Badge>
                              )}
                              {user.license_status === 'expirando' && (
                                <Badge className="text-xs bg-orange-100 text-orange-800">
                                  ⚠ Expirando
                                </Badge>
                              )}
                              {user.license_status === 'expirada' && (
                                <Badge className="text-xs bg-red-100 text-red-800">
                                  ✗ Expirada
                                </Badge>
                              )}
                            </td>
                            <td className="p-2 sm:p-3 hidden lg:table-cell">
                              {user.expires_at ? (
                                <div className="text-xs sm:text-sm">
                                  {user.license_type === 'lifetime' ? (
                                    <span className="font-semibold text-yellow-600">∞ Vitalícia</span>
                                  ) : user.days_remaining > 0 ? (
                                    <span>
                                      {user.license_type === 'free' ? 
                                        `${user.days_remaining} min` : 
                                        `${user.days_remaining} dias`
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-red-600">Expirada</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs sm:text-sm">-</span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="flex gap-1 sm:gap-2">
                                <Select
                                  value={user.status}
                                  onValueChange={(value) => handleUpdateUserStatus(user.id, value)}
                                >
                                  <SelectTrigger className="w-24 sm:w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="suspended">Suspenso</SelectItem>
                                    <SelectItem value="expired">Expirado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="licenses">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="space-y-3">
                  <div>
                    <CardTitle className="text-sm sm:text-lg">Gerenciar Licenças</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Visualize, crie e gerencie todas as licenças do sistema
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Nova Licença
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:w-full max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-sm sm:text-base">Criar Nova Licença</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                          Gere uma nova licença para um usuário específico
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <Label className="text-xs sm:text-sm">Usuário</Label>
                          <Select value={newLicense.user_id} onValueChange={(value) => setNewLicense({ ...newLicense, user_id: value })}>
                            <SelectTrigger className="text-xs sm:text-sm">
                              <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <Label className="text-xs sm:text-sm">Tipo de Licença</Label>
                          <Select 
                            value={Object.keys(LICENSE_TYPES).find(key => LICENSE_TYPES[key as keyof typeof LICENSE_TYPES].type === newLicense.license_type) || ''} 
                            onValueChange={(value) => {
                              const licenseType = LICENSE_TYPES[value as keyof typeof LICENSE_TYPES];
                              setNewLicense({ 
                                ...newLicense, 
                                license_type: licenseType.type, // Usar o tipo correto da API
                                duration_days: licenseType.days,
                                max_devices: licenseType.maxDevices
                              });
                            }}
                          >
                            <SelectTrigger className="text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LICENSE_TYPES).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Duração</Label>
                            <Input
                              type="text"
                              value={Object.values(LICENSE_TYPES).find(lt => lt.type === newLicense.license_type)?.name.match(/\((.*?)\)/)?.[1] || `${newLicense.duration_days} dias`}
                              disabled
                              className="bg-gray-50 text-xs sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Max. Dispositivos</Label>
                            <Input
                              type="number"
                              value={newLicense.max_devices}
                              disabled
                              className="bg-gray-50 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                        <Button onClick={handleCreateLicense} className="w-full text-xs sm:text-sm">
                          Criar Licença
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                      <Button 
                        variant="outline"
                        onClick={handleCleanupExpiredLicenses}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Limpar Expiradas</span>
                        <span className="sm:hidden">Limpar</span>
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleRemoveInactiveUsers}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Remover Inativos</span>
                        <span className="sm:hidden">Remover</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="block sm:hidden">
                  {licenses.map((license) => (
                    <div key={license.id} className="p-3 border-b bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm font-mono">{license.license_key}</h3>
                          <p className="text-xs text-gray-500">{license.name}</p>
                          <p className="text-xs text-gray-400">{license.email}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs ${Object.values(LICENSE_TYPES).find(lt => lt.type === license.license_type)?.color || 'bg-gray-100 text-gray-800'}`}>
                            {Object.values(LICENSE_TYPES).find(lt => lt.type === license.license_type)?.name || license.license_type.toUpperCase()}
                          </Badge>
                          <Badge variant={getLicenseStatusColor(license)} className="text-xs">
                            {license.days_remaining > 0 ? (
                              license.license_type === 'free' ? 
                                `${license.days_remaining} min` : 
                                `${license.days_remaining} dias`
                            ) : (
                              'Expirada'
                            )}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600">{license.active_devices}/{license.max_devices}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(license.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivateLicense(license.id)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            Desativar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExtendLicense(license.id, 30)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            +30d
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Licença</th>
                        <th className="text-left p-3">Usuário</th>
                        <th className="text-left p-3">Tipo</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Dispositivos</th>
                        <th className="text-left p-3">Expira</th>
                        <th className="text-left p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((license) => (
                        <tr key={license.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-mono text-sm">{license.license_key}</div>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{license.name}</div>
                              <div className="text-sm text-gray-500">{license.email}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={Object.values(LICENSE_TYPES).find(lt => lt.type === license.license_type)?.color || 'bg-gray-100 text-gray-800'}>
                              {Object.values(LICENSE_TYPES).find(lt => lt.type === license.license_type)?.name || license.license_type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant={getLicenseStatusColor(license)}>
                              {license.days_remaining > 0 ? (
                                license.license_type === 'free' ? 
                                  `${license.days_remaining} min` : 
                                  `${license.days_remaining} dias`
                              ) : (
                                'Expirada'
                              )}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-1">
                              <Monitor className="h-4 w-4" />
                              {license.active_devices}/{license.max_devices}
                            </span>
                          </td>
                          <td className="p-3">
                            {new Date(license.expires_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendLicense(license.id, 30)}
                              >
                                +30d
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeactivateLicense(license.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}