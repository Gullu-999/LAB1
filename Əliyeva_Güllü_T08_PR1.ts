// PRACTICE C1 · Unions and narrowing (warm-up for the C1 tasks)                    (about 15 min)
//
// This practice task is NOT graded. Use it to test the exam kit on your laptop before the exam.
//
//   Task 1  area(s) for every shape. Then add a third shape  { kind: "triangle"; base: number; height: number }
//           (area = base * height / 2) and let TypeScript show you what to update.
//   Task 2  parsePort(v): a port number arrives as a number, as text, or not at all (undefined).
//              number or numeric text in 1..65535   -> that number
//              anything else (0, 70000, "abc")      -> null
//              undefined                            -> 8080 (the default)
//   Task 3  label(s): "circle r=2" | "rect 3x4" | "triangle 6/2" . Use a switch with every case.
//
// Rules: no  any , no  as , no  ! , no  @ts-ignore . The tests below the editor are read-only.

type Shape =
  | { kind: "circle"; r: number }
  | { kind: "rect"; w: number; h: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return s.r * s.r * Math.PI;
    case "rect":
      return s.w * s.h;
    case "triangle":
      return (s.base * s.height) / 2;
    default: {
      const unreachable: never = s;
      return unreachable;
    }
  }
}

function parsePort(v: string | number | undefined): number | null {
  if (v === undefined) return 8080;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= 65535) return n;
  return null;
}

function label(s: Shape): string {
  switch (s.kind) {
    case "circle":
      return `circle r=${s.r}`;
    case "rect":
      return `rect ${s.w}x${s.h}`;
    case "triangle":
      return `triangle ${s.base}/${s.height}`;
    default: {
      const unreachable: never = s;
      return unreachable;
    }
  }
}


// MIDTERM C1-4 · Repair an unsound MiniLang type checker                         (about 20 min)
//
// Lecture 2, slides 12 and 19-22, Lab 1 file 04. "Type-check first. Only accepted expressions are evaluated."
// A SOUND checker guarantees: if check() accepts e, then evaluate(e) never gets Stuck.
// evaluate() is correct. Do not change it. Fix check() only.

// ---- Abstract syntax ----
type Expr =
  | { kind: "int"; value: number }
  | { kind: "str"; value: string }
  | { kind: "var"; name: string }
  | { kind: "add"; left: Expr; right: Expr }
  | { kind: "gt"; left: Expr; right: Expr }
  | { kind: "eq"; left: Expr; right: Expr }
  | { kind: "if"; cond: Expr; then: Expr; else: Expr };

type Type = "int" | "string" | "bool";
type Env = { [variable: string]: Type | undefined };       // Gamma: names -> types
class CheckError extends Error {}                          // "no rule applies" = type error

function assertNever(x: never): never {
  throw new Error("no case for " + JSON.stringify(x));
}

// ---- The type checker:  check(e, env)  answers  "Gamma |- e : ?" ----
function check(e: Expr, env: Env): Type {
  switch (e.kind) {
    case "int": return "int";                              // T-Int
    case "str": return "string";                           // T-Str
    case "var": {                                          // T-Var
      const t = env[e.name];
      if (t === undefined) throw new CheckError("unbound variable " + e.name);
      return t;
    }
    case "gt": {                                           // T-Gt
      if (check(e.left, env) !== "int" || check(e.right, env) !== "int") throw new CheckError("> needs int > int");
      return "bool";
    }
    case "add": {
      // T-Add-Int:   Gamma |- e1 : int    Gamma |- e2 : int
      //              ---------------------------------------
      //                    Gamma |- e1 + e2 : int
      //
      // T-Add-Str:   Gamma |- e1 : string    Gamma |- e2 : string
      //              ------------------------------------------
      //                    Gamma |- e1 + e2 : string
      //
      // Any other combination: no rule applies, so it is a type error.
      const l = check(e.left, env);
      const r = check(e.right, env);
      if (l === "int" && r === "int") return "int";
      if (l === "string" && r === "string") return "string";
      throw new CheckError("+ needs int + int or string + string");
    }
    case "eq": {
      // T-Eq:   Gamma |- e1 : T    Gamma |- e2 : T
      //         ---------------------------------     (T is int, string or bool)
      //              Gamma |- e1 == e2 : bool
      const l = check(e.left, env);
      const r = check(e.right, env);
      if (l !== r) throw new CheckError("== needs both operands of the same type");
      return "bool";
    }
    case "if": {
      // T-If:   Gamma |- c : bool    Gamma |- e1 : T    Gamma |- e2 : T
      //         ------------------------------------------------------
      //                 Gamma |- if c then e1 else e2 : T
      const c = check(e.cond, env);
      if (c !== "bool") throw new CheckError("if condition must be bool");
      const thenT = check(e.then, env);
      const elseT = check(e.else, env);
      if (thenT !== elseT) throw new CheckError("branches of if have different types");
      return thenT;
    }
    default:
      return assertNever(e);
  }
}

// ---- The evaluator (correct, do not change) ----
type Value = number | string | boolean;
type Store = { [variable: string]: Value | undefined };   // sigma: names -> run-time values
class Stuck extends Error {}                               // a run-time type error

function evaluate(e: Expr, s: Store): Value {
  switch (e.kind) {
    case "int": return e.value;
    case "str": return e.value;
    case "var": {
      const v = s[e.name];
      if (v === undefined) throw new Stuck("no value for " + e.name);
      return v;
    }
    case "add": {
      const l = evaluate(e.left, s);
      const r = evaluate(e.right, s);
      if (typeof l === "number" && typeof r === "number") return l + r;
      if (typeof l === "string" && typeof r === "string") return l + r;
      throw new Stuck(`cannot add ${typeof l} and ${typeof r}`);
    }
    case "gt": {
      const l = evaluate(e.left, s);
      const r = evaluate(e.right, s);
      if (typeof l !== "number" || typeof r !== "number") throw new Stuck("> needs numbers");
      return l > r;
    }
    case "eq": return evaluate(e.left, s) === evaluate(e.right, s);
    case "if": {
      const c = evaluate(e.cond, s);
      if (typeof c !== "boolean") throw new Stuck("if condition is not a boolean");
      return c ? evaluate(e.then, s) : evaluate(e.else, s);
    }
  }
}
