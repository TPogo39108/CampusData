
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Download, FileText, RefreshCcw, Search, LogOut, Trash2, Edit, 
  Users, ShieldAlert, Settings, History, Briefcase, X, Check, Database, 
  FileUp, HardDrive, Eye, EyeOff, UserCircle, CheckSquare, Square, 
  UserPlus, Tags, FileJson, Image as ImageIcon, Globe, FileCode
} from 'lucide-react';
import { 
  AppRole, PlatformUser, UserRole, AppEditor, ObjectRoleDefinition, 
  AuditLogEntry, CategoryDefinition, FieldVisibilityConfig 
} from './types';
import LoginForm from './components/LoginForm';
import UserModal from './components/UserModal';
import RoleModal from './components/RoleModal';
import ProfileModal from './components/ProfileModal';
import { 
  generateWelcomeLetter, exportToExcel, exportFullBackup, 
  readJsonFile, exportRoleDefinitions, getBase64 
} from './services/exportService';

const MASTER_PASSWORD_DEFAULT = "master123";
const MASTER_USERNAME_DEFAULT = "master";

const App: React.FC = () => {
  const [currentSessionUser, setCurrentSessionUser] = useState<{ role: AppRole, username: string } | null>(null);
  
  // App State
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [editors, setEditors] = useState<AppEditor[]>([]);
  const [roleDefinitions, setRoleDefinitions] = useState<ObjectRoleDefinition[]>([]);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [visibilityConfig, setVisibilityConfig] = useState<FieldVisibilityConfig>({
    showSystemFields: true, showPersonalFields: true, showAddressFields: true,
    showCommunicationFields: true, showUdfFields: true, showRolesFields: true
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [customMasterCreds, setCustomMasterCreds] = useState<{username: string, passwordHash: string} | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const [letterTargetUser, setLetterTargetUser] = useState<PlatformUser | null>(null);
  const [isLetterOptionsOpen, setIsLetterOptionsOpen] = useState(false);
  const [isProcessingLetter, setIsProcessingLetter] = useState(false);

  const fullBackupInputRef = useRef<HTMLInputElement>(null);
  const rolesImportInputRef = useRef<HTMLInputElement>(null);
  const localBgInputRef = useRef<HTMLInputElement>(null);

  // Persistence (Load)
  useEffect(() => {
    const saved = (key: string) => localStorage.getItem(key);
    try {
      if (saved('platform_users')) setUsers(JSON.parse(saved('platform_users')!));
      if (saved('app_editors')) setEditors(JSON.parse(saved('app_editors')!));
      if (saved('role_definitions')) setRoleDefinitions(JSON.parse(saved('role_definitions')!));
      if (saved('category_definitions')) setCategories(JSON.parse(saved('category_definitions')!));
      if (saved('visibility_config')) setVisibilityConfig(JSON.parse(saved('visibility_config')!));
      if (saved('audit_logs')) setAuditLogs(JSON.parse(saved('audit_logs')!));
      if (saved('custom_master_creds')) setCustomMasterCreds(JSON.parse(saved('custom_master_creds')!));
    } catch (e) { console.error("Restore error", e); }
  }, []);

  // Persistence (Save)
  useEffect(() => {
    localStorage.setItem('platform_users', JSON.stringify(users));
    localStorage.setItem('app_editors', JSON.stringify(editors));
    localStorage.setItem('role_definitions', JSON.stringify(roleDefinitions));
    localStorage.setItem('category_definitions', JSON.stringify(categories));
    localStorage.setItem('visibility_config', JSON.stringify(visibilityConfig));
    localStorage.setItem('audit_logs', JSON.stringify(auditLogs));
    if (customMasterCreds) localStorage.setItem('custom_master_creds', JSON.stringify(customMasterCreds));
  }, [users, editors, roleDefinitions, categories, visibilityConfig, auditLogs, customMasterCreds]);

  const logAction = (action: 'CREATE' | 'UPDATE' | 'DELETE', targetId: string, details: string) => {
    const entry: AuditLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      editorUsername: currentSessionUser?.username || 'SYSTEM',
      targetUserId: targetId, action, details
    };
    setAuditLogs(prev => [entry, ...prev].slice(0, 1000));
  };

  const handleLogin = (role: AppRole, username: string, pass: string): boolean => {
    if (role === AppRole.MASTER) {
      const mu = customMasterCreds?.username || MASTER_USERNAME_DEFAULT;
      const mp = customMasterCreds?.passwordHash || MASTER_PASSWORD_DEFAULT;
      if (username === mu && pass === mp) {
        setCurrentSessionUser({ role: AppRole.MASTER, username: mu });
        return true;
      }
    } else {
      const ed = editors.find(e => e.username === username && e.passwordHash === pass && e.active);
      if (ed) {
        setCurrentSessionUser({ role: AppRole.EDITOR, username: ed.username });
        return true;
      }
    }
    return false;
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b = await readJsonFile(file);
      if (b && typeof b === 'object' && (b.users || b.roleDefinitions)) {
        if (window.confirm(`Gültiges Backup vom ${b.timestamp || 'unbekannt'} gefunden. Aktuelle Daten überschreiben?`)) {
          if (b.users) setUsers(b.users);
          if (b.roleDefinitions) setRoleDefinitions(b.roleDefinitions);
          if (b.editors) setEditors(b.editors);
          if (b.categories) setCategories(b.categories);
          if (b.visibilityConfig) setVisibilityConfig(b.visibilityConfig);
          if (b.auditLogs) setAuditLogs(b.auditLogs);
          if (b.customMasterCreds) setCustomMasterCreds(b.customMasterCreds);
          
          alert("Backup erfolgreich wiederhergestellt.");
          logAction('UPDATE', 'SYSTEM', "Voll-Backup Import.");
          setTimeout(() => window.location.reload(), 300);
        }
      } else { alert("Kein gültiges CampusData-Backup."); }
    } catch (err) { alert("Import-Fehler: " + (err as Error).message); }
    e.target.value = '';
  };

  const handleRoleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b = await readJsonFile(file);
      const roles = b.roles || b.roleDefinitions;
      if (Array.isArray(roles)) {
        if (confirm(`${roles.length} Rollen importieren?`)) {
          setRoleDefinitions(roles);
          alert("Struktur aktualisiert.");
        }
      }
    } catch (err) { alert("Fehler"); }
    e.target.value = '';
  };

  const handleLetterProcess = async (mode: 'url' | 'white' | 'local', file?: File) => {
    if (!letterTargetUser) return;
    setIsProcessingLetter(true);
    try {
      let bg: string | null = null;
      if (mode === 'url') {
        bg = await getBase64("https://fagp.eu/files/APPs/Briefpapier_FAGP.png");
      } else if (mode === 'local' && file) {
        bg = await getBase64(file);
      }
      await generateWelcomeLetter(letterTargetUser, roleDefinitions, bg);
      setIsLetterOptionsOpen(false);
    } catch (e) {
      alert("Fehler beim Laden des Briefpapiers.");
    } finally {
      setIsProcessingLetter(false);
    }
  };

  const handleSaveUser = (userData: PlatformUser) => {
    if (userData.id) {
      setUsers(prev => prev.map(u => u.id === userData.id ? userData : u));
      logAction('UPDATE', userData.id, `Nutzer ${userData.login} aktualisiert.`);
    } else {
      const newUser = { ...userData, id: Math.random().toString(36).substr(2, 9) };
      setUsers(prev => [newUser, ...prev]);
      logAction('CREATE', newUser.id, `Nutzer ${userData.login} angelegt.`);
    }
    setIsModalOpen(false);
  };

  const displayedUsers = useMemo(() => {
    return users.filter(u => 
      `${u.firstname} ${u.lastname} ${u.login} ${u.institution} ${u.city}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  if (!currentSessionUser) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-campusBg flex flex-col text-primaryDark">
      <header className="bg-primary text-white sticky top-0 z-30 shadow-md h-16 md:h-20 flex items-center">
        <div className="max-w-[1600px] w-full mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <h1 className="font-bold text-xl">CampusData</h1>
          </div>
          <nav className="hidden md:flex gap-2">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-primary' : 'hover:bg-primaryDark'}`}>Nutzer</button>
            {currentSessionUser.role === AppRole.MASTER && (
              <>
                <button onClick={() => setActiveTab('system')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'system' ? 'bg-white text-primary' : 'hover:bg-primaryDark'}`}>System</button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-primary' : 'hover:bg-primaryDark'}`}>Logs</button>
              </>
            )}
          </nav>
          <div className="flex gap-3">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2 rounded-full hover:bg-white/10"><UserCircle className="w-6 h-6" /></button>
            <button onClick={() => setCurrentSessionUser(null)} className="p-2 bg-secondary text-primaryDark rounded-lg"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'users' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 items-center justify-between">
              <div className="relative w-full md:w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Suche (Name, Ort, Institution)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none text-sm" />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {selectedUserIds.size > 0 && (
                  <button onClick={() => { if(confirm(`${selectedUserIds.size} Nutzer löschen?`)) { setUsers(u => u.filter(i => !selectedUserIds.has(i.id))); setSelectedUserIds(new Set()); } }} className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                )}
                <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="flex-1 md:flex-none bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Neu</button>
                <button onClick={() => exportToExcel(users, roleDefinitions)} className="p-2 border-2 border-primary text-primary rounded-xl hover:bg-primary/5" title="Excel Export"><Download className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedUsers.map(u => (
                <div key={u.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <button onClick={() => { const n = new Set(selectedUserIds); n.has(u.id) ? n.delete(u.id) : n.add(u.id); setSelectedUserIds(n); }}>
                        {selectedUserIds.has(u.id) ? <CheckSquare className="text-primary w-6 h-6" /> : <Square className="text-slate-200 w-6 h-6" />}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{u.active ? 'Aktiv' : 'Passiv'}</span>
                    </div>
                    {u.institution && <p className="text-[10px] font-bold text-secondary uppercase truncate">{u.institution}</p>}
                    <h3 className="font-bold leading-tight truncate">{u.firstname} {u.lastname}</h3>
                    <p className="text-xs text-slate-400 font-mono truncate">{u.login}</p>
                    <p className="text-[10px] mt-1 text-slate-500">{u.city || 'Kein Ort'}</p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button onClick={() => { setLetterTargetUser(u); setIsLetterOptionsOpen(true); }} className="flex-1 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-secondary/20"><FileText className="w-3 h-3" /> Brief</button>
                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="flex-1 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-primary/20"><Edit className="w-3 h-3" /> Edit</button>
                  </div>
                </div>
              ))}
              {displayedUsers.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">Keine Nutzer gefunden.</div>}
            </div>
          </>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-secondary"><Database className="w-5 h-5" /> Voll-Backup</h3>
              <p className="text-xs text-slate-500">Sichert die gesamte lokale Datenbank als JSON-Datei.</p>
              <button onClick={() => exportFullBackup(users, editors, roleDefinitions, auditLogs, categories, visibilityConfig)} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primaryDark"><HardDrive className="w-4 h-4" /> Exportieren</button>
              <button onClick={() => fullBackupInputRef.current?.click()} className="w-full py-4 border-2 border-primary text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/5"><FileUp className="w-4 h-4" /> Importieren</button>
              <input ref={fullBackupInputRef} type="file" accept=".json" onChange={handleFullImport} className="hidden" />
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-primary"><Briefcase className="w-5 h-5" /> Kurs-Struktur</h3>
              <p className="text-xs text-slate-500">Nur Kurs-Definitionen ohne Nutzerdaten exportieren/importieren.</p>
              <button onClick={() => exportRoleDefinitions(roleDefinitions)} className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200"><FileCode className="w-4 h-4" /> Struktur Sichern</button>
              <button onClick={() => rolesImportInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:border-slate-400"><FileJson className="w-4 h-4" /> Struktur Laden</button>
              <input ref={rolesImportInputRef} type="file" accept=".json" onChange={handleRoleImport} className="hidden" />
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-accent"><Eye className="w-5 h-5" /> Feld-Sichtbarkeit</h3>
              <div className="space-y-1">
                {Object.entries(visibilityConfig).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg text-xs">
                    <span className="font-medium">{key.replace('show', '').replace('Fields', '')}</span>
                    <button onClick={() => setVisibilityConfig(v => ({...v, [key]: !val}))} className={`p-1 rounded-md ${val ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}>{val ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="font-bold mb-4 flex items-center gap-3 text-primary"><History className="w-6 h-6" /> Aktivitätslog</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {auditLogs.length === 0 ? <p className="text-center py-20 text-slate-400">Keine Logs vorhanden.</p> : auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl text-[11px] flex justify-between border-l-4 border-secondary">
                  <span><span className="font-bold">{log.editorUsername}:</span> {log.details}</span>
                  <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Brief-Optionen */}
      {isLetterOptionsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 text-center space-y-6">
            <div>
              <h2 className="text-xl font-bold">Brief generieren</h2>
              <p className="text-slate-400 text-sm">Empfänger: {letterTargetUser?.firstname} {letterTargetUser?.lastname}</p>
            </div>
            <div className="grid gap-3">
              <button disabled={isProcessingLetter} onClick={() => handleLetterProcess('url')} className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl hover:bg-primary/10 transition-all text-left">
                <div className="flex items-center gap-3"><Globe className="text-primary w-6 h-6" /><span className="font-bold text-sm">Server-Abruf (FAGP)</span></div>
                <ImageIcon className="text-primary/40 w-4 h-4" />
              </button>
              <button disabled={isProcessingLetter} onClick={() => localBgInputRef.current?.click()} className="flex items-center justify-between p-4 bg-secondary/5 border-2 border-secondary/20 rounded-2xl hover:bg-secondary/10 transition-all text-left">
                <div className="flex items-center gap-3"><FileUp className="text-secondary w-6 h-6" /><span className="font-bold text-sm">Eigenes Bild</span></div>
                <ImageIcon className="text-secondary/40 w-4 h-4" />
              </button>
              <input ref={localBgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLetterProcess('local', e.target.files[0])} />
              <button disabled={isProcessingLetter} onClick={() => handleLetterProcess('white')} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:bg-slate-100 transition-all text-left">
                <div className="flex items-center gap-3 text-slate-500"><FileText className="w-6 h-6" /><span className="font-bold text-sm">Weißer Hintergrund</span></div>
              </button>
            </div>
            <button onClick={() => setIsLetterOptionsOpen(false)} className="text-slate-400 font-bold text-xs uppercase hover:text-red-500">Abbrechen</button>
          </div>
        </div>
      )}

      {isModalOpen && <UserModal user={editingUser} roleDefinitions={roleDefinitions} categories={categories} visibilityConfig={visibilityConfig} currentUserRole={currentSessionUser.role} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} />}
      {isProfileModalOpen && <ProfileModal currentUser={currentSessionUser} onClose={() => setIsProfileModalOpen(false)} onSave={(u, p) => { 
        if (currentSessionUser.role === AppRole.MASTER) {
           setCustomMasterCreds(prev => ({ username: u, passwordHash: p || prev?.passwordHash || MASTER_PASSWORD_DEFAULT }));
        } else {
           setEditors(prev => prev.map(e => e.username === currentSessionUser.username ? { ...e, username: u, passwordHash: p || e.passwordHash } : e));
        }
        setCurrentSessionUser(prev => prev ? { ...prev, username: u } : null);
        setIsProfileModalOpen(false); 
      }} />}
    </div>
  );
};

export default App;
