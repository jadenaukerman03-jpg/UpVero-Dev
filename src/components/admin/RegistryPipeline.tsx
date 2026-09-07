import { Clipboard, ExternalLink, FileSpreadsheet, LoaderCircle, Mail, Search, Send, Sparkles, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  completeRegistryImport,
  createRegistryImport,
  importRegistryBatch,
  listRegistryCandidates,
  listRegistryProcessingJobs,
  getRegistryPipelineSummary,
  prepareProspectOutreachDraft,
  processQueuedRegistryResearch,
  processNextProspectDemo,
  queueCandidateAction,
  saveProspectOutreachDraft,
  saveProspectOutreachTracking,
} from "@/services/admin-registry";

type ParsedRegistry = { sourceName: string; headers: string[]; rows: Record<string, string>[] };
type Candidate = {
  id: string;
  review_status: string;
  research_source_count: number;
  last_research_error: string | null;
  research_result?: { sources?: Array<{ sourceUrl?: string; pageTitle?: string; rawFindings?: string }> } | null;
  prospect_demos?: Array<{
    preview_token: string;
    status: string;
    prospect_outreach_drafts?: Array<OutreachDraft>;
  }>;
  registry_businesses: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    industry: string | null;
    preliminary_score: number;
    preliminary_reasons: Array<{ kind: "confirmed" | "estimate"; points: number; text: string }>;
  };
};

type OutreachDraft = {
  id: string;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: "draft" | "ready_to_copy" | "dismissed";
  prospect_outreach_tracking?: Array<OutreachTracking>;
};

type OutreachTracking = {
  id: string;
  stage: OutreachStage;
  notes: string;
  last_contacted_at: string | null;
  replied_at: string | null;
};

type OutreachStage = "ready" | "contacted" | "replied" | "meeting" | "won" | "lost" | "do_not_contact";

type PipelineSummary = {
  candidates: Record<string, number>;
  outreach: Record<string, number>;
};

type ProcessingJob = {
  id: string;
  job_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  result: { remaining?: number } | null;
};

const fieldAliases: Record<string, string[]> = {
  businessName: ["business name", "entity name", "company name", "name", "legal name"],
  entityType: ["entity type", "business type", "type"],
  registrationDate: ["registration date", "filing date", "formation date", "created date"],
  registrationStatus: ["status", "entity status", "standing"],
  registeredAddress: ["registered address", "address", "street address", "principal address"],
  city: ["city", "registered city"],
  state: ["state", "registered state"],
  zipCode: ["zip", "zip code", "postal code"],
  ownerOrAgent: ["owner", "registered agent", "agent", "organizer"],
  industry: ["industry", "category", "naics", "business purpose"],
  websiteUrl: ["website", "website url", "url", "web address"],
};

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectMapping(headers: string[]) {
  return Object.fromEntries(
    Object.entries(fieldAliases)
      .map(([field, aliases]) => [
        field,
        headers.find((header) => aliases.includes(cleanHeader(header))) ?? "",
      ])
      .filter(([, header]) => header),
  ) as Record<string, string>;
}

function parseDelimited(text: string, sourceName: string): ParsedRegistry {
  const delimiter = text.includes("\t") && !text.includes(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += char;
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() ?? []).map((header, index) => header || `Column ${index + 1}`);
  return {
    sourceName,
    headers,
    rows: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
  };
}

