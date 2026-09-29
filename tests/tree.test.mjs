import test from "node:test";
import assert from "node:assert/strict";
import {
  blank,
  validate,
  descendants,
  setStatus,
  progress,
  layout,
  parseRules,
  rulebook,
} from "../lib/tree.mjs";
const fixture = () => {
  const nodes = [];
  for (const [i, type] of [
    "vision",
    "year",
    "month",
    "project",
    "milestone",
  ].entries()) {
    nodes.push({
      ...blank(type, i ? String(i - 1) : null, "Karakter"),
      id: String(i),
      title: type,
      deadline: "2027-01-01",
    });
  }
  return nodes;
};
test("verplichte hiërarchie, geen losse taken of cycli", () => {
  const n = fixture();
  assert.equal(validate(n), n);
  assert.throws(() =>
    validate(n.map((x) => (x.id === "4" ? { ...x, parentId: null } : x))),
  );
  assert.throws(() =>
    validate(n.map((x) => (x.id === "0" ? { ...x, parentId: "4" } : x))),
  );
  assert.throws(() =>
    validate(n.map((x) => (x.id === "4" ? { ...x, type: "task" } : x))),
  );
});
test("afronden cascadeert; heropenen heropent ouders", () => {
  const n = setStatus(fixture(), "0", "completed");
  assert.equal(n.filter((x) => x.status === "completed").length, 5);
  assert.doesNotThrow(() => validate(n));
  const reopened = setStatus(n, "4", "active");
  assert.equal(reopened.filter((x) => x.status === "active").length, 5);
  assert.doesNotThrow(() => validate(reopened));
});
test("voortgang volgt eindpunten en verwijderen omvat de tak", () => {
  let n = fixture();
  n.push({ ...blank("milestone", "3", "Karakter"), id: "5", title: "Tweede" });
  n = setStatus(n, "4", "completed");
  assert.deepEqual(progress(n, "0"), { done: 1, total: 2 });
  assert.deepEqual([...descendants(n, "3")], ["3", "4", "5"]);
  assert.doesNotThrow(() =>
    validate(n.filter((x) => !descendants(n, "3").has(x.id))),
  );
});
test("back-up weigert dubbele ids en ongeldige velden", () => {
  const n = fixture();
  assert.throws(() => validate([...n, n[0]]));
  assert.throws(() => validate(n.map((x) => ({ ...x, vision: {} }))));
  assert.throws(() => validate(n.map((x) => ({ ...x, deadline: "nope" }))));
});
test("projecten mogen op jaar- en langetermijnniveau; posities zijn eindig", () => {
  for (const p of ["0", "1", "2"]) {
    const n = fixture().map((x) => (x.id === "3" ? { ...x, parentId: p } : x));
    assert.doesNotThrow(() => validate(n));
    assert.equal(Object.keys(layout(n)).length, 5);
    assert.ok(
      Object.values(layout(n)).every(
        (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
      ),
    );
  }
});
test("regelboek verzamelt regels van alle soorten onderdelen en behoudt Wel/Niet", () => {
  const nodes = [
    { ...blank("vision"), id: "v", title: "Visie", rules: "Wel:\n- Eerst nadenken.\n\nNiet:\n- Een excuus blind geloven." },
    { ...blank("project", "v"), id: "p", title: "Project", rules: "Eén afspraak per regel.\nTwee afspraken per regel." },
    { ...blank("milestone", "p"), id: "m", title: "Mijlpaal", rules: "**Wel:**\n• Kort reflecteren." },
  ];
  const entries = rulebook(nodes);
  assert.deepEqual(entries.map(({ node }) => node.id), ["v", "p", "m"]);
  assert.deepEqual(entries[0].rules, [
    { section: "Wel", text: "Eerst nadenken." },
    { section: "Niet", text: "Een excuus blind geloven." },
  ]);
  assert.deepEqual(entries[1].rules, [
    { section: "", text: "Eén afspraak per regel." },
    { section: "", text: "Twee afspraken per regel." },
  ]);
  assert.deepEqual(entries[2].rules, [{ section: "Wel", text: "Kort reflecteren." }]);
  assert.deepEqual(parseRules(""), []);
});
