
import React, { useState, useEffect, useRef, useMemo } from 'https://esm.sh/react@19.0.0';
import ReactDOM from 'https://esm.sh/react-dom@19.0.0/client';
import { 
  Plus, Download, FileText, RefreshCcw, Search, LogOut, Trash2, Edit, 
  Users, ShieldAlert, Settings, History, Briefcase, X, Check, Database, 
  FileUp, HardDrive, Eye, EyeOff, UserCircle, CheckSquare, Square, 
  UserPlus, Tags, FileJson, Image as ImageIcon, Globe, FileCode, LogIn, ShieldCheck, MapPin, CheckCircle2
} from 'https://esm.sh/lucide-react@0.460.0';
import jsPDF from 'https://esm.sh/jspdf@2.5.1';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

// --- TYPES ---
export enum UserRole { ADMIN = 'Administrator', USER = 'User', GUEST = 'Guest' }
export enum AppRole { MASTER = 'MASTER', EDITOR = 'EDITOR' }
export interface AppEditor { id: string; username: string; passwordHash: string; active: boolean; }
export interface ObjectRoleDefinition { id: string; objectName: string; objectKey: string; roleName: string; roleKey: string; }
export interface CategoryDefinition { id: string; name: string; description: string; }
export interface FieldVisibilityConfig { showSystemFields: boolean; showPersonalFields: boolean; showAddressFields: boolean; showCommunicationFields: boolean; showUdfFields: boolean; showRolesFields: boolean; }
export interface AuditLogEntry { id: string; timestamp: string; editorUsername: string; targetUserId: string; action: 'CREATE' | 'UPDATE' | 'DELETE'; details: string; }

export interface PlatformUser {
  id: string; active: boolean; globalRole: UserRole; localRoleIds: string[]; category: string; externalAccount: string;
  login: string; password: string; language: 'de' | 'en'; salutation: string; firstname: string; lastname: string;
  title: string; birthday: string; email: string; institution: string; department: string; street: string;
  city: string; postalCode: string; phone: string; phoneOffice: string; mobile: string; comment: string;
  matriculation: string; udf1: string; udf2: string; udf3: string; udf4: string; udf5: string;
  unlimitedAccess: boolean; skinId: string; authMode: 'default' | 'oidc';
}

// --- CONSTANTS ---
const GOLD_CI = [146, 139, 26];
const MASTER_PASSWORD_DEFAULT = "master123";
const MASTER_USERNAME_DEFAULT = "master";

// --- SERVICES ---
const getBase64 = (source: string | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof source === 'string') {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/png")); } else reject(new Error("Canvas fail"));
      };
      img.onerror = () => reject(new Error("Image fail"));
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(source);
    }
  });
};

const generateWelcomeLetter = async (user: PlatformUser, roleDefinitions: ObjectRoleDefinition[], bgBase64: string | null) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  if (bgBase64) try { doc.addImage(bgBase64, 'PNG', 0, 0, 210, 297, undefined, 'FAST'); } catch (e) {}

  doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
  
  let currentY = 45;
  const leftMargin = 25;

  if (user.institution) { doc.text(user.institution, leftMargin, currentY); currentY += 5; }
  if (user.department) { doc.text(user.department, leftMargin, currentY); currentY += 5; }
  const addrSalutation = user.salutation === 'Herr' ? 'Herrn' : user.salutation;
  doc.text(addrSalutation, leftMargin, currentY); currentY += 5;
  doc.text(`${user.title ? user.title + ' ' : ''}${user.firstname} ${user.lastname}`, leftMargin, currentY); currentY += 5;
  doc.text(user.street || '', leftMargin, currentY); currentY += 5;
  doc.text(`${user.postalCode || ''} ${user.city || ''}`, leftMargin, currentY);

  const dateStr = new Date().toLocaleDateString('de-DE');
  doc.setFontSize(9); doc.text(`Magdeburg, den ${dateStr}`, 185, 95, { align: 'right' });

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(GOLD_CI[0], GOLD_CI[1], GOLD_CI[2]);
  doc.text("Ihre Zugangsdaten zum Virtuellen Campus", leftMargin, 110);

  let greeting = `Guten Tag ${user.firstname} ${user.lastname},`;
  if (user.salutation === 'Frau') greeting = `Sehr geehrte Frau ${user.title ? user.title + ' ' : ''}${user.lastname},`;
  else if (user.salutation === 'Herr') greeting = `Sehr geehrter Herr ${user.title ? user.title + ' ' : ''}${user.lastname},`;

  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(greeting, leftMargin, 125);
  doc.text(doc.splitTextToSize(`herzlich willkommen! Für Ihren persönlichen Zugriff auf den Virtuellen Campus der Fachakademie wurden Ihre Benutzerdaten erstellt. Bitte nutzen Sie die folgenden Daten für Ihre Anmeldung.`, 160), leftMargin, 135);

  doc.setDrawColor(GOLD_CI[0], GOLD_CI[1], GOLD_CI[2]); doc.line(leftMargin, 155, 185, 155);
  doc.setFont("helvetica", "bold"); doc.text("Benutzername:", leftMargin + 5, 165); doc.text("Passwort:", leftMargin + 5, 175);
  doc.setTextColor(GOLD_CI[0], GOLD_CI[1], GOLD_CI[2]); doc.text(user.login, 70, 165); doc.text(user.password, 70, 175);
  doc.setTextColor(0, 0, 0); doc.line(leftMargin, 185, 185, 185);

  doc.text("Viel Erfolg!", leftMargin, 250); doc.text("Mit freundlichen Grüßen,", leftMargin, 260);
  doc.setFont("helvetica", "bold"); doc.setTextColor(GOLD_CI[0], GOLD_CI[1], GOLD_CI[2]);
  doc.text("Ihre Fachakademie für Gemeindepastoral", leftMargin, 270);
  doc.save(`Zugang_${user.lastname}.pdf`);
};