async function inflateXlsxEntry(bytes: Uint8Array, offset: number, compressedSize: number, method: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const compressed = bytes.slice(offset + 30 + nameLength + extraLength, offset + 30 + nameLength + extraLength + compressedSize);
  if (method === 0) return new TextDecoder().decode(compressed);
  if (method !== 8) throw new Error("This Excel compression format is not supported. Save it as .xlsx or CSV.");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

async function parseXlsx(file: File): Promise<ParsedRegistry> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("This is not a readable .xlsx file. Save it as CSV and try again.");
  const centralOffset = view.getUint32(end + 16, true);
  const entries = new Map<string, { offset: number; size: number; method: number }>();
  for (let pointer = centralOffset; view.getUint32(pointer, true) === 0x02014b50; ) {
    const method = view.getUint16(pointer + 10, true);
    const size = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const offset = view.getUint32(pointer + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pointer + 46, pointer + 46 + nameLength));
    entries.set(name, { offset, size, method });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  async function entry(name: string) {
    const found = entries.get(name);
    return found ? inflateXlsxEntry(bytes, found.offset, found.size, found.method) : "";
  }
  const shared = new DOMParser().parseFromString(await entry("xl/sharedStrings.xml"), "application/xml");
  const strings = Array.from(shared.querySelectorAll("si")).map((node) => node.textContent ?? "");
  const sheet = new DOMParser().parseFromString(await entry("xl/worksheets/sheet1.xml"), "application/xml");
  const rows = Array.from(sheet.querySelectorAll("sheetData > row")).map((row) => {
    const values: string[] = [];
    row.querySelectorAll("c").forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "A1";
      const letters = ref.replace(/[0-9]/g, "");
      let column = 0;
      for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
      const type = cell.getAttribute("t");
      const raw = cell.querySelector("v")?.textContent ?? cell.querySelector("t")?.textContent ?? "";
      values[column - 1] = type === "s" ? strings[Number(raw)] ?? "" : raw;
    });
    return values;
  });
  const headers = (rows.shift() ?? []).map((header, index) => header?.trim() || `Column ${index + 1}`);
  return {
    sourceName: file.name,
    headers,
    rows: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
  };
}

function OutreachDraftEditor({ candidate, registryId }: { candidate: Candidate; registryId: string }) {
  const demo = candidate.prospect_demos?.find((item) => item.status === "ready");
  const [draft, setDraft] = useState<OutreachDraft | null>(demo?.prospect_outreach_drafts?.[0] ?? null);
  const [tracking, setTracking] = useState<OutreachTracking | null>(draft?.prospect_outreach_tracking?.[0] ?? null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const prepareDraft = useServerFn(prepareProspectOutreachDraft);
  const saveDraft = useServerFn(saveProspectOutreachDraft);
  const saveTracking = useServerFn(saveProspectOutreachTracking);

  if (!demo) return null;

  async function getSessionAccessToken() {
    const { data } = await createBrowserSupabaseClient().auth.getSession();
    if (!data.session) throw new Error("Your admin session has expired. Please sign in again.");
    return data.session.access_token;
  }

  async function prepare() {
    setWorking(true);
    try {
      const accessToken = await getSessionAccessToken();
      const result = await prepareDraft({ data: { accessToken, registryId, candidateId: candidate.id } });
      setDraft(result as OutreachDraft);
      setNotice("Copy-ready draft prepared. Nothing has been sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to prepare the outreach draft.");
    } finally {
      setWorking(false);
    }
  }

  async function save() {
    if (!draft) return;
    setWorking(true);
    try {
      const accessToken = await getSessionAccessToken();
      const result = await saveDraft({
        data: {
          accessToken,
          registryId,
          candidateId: candidate.id,
          draftId: draft.id,
          recipientEmail: draft.recipient_email || undefined,
          subject: draft.subject,
          body: draft.body,
          status: "ready_to_copy",
        },
      });
      setDraft(result as OutreachDraft);
      setNotice("Saved as copy-ready. Nothing has been sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the outreach draft.");
    } finally {
      setWorking(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setNotice("Copied to your clipboard. Nothing has been sent.");
    } catch {
      setNotice("Copy was unavailable. Select the text manually to copy it.");
    }
  }

  async function updateTracking() {
    if (!draft) return;
    const current = tracking ?? { id: "", stage: "ready" as OutreachStage, notes: "", last_contacted_at: null, replied_at: null };
    setWorking(true);
    try {
      const accessToken = await getSessionAccessToken();
      const result = await saveTracking({
        data: { accessToken, registryId, draftId: draft.id, stage: current.stage, notes: current.notes },
      });
      setTracking(result as OutreachTracking);
      setNotice("Manual pipeline status saved. Nothing has been sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the manual pipeline status.");
    } finally {
      setWorking(false);
    }
  }

  if (!draft) {
    return <p><button type="button" className="uv-admin-demo-link" disabled={working} onClick={() => void prepare()}><Mail size={14} /> Prepare personal message</button>{notice ? <span className="uv-admin-inline-notice">{notice}</span> : null}</p>;
  }

  return (
    <section className="uv-admin-outreach-draft">
      <p><strong>Manual outreach draft</strong> — review and copy it yourself; Upvero will not send it.</p>
      <label>Recipient email (optional)<input className="uv-input" type="email" value={draft.recipient_email ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, recipient_email: event.target.value } : current)} /></label>
      <label>Subject<input className="uv-input" value={draft.subject} maxLength={240} onChange={(event) => setDraft((current) => current ? { ...current, subject: event.target.value } : current)} /></label>
      <label>Message<textarea className="uv-input" rows={9} value={draft.body} maxLength={6000} onChange={(event) => setDraft((current) => current ? { ...current, body: event.target.value } : current)} /></label>
      <div className="uv-admin-actions"><button type="button" className="uv-button uv-button-secondary" disabled={working} onClick={() => void save()}>Save copy-ready</button><button type="button" className="uv-button uv-button-ghost" onClick={() => void copy()}><Clipboard size={15} /> Copy message</button></div>
      <div className="uv-admin-outreach-tracking">
        <p><strong>Manual pipeline status</strong></p>
        <label>Outcome<select className="uv-input" value={tracking?.stage ?? "ready"} onChange={(event) => setTracking((current) => ({ id: current?.id ?? "", stage: event.target.value as OutreachStage, notes: current?.notes ?? "", last_contacted_at: current?.last_contacted_at ?? null, replied_at: current?.replied_at ?? null }))}><option value="ready">Ready to contact</option><option value="contacted">Contacted manually</option><option value="replied">Replied</option><option value="meeting">Meeting</option><option value="won">Won</option><option value="lost">Lost</option><option value="do_not_contact">Do not contact</option></select></label>
        <label>Private notes<textarea className="uv-input" rows={3} maxLength={2000} value={tracking?.notes ?? ""} onChange={(event) => setTracking((current) => ({ id: current?.id ?? "", stage: current?.stage ?? "ready", notes: event.target.value, last_contacted_at: current?.last_contacted_at ?? null, replied_at: current?.replied_at ?? null }))} /></label>
        <button type="button" className="uv-button uv-button-ghost" disabled={working} onClick={() => void updateTracking()}>Save pipeline status</button>
      </div>
      {notice ? <p className="uv-admin-inline-notice" role="status">{notice}</p> : null}
    </section>
  );
}

