import { useState, useEffect, useRef } from "react";
import {
  KEY,
  TYPES,
  PARENTS,
  uid,
  blank,
  validate,
  descendants,
  progress,
  setStatus,
  layout,
} from "../lib/tree.mjs";

const date = (d) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Geen deadline";
const stamp = (d) => new Date(d).toLocaleString("nl-NL");
const today = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
export default function GoalTree() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("tree");
  const [selected, setSelected] = useState(null),
    [draft, setDraft] = useState(null),
    [eventDraft, setEventDraft] = useState(null),
    [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState(""),
    [domain, setDomain] = useState(""),
    [query, setQuery] = useState("");
  const file = useRef(null),
    dialog = useRef(null),
    previousFocus = useRef(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw
        ? JSON.parse(raw)
        : { version: 1, nodes: [], events: [], history: [] };
      checkData(saved);
      setData(saved);
    } catch {
      setError(
        "De opgeslagen gegevens konden niet worden geladen. Exporteer eerst de oorspronkelijke opslag of importeer een geldige back-up.",
      );
      setPanel("recovery");
    }
    const changed = (e) => {
      if (e.key === KEY) {
        try {
          const next = JSON.parse(e.newValue);
          checkData(next);
          setData(next);
          setDraft(null);
          setSelected(null);
          setNotice("Bijgewerkt vanuit een ander tabblad.");
        } catch {
          setError(
            "De opslag is buiten dit tabblad gewijzigd. Herlaad de pagina.",
          );
        }
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  const modal = !!(draft || eventDraft || selected || panel);
  useEffect(() => {
    if (!modal) return;
    previousFocus.current = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(
      () => dialog.current?.querySelector("button,input,select")?.focus(),
      0,
    );
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = [
          ...dialog.current.querySelectorAll(
            'button:not(:disabled),input,select,textarea,[tabindex="0"]',
          ),
        ];
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previousFocus.current?.focus();
    };
  }, [modal]);
  function close() {
    setDraft(null);
    setEventDraft(null);
    setSelected(null);
    setPanel(null);
  }
  function commit(nodes, label, nextEvents = data?.events || []) {
    try {
      validate(nodes);
      validateEvents(nextEvents, nodes);
      const next = {
        version: 1,
        nodes,
        events: nextEvents,
        history: [
          ...(data?.history || []),
          {
            id: uid(),
            at: new Date().toISOString(),
            label,
            nodes: data?.nodes || [],
            events: data?.events || [],
          },
        ],
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setError("");
      setNotice(label);
      return true;
    } catch (e) {
      setError(
        "Niet opgeslagen: " +
          e.message +
          " Exporteer een back-up als de browseropslag vol is.",
      );
      return false;
    }
  }
  const nodes = data?.nodes || [],
    node = nodes.find((n) => n.id === selected);
  const domains = [...new Set(nodes.map((n) => n.domain).filter(Boolean))];
  const events = data?.events || [];
  function create(parent, type) {
    setSelected(null);
    setDraft(blank(type, parent?.id || null, parent?.domain || ""));
  }
  function save(e) {
    e.preventDefault();
    const entry = {
      ...draft,
      title: draft.title.trim(),
      deadline: new FormData(e.currentTarget).get("deadline") || "",
    };
    if (!entry.deadline) {
      setError("Vul een deadline in.");
      return;
    }
    const existing = nodes.some((n) => n.id === draft.id);
    let next = existing
      ? nodes.map((n) => (n.id === draft.id ? entry : n))
      : [...nodes, entry];
    if (draft.status === "active" && draft.parentId) {
      let p = draft.parentId;
      while (p) {
        next = next.map((n) => (n.id === p ? { ...n, status: "active" } : n));
        p = next.find((n) => n.id === p)?.parentId;
      }
    }
    if (
      commit(next, existing ? "Onderdeel gewijzigd" : "Onderdeel toegevoegd")
    ) {
      setDraft(null);
      setSelected(draft.id);
    }
  }
  function markDeviation(node) {
    setSelected(null);
    setEventDraft({
      id: uid(),
      nodeId: node.id,
      date: today(),
      kind: "deviation",
      details: "",
      nextStep: "",
    });
  }
  function saveEvent(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const event = {
      ...eventDraft,
      date: form.get("event-date"),
      kind: form.get("event-kind"),
      details: String(form.get("event-details") || "").trim(),
      nextStep: String(form.get("event-next-step") || "").trim(),
    };
    const nextEvents = [...events, event];
    if (commit(nodes, event.kind === "mistake" ? "Fout gemarkeerd" : "Afwijking gemarkeerd", nextEvents)) {
      setEventDraft(null);
      setSelected(event.nodeId);
    }
  }
  function exportFile(raw = false) {
    const text = raw
      ? localStorage.getItem(KEY)
      : JSON.stringify(data, null, 2);
    const url = URL.createObjectURL(
      new Blob([text || ""], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "richting-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 20_000_000) throw Error("Bestand groter dan 20 MB.");
      const imported = JSON.parse(await f.text());
      checkData(imported);
      if (
        !confirm(
          "Deze back-up laden? Je huidige boom blijft als herstelpunt bewaard.",
        )
      )
        return;
      const next = {
        ...imported,
        history: [
          ...(data?.history || []),
          ...imported.history.map((h) => ({
            ...h,
            id: uid(),
            events: h.events || [],
          })),
          {
            id: uid(),
            at: new Date().toISOString(),
            label: "Situatie vóór import",
            nodes,
            events,
          },
        ],
        events: imported.events || [],
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setError("");
      close();
      setNotice("Back-up geïmporteerd.");
    } catch (e) {
      setError("Import mislukt: " + e.message);
    }
  }
  const visible = nodes.filter(
    (n) =>
      (!domain || n.domain === domain) &&
      (!query || n.title.toLowerCase().includes(query.toLowerCase())),
  );
  const visibleIds = new Set(visible.map((n) => n.id));
  const timelineItems = [
    ...visible.map((item) => ({ itemType: "node", item, date: item.deadline })),
    ...events
      .filter((event) => visibleIds.has(event.nodeId))
      .map((item) => ({ itemType: "event", item, date: item.date })),
  ].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const nodeEvents = node
    ? events
        .filter((event) => descendants(nodes, node.id).has(event.nodeId))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">MIJN DOELEN</p>
          <h1>
            Richting<span>✳</span>
          </h1>
        </div>
        <button
          className="icon"
          aria-label="Bewaren en back-up"
          onClick={() => setPanel("backup")}
        >
          ↥
        </button>
      </header>
      <div className="summary">
        <span>
          <b>
            {
              nodes.filter((n) => n.type === "project" && n.status === "active")
                .length
            }
          </b>{" "}
          actieve projecten
        </span>
        <span>
          <b>
            {
              nodes.filter(
                (n) => n.type === "milestone" && n.status === "completed",
              ).length
            }
          </b>{" "}
          mijlpalen bereikt
        </span>
        <span className="local">● Alleen op dit apparaat</span>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <p className="sr" role="status">
        {notice}
      </p>
      <div className="tools">
        <input
          aria-label="Zoek een doel"
          placeholder="Zoek in je richting…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Levensgebied"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        >
          <option value="">Alle gebieden</option>
          {domains.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <nav aria-label="Weergave">
        {[
          ["tree", "✳", "Skilltree"],
          ["timeline", "◷", "Tijdlijn"],
          ["history", "↺", "Geschiedenis"],
        ].map(([t, i, l]) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {i} {l}
          </button>
        ))}
      </nav>
      {!data && !error ? (
        <p className="empty">Je richting wordt geladen…</p>
      ) : tab === "tree" ? (
        nodes.length ? (
          <>
            <section className="aspect-heading" aria-label="Geselecteerd levensgebied">
              <p className="eyebrow">LEVENSGEBIED</p>
              <h2>{domain || (domains.length === 1 ? domains[0] : "Alle levensgebieden")}</h2>
              <div className="legend"><span><i className="legend-done">✓</i> Behaald</span><span><i className="legend-active">○</i> Nog te behalen</span><span><i className="legend-goal">◆</i> Einddoel</span></div>
            </section>
            <Tree
              nodes={nodes}
              visible={visible}
              events={events}
              onSelect={setSelected}
            />
          </>
        ) : (
          <section className="empty">
            <p className="eyebrow">SKILLTREE</p>
            <h2>Langetermijnvisie</h2>
            <p>
              Maak een langetermijnvisie. Voeg daarna jaarlijkse doelen,
              projecten en weekmijlpalen toe.
            </p>
            <button
              disabled={!data}
              className="primary"
              onClick={() => create(null, "vision")}
            >
              ＋ Langetermijnvisie toevoegen
            </button>
          </section>
        )
      ) : tab === "timeline" ? (
        <section className="timeline">
          {timelineItems.length ? (
            timelineItems.map(({ itemType, item }) => {
              if (itemType === "event") {
                const parent = nodes.find((n) => n.id === item.nodeId);
                return (
                  <button
                    className="timeline-item timeline-event"
                    key={item.id}
                    onClick={() => setSelected(item.nodeId)}
                  >
                    <span className={"dot " + item.kind} />
                    <div>
                      <small>
                        {date(item.date)} · {item.kind === "mistake" ? "Fout" : "Afwijking"}
                      </small>
                      <h3>{item.details}</h3>
                      <p>{parent?.domain} · {parent?.title}</p>
                      {item.nextStep && <small>Vervolg: {item.nextStep}</small>}
                    </div>
                    <span>›</span>
                  </button>
                );
              }
              const n = item;
              return (
                <button
                  className="timeline-item"
                  key={n.id}
                  onClick={() => setSelected(n.id)}
                >
                  <span className={"dot " + n.status} />
                  <div>
                    <small>{date(n.deadline)} · {TYPES[n.type]}</small>
                    <h3>{n.title}</h3>
                    <p>{n.domain} {n.status === "completed" ? "· Behaald" : "· Open"}</p>
                    <small>{nodes.find((p) => p.id === n.parentId)?.title || "Langetermijnvisie"}</small>
                  </div>
                  <span>›</span>
                </button>
              );
            })
          ) : (
            <p className="empty">Geen onderdelen om te tonen.</p>
          )}
        </section>
      ) : (
        <section className="history">
          <h2>Versiegeschiedenis</h2>
          <p>
            Eerdere versies van je doelen en projecten.
          </p>
          {[...(data?.history || [])].reverse().map((h) => (
            <article key={h.id}>
              <small>{stamp(h.at)}</small>
              <h3>Vóór: {h.label}</h3>
              <p>{h.nodes.length} onderdelen · {h.events?.length || 0} markeringen</p>
              <button
                onClick={() => {
                  setPanel({ snapshot: h });
                }}
              >
                Bekijken en herstellen
              </button>
            </article>
          ))}
          {!data?.history.length && (
            <p className="empty">Je eerste wijziging verschijnt hier.</p>
          )}
        </section>
      )}
      <footer>
        <p>Je dagelijkse taken staan in je eigen to-dolijst.</p>
        <button
          className="primary"
          disabled={!data}
          onClick={() => create(null, "vision")}
        >
          ＋ Langetermijnvisie
        </button>
      </footer>
      <input
        type="file"
        accept="application/json,.json"
        ref={file}
        hidden
        onChange={importFile}
      />
      {modal && (
        <div
          className="veil"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            className="sheet"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={eventDraft ? "Padmarkering toevoegen" : draft ? "Onderdeel bewerken" : node?.title || "Beheer"}
          >
            <div className="sheet-top">
              <span className="eyebrow">
                {eventDraft
                  ? "PADMARKERING"
                  : draft
                  ? "RICHTING VORMGEVEN"
                  : node
                    ? TYPES[node.type]
                    : "JOUW GEGEVENS"}
              </span>
              <button className="icon" onClick={close} aria-label="Sluiten">
                ×
              </button>
            </div>
            {draft ? (
              <form onSubmit={save}>
                <h2>
                  {nodes.some((n) => n.id === draft.id)
                    ? "Onderdeel bewerken"
                    : (draft.type === "vision" || draft.type === "milestone"
                        ? "Nieuwe "
                        : "Nieuw ") + TYPES[draft.type].toLowerCase()}
                </h2>
                <label>
                  Concreet doel
                  <input
                    autoComplete="off"
                    required
                    maxLength={160}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Levensgebied
                  <input
                    required
                    list="domains"
                    value={draft.domain}
                    onChange={(e) =>
                      setDraft({ ...draft, domain: e.target.value })
                    }
                  />
                  <datalist id="domains">
                    {[
                      ...new Set([
                        ...domains,
                        "Karakterontwikkeling",
                        "Inkomen en carrière",
                        "Levensomstandigheden",
                      ]),
                    ].map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </label>
                {draft.type !== "vision" && (
                  <label>
                    Bijdragend aan
                    <select
                      required
                      value={draft.parentId}
                      onChange={(e) =>
                        setDraft({ ...draft, parentId: e.target.value })
                      }
                    >
                      {nodes
                        .filter((n) => PARENTS[draft.type].includes(n.type))
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {TYPES[n.type]} · {n.title}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  Deadline
                  <input
                    type="date"
                    name="deadline"
                    required
                    value={draft.deadline}
                    onChange={(e) =>
                      setDraft({ ...draft, deadline: e.target.value })
                    }
                  />
                </label>
                {[
                  ["description", "Omschrijving"],
                  ["reason", "Waarom doet dit ertoe?"],
                  ["vision", "Positieve visie · wat wil je bereiken?"],
                  ["anti", "Anti-visie · wat wil je voorkomen?"],
                  ["rules", "Spelregels · wat mag wel en niet?"],
                  ...(draft.type === "project"
                    ? [
                        ["scope", "Scope · wat hoort er wel en niet bij?"],
                        ["outline", "Aanpak · de grote lijnen"],
                      ]
                    : []),
                ].map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <textarea
                      rows={3}
                      value={draft[k]}
                      onChange={(e) =>
                        setDraft({ ...draft, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <button className="primary wide" type="submit">
                  Opslaan
                </button>
              </form>
            ) : eventDraft ? (
              <form onSubmit={saveEvent}>
                <h2>Markering op het pad</h2>
                <p className="muted">
                  {nodes.find((n) => n.id === eventDraft.nodeId)?.title}
                </p>
                <label>
                  Wat wil je markeren?
                  <select name="event-kind" defaultValue={eventDraft.kind}>
                    <option value="deviation">Afwijking van het plan</option>
                    <option value="mistake">Fout die ik maakte</option>
                  </select>
                </label>
                <label>
                  Datum
                  <input
                    type="date"
                    name="event-date"
                    required
                    defaultValue={eventDraft.date}
                  />
                </label>
                <label>
                  Wat gebeurde er?
                  <textarea
                    name="event-details"
                    rows={3}
                    required
                    maxLength={500}
                    placeholder="Beschrijf kort wat er misliep of veranderde."
                    autoFocus
                  />
                </label>
                <label>
                  Hoe pak je het vervolg op? · optioneel
                  <textarea
                    name="event-next-step"
                    rows={2}
                    maxLength={300}
                    placeholder="Bijvoorbeeld: hervat de eerstvolgende mijlpaal."
                  />
                </label>
                <button className="primary wide" type="submit">
                  Markering opslaan
                </button>
              </form>
            ) : node ? (
              <>
                <h2>{node.title}</h2>
                <p className="muted">
                  {node.domain} · {date(node.deadline)}
                </p>
                <div className="breadcrumb">
                  {ancestorPath(nodes, node).map((n) => (
                    <button key={n.id} onClick={() => setSelected(n.id)}>
                      {n.title}
                    </button>
                  ))}
                </div>
                <div className="completion">
                  <span>
                    {node.status === "completed" ? "✓ Voltooid" : "Actief"}
                  </span>
                  <span>
                    {progress(nodes, node.id).done} /{" "}
                    {progress(nodes, node.id).total} eindpunten bereikt
                  </span>
                </div>
                {[
                  ["description", "Omschrijving"],
                  ["reason", "Waarom"],
                  ["vision", "Positieve visie"],
                  ["anti", "Anti-visie"],
                  ["rules", "Spelregels"],
                  ["scope", "Scope"],
                  ["outline", "Aanpak"],
                ].map(
                  ([k, l]) =>
                    node[k] && (
                      <div className="detail" key={k}>
                        <h3>{l}</h3>
                        <p>{node[k]}</p>
                      </div>
                    ),
                )}
                <div className="detail event-log">
                  <h3>Markeringen op dit pad · {nodeEvents.length}</h3>
                  {node.type !== "milestone" && (
                    <button className="add-child" onClick={() => markDeviation(node)}>
                      ＋ Afwijking of fout markeren
                    </button>
                  )}
                  {nodeEvents.length ? nodeEvents.map((event) => {
                    const linkedNode = nodes.find((n) => n.id === event.nodeId);
                    return (
                      <article className={"event-entry " + event.kind} key={event.id}>
                        <div className="event-entry-heading">
                          <span>{event.kind === "mistake" ? "! Fout" : "↘ Afwijking"}</span>
                          <time dateTime={event.date}>{date(event.date)}</time>
                        </div>
                        {linkedNode?.id !== node.id && <small>Bij: {linkedNode?.title}</small>}
                        <p>{event.details}</p>
                        {event.nextStep && <small>Vervolg: {event.nextStep}</small>}
                        <button
                          className="event-delete"
                          onClick={() => {
                            if (confirm("Deze padmarkering verwijderen? Je kunt haar via de versiegeschiedenis herstellen."))
                              commit(nodes, "Padmarkering verwijderd", events.filter((item) => item.id !== event.id));
                          }}
                        >Verwijderen</button>
                      </article>
                    );
                  }) : <p className="muted">Nog geen afwijkingen of fouten op deze tak.</p>}
                </div>
                <div className="detail">
                  <h3>
                    {node.type === "project"
                      ? "Mijlpalen"
                      : "Verbonden onderdelen"}
                  </h3>
                  {nodes
                    .filter((n) => n.parentId === node.id)
                    .map((n) => (
                      <button
                        className="child"
                        key={n.id}
                        onClick={() => setSelected(n.id)}
                      >
                        {n.status === "completed" ? "✓" : "○"} {n.title}
                        <span>›</span>
                      </button>
                    ))}
                  {Object.keys(TYPES)
                    .filter((t) => PARENTS[t].includes(node.type))
                    .map((t) => (
                      <button
                        className="add-child"
                        key={t}
                        onClick={() => create(node, t)}
                      >
                        ＋ {TYPES[t]} toevoegen
                      </button>
                    ))}
                </div>
                {node.type === "milestone" && (
                  <aside>
                    Wat is de eerstvolgende concrete actie voor deze mijlpaal?
                    Zet die nu in je eigen to-dolijst.
                  </aside>
                )}
                <div className="actions">
                  <button
                    onClick={() => {
                      setDraft({ ...node });
                      setSelected(null);
                    }}
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => {
                      const status =
                        node.status === "active" ? "completed" : "active";
                      if (
                        status === "completed" &&
                        descendants(nodes, node.id).size > 1 &&
                        !confirm(
                          "Dit onderdeel en alle onderliggende onderdelen voltooien?",
                        )
                      )
                        return;
                      commit(
                        setStatus(nodes, node.id, status),
                        status === "completed"
                          ? "Tak voltooid"
                          : "Tak heropend",
                      );
                    }}
                  >
                    {node.status === "active" ? "✓ Voltooien" : "Heropenen"}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      const ids = descendants(nodes, node.id);
                      if (
                        confirm(
                          `Dit onderdeel en ${ids.size - 1} onderliggende onderdelen verwijderen? Je kunt ze via Geschiedenis herstellen.`,
                        ) &&
                        commit(
                          nodes.filter((n) => !ids.has(n.id)),
                          "Tak verwijderd",
                          events.filter((event) => !ids.has(event.nodeId)),
                        )
                      )
                        close();
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              </>
            ) : panel?.snapshot ? (
              <>
                <h2>Historische situatie</h2>
                <p>
                  {stamp(panel.snapshot.at)} · vóór {panel.snapshot.label}
                </p>
                <ul className="snapshot">
                  {panel.snapshot.nodes.map((n) => (
                    <li key={n.id}>
                      <b>{n.title}</b>
                      <small>
                        {TYPES[n.type]} ·{" "}
                        {n.status === "completed" ? "Voltooid" : "Actief"} ·{" "}
                        {date(n.deadline)}
                      </small>
                      <small>
                        {n.domain} ·{" "}
                        {panel.snapshot.nodes.find((p) => p.id === n.parentId)
                          ?.title || "Langetermijnrichting"}
                      </small>
                      {[
                        ["description", "Omschrijving"],
                        ["reason", "Reden"],
                        ["vision", "Positieve visie"],
                        ["anti", "Anti-visie"],
                        ["rules", "Spelregels"],
                        ["scope", "Scope"],
                        ["outline", "Aanpak"],
                      ].map(
                        ([key, label]) =>
                          n[key] && (
                            <p key={key}>
                              <b>{label}: </b>
                              {n[key]}
                            </p>
                          ),
                      )}
                    </li>
                  ))}
                </ul>
                {!!panel.snapshot.events?.length && (
                  <section className="snapshot-events">
                    <h3>Padmarkeringen · {panel.snapshot.events.length}</h3>
                    {panel.snapshot.events.map((event) => (
                      <article className={"event-entry " + event.kind} key={event.id}>
                        <div className="event-entry-heading">
                          <span>{event.kind === "mistake" ? "! Fout" : "↘ Afwijking"}</span>
                          <time dateTime={event.date}>{date(event.date)}</time>
                        </div>
                        <p>{event.details}</p>
                      </article>
                    ))}
                  </section>
                )}
                <button
                  className="primary wide"
                  onClick={() => {
                    if (
                      confirm(
                        "Deze versie herstellen? De huidige situatie blijft bewaard.",
                      ) &&
                      commit(panel.snapshot.nodes, "Versie hersteld", panel.snapshot.events || [])
                    )
                      close();
                  }}
                >
                  Deze versie herstellen
                </button>
              </>
            ) : (
              <>
                <h2>
                  {panel === "recovery"
                    ? "Opslag herstellen"
                    : "Veilig bewaren"}
                </h2>
                <p>
                  Je doelen en geschiedenis staan alleen in deze browser, op dit
                  apparaat. Er is geen account of synchronisatie. Bij het wissen
                  van browsergegevens verdwijnen ze.
                </p>
                <aside>
                  Bewaar een back-up om je boom te herstellen of naar een ander
                  apparaat over te zetten.
                </aside>
                <button
                  className="primary wide"
                  onClick={() => exportFile(panel === "recovery")}
                >
                  Back-up downloaden
                </button>
                <button className="wide" onClick={() => file.current.click()}>
                  Back-up importeren
                </button>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
function checkData(d) {
  if (!d || d.version !== 1 || !Array.isArray(d.history))
    throw Error("Geen geldige Richting-back-up.");
  validate(d.nodes);
  validateEvents(d.events || [], d.nodes);
  for (const h of d.history) {
    if (
      !h ||
      typeof h.id !== "string" ||
      typeof h.label !== "string" ||
      !Number.isFinite(Date.parse(h.at))
    )
    throw Error("Ongeldige geschiedenis.");
    validate(h.nodes);
    validateEvents(h.events || [], h.nodes);
  }
}
function validateEvents(events, nodes) {
  if (!Array.isArray(events) || events.length > 20_000)
    throw Error("Ongeldige of te grote lijst met padmarkeringen.");
  const ids = new Set();
  for (const event of events) {
    if (
      !event ||
      typeof event.id !== "string" ||
      ids.has(event.id) ||
      !nodes.some((node) => node.id === event.nodeId) ||
      !["deviation", "mistake"].includes(event.kind) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
      !Number.isFinite(Date.parse(event.date)) ||
      typeof event.details !== "string" ||
      !event.details.trim() ||
      typeof event.nextStep !== "string"
    )
      throw Error("Een padmarkering bevat ongeldige gegevens.");
    ids.add(event.id);
  }
  return events;
}
function ancestorPath(nodes, node) {
  const path = [];
  let p = nodes.find((n) => n.id === node.parentId);
  while (p) {
    path.unshift(p);
    p = nodes.find((n) => n.id === p.parentId);
  }
  return path;
}
function Tree({ nodes, visible, events, onSelect }) {
  const box = useRef(null),
    pointers = useRef(new Map()),
    gesture = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 0.65 }),
    [size, setSize] = useState({ w: 360, h: 500 });
  const positions = layout(nodes),
    visibleIds = new Set(visible.map((n) => n.id));
  const eventCounts = events.reduce((counts, event) => {
    counts[event.nodeId] ||= { deviation: 0, mistake: 0 };
    counts[event.nodeId][event.kind] += 1;
    return counts;
  }, {});
  useEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    fit();
  }, [size.w, size.h, nodes.length]);
  function start(e) {
    if (e.target.closest("button")) return;
    box.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = null;
  }
  function move(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = [...pointers.current.values()];
    const center = {
      x: p.reduce((s, p) => s + p.x, 0) / p.length,
      y: p.reduce((s, p) => s + p.y, 0) / p.length,
    };
    const dist =
      p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    const last = gesture.current;
    if (last) {
      const rect = box.current.getBoundingClientRect();
      setView((v) => {
        const z =
          dist && last.dist
            ? Math.max(0.15, Math.min(2, (v.z * dist) / last.dist))
            : v.z;
        const r = z / v.z;
        const ax = last.x - rect.left - size.w / 2,
          ay = last.y - rect.top - size.h / 2;
        return {
          z,
          x: center.x - last.x + ax - (ax - v.x) * r,
          y: center.y - last.y + ay - (ay - v.y) * r,
        };
      });
    }
    gesture.current = { ...center, dist };
  }
  function end(e) {
    pointers.current.delete(e.pointerId);
    gesture.current = null;
  }
  function fit() {
    const coords = Object.values(positions);
    const minX = Math.min(-70, ...coords.map((p) => p.x - 110)),
      maxX = Math.max(70, ...coords.map((p) => p.x + 110));
    const minY = Math.min(-70, ...coords.map((p) => p.y - 70)),
      maxY = Math.max(70, ...coords.map((p) => p.y + 70));
    const z = Math.max(
      0.15,
      Math.min(
        0.85,
        (size.w - 30) / (maxX - minX),
        (size.h - 100) / (maxY - minY),
      ),
    );
    setView({
      x: (-(minX + maxX) / 2) * z,
      y: (-(minY + maxY) / 2) * z,
      z,
    });
  }
  return (
    <section className="tree-wrap">
      <div className="tree-help">
        Sleep in elke richting · knijp om te zoomen
      </div>
      <div
        className="tree"
        ref={box}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          className="world"
          style={{
            transform: `translate(${size.w / 2 + view.x}px,${size.h / 2 + view.y}px) scale(${view.z})`,
          }}
        >
          <svg className="links">
            <g>
              {nodes.map((n) => {
                const p = positions[n.id],
                  parent = positions[n.parentId] || { x: 0, y: 0 };
                return (
                  <line
                    key={n.id}
                    x1={parent.x}
                    y1={parent.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={n.status === "completed" ? "#b2d695" : "#3b5145"}
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          </svg>
          <div className="root">NU<small>STARTPUNT</small></div>
          {nodes.map((n) => {
            const p = positions[n.id],
              pr = progress(nodes, n.id);
            return (
              <button
                key={n.id}
                className={"node " + n.type + " " + n.status}
                style={{
                  left: p.x,
                  top: p.y,
                  opacity: visibleIds.has(n.id) ? 1 : 0.2,
                }}
                onClick={() => onSelect(n.id)}
              >
                <small>
                  {n.type === "vision" ? "◆ EINDDOEL" : n.domain || TYPES[n.type]}
                </small>
                <strong>{n.title}</strong>
                <span className="node-status">{n.status === "completed" ? "✓ BEHAALD" : "○ NOG TE BEHALEN"}</span>
                {eventCounts[n.id] && (
                  <span className="node-events">
                    {eventCounts[n.id].deviation > 0 && `↘ ${eventCounts[n.id].deviation} afwijking${eventCounts[n.id].deviation === 1 ? "" : "en"}`}
                    {eventCounts[n.id].deviation > 0 && eventCounts[n.id].mistake > 0 && " · "}
                    {eventCounts[n.id].mistake > 0 && `! ${eventCounts[n.id].mistake} fout${eventCounts[n.id].mistake === 1 ? "" : "en"}`}
                  </span>
                )}
                <span>{TYPES[n.type]} · {date(n.deadline)}</span>
                <div className="bar">
                  <i
                    style={{
                      width: `${pr.total ? (pr.done / pr.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="zoom">
        <button
          aria-label="Uitzoomen"
          onClick={() =>
            setView((v) => ({ ...v, z: Math.max(0.15, v.z * 0.8) }))
          }
        >
          −
        </button>
        <button onClick={fit}>Overzicht</button>
        <button
          aria-label="Inzoomen"
          onClick={() => setView((v) => ({ ...v, z: Math.min(2, v.z * 1.25) }))}
        >
          ＋
        </button>
      </div>
      <p className="tree-count">
        {visible.length} onderdelen · tik om te openen
      </p>
    </section>
  );
}