// --- COMPONENTS ---
const LoginForm = ({ onLogin }: { onLogin: any }) => {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [r, setR] = useState(AppRole.EDITOR);
  return (
    <div className="min-h-screen flex items-center justify-center bg-primaryDark p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 space-y-6 shadow-2xl border-t-8 border-secondary">
        <div className="text-center"><ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" /><h1 className="text-2xl font-bold">CampusData Login</h1></div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>setR(AppRole.EDITOR)} className={`py-2 rounded-xl border-2 font-bold ${r===AppRole.EDITOR?'bg-accent/10 border-primary':'border-slate-100'}`}>Bearbeiter</button>
          <button onClick={()=>setR(AppRole.MASTER)} className={`py-2 rounded-xl border-2 font-bold ${r===AppRole.MASTER?'bg-red-50 border-red-500':'border-slate-100'}`}>Master</button>
        </div>
        <input placeholder="Name" value={u} onChange={e=>setU(e.target.value)} className="w-full p-3 border rounded-xl" />
        <input type="password" placeholder="Passwort" value={p} onChange={e=>setP(e.target.value)} className="w-full p-3 border rounded-xl" />
        <button onClick={()=>onLogin(r, u, p)} className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><LogIn className="w-5 h-5"/> Betreten</button>
      </div>
    </div>
  );
};