function PipelineSummaryCards({ summary }: { summary: PipelineSummary | undefined }) {
  if (!summary) return null;
  const metrics = [
    ["Review", summary.candidates["review"] ?? 0],
    ["Research complete", summary.candidates["research_complete"] ?? 0],
    ["Private demos", summary.candidates["demo_complete"] ?? 0],
    ["Contacted", summary.outreach["contacted"] ?? 0],
    ["Replies", summary.outreach["replied"] ?? 0],
    ["Won", summary.outreach["won"] ?? 0],
  ];
  return <div className="uv-admin-pipeline-summary">{metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function RegistryPipeline() {
  const [parsed, setParsed] = useState<ParsedRegistry>();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [targetIndustry, setTargetIndustry] = useState("roofing");
  const [paste, setPaste] = useState("");
  const [registryId, setRegistryId] = useState<string>();
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [summary, setSummary] = useState<PipelineSummary>();
  const [selected, setSelected] = useState<string[]>([]);
  const createImport = useServerFn(createRegistryImport);
  const importBatch = useServerFn(importRegistryBatch);
  const completeImport = useServerFn(completeRegistryImport);
  const loadCandidates = useServerFn(listRegistryCandidates);
  const loadJobs = useServerFn(listRegistryProcessingJobs);
  const loadSummary = useServerFn(getRegistryPipelineSummary);
  const queueAction = useServerFn(queueCandidateAction);
  const runResearch = useServerFn(processQueuedRegistryResearch);
  const generateNextDemo = useServerFn(processNextProspectDemo);

  async function token() {
    const { data } = await createBrowserSupabaseClient().auth.getSession();
    if (!data.session) throw new Error("Your admin session has expired. Please sign in again.");
    return data.session.access_token;
  }

  async function refreshPipeline(nextRegistryId: string, accessToken: string) {
    const [shortlist, recentJobs, nextSummary] = await Promise.all([
      loadCandidates({ data: { accessToken, registryId: nextRegistryId, limit: 50 } }),
      loadJobs({ data: { accessToken, registryId: nextRegistryId, limit: 10 } }),
      loadSummary({ data: { accessToken, registryId: nextRegistryId } }),
    ]);
    setCandidates(shortlist as unknown as Candidate[]);
    setJobs(recentJobs as ProcessingJob[]);
    setSummary(nextSummary as PipelineSummary);
  }

  function acceptParsed(next: ParsedRegistry) {
    if (next.headers.length === 0 || next.rows.length === 0) throw new Error("No registry rows were found.");
    if (next.rows.length > 100_000) throw new Error("Split uploads larger than 100,000 rows before importing.");
    setParsed(next);
    setMapping(detectMapping(next.headers));
    setRegistryId(undefined);
    setCandidates([]);
    setSummary(undefined);
    setSelected([]);
    setProgress(`${next.rows.length.toLocaleString()} rows ready for review.`);
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith(".xls")) throw new Error("Please save legacy .xls files as .xlsx or CSV first.");
      acceptParsed(file.name.toLowerCase().endsWith(".xlsx") ? await parseXlsx(file) : parseDelimited(await file.text(), file.name));
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "Unable to read this file.");
    }
  }

  async function startImport() {
    if (!parsed || busy) return;
    setBusy(true);
    try {
      const accessToken = await token();
      const registry = await createImport({ data: { accessToken, sourceName: parsed.sourceName, targetIndustry, headers: parsed.headers, columnMapping: mapping, rowCount: parsed.rows.length } });
      setRegistryId(registry.id);
      for (let start = 0; start < parsed.rows.length; start += 250) {
        await importBatch({ data: { accessToken, registryId: registry.id, columnMapping: mapping, rows: parsed.rows.slice(start, start + 250) } });
        setProgress(`Imported ${Math.min(start + 250, parsed.rows.length).toLocaleString()} of ${parsed.rows.length.toLocaleString()} rows…`);
      }
      const complete = await completeImport({ data: { accessToken, registryId: registry.id } });
      setProgress(`Import complete: ${complete.importedCount.toLocaleString()} unique businesses ready for review.`);
      await refreshPipeline(registry.id, accessToken);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "The import could not be completed. You can safely retry it.");
    } finally {
      setBusy(false);
    }
  }

  async function queue(action: "research" | "demo") {
    if (!registryId || selected.length === 0) return;
    setBusy(true);
    try {
      const accessToken = await token();
      const result = await queueAction({ data: { accessToken, registryId, candidateIds: selected, action } });
      setProgress(`${result.queued} businesses queued for ${action === "research" ? "manual research" : "demo generation"}.`);
      setSelected([]);
      await refreshPipeline(registryId, accessToken);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "Unable to queue the selected businesses.");
    } finally { setBusy(false); }
  }

  async function researchNextBatch() {
    if (!registryId) return;
    setBusy(true);
    try {
      const accessToken = await token();
      const result = await runResearch({ data: { accessToken, registryId, batchSize: 5 } });
      setProgress(`Research batch finished: ${result.completed} completed, ${result.failed} failed. Failed rows can be queued again.`);
      await refreshPipeline(registryId, accessToken);
    } catch (error) { setProgress(error instanceof Error ? error.message : "Research batch failed."); }
    finally { setBusy(false); }
  }

  async function generateApprovedDemo() {
    if (!registryId) return;
    setBusy(true);
    try {
      const accessToken = await token();
      const result = await generateNextDemo({ data: { accessToken, registryId } });
      setProgress(
        result.generated
          ? `Private demo generated. ${result.remaining ? `${result.remaining} approved demo${result.remaining === 1 ? "" : "s"} remain queued.` : "No approved demos remain queued."}`
          : "No approved demo is currently queued.",
      );
      await refreshPipeline(registryId, accessToken);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "Demo generation failed. You can retry it safely.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="uv-admin-registry">
      <div className="uv-container">
        <p className="uv-eyebrow">Business registry</p>
        <h2>Find the strongest roofing prospects.</h2>
        <p className="uv-lead">Import a registry, map what it contains, then review deterministic scores before spending on live research or demos.</p>
        <div className="uv-admin-import-card">
          <label className="uv-admin-file-input"><Upload size={17} /> Upload CSV or .xlsx<input type="file" accept=".csv,.tsv,.xlsx,.xls,text/csv" onChange={(event) => void chooseFile(event)} /></label>
          <span>or</span>
          <textarea className="uv-input" rows={4} value={paste} placeholder="Paste CSV or tab-separated registry rows, including headers…" onChange={(event) => setPaste(event.target.value)} />
          <button type="button" className="uv-button uv-button-secondary" onClick={() => { try { acceptParsed(parseDelimited(paste, "Pasted registry")); } catch (error) { setProgress(error instanceof Error ? error.message : "Unable to read pasted rows."); } }}>Read pasted rows</button>
        </div>
        {parsed ? <div className="uv-admin-import-card"><label>Target industry<input className="uv-input" value={targetIndustry} onChange={(event) => setTargetIndustry(event.target.value)} /></label><p>{parsed.rows.length.toLocaleString()} rows detected. Mapping can be adjusted before import.</p><div className="uv-admin-mapping">{Object.keys(fieldAliases).map((field) => <label key={field}>{field}<select className="uv-input" value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">Not provided</option>{parsed.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><button type="button" className="uv-button uv-button-primary" disabled={busy} onClick={() => void startImport()}>{busy ? <><LoaderCircle className="animate-spin" size={16} /> Importing…</> : <><FileSpreadsheet size={16} /> Import and score registry</>}</button></div> : null}
        {progress ? <p className="uv-notice" role="status">{progress}</p> : null}
        {registryId ? <PipelineSummaryCards summary={summary} /> : null}
        {registryId ? <section className="uv-admin-shortlist"><div><p className="uv-eyebrow">Review shortlist</p><h3>Highest preliminary scores</h3></div><div className="uv-admin-actions"><button type="button" className="uv-button uv-button-secondary" disabled={busy || selected.length === 0} onClick={() => void queue("research")}>Queue research ({selected.length})</button><button type="button" className="uv-button uv-button-primary" disabled={busy || selected.length === 0} onClick={() => void queue("demo")}>Queue demos ({selected.length})</button><button type="button" className="uv-button uv-button-ghost" disabled={busy} onClick={() => void researchNextBatch()}><Search size={16} /> Process next research batch</button><button type="button" className="uv-button uv-button-ghost" disabled={busy} onClick={() => void generateApprovedDemo()}><Sparkles size={16} /> Generate next approved demo</button></div><div className="uv-admin-candidates">{candidates.map((candidate) => <article key={candidate.id}><label><input type="checkbox" checked={selected.includes(candidate.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /><span className="uv-admin-score">{candidate.registry_businesses.preliminary_score}/100</span></label><div><h4>{candidate.registry_businesses.name}</h4><p>{[candidate.registry_businesses.city, candidate.registry_businesses.state, candidate.registry_businesses.industry].filter(Boolean).join(" · ") || "Registry details incomplete"}</p><ul>{candidate.registry_businesses.preliminary_reasons.map((reason, index) => <li key={`${reason.text}-${index}`}>{reason.kind === "confirmed" ? "Confirmed" : "Estimate"}: {reason.text}</li>)}</ul><p>Review: {candidate.review_status.replaceAll("_", " ")} · Sources: {candidate.research_source_count}{candidate.last_research_error ? ` · ${candidate.last_research_error}` : ""}</p>{candidate.prospect_demos?.[0]?.status === "ready" ? <><p><a className="uv-admin-demo-link" href={`/demo/${candidate.prospect_demos[0].preview_token}`} target="_blank" rel="noreferrer">Open private preview <ExternalLink size={14} /></a></p><OutreachDraftEditor candidate={candidate} registryId={registryId} /></> : null}{candidate.research_result?.sources?.length ? <ul className="uv-admin-sources">{candidate.research_result.sources.slice(0, 3).map((source, index) => <li key={`${source.sourceUrl}-${index}`}>{source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.pageTitle || source.sourceUrl}</a> : "Source URL unavailable"}{source.rawFindings ? ` — ${source.rawFindings}` : ""}</li>)}</ul> : null}</div></article>)}</div>{jobs.length ? <div className="uv-admin-jobs"><h4>Recent processing jobs</h4>{jobs.map((job) => <p key={job.id}>{job.job_type.replaceAll("_", " ")} · {job.status} · attempt {job.attempts}{job.result?.remaining ? ` · ${job.result.remaining} remaining` : ""}{job.last_error ? ` · ${job.last_error}` : ""}</p>)}</div> : null}<p className="uv-admin-queue-note"><Send size={15} /> Demos are generated only when you explicitly queue candidates and click “Generate next approved demo.” Nothing is sent automatically.</p></section> : null}
      </div>
    </section>
  );
}
