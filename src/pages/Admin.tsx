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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-600 to-pink-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-500">Bot MVB Pro - Sistema SaaS</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="destructive">ADMIN</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  logout();
                  navigate('/dashboard');
                }}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Licenças</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLicenses}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Licenças Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeLicenses}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Licenças Expiradas</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredLicenses}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="licenses">Licenças</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Usuário</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Data Cadastro</th>
                        <th className="text-left p-3">Tipo Licença</th>
                        <th className="text-left p-3">Status Licença</th>
                        <th className="text-left p-3">Expira em</th>
                        <th className="text-left p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isExpiring = user.license_status === 'expirando' || user.license_status === 'expirada';
                        const rowClass = isExpiring ? 'border-b hover:bg-orange-50 bg-orange-50/30' : 'border-b hover:bg-gray-50';
                        
                        return (
                          <tr key={user.id} className={rowClass}>
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">ID: {user.id}</div>
                              </div>
                            </td>
                            <td className="p-3">{user.email}</td>
                            <td className="p-3">
                              <div className="text-sm">
                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="p-3">
                              {user.license_type ? (
                                <Badge className={Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.color || 'bg-gray-100 text-gray-800'}>
                                  {Object.values(LICENSE_TYPES).find(lt => lt.type === user.license_type)?.name || user.license_type.toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-400">Sem Licença</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              {user.license_status === 'sem_licenca' && (
                                <Badge variant="outline" className="text-gray-500">
                                  Sem Licença
                                </Badge>
                              )}
                              {user.license_status === 'ativa' && (
                                <Badge className="bg-green-100 text-green-800">
                                  ✓ Ativa
                                </Badge>
                              )}
                              {user.license_status === 'expirando' && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  ⚠ Expirando
                                </Badge>
                              )}
                              {user.license_status === 'expirada' && (
                                <Badge className="bg-red-100 text-red-800">
                                  ✗ Expirada
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              {user.expires_at ? (
                                <div className="text-sm">
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
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Select
                                  value={user.status}
                                  onValueChange={(value) => handleUpdateUserStatus(user.id, value)}
                                >
                                  <SelectTrigger className="w-32">
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
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciar Licenças</CardTitle>
                    <CardDescription>
                      Visualize, crie e gerencie todas as licenças do sistema
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Licença
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Licença</DialogTitle>
                        <DialogDescription>
                          Gere uma nova licença para um usuário específico
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Usuário</Label>
                          <Select value={newLicense.user_id} onValueChange={(value) => setNewLicense({ ...newLicense, user_id: value })}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label>Tipo de Licença</Label>
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
                            <SelectTrigger>
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Duração</Label>
                            <Input
                              type="text"
                              value={Object.values(LICENSE_TYPES).find(lt => lt.type === newLicense.license_type)?.name.match(/\((.*?)\)/)?.[1] || `${newLicense.duration_days} dias`}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max. Dispositivos</Label>
                            <Input
                              type="number"
                              value={newLicense.max_devices}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                        <Button onClick={handleCreateLicense} className="w-full">
                          Criar Licença
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline"
                    onClick={handleCleanupExpiredLicenses}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Expiradas
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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