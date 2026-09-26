"use client";
import { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  ShieldCheck,
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  FileText,
  Upload,
  Check,
  UserRound,
  Settings,
  BookOpen,
  LockKeyhole,
  Sparkles,
  Download,
  RefreshCw,
  ChevronRight,
  Clock,
  TriangleAlert,
  Save,
  Building2,
  Users,
  PanelLeftClose,
  Trash2,
  LogOut,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "sonner";
import {
  emptyCase,
  emptyParty,
  emptyProfile,
  partyFields,
  operationFields,
  identity,
  type CaseData,
  type Profile,
  type Party,
} from "@/lib/model";
import risks from "@/lib/risks.json";
import { extractionLabels, documentCategories } from "@/lib/extraction";

type RecordData = {
  id: string;
  version: number;
  updated: string;
  data: CaseData;
  documents?: any[];
  checks?: any[];
};
import {api, remove, importSeller} from './test-api';
function date(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger aria-label={label || "Choisir"}>
        <SelectValue placeholder="À renseigner" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({
  label,
  value,
  change,
  multiline = false,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className={multiline ? "field wide" : "field"}>
      <span>{label}</span>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => change(e.target.value)}
          rows={3}
        />
      ) : (
        <Input value={value} onChange={(e) => change(e.target.value)} />
      )}
    </label>
  );
}
const categories = [
  "Pièce d’identité",
  "Justificatif de domicile",
  "Justificatif de revenus",
  "Extrait Kbis",
  "Statuts",
  "Comptes certifiés",
  "Registre des bénéficiaires effectifs",
  "Preuve de contrôle des gels",
  "Autre",
];
export default function Workspace() {
  const [view, setView] = useState("dossiers"),
    [list, setList] = useState<RecordData[]>([]),
    [selected, setSelected] = useState<RecordData | null>(null),
    [profile, setProfile] = useState<Profile>(emptyProfile),
    [currentUser, setCurrentUser] = useState({ name: "", email: "" }),
    [ai, setAi] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [dirty, setDirty] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Tous les dossiers"),
    [tab, setTab] = useState("pieces"),
    [create, setCreate] = useState(false),
    [title, setTitle] = useState(""),
    [category, setCategory] = useState(categories[0]),
    [partyId, setPartyId] = useState("general"),
    [extraction, setExtraction] = useState<any>(null),
    [chosen, setChosen] = useState<number[]>([]),
    [target, setTarget] = useState(""),
    [reviewRole, setReviewRole] = useState("Vendeur");
  const input = useRef<HTMLInputElement>(null);
  async function loadList() {
    setError("");
    try {
      const [l, p] = await Promise.all([
        api("/api/dossiers"),
        api("/api/profile"),
      ]);
      setList(l);
      setProfile(p.profile);
      setAi(p.aiReady);
      setCurrentUser(
        typeof p.user === "string"
          ? { name: p.user, email: p.profile.email || "" }
          : p.user || { name: "", email: "" },
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadList();
    const receive = async (e: MessageEvent) => { if(e.origin!==location.origin || e.source!==parent || e.data?.type!=='cockpit-labft-seller')return; try { const id=await importSeller(e.data.seller); await loadList(); await open(id); } catch(err:any){toast.error(err.message);} };
    window.addEventListener('message',receive);parent.postMessage({type:'labft-ready'},location.origin);
    return ()=>window.removeEventListener('message',receive);
  }, []);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  }
  async function open(id: string) {
    await run("Chargement", async () => {
      const r = await api("/api/dossiers?id=" + id);
      setSelected(r);
      setDirty(false);
      setTab("pieces");
    });
  }
  async function save() {
    if (!selected) return;
    const r = await api("/api/dossiers", {
      id: selected.id,
      version: selected.version,
      data: selected.data,
    });
    const n = { ...selected, ...r };
    setSelected(n);
    setDirty(false);
    setList((prev) => prev.map((x) => (x.id === n.id ? n : x)));
    return n;
  }
  function update(p: Partial<CaseData>) {
    if (selected) {
      setSelected({
        ...selected,
        data: { ...selected.data, ...p, validated: false },
      });
      setDirty(true);
    }
  }
  function changeParty(id: string, key: string, value: string) {
    if (selected)
      update({
        parties: selected.data.parties.map((p) =>
          p.id === id ? { ...p, [key]: value } : p,
        ),
      });
  }
  async function back(next = "dossiers") {
    await run("Enregistrement", async () => {
      if (dirty) await save();
      setSelected(null);
      setView(next);
      loadList();
    });
  }
  function reviewAnalysis(x: any) {
    setExtraction(x);
    setChosen(x.fields.map((_: any, i: number) => i));
    setTarget(x.party || "__new");
    setReviewRole("Vendeur");
  }
  async function analyze(doc: any) {
    await run("Analyse de la pièce", async () => {
      if (dirty) await save();
      const x = doc.analysis
        ? JSON.parse(doc.analysis)
        : await api("/api/extract", { document: doc.id });
      setSelected(await api("/api/dossiers?id=" + selected!.id));
      reviewAnalysis(x);
    });
  }
  async function reanalyze(doc: any) {
    await run("Nouvelle analyse de la pièce", async () => {
      if (dirty) await save();
      const x = await api("/api/extract", { document: doc.id });
      setSelected(await api("/api/dossiers?id=" + selected!.id));
      reviewAnalysis(x);
    });
  }
  async function upload(files: FileList | null) {
    if (!files || !selected || busy) return;
    await run("Import des pièces", async () => {
      if (dirty) await save();
      let count = 0,
        analyzed = 0;
      const failures: string[] = [];
      for (const file of Array.from(files)) {
        setBusy("Import : " + file.name);
        const f = new FormData();
        f.set("file", file);
        f.set("dossier", selected.id);
        f.set("category", "À classer");
        f.set("party", "");
        try {
          const uploaded = await api("/api/documents", f);
          count++;
          if (ai) {
            setBusy("Classement et lecture : " + file.name);
            try {
              await api("/api/extract", { document: uploaded.id });
              analyzed++;
            } catch {
              failures.push(
                file.name + " : pièce conservée, analyse à relancer",
              );
            }
          }
        } catch {
          failures.push(file.name + " : import échoué");
        }
      }
      setSelected(await api("/api/dossiers?id=" + selected.id));
      toast.success(
        `${count} pièce(s) enregistrée(s) · ${analyzed} analyse(s) prête(s)`,
      );
      if (!ai)
        toast.info(
          "Pièces conservées. Le classement et la lecture démarreront une fois le service IA activé.",
        );
      if (failures.length) toast.error(failures.join(" ; "));
    });
    if (input.current) input.current.value = "";
  }
  async function analyzePending() {
    if (!selected) return;
    await run("Analyse des pièces en attente", async () => {
      if (dirty) await save();
      const failures: string[] = [];
      for (const doc of selected.documents || []) {
        if (doc.analysis) continue;
        setBusy("Classement et lecture : " + doc.name);
        try {
          await api("/api/extract", { document: doc.id });
        } catch (e: any) {
          failures.push(e.message);
        }
      }
      setSelected(await api("/api/dossiers?id=" + selected.id));
      if (failures.length)
        toast.error(`${failures.length} analyse(s) à relancer. ${failures[0]}`);
      else toast.success("Analyses prêtes à vérifier");
    });
  }
  async function deleteDocument(doc: any) {
    if (
      !selected ||
      !window.confirm(`Supprimer définitivement la pièce « ${doc.name} » ?`)
    )
      return;
    await run("Suppression de la pièce", async () => {
      await remove("/api/documents?id=" + encodeURIComponent(doc.id));
      setSelected(await api("/api/dossiers?id=" + selected.id));
      toast.success("Pièce supprimée");
    });
  }
  async function deleteDossier() {
    if (
      !selected ||
      !window.confirm(
        `Supprimer définitivement le dossier « ${selected.data.title} » et toutes ses pièces ?`,
      )
    )
      return;
    await run("Suppression du dossier", async () => {
      await remove("/api/dossiers?id=" + encodeURIComponent(selected.id));
      setSelected(null);
      await loadList();
      toast.success("Dossier supprimé");
    });
  }
  function deleteParty(id: string, name: string) {
    if (
      !selected ||
      !window.confirm(
        `Supprimer l’intervenant « ${name || "sans nom"} » ? Les pièces resteront dans le dossier et pourront être réattribuées.`,
      )
    )
      return;
    update({ parties: selected.data.parties.filter((p) => p.id !== id) });
  }

  const d = selected?.data,
    docs = selected?.documents || [],
    checks = selected?.checks || [];
  const latest = checks[0]?.data;
  const currentCheck = !!(
    latest?.parties?.length &&
    d &&
    latest.parties.length === d.parties.length &&
    d.parties.every((p) =>
      latest.parties.some((c: any) => c.identity === identity(p)),
    )
  );
  const yes = risks.filter((r) => d?.answers[r.id] === "Oui");
  const score = yes.reduce((a, r) => a + r.score, 0);
  const answered = d ? risks.filter((r) => !!d.answers[r.id]).length : 0;
  const groups = Array.from(new Set(risks.map((r) => r.group)));
  const filtered = list.filter(
    (r) =>
      `${r.data.title} ${r.data.reference} ${r.data.address}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "Tous les dossiers" ||
        (filter === "Validés" ? r.data.validated : !r.data.validated)),
  );
  async function exportPdf() {
    if (!selected) return;
    await run("Génération du PDF", async () => {
      const current = dirty ? await save() : selected;
      if (!current) return;
      const { makePdf } = await import("@/lib/pdf");
      await makePdf(current, profile, docs, checks);
      toast.success("Rapport PDF téléchargé");
    });
  }
  return (
    <SidebarProvider>
      <Sidebar className="navigation">
        <SidebarHeader>
          <div className="brand">
            <img src="/labft/logo-tribu-immo.jpeg" alt="Tribu Immo" />
            <div className="brand-divider" />
            <div>
              <strong>Vigilance</strong>
              <small>ESPACE LAB-FT</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label">ESPACE CONSEILLER</div>
          <SidebarMenu>
            {[
              { id: "dossiers", label: "Mes dossiers", icon: FolderOpen },
              { id: "referentiel", label: "Référentiel iad", icon: BookOpen },
              { id: "profile", label: "Mes coordonnées", icon: UserRound },
            ].map((n) => (
              <SidebarMenuItem key={n.id}>
                <SidebarMenuButton
                  isActive={view === n.id}
                  onClick={() => back(n.id)}
                >
                  <n.icon />
                  <span>{n.label}</span>
                  {n.id === "dossiers" && (
                    <span className="nav-count">{list.length}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="sidebar-note">
            <ShieldCheck size={25} />
            <h3>La vigilance, à chaque étape.</h3>
            <p>
              Identifiez, documentez et conservez la trace de vos contrôles.
            </p>
            <a
              href="https://gels-avoirs.dgtresor.gouv.fr/"
              target="_blank"
              rel="noreferrer"
            >
              Registre officiel <ArrowUpRight size={16} />
            </a>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <button className="profile-chip" onClick={() => back("profile")}>
            <div className="avatar">
              {(profile.firstName?.[0] || "C") + (profile.name?.[0] || "")}
            </div>
            <div>
              <strong>
                {[profile.firstName, profile.name].filter(Boolean).join(" ") ||
                  "Mon profil conseiller"}
              </strong>
              <small>Conseiller immobilier iad</small>
            </div>
            <Settings size={17} />
          </button>
        </SidebarFooter>
      </Sidebar>
      <main className="main">
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span>Espace conseiller</span>
            <ChevronRight size={14} />
            <strong>
              {selected
                ? "Dossier client"
                : view === "profile"
                  ? "Mes coordonnées"
                  : view === "referentiel"
                    ? "Référentiel iad"
                    : "Mes dossiers"}
            </strong>
          </div>
          <div className="account-area">
            <span className="private">
              <LockKeyhole size={14} /> Test local
            </span>
            <span className="account-name">
              {currentUser.email || currentUser.name}
            </span>
            <a
              className="signout"
              href="/"
              title="Retour au Cockpit"
              aria-label="Se déconnecter"
            >
              <LogOut size={15} />
            </a>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="notice error">
              {error}
              <Button variant="outline" onClick={loadList}>
                Réessayer
              </Button>
            </div>
          )}
          {view === "dossiers" && !selected && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">GESTION DES DOSSIERS</div>
                  <h1>
                    {profile.firstName
                      ? `Bienvenue ${profile.firstName}`
                      : "Votre espace LAB-FT"}
                  </h1>
                  <p>
                    Vos dossiers, vos pièces et vos rapports dans un espace
                    personnel séparé de ceux des autres conseillers.
                  </p>
                </div>
                <Button className="primary" onClick={() => setCreate(true)}>
                  <Plus size={18} /> Nouveau dossier
                </Button>
              </div>
              {!profile.name && !loading && (
                <div className="personal-onboarding">
                  <div className="onboarding-icon">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <strong>Finalisez votre espace conseiller</strong>
                    <p>
                      Ajoutez vos coordonnées une seule fois : elles seront
                      reprises automatiquement sur chacun de vos rapports PDF.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setView("profile")}>
                    Compléter mon profil
                  </Button>
                </div>
              )}
              <div className="stats">
                <div className="stat">
                  <span>
                    Dossiers enregistrés <FolderOpen />
                  </span>
                  <strong>{list.length.toString().padStart(2, "0")}</strong>
                  <small>Votre portefeuille LAB-FT</small>
                </div>
                <div className="stat">
                  <span>
                    À compléter <Clock />
                  </span>
                  <strong>
                    {list
                      .filter((x) => !x.data.validated)
                      .length.toString()
                      .padStart(2, "0")}
                  </strong>
                  <small>Avant validation du conseiller</small>
                </div>
                <div className="stat">
                  <span>
                    Validés par vos soins <ShieldCheck />
                  </span>
                  <strong>
                    {list
                      .filter((x) => x.data.validated)
                      .length.toString()
                      .padStart(2, "0")}
                  </strong>
                  <small>Données revues par le conseiller</small>
                </div>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    Mes dossiers <span className="count">{list.length}</span>
                  </h2>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <Input
                        aria-label="Rechercher un dossier"
                        placeholder="Rechercher un dossier…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Choice
                      value={filter}
                      onChange={setFilter}
                      options={["Tous les dossiers", "À compléter", "Validés"]}
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DOSSIER / TRANSACTION</TableHead>
                      <TableHead>INTERVENANTS</TableHead>
                      <TableHead>STATUT</TableHead>
                      <TableHead>DERNIÈRE MODIFICATION</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="case-row"
                        onClick={() => open(r.id)}
                      >
                        <TableCell>
                          <div className="case-name">
                            <div className="folder-icon">
                              <FolderOpen size={21} />
                            </div>
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  open(r.id);
                                }}
                              >
                                {r.data.title}
                              </button>
                              <small>
                                {r.data.reference ||
                                  r.data.address ||
                                  "Référence à renseigner"}
                              </small>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.data.parties.length} intervenant(s)
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              "badge " + (r.data.validated ? "green" : "amber")
                            }
                          >
                            {r.data.validated
                              ? "Données validées"
                              : "À compléter"}
                          </span>
                        </TableCell>
                        <TableCell className="muted">
                          {date(r.updated)}
                        </TableCell>
                        <TableCell>
                          <ChevronRight size={18} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!filtered.length && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FolderOpen size={33} />
                    </div>
                    <h3>
                      {loading
                        ? "Chargement des dossiers…"
                        : list.length
                          ? "Aucun dossier ne correspond"
                          : "Votre premier dossier commence ici"}
                    </h3>
                    <p>
                      {list.length
                        ? "Modifiez votre recherche pour retrouver un dossier."
                        : "Créez un dossier, ajoutez les intervenants puis déposez leurs pièces."}
                    </p>
                    {!list.length && !loading && (
                      <Button variant="outline" onClick={() => setCreate(true)}>
                        <Plus size={16} /> Créer un dossier
                      </Button>
                    )}
                  </div>
                )}
              </section>
              <div className="workflow-strip">
                {[
                  {
                    n: "01",
                    t: "Rassembler",
                    s: "Pièces et identités",
                    i: Upload,
                  },
                  {
                    n: "02",
                    t: "Vérifier",
                    s: "Risques et gel des avoirs",
                    i: ShieldCheck,
                  },
                  {
                    n: "03",
                    t: "Conserver",
                    s: "Rapport PDF personnalisé",
                    i: FileText,
                  },
                ].map((x) => (
                  <div key={x.n}>
                    <span>{x.n}</span>
                    <x.i size={21} />
                    <div>
                      <strong>{x.t}</strong>
                      <small>{x.s}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="footnote">
                <LockKeyhole size={15} /> Chaque conseiller ne retrouve que ses
                propres dossiers dans son espace.
              </div>
            </>
          )}
          {selected && d && (
            <>
              <div className="page-heading detail-heading">
                <div>
                  <button className="back" onClick={() => back()}>
                    <ArrowLeft size={15} /> Mes dossiers
                  </button>
                  <h1>{d.title}</h1>
                  <p>
                    {d.reference || "Référence à renseigner"}{" "}
                    <span className="dot-separator">·</span> Modifié le{" "}
                    {date(selected.updated)}
                  </p>
                </div>
                <div className="actions">
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={deleteDossier}
                  >
                    <Trash2 size={16} /> Supprimer le dossier
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy || !dirty}
                    onClick={() =>
                      run("Enregistrement", async () => {
                        await save();
                        toast.success("Dossier enregistré");
                      })
                    }
                  >
                    <Save size={16} />
                    {dirty ? "Enregistrer" : "Enregistré"}
                  </Button>
                  <Button
                    className="primary"
                    disabled={!!busy}
                    onClick={exportPdf}
                  >
                    <Download size={16} /> Exporter le PDF
                  </Button>
                </div>
              </div>
              <div className="dossier-summary">
                <div>
                  <span
                    className={"badge " + (d.validated ? "green" : "amber")}
                  >
                    {d.validated
                      ? "Données validées"
                      : "Dossier en préparation"}
                  </span>
                  <span>
                    <Users size={16} />
                    {d.parties.length} intervenant(s)
                  </span>
                  <span>
                    <FileText size={16} />
                    {docs.length} pièce(s)
                  </span>
                </div>
                <small>
                  {dirty
                    ? "Modifications à enregistrer"
                    : "Enregistrement à jour"}
                </small>
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="case-tabs" variant="line">
                  {[
                    ["pieces", "1. Pièces"],
                    ["identites", "2. Identités"],
                    ["operation", "3. Opération & risques"],
                    ["gels", "4. Gel des avoirs"],
                    ["rapport", "5. Rapport"],
                  ].map(([k, v]) => (
                    <TabsTrigger value={k} key={k}>
                      {v}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="pieces">
                  <div className="two-column">
                    <section className="panel padded">
                      <div className="section-title">
                        <div>
                          <h2>Pièces justificatives</h2>
                          <p>PDF, JPG et PNG · 10 Mo maximum par fichier</p>
                        </div>
                        <span className="count">{docs.length}</span>
                      </div>
                      <div className="notice">
                        <Sparkles size={19} />
                        <span>
                          {ai
                            ? "Déposez vos pièces ensemble : l’IA les classe et extrait leurs informations automatiquement."
                            : "Déposez vos pièces sans les trier. Elles seront conservées en attente de l’activation du service IA."}
                        </span>
                      </div>
                      <div
                        className="drop-zone"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!busy) upload(e.dataTransfer.files);
                        }}
                      >
                        <div className="upload-icon">
                          <Upload size={25} />
                        </div>
                        <h3>Déposez vos pièces, l’IA prépare le dossier</h3>
                        <p>
                          Pièces d’identité, domicile, revenus, Kbis,
                          financement…
                        </p>
                        <Button
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => input.current?.click()}
                        >
                          Parcourir les fichiers
                        </Button>
                        <input
                          ref={input}
                          type="file"
                          multiple
                          accept="application/pdf,image/jpeg,image/png"
                          hidden
                          onChange={(e) => upload(e.target.files)}
                        />
                      </div>
                      <div className="document-list">
                        <div className="actions" style={{ marginTop: 20 }}>
                          <Button
                            variant="outline"
                            disabled={
                              !!busy ||
                              !ai ||
                              !docs.some((doc) => !doc.analysis)
                            }
                            onClick={analyzePending}
                          >
                            <Sparkles size={16} /> Analyser les pièces en
                            attente
                          </Button>
                        </div>
                        {docs.map((doc) => (
                          <div className="document" key={doc.id}>
                            <FileText size={22} />
                            <div>
                              <a href={doc.url} download={doc.name}>
                                {doc.name}
                              </a>
                              <small>
                                {doc.category} · {Math.ceil(doc.size / 1024)} Ko
                                ·{" "}
                                {d.parties.find((p) => p.id === doc.party)
                                  ?.name || "Intervenant à confirmer"}
                              </small>
                              <small>
                                {doc.analysis
                                  ? JSON.parse(doc.analysis).reviewed
                                    ? "Informations validées"
                                    : "Informations extraites · À vérifier"
                                  : "En attente d’analyse IA"}
                              </small>
                            </div>
                            <div className="actions">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!!busy || (!ai && !doc.analysis)}
                                onClick={() => analyze(doc)}
                              >
                                <Sparkles size={16} />
                                {doc.analysis ? "Vérifier" : "Analyser"}
                              </Button>
                              {doc.analysis && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!!busy || !ai}
                                  onClick={() => reanalyze(doc)}
                                >
                                  <RefreshCw size={16} />
                                  Relancer l’IA
                                </Button>
                              )}
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={"Supprimer " + doc.name}
                                disabled={!!busy}
                                onClick={() => deleteDocument(doc)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                    <aside>
                      <div className="guidance blue">
                        <Sparkles size={25} />
                        <h3>
                          L’IA prépare.
                          <br />
                          Vous validez.
                        </h3>
                        <p>
                          L’IA reconnaît la pièce, extrait les données et
                          propose le bon intervenant. Vous vérifiez les valeurs
                          avant leur enregistrement.
                        </p>
                        <div className="mini-status">
                          {ai
                            ? "Extraction disponible"
                            : "Extraction IA à activer"}
                        </div>
                        {!ai && (
                          <small>
                            Le service IA doit être connecté par
                            l’administrateur. La saisie manuelle reste
                            disponible.
                          </small>
                        )}
                      </div>
                      <div className="guidance">
                        <h3>Les pièces à prévoir</h3>
                        <p>
                          <strong>Personne physique</strong>
                          <br />
                          Identité et domicile récent. Pour l’acquéreur :
                          revenus et patrimoine.
                        </p>
                        <p>
                          <strong>Personne morale</strong>
                          <br />
                          Identité du représentant, Kbis, statuts, comptes
                          certifiés et bénéficiaires effectifs.
                        </p>
                        <small>Selon le questionnaire iad fourni.</small>
                        <Button
                          variant="link"
                          onClick={() => setTab("identites")}
                        >
                          Renseigner les intervenants <ChevronRight size={15} />
                        </Button>
                      </div>
                    </aside>
                  </div>
                </TabsContent>
                <TabsContent value="identites">
                  <section className="panel padded">
                    <div className="section-title">
                      <div>
                        <h2>Les intervenants du dossier</h2>
                        <p>
                          Ajoutez les vendeurs, acquéreurs, représentants et
                          bénéficiaires effectifs.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          update({ parties: [...d.parties, emptyParty()] })
                        }
                      >
                        <Plus size={16} /> Ajouter
                      </Button>
                    </div>
                    {!d.parties.length && (
                      <div className="empty-state">
                        <Users size={32} />
                        <h3>Qui participe à la transaction ?</h3>
                        <p>
                          Ajoutez chaque personne à identifier et à contrôler.
                        </p>
                        <Button
                          className="primary"
                          onClick={() => update({ parties: [emptyParty()] })}
                        >
                          Ajouter un intervenant
                        </Button>
                      </div>
                    )}
                    {d.parties.map((p, i) => (
                      <div className="party-card" key={p.id}>
                        <div className="section-title">
                          <h3>
                            <span className="number-chip">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {p.firstName} {p.name || "Nouvel intervenant"}
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!!busy}
                            onClick={() =>
                              deleteParty(
                                p.id,
                                [p.firstName, p.name].filter(Boolean).join(" "),
                              )
                            }
                          >
                            <Trash2 size={16} /> Supprimer
                          </Button>
                        </div>
                        <div className="form-grid">
                          <label className="field">
                            <span>Rôle dans l’opération</span>
                            <Choice
                              value={p.role}
                              options={[
                                "Vendeur",
                                "Acquéreur",
                                "Bénéficiaire effectif",
                                "Représentant",
                                "Autre intervenant",
                              ]}
                              onChange={(v) => changeParty(p.id, "role", v)}
                            />
                          </label>
                          <label className="field">
                            <span>Nature</span>
                            <Choice
                              value={p.kind}
                              options={["Personne physique", "Personne morale"]}
                              onChange={(v) => changeParty(p.id, "kind", v)}
                            />
                          </label>
                          {Object.entries(partyFields)
                            .filter(([key]) =>
                              p.kind === "Personne morale"
                                ? ![
                                    "firstName",
                                    "birthDate",
                                    "birthPlace",
                                    "nationality",
                                    "profession",
                                    "salary",
                                    "income",
                                    "loans",
                                  ].includes(key)
                                : ![
                                    "registration",
                                    "representative",
                                    "activity",
                                  ].includes(key),
                            )
                            .map(([key, label]) => (
                              <Field
                                key={key}
                                label={label}
                                value={(p as any)[key]}
                                change={(v) => changeParty(p.id, key, v)}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </section>
                </TabsContent>
                <TabsContent value="operation">
                  <section className="panel padded">
                    <div className="section-title">
                      <div>
                        <h2>La transaction & son financement</h2>
                        <p>
                          Informations issues du questionnaire d’application
                          iad.
                        </p>
                      </div>
                      <Building2 size={25} />
                    </div>
                    <div className="form-grid">
                      {Object.entries(operationFields).map(([k, v]) => (
                        <Field
                          key={k}
                          label={v}
                          value={(d as any)[k]}
                          multiline={[
                            "observations",
                            "decision",
                            "foreignFunds",
                          ].includes(k)}
                          change={(v) => update({ [k]: v })}
                        />
                      ))}
                    </div>
                  </section>
                  <section className="panel padded risk-panel">
                    <div className="section-title">
                      <div>
                        <h2>Cartographie des risques</h2>
                        <p>
                          {answered} / {risks.length} critères renseignés ·
                          Modèle iad fourni
                        </p>
                      </div>
                      <div className="score">
                        <strong>{score}</strong>
                        <span>points relevés</span>
                      </div>
                    </div>
                    <Progress value={(answered / risks.length) * 100} />
                    <p className="muted small">
                      Le score additionne les réponses « Oui ». Aucune
                      conclusion automatique de conformité n’est déduite du
                      total.
                    </p>
                    {groups.map((g) => (
                      <details className="risk-group" key={g}>
                        <summary>
                          {g}
                          <span>
                            {
                              risks.filter(
                                (r) => r.group === g && d.answers[r.id],
                              ).length
                            }
                            /{risks.filter((r) => r.group === g).length}
                          </span>
                        </summary>
                        {risks
                          .filter((r) => r.group === g)
                          .map((r) => (
                            <div className="risk-row" key={r.id}>
                              <div>
                                <p>{r.text}</p>
                                <small>{r.score} point(s) si oui</small>
                                {d.answers[r.id] === "Oui" && r.advice && (
                                  <div className="risk-advice">{r.advice}</div>
                                )}
                              </div>
                              <Choice
                                label={r.text}
                                value={d.answers[r.id] || ""}
                                options={["Oui", "Non", "Non applicable"]}
                                onChange={(v) =>
                                  update({
                                    answers: { ...d.answers, [r.id]: v as any },
                                  })
                                }
                              />
                            </div>
                          ))}
                      </details>
                    ))}
                  </section>
                </TabsContent>
                <TabsContent value="gels">
                  <section className="panel padded">
                    <div className="section-title">
                      <div>
                        <h2>Registre national des gels</h2>
                        <p>
                          Contrôle de tous les intervenants enregistrés dans le
                          dossier.
                        </p>
                      </div>
                      <ShieldCheck size={27} />
                    </div>
                    <div className="register-banner">
                      <div>
                        <span className="eyebrow">SOURCE OFFICIELLE</span>
                        <h3>Direction générale du Trésor</h3>
                        <p>
                          La recherche inclut les noms et alias. Les homonymies
                          doivent être examinées.
                        </p>
                      </div>
                      <a
                        href="https://gels-avoirs.dgtresor.gouv.fr/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir le registre <ArrowUpRight size={17} />
                      </a>
                    </div>
                    <div className="actions">
                      <Button
                        className="primary"
                        disabled={!!busy || !d.parties.length}
                        onClick={() =>
                          run("Contrôle du registre", async () => {
                            if (dirty) await save();
                            await api("/api/check", { id: selected.id });
                            setSelected(
                              await api("/api/dossiers?id=" + selected.id),
                            );
                            toast.success("Résultat du contrôle enregistré");
                          })
                        }
                      >
                        <RefreshCw size={17} /> Lancer le contrôle
                      </Button>
                      <span className="muted small">
                        {d.parties.length} intervenant(s) à rechercher
                      </span>
                    </div>
                    {!checks.length && (
                      <div className="empty-state compact">
                        <ShieldCheck size={32} />
                        <h3>Aucun contrôle effectué</h3>
                        <p>
                          Le résultat et l’heure de la recherche seront
                          conservés dans le dossier.
                        </p>
                      </div>
                    )}
                    {latest && !currentCheck && latest.parties?.length > 0 && (
                      <div className="notice">
                        L’identité des intervenants a changé. Relancez le
                        contrôle.
                      </div>
                    )}
                    {checks.map((c, i) => (
                      <details
                        className="check-history"
                        key={c.id}
                        open={i === 0}
                      >
                        <summary>
                          Contrôle du {date(c.created)}{" "}
                          {i === 0 && (
                            <span className="badge neutral">
                              Dernier contrôle
                            </span>
                          )}
                        </summary>
                        {c.data.error ? (
                          <div className="notice error">{c.data.error}</div>
                        ) : (
                          <>
                            <p className="small muted">
                              Publication du registre : {c.data.published} ·{" "}
                              {c.data.total} entrées examinées
                            </p>
                            {c.data.parties.map((p: any) => (
                              <div className="check-party" key={p.partyId}>
                                <div>
                                  <strong>{p.name}</strong>
                                  <span
                                    className={
                                      "badge " + (p.count ? "amber" : "neutral")
                                    }
                                  >
                                    {p.status}
                                  </span>
                                </div>
                                {p.count > 0 && (
                                  <p>
                                    {p.count} correspondance(s) possible(s).
                                    Comparez les prénoms, la date et le lieu de
                                    naissance avec le registre officiel. Les 50
                                    premières fiches sont affichées.
                                  </p>
                                )}
                                {p.hits.map((h: any) => (
                                  <details key={h.IdRegistre}>
                                    <summary>
                                      {h.Nom} · Registre n° {h.IdRegistre}
                                    </summary>
                                    <pre>
                                      {JSON.stringify(
                                        h.RegistreDetail,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </details>
                                ))}
                              </div>
                            ))}
                            <p className="small muted">{c.data.method}</p>
                          </>
                        )}
                      </details>
                    ))}
                  </section>
                </TabsContent>
                <TabsContent value="rapport">
                  <div className="two-column">
                    <section className="panel padded">
                      <div className="section-title">
                        <div>
                          <h2>Votre rapport LAB-FT</h2>
                          <p>
                            Un PDF structuré avec une page de synthèse, vos
                            coordonnées et la trace des contrôles.
                          </p>
                        </div>
                        <FileText size={27} />
                      </div>
                      <div className="report-preview">
                        <img src="/labft/logo-tribu-immo.jpeg" alt="Tribu Immo" />
                        <div className="report-rule" />
                        <span>DOSSIER DE VIGILANCE</span>
                        <h2>{d.title}</h2>
                        <p>{d.address || "Adresse du bien à compléter"}</p>
                        <div className="report-lines">
                          <div>
                            <span>Conseiller</span>
                            <strong>
                              {profile.firstName}{" "}
                              {profile.name || "À renseigner"}
                            </strong>
                          </div>
                          <div>
                            <span>Intervenants</span>
                            <strong>{d.parties.length}</strong>
                          </div>
                          <div>
                            <span>Pièces jointes référencées</span>
                            <strong>{docs.length}</strong>
                          </div>
                          <div>
                            <span>Contrôle des gels</span>
                            <strong>
                              {currentCheck
                                ? "Recherche enregistrée"
                                : "À effectuer / renouveler"}
                            </strong>
                          </div>
                        </div>
                        <small>
                          {d.validated
                            ? "Données validées par le conseiller"
                            : "Document de travail • À compléter et vérifier"}
                        </small>
                      </div>
                      <Button
                        className="primary"
                        disabled={!!busy}
                        onClick={exportPdf}
                      >
                        <Download size={17} /> Télécharger le rapport PDF
                      </Button>
                    </section>
                    <aside>
                      <div className="guidance">
                        <h3>Avant de finaliser</h3>
                        {[
                          [
                            "Coordonnées du conseiller",
                            !!(profile.name && profile.email && profile.phone),
                          ],
                          [
                            "Intervenants identifiés",
                            !!d.parties.length &&
                              d.parties.every((p) => !!p.name),
                          ],
                          [
                            "Critères de risque renseignés",
                            answered === risks.length,
                          ],
                          ["Contrôle des gels à jour", currentCheck],
                        ].map(([t, ok]) => (
                          <div className="checklist" key={String(t)}>
                            {ok ? <Check size={17} /> : <Clock size={17} />}
                            <span>{t}</span>
                          </div>
                        ))}
                        <label className="validation">
                          <Checkbox
                            checked={d.validated}
                            disabled={!!busy}
                            onCheckedChange={(v) => {
                              setSelected({
                                ...selected,
                                data: { ...d, validated: !!v },
                              });
                              setDirty(true);
                            }}
                          />
                          <span>
                            J’ai relu les données et les pièces. Cette
                            validation personnelle ne vaut pas avis de
                            conformité iad.
                          </span>
                        </label>
                        <p className="small muted">
                          Le rapport classe les informations par rubrique et
                          signale clairement les champs manquants, les risques
                          et les contrôles à renouveler. Les originaux restent
                          téléchargeables dans les pièces.
                        </p>
                      </div>
                    </aside>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
          {view === "profile" && !selected && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PERSONNALISATION DU RAPPORT</div>
                  <h1>Mes coordonnées</h1>
                  <p>
                    Ces informations figureront sur les rapports de vos dossiers
                    et sont conservées dans ce navigateur uniquement.
                  </p>
                </div>
              </div>
              <section className="panel padded narrow">
                <div className="profile-privacy">
                  <LockKeyhole size={18} />
                  <div>
                    <strong>Profil personnel</strong>
                    <p>
                      Espace local :{" "}
                      {currentUser.email || "ce navigateur (test)"}. Aucune synchronisation entre appareils. Ne pas utiliser de pièces réelles.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  {Object.entries({
                    firstName: "Prénom",
                    name: "Nom",
                    email: "E-mail professionnel",
                    phone: "Téléphone",
                    status: "Statut (EI ou EIRL)",
                    city: "Ville du RSAC",
                    rsac: "Numéro RSAC",
                  }).map(([k, l]) => (
                    <Field
                      key={k}
                      label={l}
                      value={(profile as any)[k]}
                      change={(v) => setProfile({ ...profile, [k]: v })}
                    />
                  ))}
                </div>
                <Button
                  className="primary"
                  disabled={!!busy}
                  onClick={() =>
                    run("Enregistrement du profil", async () => {
                      await api("/api/profile", profile);
                      toast.success("Coordonnées enregistrées");
                    })
                  }
                >
                  <Save size={16} /> Enregistrer mes coordonnées
                </Button>
              </section>
            </>
          )}
          {view === "referentiel" && !selected && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DOCUMENTATION</div>
                  <h1>Le référentiel de votre équipe</h1>
                  <p>
                    Les sources utilisées pour préparer vos dossiers LAB-FT.
                  </p>
                </div>
              </div>
              <section className="panel padded">
                <h2>Vos documents iad</h2>
                {[
                  {
                    t: "Questionnaire d’application procédure TRACFIN",
                    d: "Identités, opération, financement et synthèse.",
                    href: "/labft/references/questionnaire.pdf",
                  },
                  {
                    t: "Cartographie des risques iad France",
                    d: `${risks.length} critères repris dans les dossiers, avec leurs pondérations et préconisations.`,
                    href: "/labft/references/cartographie.xlsx",
                  },
                  {
                    t: "Charte graphique iad 2025",
                    d: "Bleu iad, typographie Montserrat et logo provenant du document fourni.",
                    href: "/labft/references/charte.pdf",
                  },
                ].map((r) => (
                  <a className="reference-row" key={r.t} href={r.href} download>
                    <FileText />
                    <div>
                      <strong>{r.t}</strong>
                      <p>{r.d}</p>
                    </div>
                    <Download size={19} />
                  </a>
                ))}
                <div className="notice">
                  Le classeur fourni affiche des totaux différents dans sa
                  cartographie et sa synthèse. L’application additionne les
                  pondérations des critères renseignés, sans reprendre ces
                  totaux ni inventer un seuil de décision.
                </div>
                <h2>Registre officiel du gel des avoirs</h2>
                <p>
                  La recherche automatisée utilise le flux publié par la DG
                  Trésor. En cas d’indisponibilité, le contrôle reste non
                  réalisé : effectuez la recherche officielle et ajoutez sa
                  preuve au dossier.
                </p>
                <a
                  className="text-link"
                  target="_blank"
                  rel="noreferrer"
                  href="https://www.tresor.economie.gouv.fr/services-aux-entreprises/sanctions-economiques/registre-national-des-gels-foire-aux-questions"
                >
                  Consulter la FAQ de la DG Trésor <ArrowUpRight size={17} />
                </a>
              </section>
            </>
          )}
          <footer>
            iad · Vigilance LAB-FT{" "}
            <span>Outil de travail indépendant pour votre équipe</span>
          </footer>
        </div>
      </main>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier LAB-FT</DialogTitle>
            <DialogDescription>
              Choisissez un nom pour retrouver facilement la transaction.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("Création du dossier", async () => {
                const data = emptyCase(title.trim());
                const r = await api("/api/dossiers", { data });
                setCreate(false);
                setTitle("");
                setSelected({ ...r, data, documents: [], checks: [] });
                setDirty(false);
                setView("dossiers");
                setTab("pieces");
                setList((prev) => [{ ...r, data }, ...prev]);
              });
            }}
          >
            <Field label="Nom du dossier" value={title} change={setTitle} />
            <p className="small muted">Exemple : Vente maison · Narbonne</p>
            <Button
              className="primary full"
              disabled={!!busy || !title.trim()}
              type="submit"
            >
              Créer le dossier <ChevronRight size={17} />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!extraction}
        onOpenChange={(v) => {
          if (!v) setExtraction(null);
        }}
      >
        <DialogContent className="extraction-dialog">
          <DialogHeader>
            <DialogTitle>Vérifier les données extraites</DialogTitle>
            <DialogDescription>
              {extraction?.name} · Sélectionnez uniquement les valeurs vérifiées
              sur la pièce.
            </DialogDescription>
          </DialogHeader>
          {extraction && (
            <>
              <label className="field">
                <span>Catégorie détectée</span>
                <Choice
                  value={extraction.category}
                  options={[...documentCategories]}
                  onChange={(v) =>
                    setExtraction({ ...extraction, category: v })
                  }
                />
              </label>
              {extraction.note && <p className="notice">{extraction.note}</p>}
              {extraction.scope === "operation" ? (
                <p>
                  Ces informations seront reportées dans l’opération et son
                  financement.
                </p>
              ) : (
                <>
                  <label className="field">
                    <span>Intervenant destinataire</span>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un intervenant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new">
                          Créer un nouvel intervenant
                        </SelectItem>
                        {d?.parties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.firstName} {p.name || "Intervenant"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {target === "__new" && (
                    <label className="field">
                      <span>Rôle dans l’opération</span>
                      <Choice
                        value={reviewRole}
                        onChange={setReviewRole}
                        options={[
                          "Vendeur",
                          "Acquéreur",
                          "Bénéficiaire effectif",
                          "Représentant",
                          "Autre intervenant",
                        ]}
                      />
                    </label>
                  )}
                </>
              )}
              {!extraction.fields.length && (
                <p>
                  Aucune donnée exploitable n’a été extraite. Complétez les
                  informations manuellement.
                </p>
              )}
              <div className="extraction-fields">
                {extraction.fields.map((x: any, i: number) => (
                  <div key={i}>
                    <Checkbox
                      checked={chosen.includes(i)}
                      onCheckedChange={(v) =>
                        setChosen(
                          v ? [...chosen, i] : chosen.filter((n) => n !== i),
                        )
                      }
                    />
                    <div>
                      <strong>
                        {extractionLabels(extraction.scope)[x.key]}
                      </strong>
                      <Input
                        aria-label={extractionLabels(extraction.scope)[x.key]}
                        value={x.value}
                        onChange={(e) =>
                          setExtraction({
                            ...extraction,
                            fields: extraction.fields.map(
                              (f: any, j: number) =>
                                j === i ? { ...f, value: e.target.value } : f,
                            ),
                          })
                        }
                      />
                      <small>
                        Page {x.page || "?"} · « {x.evidence} »
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <p className="small muted">
                Les champs cochés remplaceront les valeurs existantes du
                destinataire choisi. Les citations de la pièce restent
                conservées avec l’analyse.
              </p>
              <Button
                className="primary"
                disabled={
                  !!busy ||
                  (!target && extraction.scope !== "operation") ||
                  !chosen.length
                }
                onClick={() =>
                  run("Validation des informations", async () => {
                    if (!selected) return;
                    const current = dirty ? await save() : selected;
                    if (!current) return;
                    await api("/api/review", {
                      document: extraction.document,
                      version: current.version,
                      target,
                      role: reviewRole,
                      category: extraction.category,
                      fields: extraction.fields
                        .filter((_: any, i: number) => chosen.includes(i))
                        .map((x: any) => ({ key: x.key, value: x.value })),
                    });
                    setSelected(await api("/api/dossiers?id=" + selected.id));
                    setDirty(false);
                    setExtraction(null);
                    toast.success("Pièce classée et informations enregistrées");
                  })
                }
              >
                Valider et enregistrer les informations
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {busy && (
        <div className="busy" role="status">
          <RefreshCw className="spin" size={17} />
          {busy}…
        </div>
      )}
      <Toaster position="bottom-right" richColors />
    </SidebarProvider>
  );
}
