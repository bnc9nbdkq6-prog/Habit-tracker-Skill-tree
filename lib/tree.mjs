export const KEY = "richting-v1";
export const TYPES = {
  vision: "Tienjaarsvisie",
  year: "Jaardoel",
  month: "Maanddoel",
  project: "Project",
  milestone: "Weekmijlpaal",
};
export const PARENTS = {
  vision: [],
  year: ["vision"],
  month: ["year"],
  project: ["vision", "year", "month"],
  milestone: ["project"],
};
export const uid = () => crypto.randomUUID();
export function descendants(nodes, id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes)
      if (ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id);
        changed = true;
      }
  }
  return ids;
}
export function progress(nodes, id) {
  const ids = descendants(nodes, id);
  const leaves = nodes.filter(
    (n) => ids.has(n.id) && !nodes.some((c) => c.parentId === n.id),
  );
  return {
    done: leaves.filter((n) => n.status === "completed").length,
    total: leaves.length,
  };
}
export function setStatus(nodes, id, status) {
  const affected = descendants(nodes, id);
  let next = nodes.map((n) => (affected.has(n.id) ? { ...n, status } : n));
  if (status === "active") {
    let p = nodes.find((n) => n.id === id)?.parentId;
    while (p) {
      next = next.map((n) => (n.id === p ? { ...n, status: "active" } : n));
      p = nodes.find((n) => n.id === p)?.parentId;
    }
  }
  return next;
}
export function validate(nodes) {
  if (!Array.isArray(nodes) || nodes.length > 5000)
    throw Error("Ongeldige of te grote doelenlijst.");
  const ids = new Set();
  for (const n of nodes) {
    if (
      !n ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      !Object.hasOwn(TYPES, n.type) ||
      typeof n.title !== "string" ||
      !n.title.trim() ||
      !["active", "completed"].includes(n.status)
    )
      throw Error("Een onderdeel heeft ongeldige gegevens.");
    ids.add(n.id);
    for (const k of [
      "domain",
      "description",
      "reason",
      "vision",
      "anti",
      "rules",
      "scope",
      "outline",
      "deadline",
    ])
      if (typeof n[k] !== "string") throw Error("Een tekstveld ontbreekt.");
    if (
      n.deadline &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(n.deadline) ||
        !Number.isFinite(Date.parse(n.deadline)))
    )
      throw Error("Ongeldige deadline.");
  }
  for (const n of nodes) {
    const p = nodes.find((x) => x.id === n.parentId);
    if (
      n.type === "vision"
        ? n.parentId !== null
        : !p || !PARENTS[n.type].includes(p.type)
    )
      throw Error(
        "Elk onderdeel moet aan een passend hoger doel gekoppeld zijn.",
      );
    if (p?.status === "completed" && n.status !== "completed")
      throw Error(
        "Een voltooid doel bevat een actief onderdeel. Heropen eerst het doel.",
      );
  }
  return nodes;
}
export function blank(type = "vision", parentId = null, domain = "") {
  return {
    id: uid(),
    type,
    parentId,
    title: "",
    domain,
    deadline: "",
    description: "",
    reason: "",
    vision: "",
    anti: "",
    rules: "",
    scope: "",
    outline: "",
    status: "active",
  };
}
export function layout(nodes) {
  const positions = {};
  const roots = nodes.filter((n) => !n.parentId);
  const weight = (id) =>
    Math.max(
      1,
      nodes
        .filter((n) => n.parentId === id)
        .reduce((s, n) => s + weight(n.id), 0),
    );
  function place(n, a, b, depth) {
    const angle = (a + b) / 2;
    const r = 290 * depth;
    positions[n.id] = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    const children = nodes.filter((x) => x.parentId === n.id);
    const total = children.reduce((s, c) => s + weight(c.id), 0);
    let cursor = a;
    for (const c of children) {
      const end = cursor + ((b - a) * weight(c.id)) / total;
      place(c, cursor, end, depth + 1);
      cursor = end;
    }
  }
  const total = roots.reduce((s, n) => s + weight(n.id), 0);
  let cursor = -Math.PI;
  for (const n of roots) {
    const end = cursor + (Math.PI * 2 * weight(n.id)) / total;
    place(n, cursor, end, 1);
    cursor = end;
  }
  return positions;
}