const UserModal = ({ user, roleDefinitions, onClose, onSave, visibilityConfig, currentUserRole }: any) => {
  const [formData, setFormData] = useState<any>({ active: true, salutation: 'Herr', login: '', password: '', firstname: '', lastname: '', localRoleIds: [], ...user });
  const isMaster = currentUserRole === AppRole.MASTER;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-campusBg rounded-t-[2rem]">
          <h2 className="font-bold text-lg">{user?.id ? 'Nutzer editieren' : 'Neuanlage'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-[10px] font-bold uppercase text-slate-400">Vorname</label><input value={formData.firstname} onChange={e=>setFormData({...formData, firstname: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-400">Nachname</label><input value={formData.lastname} onChange={e=>setFormData({...formData, lastname: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-400">Institution</label><input value={formData.institution} onChange={e=>setFormData({...formData, institution: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-400">Abteilung</label><input value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-400">Straße</label><input value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div className="flex gap-2">
              <input placeholder="PLZ" value={formData.postalCode} onChange={e=>setFormData({...formData, postalCode: e.target.value})} className="w-20 p-2 border rounded-lg" />
              <input placeholder="Ort" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="flex-1 p-2 border rounded-lg" />
            </div>
          </section>
          <section className="bg-slate-50 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm">Zugangsdaten</h3>
            <div className="grid grid-cols-2 gap-4">
               <input placeholder="Login" value={formData.login} onChange={e=>setFormData({...formData, login: e.target.value})} className="p-2 border rounded-lg font-mono" />
               <input placeholder="Passwort" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="p-2 border rounded-lg font-mono" />
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="font-bold text-sm">Kurse</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roleDefinitions.map((rd: any) => (
                <button key={rd.id} onClick={() => {
                  const ids = formData.localRoleIds || [];
                  setFormData({...formData, localRoleIds: ids.includes(rd.id) ? ids.filter((i:any)=>i!==rd.id) : [...ids, rd.id]});
                }} className={`p-3 border-2 rounded-xl text-left text-xs ${formData.localRoleIds?.includes(rd.id)?'border-primary bg-primary/5':'border-slate-100'}`}>
                  <b>{rd.objectName}</b><br/>{rd.roleName}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="p-6 border-t flex justify-end gap-2 bg-campusBg rounded-b-[2rem]">
          <button onClick={onClose} className="px-6 py-2 font-bold text-slate-400">Abbruch</button>
          <button onClick={()=>onSave(formData)} className="px-8 py-2 bg-primary text-white font-bold rounded-xl shadow-lg">Speichern</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [session, setSession] = useState<any>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<ObjectRoleDefinition[]>([]);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('cp_u'); const r = localStorage.getItem('cp_r');
    if (u) setUsers(JSON.parse(u)); if (r) setRoles(JSON.parse(r));
  }, []);

  useEffect(() => {
    localStorage.setItem('cp_u', JSON.stringify(users)); localStorage.setItem('cp_r', JSON.stringify(roles));
  }, [users, roles]);

  const login = (role: AppRole, u: string, p: string) => {
    if (role === AppRole.MASTER && u === MASTER_USERNAME_DEFAULT && p === MASTER_PASSWORD_DEFAULT) {
      setSession({ role, username: u }); return true;
    }
    setSession({ role: AppRole.EDITOR, username: u }); // Fallback für Demo
    return true;
  };

  const filteredUsers = useMemo(() => users.filter(u => `${u.firstname} ${u.lastname} ${u.login} ${u.city}`.toLowerCase().includes(search.toLowerCase())), [users, search]);

  if (!session) return <LoginForm onLogin={login} />;

  return (
    <div className="min-h-screen bg-campusBg flex flex-col">
      <header className="bg-primary text-white h-16 flex items-center px-6 justify-between shadow-lg">
        <div className="flex items-center gap-2 font-bold text-lg"><Users /> CampusData</div>
        <div className="flex gap-2">
          <button onClick={()=>setActiveTab('users')} className={`px-4 py-1 rounded-lg text-sm font-bold ${activeTab==='users'?'bg-white text-primary':''}`}>Nutzer</button>
          <button onClick={()=>setActiveTab('system')} className={`px-4 py-1 rounded-lg text-sm font-bold ${activeTab==='system'?'bg-white text-primary':''}`}>System</button>
          <button onClick={()=>setSession(null)} className="p-2 bg-secondary rounded-lg"><LogOut className="w-4 h-4"/></button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto w-full flex-1">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm items-center">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-300"/><input placeholder="Suchen..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" /></div>
              <button onClick={()=>setEditing({})} className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex gap-2"><Plus className="w-4 h-4"/> Neu</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                   <p className="text-[10px] font-bold text-secondary uppercase truncate">{u.institution || 'Keine Institution'}</p>
                   <h3 className="font-bold text-lg">{u.firstname} {u.lastname}</h3>
                   <p className="text-xs text-slate-400 font-mono mb-4">{u.login}</p>
                   <div className="flex gap-2 pt-4 border-t">
                      <button onClick={()=>generateWelcomeLetter(u, roles, "https://fagp.eu/files/APPs/Briefpapier_FAGP.png")} className="flex-1 py-2 bg-secondary/10 text-secondary rounded-xl font-bold text-xs flex items-center justify-center gap-1"><FileText className="w-3 h-3"/> Brief</button>
                      <button onClick={()=>setEditing(u)} className="flex-1 py-2 bg-primary/10 text-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1"><Edit className="w-3 h-3"/> Edit</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
               <h3 className="font-bold flex items-center gap-2 text-primary"><Database/> Datenbank</h3>
               <button onClick={()=>alert(JSON.stringify(users))} className="w-full py-3 bg-slate-100 rounded-xl font-bold">Export JSON</button>
               <button onClick={()=>setUsers([])} className="w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-bold">Daten löschen</button>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
               <h3 className="font-bold flex items-center gap-2 text-secondary"><Briefcase/> Kurs-Struktur</h3>
               <button onClick={()=>setRoles([...roles, {id: Math.random().toString(), objectName: 'Neuer Kurs', objectKey: 'key', roleName: 'Mitglied', roleKey: 'role'}])} className="w-full py-3 bg-secondary/10 text-secondary rounded-xl font-bold">Mock Kurs hinzufügen</button>
               <p className="text-xs text-slate-400">Aktuelle Kurse: {roles.length}</p>
            </div>
          </div>
        )}
      </main>

      {editing && <UserModal user={editing} roleDefinitions={roles} currentUserRole={session.role} onClose={()=>setEditing(null)} onSave={(u:any)=>{
        if(u.id) setUsers(users.map(i=>i.id===u.id?u:i));
        else setUsers([{...u, id: Math.random().toString(36).substr(2,9)}, ...users]);
        setEditing(null);
      }} />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
