import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import risks from "./risks.json";
import { identity, operationFields, partyFields, type Profile } from "./model";

type Assets = { font?: Uint8Array; boldFont?: Uint8Array; logo?: Uint8Array };
const W = 595,
  H = 842,
  M = 45,
  CONTENT = W - M * 2;
const blue = rgb(0, 0.55, 0.76),
  cyan = rgb(0, 0.71, 0.93),
  navy = rgb(0.12, 0.2, 0.29),
  muted = rgb(0.39, 0.46, 0.52);
const lineColor = rgb(0.86, 0.9, 0.92),
  paleBlue = rgb(0.92, 0.98, 1),
  paleGrey = rgb(0.97, 0.98, 0.985);
const green = rgb(0.14, 0.49, 0.32),
  paleGreen = rgb(0.91, 0.97, 0.93),
  amber = rgb(0.59, 0.39, 0.12),
  paleAmber = rgb(1, 0.96, 0.87),
  red = rgb(0.66, 0.2, 0.18),
  paleRed = rgb(1, 0.93, 0.92);

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim();
}
function formatDate(value: unknown, withTime = false) {
  const raw = clean(value);
  if (!raw) return "Non renseigné";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
function formatSize(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "Taille non renseignée";
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export async function buildPdf(
  record: any,
  profile: Profile,
  documents: any[],
  checks: any[],
  assets?: Assets,
) {
  const pdf = await PDFDocument.create();
  const advisor = [profile.firstName, profile.name].filter(Boolean).join(" ");
  pdf.setTitle(`Dossier LAB-FT - ${record.data.title}`);
  pdf.setAuthor(advisor || "Conseiller iad");
  pdf.setSubject("Dossier de vigilance LAB-FT");
  pdf.setCreator("iad · Vigilance LAB-FT");
  pdf.registerFontkit(fontkit);
  const regularBytes =
    assets?.font ||
    new Uint8Array(
      await (
        await fetch("/labft/fonts/montserrat-latin-400-normal.woff")
      ).arrayBuffer(),
    );
  const boldBytes =
    assets?.boldFont ||
    new Uint8Array(
      await (
        await fetch("/labft/fonts/montserrat-latin-600-normal.woff")
      ).arrayBuffer(),
    );
  const font = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const logoBytes =
    assets?.logo ||
    new Uint8Array(await (await fetch("/labft/logo-tribu-immo.jpeg")).arrayBuffer());
  const logo = await pdf.embedJpg(logoBytes);
  let page: PDFPage,
    y = 0,
    sectionNumber = 0;

  function wrap(value: unknown, maxWidth: number, size: number, face = font) {
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        continue;
      }
      let current = "";
      for (const word of words) {
        let chunks = [word];
        if (face.widthOfTextAtSize(word, size) > maxWidth) {
          chunks = [];
          let chunk = "";
          for (const character of word) {
            if (
              chunk &&
              face.widthOfTextAtSize(chunk + character, size) > maxWidth
            ) {
              chunks.push(chunk);
              chunk = "";
            }
            chunk += character;
          }
          if (chunk) chunks.push(chunk);
        }
        for (const chunk of chunks) {
          const candidate = current ? `${current} ${chunk}` : chunk;
          if (current && face.widthOfTextAtSize(candidate, size) > maxWidth) {
            lines.push(current);
            current = chunk;
          } else current = candidate;
        }
      }
      lines.push(current);
    }
    return lines;
  }
  function addHeader(target: PDFPage) {
    target.drawImage(logo, { x: M, y: 772, width: 59, height: 43 });
    target.drawText("VIGILANCE LAB-FT", {
      x: 126,
      y: 791,
      size: 10,
      font: bold,
      color: navy,
    });
    target.drawText(clean(record.data.title).slice(0, 60), {
      x: 126,
      y: 775,
      size: 8,
      font,
      color: muted,
    });
    target.drawRectangle({
      x: M,
      y: 757,
      width: CONTENT,
      height: 2,
      color: cyan,
    });
  }
  function newPage() {
    page = pdf.addPage([W, H]);
    addHeader(page);
    y = 731;
  }
  function ensure(height: number) {
    if (y - height < 58) newPage();
  }
  function paragraph(
    value: unknown,
    options: {
      size?: number;
      color?: ReturnType<typeof rgb>;
      face?: PDFFont;
      indent?: number;
      gap?: number;
    } = {},
  ) {
    const size = options.size ?? 9,
      indent = options.indent ?? 0,
      face = options.face ?? font;
    const rows = wrap(
      clean(value) || "Non renseigné",
      CONTENT - indent,
      size,
      face,
    );
    ensure(rows.length * size * 1.45 + (options.gap ?? 5));
    for (const row of rows) {
      page.drawText(row || " ", {
        x: M + indent,
        y,
        size,
        font: face,
        color: options.color ?? navy,
        maxWidth: CONTENT - indent,
      });
      y -= size * 1.45;
    }
    y -= options.gap ?? 5;
  }
  function section(title: string, description?: string) {
    sectionNumber += 1;
    ensure(description ? 75 : 53);
    y -= 6;
    page.drawRectangle({
      x: M,
      y: y - 31,
      width: CONTENT,
      height: 38,
      color: paleBlue,
    });
    page.drawRectangle({ x: M, y: y - 31, width: 5, height: 38, color: cyan });
    page.drawText(String(sectionNumber).padStart(2, "0"), {
      x: M + 16,
      y: y - 17,
      size: 10,
      font: bold,
      color: blue,
    });
    page.drawText(title, {
      x: M + 48,
      y: y - 18,
      size: 13,
      font: bold,
      color: navy,
    });
    y -= 48;
    if (description) paragraph(description, { size: 8, color: muted, gap: 9 });
  }
  function subsection(title: string) {
    ensure(36);
    y -= 5;
    page.drawText(title, { x: M, y, size: 10.5, font: bold, color: blue });
    y -= 9;
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: 0.7,
      color: lineColor,
    });
    y -= 15;
  }
  function keyValue(label: string, value: unknown, shaded = false) {
    const shown = clean(value) || "Non renseigné",
      labelWidth = 185,
      valueWidth = CONTENT - labelWidth - 22;
    const labelLines = wrap(label, labelWidth - 12, 8, bold),
      valueLines = wrap(shown, valueWidth, 9, font);
    const height =
      Math.max(labelLines.length * 11, valueLines.length * 13) + 12;
    ensure(height);
    if (shaded)
      page.drawRectangle({
        x: M,
        y: y - height + 6,
        width: CONTENT,
        height,
        color: paleGrey,
      });
    let rowY = y;
    for (const row of labelLines) {
      page.drawText(row, {
        x: M + 8,
        y: rowY,
        size: 8,
        font: bold,
        color: muted,
      });
      rowY -= 11;
    }
    rowY = y;
    for (const row of valueLines) {
      page.drawText(row, {
        x: M + labelWidth + 10,
        y: rowY,
        size: 9,
        font,
        color: shown === "Non renseigné" ? muted : navy,
      });
      rowY -= 13;
    }
    y -= height;
  }
  function statusBox(
    label: string,
    value: string,
    tone: "blue" | "green" | "amber" | "red",
  ) {
    const colors = {
      blue: [paleBlue, blue],
      green: [paleGreen, green],
      amber: [paleAmber, amber],
      red: [paleRed, red],
    } as const;
    const [background, foreground] = colors[tone];
    const rows = wrap(value, CONTENT - 28, 10, bold).slice(0, 3);
    const height = 35 + rows.length * 13;
    ensure(height + 8);
    page.drawRectangle({
      x: M,
      y: y - height + 7,
      width: CONTENT,
      height,
      color: background,
    });
    page.drawText(label.toUpperCase(), {
      x: M + 14,
      y: y - 8,
      size: 7,
      font: bold,
      color: foreground,
    });
    let rowY = y - 24;
    for (const row of rows) {
      page.drawText(row, {
        x: M + 14,
        y: rowY,
        size: 10,
        font: bold,
        color: foreground,
      });
      rowY -= 13;
    }
    y -= height + 7;
  }
  function summaryCard(
    x: number,
    width: number,
    label: string,
    value: string,
    note: string,
  ) {
    page.drawRectangle({ x, y: 402, width, height: 90, color: paleGrey });
    page.drawText(label.toUpperCase(), {
      x: x + 14,
      y: 470,
      size: 7,
      font: bold,
      color: muted,
    });
    page.drawText(value, {
      x: x + 14,
      y: 441,
      size: 19,
      font: bold,
      color: blue,
    });
    wrap(note, width - 28, 7.5)
      .slice(0, 2)
      .forEach((row, index) =>
        page.drawText(row, {
          x: x + 14,
          y: 420 - index * 11,
          size: 7.5,
          font,
          color: muted,
        }),
      );
  }

  const answered = risks.filter((risk) => record.data.answers[risk.id]);
  const positive = answered.filter(
    (risk) => record.data.answers[risk.id] === "Oui",
  );
  const score = positive.reduce((total, risk) => total + risk.score, 0);
  const latest = checks[0]?.data;
  const currentCheck = !!(
    latest?.parties?.length === record.data.parties.length &&
    record.data.parties.every((party: any) =>
      latest.parties.some((result: any) => result.identity === identity(party)),
    )
  );

  page = pdf.addPage([W, H]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: W,
    height: H,
    color: rgb(0.985, 0.992, 0.996),
  });
  page.drawRectangle({ x: 0, y: 742, width: W, height: 100, color: navy });
  page.drawImage(logo, { x: M, y: 766, width: 72, height: 52 });
  page.drawText("DOSSIER DE VIGILANCE", {
    x: M,
    y: 680,
    size: 10,
    font: bold,
    color: blue,
  });
  const titleLines = wrap(record.data.title, CONTENT, 24, bold).slice(0, 2);
  let titleY = 645;
  for (const row of titleLines) {
    page.drawText(row, { x: M, y: titleY, size: 24, font: bold, color: navy });
    titleY -= 32;
  }
  page.drawText(clean(record.data.address) || "Adresse du bien à compléter", {
    x: M,
    y: titleY - 2,
    size: 10,
    font,
    color: muted,
  });
  page.drawRectangle({
    x: M,
    y: titleY - 28,
    width: 78,
    height: 3,
    color: cyan,
  });
  page.drawText(
    record.data.validated
      ? "DOSSIER RELU PAR LE CONSEILLER"
      : "DOCUMENT DE TRAVAIL À VÉRIFIER",
    {
      x: M,
      y: 524,
      size: 9,
      font: bold,
      color: record.data.validated ? green : amber,
    },
  );
  const gap = 10,
    cardWidth = (CONTENT - gap * 2) / 3;
  summaryCard(
    M,
    cardWidth,
    "Intervenants",
    String(record.data.parties.length),
    "personnes ou entités renseignées",
  );
  summaryCard(
    M + cardWidth + gap,
    cardWidth,
    "Pièces",
    String(documents.length),
    "documents référencés dans le dossier",
  );
  summaryCard(
    M + (cardWidth + gap) * 2,
    cardWidth,
    "Critères",
    `${answered.length}/${risks.length}`,
    `${positive.length} « Oui » · ${score} point(s)`,
  );
  page.drawText("SYNTHÈSE DU DOSSIER", {
    x: M,
    y: 365,
    size: 10,
    font: bold,
    color: blue,
  });
  const summaryRows = [
    ["Référence du mandat", clean(record.data.reference) || "Non renseignée"],
    ["Conseiller", advisor || "Non renseigné"],
    [
      "Contrôle du gel des avoirs",
      currentCheck
        ? "À jour pour les identités actuelles"
        : "À effectuer ou à renouveler",
    ],
    ["Date d’édition", formatDate(new Date().toISOString(), true)],
  ];
  let coverY = 335;
  for (const [label, value] of summaryRows) {
    page.drawText(label, {
      x: M,
      y: coverY,
      size: 8,
      font: bold,
      color: muted,
    });
    const values = wrap(value, 295, 9, font).slice(0, 2);
    values.forEach((row, index) =>
      page.drawText(row, {
        x: 255,
        y: coverY - index * 12,
        size: 9,
        font,
        color: navy,
      }),
    );
    page.drawLine({
      start: { x: M, y: coverY - 12 },
      end: { x: W - M, y: coverY - 12 },
      thickness: 0.5,
      color: lineColor,
    });
    coverY -= values.length > 1 ? 38 : 30;
  }
  page.drawText("CONTENU", { x: M, y: 185, size: 8, font: bold, color: blue });
  page.drawText(
    "01 Opération   02 Intervenants   03 Pièces   04 Contrôles   05 Risques   06 Traçabilité",
    { x: M, y: 161, size: 8, font: bold, color: navy },
  );
  page.drawText("Confidentiel · Données à caractère personnel", {
    x: M,
    y: 65,
    size: 8,
    font,
    color: muted,
  });

  newPage();
  section(
    "Opération et financement",
    "Les données non renseignées restent explicitement signalées afin de faciliter la revue du dossier.",
  );
  Object.entries(operationFields).forEach(([key, label], index) =>
    keyValue(label, record.data[key], index % 2 === 0),
  );
  newPage();
  section(
    "Identification des intervenants",
    "Une fiche distincte est présentée pour chaque personne physique ou morale.",
  );
  if (!record.data.parties.length)
    statusBox("Intervenants", "Aucun intervenant renseigné", "amber");
  for (const [partyIndex, party] of record.data.parties.entries()) {
    if (partyIndex > 0 && y < 420) newPage();
    subsection(
      `${partyIndex + 1}. ${[party.firstName, party.name].filter(Boolean).join(" ") || "Intervenant sans nom"}`,
    );
    statusBox("Qualité", `${party.role} · ${party.kind}`, "blue");
    Object.entries(partyFields)
      .filter(
        ([key]) =>
          clean((party as any)[key]) ||
          ["name", "address", "birthDate"].includes(key),
      )
      .forEach(([key, label], index) =>
        keyValue(label, (party as any)[key], index % 2 === 0),
      );
    y -= 12;
  }
  newPage();
  section(
    "Pièces justificatives",
    "Les originaux ne sont pas incorporés au rapport. Ils restent conservés séparément dans le dossier sécurisé.",
  );
  if (!documents.length)
    statusBox("Pièces", "Aucune pièce enregistrée", "amber");
  for (const [index, document] of documents.entries()) {
    const linkedParty = record.data.parties.find(
      (party: any) => party.id === document.party,
    );
    const titleRows = wrap(document.name, CONTENT - 54, 9, bold),
      height = 62 + Math.max(0, titleRows.length - 1) * 12;
    ensure(height);
    page.drawRectangle({
      x: M,
      y: y - height + 8,
      width: CONTENT,
      height,
      color: index % 2 ? paleGrey : rgb(1, 1, 1),
      borderColor: lineColor,
      borderWidth: 0.6,
    });
    page.drawText(String(index + 1).padStart(2, "0"), {
      x: M + 13,
      y: y - 9,
      size: 8,
      font: bold,
      color: blue,
    });
    let documentY = y - 9;
    titleRows.forEach((row) => {
      page.drawText(row, {
        x: M + 48,
        y: documentY,
        size: 9,
        font: bold,
        color: navy,
      });
      documentY -= 12;
    });
    page.drawText(clean(document.category) || "À classer", {
      x: M + 48,
      y: documentY - 3,
      size: 8,
      font,
      color: blue,
    });
    page.drawText(
      `${formatSize(document.size)} · ajouté le ${formatDate(document.created)}`,
      { x: M + 48, y: documentY - 17, size: 7.5, font, color: muted },
    );
    page.drawText(
      `Rattachement : ${linkedParty ? [linkedParty.firstName, linkedParty.name].filter(Boolean).join(" ") : "Dossier général"}`,
      { x: M + 48, y: documentY - 29, size: 7.5, font, color: muted },
    );
    y -= height + 7;
  }
  newPage();
  section(
    "Contrôles du gel des avoirs",
    "Les résultats sont des aides à la vigilance. Une homonymie doit toujours être examinée avant toute conclusion.",
  );
  if (!checks.length)
    statusBox("État du contrôle", "Aucun contrôle enregistré", "amber");
  for (const [checkIndex, check] of checks.entries()) {
    const data = check.data;
    subsection(`Contrôle du ${formatDate(check.created, true)}`);
    if (data.error) {
      statusBox("Résultat", data.error, "red");
      continue;
    }
    const valid =
      data.parties?.length === record.data.parties.length &&
      record.data.parties.every((party: any) =>
        data.parties.some((result: any) => result.identity === identity(party)),
      );
    statusBox(
      "État du contrôle",
      valid
        ? "Contrôle cohérent avec les identités actuelles"
        : "Identités modifiées : nouveau contrôle nécessaire",
      valid ? "green" : "amber",
    );
    keyValue("Publication du registre", formatDate(data.published), true);
    keyValue("Entrées examinées", data.total, false);
    keyValue("Source officielle", data.source, true);
    for (const result of data.parties || []) {
      statusBox(
        result.name || "Intervenant",
        `${result.status} · ${result.count || 0} correspondance(s) possible(s)`,
        result.count ? "red" : "green",
      );
      keyValue("Date de naissance recherchée", result.birthDate, false);
      for (const hit of result.hits || [])
        keyValue(
          "Fiche à examiner",
          `${hit.Nom || "Nom non indiqué"} · référence ${hit.IdRegistre || "non indiquée"}`,
          true,
        );
    }
    paragraph(data.method, { size: 7.5, color: muted, gap: 12 });
    if (checkIndex < checks.length - 1) y -= 8;
  }
  newPage();
  section(
    "Cartographie des risques",
    "Les pondérations reprennent le référentiel fourni. Aucun seuil global de conformité n’est déduit automatiquement.",
  );
  statusBox(
    "Synthèse",
    `${answered.length} critère(s) renseigné(s) sur ${risks.length} · ${positive.length} réponse(s) « Oui » · somme des pondérations : ${score}`,
    answered.length === risks.length ? "blue" : "amber",
  );
  let currentGroup = "";
  for (const risk of risks) {
    if (risk.group !== currentGroup) {
      currentGroup = risk.group;
      subsection(currentGroup);
    }
    const answer = record.data.answers[risk.id] || "Non renseigné",
      rows = wrap(risk.text, CONTENT - 105, 8.2, font),
      adviceRows =
        answer === "Oui" && risk.advice
          ? wrap(`Préconisation : ${risk.advice}`, CONTENT - 20, 7.5, font)
          : [],
      height =
        Math.max(28, rows.length * 11 + 11) +
        (adviceRows.length ? adviceRows.length * 10 + 13 : 0);
    ensure(height);
    page.drawRectangle({
      x: M,
      y: y - height + 6,
      width: CONTENT,
      height,
      color: answer === "Oui" ? paleAmber : paleGrey,
    });
    let riskY = y;
    rows.forEach((row) => {
      page.drawText(row, { x: M + 9, y: riskY, size: 8.2, font, color: navy });
      riskY -= 11;
    });
    const answerColor =
      answer === "Oui" ? amber : answer === "Non" ? green : muted;
    page.drawText(answer, {
      x: W - M - 88,
      y,
      size: 7.5,
      font: bold,
      color: answerColor,
    });
    page.drawText(`${risk.score} pt${risk.score > 1 ? "s" : ""}`, {
      x: W - M - 88,
      y: y - 13,
      size: 7,
      font,
      color: muted,
    });
    if (adviceRows.length) {
      riskY -= 2;
      adviceRows.forEach((row) => {
        page.drawText(row, {
          x: M + 9,
          y: riskY,
          size: 7.5,
          font,
          color: amber,
        });
        riskY -= 10;
      });
    }
    y -= height + 4;
  }
  newPage();
  section("Traçabilité et validation");
  subsection("Coordonnées du conseiller");
  [
    ["Nom", advisor],
    ["E-mail", profile.email],
    ["Téléphone", profile.phone],
    ["Statut", profile.status],
    [
      "Immatriculation RSAC",
      [profile.rsac, profile.city].filter(Boolean).join(" · "),
    ],
  ].forEach(([label, value], index) =>
    keyValue(String(label), value, index % 2 === 0),
  );
  subsection("Portée du rapport");
  paragraph(
    "Questionnaire d’application de la procédure TRACFIN et cartographie des risques : documents fournis par votre équipe. Charte graphique iad 2025.",
  );
  paragraph(
    "Source du registre national des gels : https://gels-avoirs.dgtresor.gouv.fr/",
    { size: 8, color: muted },
  );
  paragraph(
    "Une absence de correspondance ne constitue pas une attestation de non-inscription. Les alias, homonymies, dates de naissance et variantes de translittération doivent être examinés. Une preuve officielle horodatée doit être conservée.",
    { size: 8, color: muted },
  );
  statusBox(
    "Validation du dossier",
    record.data.validated
      ? "Données relues et validées par le conseiller"
      : "Document de travail : données à compléter et à vérifier",
    record.data.validated ? "green" : "amber",
  );
  paragraph(
    "Outil indépendant. Ce rapport ne constitue pas une validation de conformité par iad France.",
    { size: 8, color: muted },
  );
  ensure(100);
  y -= 15;
  page.drawText("Nom et signature du conseiller", {
    x: M,
    y,
    size: 9,
    font: bold,
    color: navy,
  });
  page.drawLine({
    start: { x: M, y: y - 58 },
    end: { x: M + 235, y: y - 58 },
    thickness: 0.6,
    color: muted,
  });
  page.drawText("Date", { x: 350, y, size: 9, font: bold, color: navy });
  page.drawLine({
    start: { x: 350, y: y - 58 },
    end: { x: W - M, y: y - 58 },
    thickness: 0.6,
    color: muted,
  });
  const pages = pdf.getPages();
  pages.forEach((target, index) => {
    target.drawLine({
      start: { x: M, y: 45 },
      end: { x: W - M, y: 45 },
      thickness: 0.5,
      color: lineColor,
    });
    target.drawText("iad · Dossier de travail LAB-FT · Confidentiel", {
      x: M,
      y: 28,
      size: 7,
      font,
      color: muted,
    });
    target.drawText(`${index + 1} / ${pages.length}`, {
      x: W - M - 30,
      y: 28,
      size: 7,
      font,
      color: muted,
    });
  });
  for (const p of pdf.getPages()) p.drawText('TEST - Document de démonstration - Contrôles automatiques non effectués', {x:45,y:12,size:7,font,color:red});
  return pdf.save();
}

export async function makePdf(
  record: any,
  profile: Profile,
  documents: any[],
  checks: any[],
) {
  const bytes = await buildPdf(record, profile, documents, checks);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "LAB-FT-" +
    record.data.title.replace(/[^a-zA-Z0-9àâéèêëîïôùûç -]/g, "").slice(0, 80) +
    ".pdf";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
