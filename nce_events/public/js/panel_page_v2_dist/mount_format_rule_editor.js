/**
* @vue/shared v3.5.30
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
// @__NO_SIDE_EFFECTS__
function Zs(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const s of e.split(",")) t[s] = 1;
  return (s) => s in t;
}
const J = {}, ht = [], He = () => {
}, ir = () => !1, vs = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), zs = (e) => e.startsWith("onUpdate:"), ae = Object.assign, en = (e, t) => {
  const s = e.indexOf(t);
  s > -1 && e.splice(s, 1);
}, gi = Object.prototype.hasOwnProperty, K = (e, t) => gi.call(e, t), V = Array.isArray, gt = (e) => Jt(e) === "[object Map]", Ct = (e) => Jt(e) === "[object Set]", Fn = (e) => Jt(e) === "[object Date]", H = (e) => typeof e == "function", se = (e) => typeof e == "string", je = (e) => typeof e == "symbol", q = (e) => e !== null && typeof e == "object", lr = (e) => (q(e) || H(e)) && H(e.then) && H(e.catch), or = Object.prototype.toString, Jt = (e) => or.call(e), mi = (e) => Jt(e).slice(8, -1), cr = (e) => Jt(e) === "[object Object]", tn = (e) => se(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Ot = /* @__PURE__ */ Zs(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), ys = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (s) => t[s] || (t[s] = e(s));
}, _i = /-\w/g, Ee = ys(
  (e) => e.replace(_i, (t) => t.slice(1).toUpperCase())
), bi = /\B([A-Z])/g, ft = ys(
  (e) => e.replace(bi, "-$1").toLowerCase()
), fr = ys((e) => e.charAt(0).toUpperCase() + e.slice(1)), Ms = ys(
  (e) => e ? `on${fr(e)}` : ""
), Be = (e, t) => !Object.is(e, t), is = (e, ...t) => {
  for (let s = 0; s < e.length; s++)
    e[s](...t);
}, ur = (e, t, s, n = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: n,
    value: s
  });
}, xs = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
};
let En;
const Cs = () => En || (En = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Re(e) {
  if (V(e)) {
    const t = {};
    for (let s = 0; s < e.length; s++) {
      const n = e[s], r = se(n) ? Ci(n) : Re(n);
      if (r)
        for (const i in r)
          t[i] = r[i];
    }
    return t;
  } else if (se(e) || q(e))
    return e;
}
const vi = /;(?![^(]*\))/g, yi = /:([^]+)/, xi = /\/\*[^]*?\*\//g;
function Ci(e) {
  const t = {};
  return e.replace(xi, "").split(vi).forEach((s) => {
    if (s) {
      const n = s.split(yi);
      n.length > 1 && (t[n[0].trim()] = n[1].trim());
    }
  }), t;
}
function mt(e) {
  let t = "";
  if (se(e))
    t = e;
  else if (V(e))
    for (let s = 0; s < e.length; s++) {
      const n = mt(e[s]);
      n && (t += n + " ");
    }
  else if (q(e))
    for (const s in e)
      e[s] && (t += s + " ");
  return t.trim();
}
const Fi = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Ei = /* @__PURE__ */ Zs(Fi);
function ar(e) {
  return !!e || e === "";
}
function wi(e, t) {
  if (e.length !== t.length) return !1;
  let s = !0;
  for (let n = 0; s && n < e.length; n++)
    s = Ft(e[n], t[n]);
  return s;
}
function Ft(e, t) {
  if (e === t) return !0;
  let s = Fn(e), n = Fn(t);
  if (s || n)
    return s && n ? e.getTime() === t.getTime() : !1;
  if (s = je(e), n = je(t), s || n)
    return e === t;
  if (s = V(e), n = V(t), s || n)
    return s && n ? wi(e, t) : !1;
  if (s = q(e), n = q(t), s || n) {
    if (!s || !n)
      return !1;
    const r = Object.keys(e).length, i = Object.keys(t).length;
    if (r !== i)
      return !1;
    for (const l in e) {
      const o = e.hasOwnProperty(l), c = t.hasOwnProperty(l);
      if (o && !c || !o && c || !Ft(e[l], t[l]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function sn(e, t) {
  return e.findIndex((s) => Ft(s, t));
}
const dr = (e) => !!(e && e.__v_isRef === !0), kt = (e) => se(e) ? e : e == null ? "" : V(e) || q(e) && (e.toString === or || !H(e.toString)) ? dr(e) ? kt(e.value) : JSON.stringify(e, pr, 2) : String(e), pr = (e, t) => dr(t) ? pr(e, t.value) : gt(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (s, [n, r], i) => (s[Os(n, i) + " =>"] = r, s),
    {}
  )
} : Ct(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((s) => Os(s))
} : je(t) ? Os(t) : q(t) && !V(t) && !cr(t) ? String(t) : t, Os = (e, t = "") => {
  var s;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    je(e) ? `Symbol(${(s = e.description) != null ? s : t})` : e
  );
};
/**
* @vue/reactivity v3.5.30
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let _e;
class Ai {
  // TODO isolatedDeclarations "__v_skip"
  constructor(t = !1) {
    this.detached = t, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.__v_skip = !0, this.parent = _e, !t && _e && (this.index = (_e.scopes || (_e.scopes = [])).push(
      this
    ) - 1);
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let t, s;
      if (this.scopes)
        for (t = 0, s = this.scopes.length; t < s; t++)
          this.scopes[t].pause();
      for (t = 0, s = this.effects.length; t < s; t++)
        this.effects[t].pause();
    }
  }
  /**
   * Resumes the effect scope, including all child scopes and effects.
   */
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1;
      let t, s;
      if (this.scopes)
        for (t = 0, s = this.scopes.length; t < s; t++)
          this.scopes[t].resume();
      for (t = 0, s = this.effects.length; t < s; t++)
        this.effects[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const s = _e;
      try {
        return _e = this, t();
      } finally {
        _e = s;
      }
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ++this._on === 1 && (this.prevScope = _e, _e = this);
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    this._on > 0 && --this._on === 0 && (_e = this.prevScope, this.prevScope = void 0);
  }
  stop(t) {
    if (this._active) {
      this._active = !1;
      let s, n;
      for (s = 0, n = this.effects.length; s < n; s++)
        this.effects[s].stop();
      for (this.effects.length = 0, s = 0, n = this.cleanups.length; s < n; s++)
        this.cleanups[s]();
      if (this.cleanups.length = 0, this.scopes) {
        for (s = 0, n = this.scopes.length; s < n; s++)
          this.scopes[s].stop(!0);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !t) {
        const r = this.parent.scopes.pop();
        r && r !== this && (this.parent.scopes[this.index] = r, r.index = this.index);
      }
      this.parent = void 0;
    }
  }
}
function Si() {
  return _e;
}
let Z;
const Is = /* @__PURE__ */ new WeakSet();
class hr {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, _e && _e.active && _e.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, Is.has(this) && (Is.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || mr(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, wn(this), _r(this);
    const t = Z, s = we;
    Z = this, we = !0;
    try {
      return this.fn();
    } finally {
      br(this), Z = t, we = s, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        ln(t);
      this.deps = this.depsTail = void 0, wn(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? Is.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    js(this) && this.run();
  }
  get dirty() {
    return js(this);
  }
}
let gr = 0, It, Pt;
function mr(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = Pt, Pt = e;
    return;
  }
  e.next = It, It = e;
}
function nn() {
  gr++;
}
function rn() {
  if (--gr > 0)
    return;
  if (Pt) {
    let t = Pt;
    for (Pt = void 0; t; ) {
      const s = t.next;
      t.next = void 0, t.flags &= -9, t = s;
    }
  }
  let e;
  for (; It; ) {
    let t = It;
    for (It = void 0; t; ) {
      const s = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1)
        try {
          t.trigger();
        } catch (n) {
          e || (e = n);
        }
      t = s;
    }
  }
  if (e) throw e;
}
function _r(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function br(e) {
  let t, s = e.depsTail, n = s;
  for (; n; ) {
    const r = n.prevDep;
    n.version === -1 ? (n === s && (s = r), ln(n), Ti(n)) : t = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = r;
  }
  e.deps = t, e.depsTail = s;
}
function js(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (vr(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function vr(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Lt) || (e.globalVersion = Lt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !js(e))))
    return;
  e.flags |= 2;
  const t = e.dep, s = Z, n = we;
  Z = e, we = !0;
  try {
    _r(e);
    const r = e.fn(e._value);
    (t.version === 0 || Be(r, e._value)) && (e.flags |= 128, e._value = r, t.version++);
  } catch (r) {
    throw t.version++, r;
  } finally {
    Z = s, we = n, br(e), e.flags &= -3;
  }
}
function ln(e, t = !1) {
  const { dep: s, prevSub: n, nextSub: r } = e;
  if (n && (n.nextSub = r, e.prevSub = void 0), r && (r.prevSub = n, e.nextSub = void 0), s.subs === e && (s.subs = n, !n && s.computed)) {
    s.computed.flags &= -5;
    for (let i = s.computed.deps; i; i = i.nextDep)
      ln(i, !0);
  }
  !t && !--s.sc && s.map && s.map.delete(s.key);
}
function Ti(e) {
  const { prevDep: t, nextDep: s } = e;
  t && (t.nextDep = s, e.prevDep = void 0), s && (s.prevDep = t, e.nextDep = void 0);
}
let we = !0;
const yr = [];
function Je() {
  yr.push(we), we = !1;
}
function Ye() {
  const e = yr.pop();
  we = e === void 0 ? !0 : e;
}
function wn(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const s = Z;
    Z = void 0;
    try {
      t();
    } finally {
      Z = s;
    }
  }
}
let Lt = 0;
class Di {
  constructor(t, s) {
    this.sub = t, this.dep = s, this.version = s.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class on {
  // TODO isolatedDeclarations "__v_skip"
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
  }
  track(t) {
    if (!Z || !we || Z === this.computed)
      return;
    let s = this.activeLink;
    if (s === void 0 || s.sub !== Z)
      s = this.activeLink = new Di(Z, this), Z.deps ? (s.prevDep = Z.depsTail, Z.depsTail.nextDep = s, Z.depsTail = s) : Z.deps = Z.depsTail = s, xr(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = Z.depsTail, s.nextDep = void 0, Z.depsTail.nextDep = s, Z.depsTail = s, Z.deps === s && (Z.deps = n);
    }
    return s;
  }
  trigger(t) {
    this.version++, Lt++, this.notify(t);
  }
  notify(t) {
    nn();
    try {
      for (let s = this.subs; s; s = s.prevSub)
        s.sub.notify() && s.sub.dep.notify();
    } finally {
      rn();
    }
  }
}
function xr(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let n = t.deps; n; n = n.nextDep)
        xr(n);
    }
    const s = e.dep.subs;
    s !== e && (e.prevSub = s, s && (s.nextSub = e)), e.dep.subs = e;
  }
}
const Ns = /* @__PURE__ */ new WeakMap(), ot = /* @__PURE__ */ Symbol(
  ""
), ks = /* @__PURE__ */ Symbol(
  ""
), Ut = /* @__PURE__ */ Symbol(
  ""
);
function fe(e, t, s) {
  if (we && Z) {
    let n = Ns.get(e);
    n || Ns.set(e, n = /* @__PURE__ */ new Map());
    let r = n.get(s);
    r || (n.set(s, r = new on()), r.map = n, r.key = s), r.track();
  }
}
function We(e, t, s, n, r, i) {
  const l = Ns.get(e);
  if (!l) {
    Lt++;
    return;
  }
  const o = (c) => {
    c && c.trigger();
  };
  if (nn(), t === "clear")
    l.forEach(o);
  else {
    const c = V(e), d = c && tn(s);
    if (c && s === "length") {
      const a = Number(n);
      l.forEach((h, x) => {
        (x === "length" || x === Ut || !je(x) && x >= a) && o(h);
      });
    } else
      switch ((s !== void 0 || l.has(void 0)) && o(l.get(s)), d && o(l.get(Ut)), t) {
        case "add":
          c ? d && o(l.get("length")) : (o(l.get(ot)), gt(e) && o(l.get(ks)));
          break;
        case "delete":
          c || (o(l.get(ot)), gt(e) && o(l.get(ks)));
          break;
        case "set":
          gt(e) && o(l.get(ot));
          break;
      }
  }
  rn();
}
function ut(e) {
  const t = /* @__PURE__ */ U(e);
  return t === e ? t : (fe(t, "iterate", Ut), /* @__PURE__ */ Fe(e) ? t : t.map(Ae));
}
function Fs(e) {
  return fe(e = /* @__PURE__ */ U(e), "iterate", Ut), e;
}
function $e(e, t) {
  return /* @__PURE__ */ Qe(e) ? vt(/* @__PURE__ */ ct(e) ? Ae(t) : t) : Ae(t);
}
const Mi = {
  __proto__: null,
  [Symbol.iterator]() {
    return Ps(this, Symbol.iterator, (e) => $e(this, e));
  },
  concat(...e) {
    return ut(this).concat(
      ...e.map((t) => V(t) ? ut(t) : t)
    );
  },
  entries() {
    return Ps(this, "entries", (e) => (e[1] = $e(this, e[1]), e));
  },
  every(e, t) {
    return ke(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return ke(
      this,
      "filter",
      e,
      t,
      (s) => s.map((n) => $e(this, n)),
      arguments
    );
  },
  find(e, t) {
    return ke(
      this,
      "find",
      e,
      t,
      (s) => $e(this, s),
      arguments
    );
  },
  findIndex(e, t) {
    return ke(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return ke(
      this,
      "findLast",
      e,
      t,
      (s) => $e(this, s),
      arguments
    );
  },
  findLastIndex(e, t) {
    return ke(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return ke(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return Rs(this, "includes", e);
  },
  indexOf(...e) {
    return Rs(this, "indexOf", e);
  },
  join(e) {
    return ut(this).join(e);
  },
  // keys() iterator only reads `length`, no optimization required
  lastIndexOf(...e) {
    return Rs(this, "lastIndexOf", e);
  },
  map(e, t) {
    return ke(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return St(this, "pop");
  },
  push(...e) {
    return St(this, "push", e);
  },
  reduce(e, ...t) {
    return An(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return An(this, "reduceRight", e, t);
  },
  shift() {
    return St(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return ke(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return St(this, "splice", e);
  },
  toReversed() {
    return ut(this).toReversed();
  },
  toSorted(e) {
    return ut(this).toSorted(e);
  },
  toSpliced(...e) {
    return ut(this).toSpliced(...e);
  },
  unshift(...e) {
    return St(this, "unshift", e);
  },
  values() {
    return Ps(this, "values", (e) => $e(this, e));
  }
};
function Ps(e, t, s) {
  const n = Fs(e), r = n[t]();
  return n !== e && !/* @__PURE__ */ Fe(e) && (r._next = r.next, r.next = () => {
    const i = r._next();
    return i.done || (i.value = s(i.value)), i;
  }), r;
}
const Oi = Array.prototype;
function ke(e, t, s, n, r, i) {
  const l = Fs(e), o = l !== e && !/* @__PURE__ */ Fe(e), c = l[t];
  if (c !== Oi[t]) {
    const h = c.apply(e, i);
    return o ? Ae(h) : h;
  }
  let d = s;
  l !== e && (o ? d = function(h, x) {
    return s.call(this, $e(e, h), x, e);
  } : s.length > 2 && (d = function(h, x) {
    return s.call(this, h, x, e);
  }));
  const a = c.call(l, d, n);
  return o && r ? r(a) : a;
}
function An(e, t, s, n) {
  const r = Fs(e), i = r !== e && !/* @__PURE__ */ Fe(e);
  let l = s, o = !1;
  r !== e && (i ? (o = n.length === 0, l = function(d, a, h) {
    return o && (o = !1, d = $e(e, d)), s.call(this, d, $e(e, a), h, e);
  }) : s.length > 3 && (l = function(d, a, h) {
    return s.call(this, d, a, h, e);
  }));
  const c = r[t](l, ...n);
  return o ? $e(e, c) : c;
}
function Rs(e, t, s) {
  const n = /* @__PURE__ */ U(e);
  fe(n, "iterate", Ut);
  const r = n[t](...s);
  return (r === -1 || r === !1) && /* @__PURE__ */ un(s[0]) ? (s[0] = /* @__PURE__ */ U(s[0]), n[t](...s)) : r;
}
function St(e, t, s = []) {
  Je(), nn();
  const n = (/* @__PURE__ */ U(e))[t].apply(e, s);
  return rn(), Ye(), n;
}
const Ii = /* @__PURE__ */ Zs("__proto__,__v_isRef,__isVue"), Cr = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(je)
);
function Pi(e) {
  je(e) || (e = String(e));
  const t = /* @__PURE__ */ U(this);
  return fe(t, "has", e), t.hasOwnProperty(e);
}
class Fr {
  constructor(t = !1, s = !1) {
    this._isReadonly = t, this._isShallow = s;
  }
  get(t, s, n) {
    if (s === "__v_skip") return t.__v_skip;
    const r = this._isReadonly, i = this._isShallow;
    if (s === "__v_isReactive")
      return !r;
    if (s === "__v_isReadonly")
      return r;
    if (s === "__v_isShallow")
      return i;
    if (s === "__v_raw")
      return n === (r ? i ? Ui : Sr : i ? Ar : wr).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(n) ? t : void 0;
    const l = V(t);
    if (!r) {
      let c;
      if (l && (c = Mi[s]))
        return c;
      if (s === "hasOwnProperty")
        return Pi;
    }
    const o = Reflect.get(
      t,
      s,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ ue(t) ? t : n
    );
    if ((je(s) ? Cr.has(s) : Ii(s)) || (r || fe(t, "get", s), i))
      return o;
    if (/* @__PURE__ */ ue(o)) {
      const c = l && tn(s) ? o : o.value;
      return r && q(c) ? /* @__PURE__ */ Us(c) : c;
    }
    return q(o) ? r ? /* @__PURE__ */ Us(o) : /* @__PURE__ */ Yt(o) : o;
  }
}
class Er extends Fr {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, s, n, r) {
    let i = t[s];
    const l = V(t) && tn(s);
    if (!this._isShallow) {
      const d = /* @__PURE__ */ Qe(i);
      if (!/* @__PURE__ */ Fe(n) && !/* @__PURE__ */ Qe(n) && (i = /* @__PURE__ */ U(i), n = /* @__PURE__ */ U(n)), !l && /* @__PURE__ */ ue(i) && !/* @__PURE__ */ ue(n))
        return d || (i.value = n), !0;
    }
    const o = l ? Number(s) < t.length : K(t, s), c = Reflect.set(
      t,
      s,
      n,
      /* @__PURE__ */ ue(t) ? t : r
    );
    return t === /* @__PURE__ */ U(r) && (o ? Be(n, i) && We(t, "set", s, n) : We(t, "add", s, n)), c;
  }
  deleteProperty(t, s) {
    const n = K(t, s);
    t[s];
    const r = Reflect.deleteProperty(t, s);
    return r && n && We(t, "delete", s, void 0), r;
  }
  has(t, s) {
    const n = Reflect.has(t, s);
    return (!je(s) || !Cr.has(s)) && fe(t, "has", s), n;
  }
  ownKeys(t) {
    return fe(
      t,
      "iterate",
      V(t) ? "length" : ot
    ), Reflect.ownKeys(t);
  }
}
class Ri extends Fr {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, s) {
    return !0;
  }
  deleteProperty(t, s) {
    return !0;
  }
}
const $i = /* @__PURE__ */ new Er(), Vi = /* @__PURE__ */ new Ri(), Bi = /* @__PURE__ */ new Er(!0);
const Ls = (e) => e, es = (e) => Reflect.getPrototypeOf(e);
function Hi(e, t, s) {
  return function(...n) {
    const r = this.__v_raw, i = /* @__PURE__ */ U(r), l = gt(i), o = e === "entries" || e === Symbol.iterator && l, c = e === "keys" && l, d = r[e](...n), a = s ? Ls : t ? vt : Ae;
    return !t && fe(
      i,
      "iterate",
      c ? ks : ot
    ), ae(
      // inheriting all iterator properties
      Object.create(d),
      {
        // iterator protocol
        next() {
          const { value: h, done: x } = d.next();
          return x ? { value: h, done: x } : {
            value: o ? [a(h[0]), a(h[1])] : a(h),
            done: x
          };
        }
      }
    );
  };
}
function ts(e) {
  return function(...t) {
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function ji(e, t) {
  const s = {
    get(r) {
      const i = this.__v_raw, l = /* @__PURE__ */ U(i), o = /* @__PURE__ */ U(r);
      e || (Be(r, o) && fe(l, "get", r), fe(l, "get", o));
      const { has: c } = es(l), d = t ? Ls : e ? vt : Ae;
      if (c.call(l, r))
        return d(i.get(r));
      if (c.call(l, o))
        return d(i.get(o));
      i !== l && i.get(r);
    },
    get size() {
      const r = this.__v_raw;
      return !e && fe(/* @__PURE__ */ U(r), "iterate", ot), r.size;
    },
    has(r) {
      const i = this.__v_raw, l = /* @__PURE__ */ U(i), o = /* @__PURE__ */ U(r);
      return e || (Be(r, o) && fe(l, "has", r), fe(l, "has", o)), r === o ? i.has(r) : i.has(r) || i.has(o);
    },
    forEach(r, i) {
      const l = this, o = l.__v_raw, c = /* @__PURE__ */ U(o), d = t ? Ls : e ? vt : Ae;
      return !e && fe(c, "iterate", ot), o.forEach((a, h) => r.call(i, d(a), d(h), l));
    }
  };
  return ae(
    s,
    e ? {
      add: ts("add"),
      set: ts("set"),
      delete: ts("delete"),
      clear: ts("clear")
    } : {
      add(r) {
        const i = /* @__PURE__ */ U(this), l = es(i), o = /* @__PURE__ */ U(r), c = !t && !/* @__PURE__ */ Fe(r) && !/* @__PURE__ */ Qe(r) ? o : r;
        return l.has.call(i, c) || Be(r, c) && l.has.call(i, r) || Be(o, c) && l.has.call(i, o) || (i.add(c), We(i, "add", c, c)), this;
      },
      set(r, i) {
        !t && !/* @__PURE__ */ Fe(i) && !/* @__PURE__ */ Qe(i) && (i = /* @__PURE__ */ U(i));
        const l = /* @__PURE__ */ U(this), { has: o, get: c } = es(l);
        let d = o.call(l, r);
        d || (r = /* @__PURE__ */ U(r), d = o.call(l, r));
        const a = c.call(l, r);
        return l.set(r, i), d ? Be(i, a) && We(l, "set", r, i) : We(l, "add", r, i), this;
      },
      delete(r) {
        const i = /* @__PURE__ */ U(this), { has: l, get: o } = es(i);
        let c = l.call(i, r);
        c || (r = /* @__PURE__ */ U(r), c = l.call(i, r)), o && o.call(i, r);
        const d = i.delete(r);
        return c && We(i, "delete", r, void 0), d;
      },
      clear() {
        const r = /* @__PURE__ */ U(this), i = r.size !== 0, l = r.clear();
        return i && We(
          r,
          "clear",
          void 0,
          void 0
        ), l;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((r) => {
    s[r] = Hi(r, e, t);
  }), s;
}
function cn(e, t) {
  const s = ji(e, t);
  return (n, r, i) => r === "__v_isReactive" ? !e : r === "__v_isReadonly" ? e : r === "__v_raw" ? n : Reflect.get(
    K(s, r) && r in n ? s : n,
    r,
    i
  );
}
const Ni = {
  get: /* @__PURE__ */ cn(!1, !1)
}, ki = {
  get: /* @__PURE__ */ cn(!1, !0)
}, Li = {
  get: /* @__PURE__ */ cn(!0, !1)
};
const wr = /* @__PURE__ */ new WeakMap(), Ar = /* @__PURE__ */ new WeakMap(), Sr = /* @__PURE__ */ new WeakMap(), Ui = /* @__PURE__ */ new WeakMap();
function Ki(e) {
  switch (e) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function Wi(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : Ki(mi(e));
}
// @__NO_SIDE_EFFECTS__
function Yt(e) {
  return /* @__PURE__ */ Qe(e) ? e : fn(
    e,
    !1,
    $i,
    Ni,
    wr
  );
}
// @__NO_SIDE_EFFECTS__
function qi(e) {
  return fn(
    e,
    !1,
    Bi,
    ki,
    Ar
  );
}
// @__NO_SIDE_EFFECTS__
function Us(e) {
  return fn(
    e,
    !0,
    Vi,
    Li,
    Sr
  );
}
function fn(e, t, s, n, r) {
  if (!q(e) || e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const i = Wi(e);
  if (i === 0)
    return e;
  const l = r.get(e);
  if (l)
    return l;
  const o = new Proxy(
    e,
    i === 2 ? n : s
  );
  return r.set(e, o), o;
}
// @__NO_SIDE_EFFECTS__
function ct(e) {
  return /* @__PURE__ */ Qe(e) ? /* @__PURE__ */ ct(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Qe(e) {
  return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Fe(e) {
  return !!(e && e.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function un(e) {
  return e ? !!e.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function U(e) {
  const t = e && e.__v_raw;
  return t ? /* @__PURE__ */ U(t) : e;
}
function Gi(e) {
  return !K(e, "__v_skip") && Object.isExtensible(e) && ur(e, "__v_skip", !0), e;
}
const Ae = (e) => q(e) ? /* @__PURE__ */ Yt(e) : e, vt = (e) => q(e) ? /* @__PURE__ */ Us(e) : e;
// @__NO_SIDE_EFFECTS__
function ue(e) {
  return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function Ue(e) {
  return Ji(e, !1);
}
function Ji(e, t) {
  return /* @__PURE__ */ ue(e) ? e : new Yi(e, t);
}
class Yi {
  constructor(t, s) {
    this.dep = new on(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = s ? t : /* @__PURE__ */ U(t), this._value = s ? t : Ae(t), this.__v_isShallow = s;
  }
  get value() {
    return this.dep.track(), this._value;
  }
  set value(t) {
    const s = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ Fe(t) || /* @__PURE__ */ Qe(t);
    t = n ? t : /* @__PURE__ */ U(t), Be(t, s) && (this._rawValue = t, this._value = n ? t : Ae(t), this.dep.trigger());
  }
}
function Tr(e) {
  return /* @__PURE__ */ ue(e) ? e.value : e;
}
const Qi = {
  get: (e, t, s) => t === "__v_raw" ? e : Tr(Reflect.get(e, t, s)),
  set: (e, t, s, n) => {
    const r = e[t];
    return /* @__PURE__ */ ue(r) && !/* @__PURE__ */ ue(s) ? (r.value = s, !0) : Reflect.set(e, t, s, n);
  }
};
function Dr(e) {
  return /* @__PURE__ */ ct(e) ? e : new Proxy(e, Qi);
}
class Xi {
  constructor(t, s, n) {
    this.fn = t, this.setter = s, this._value = void 0, this.dep = new on(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Lt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Z !== this)
      return mr(this, !0), !0;
  }
  get value() {
    const t = this.dep.track();
    return vr(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
// @__NO_SIDE_EFFECTS__
function Zi(e, t, s = !1) {
  let n, r;
  return H(e) ? n = e : (n = e.get, r = e.set), new Xi(n, r, s);
}
const ss = {}, as = /* @__PURE__ */ new WeakMap();
let lt;
function zi(e, t = !1, s = lt) {
  if (s) {
    let n = as.get(s);
    n || as.set(s, n = []), n.push(e);
  }
}
function el(e, t, s = J) {
  const { immediate: n, deep: r, once: i, scheduler: l, augmentJob: o, call: c } = s, d = (P) => r ? P : /* @__PURE__ */ Fe(P) || r === !1 || r === 0 ? qe(P, 1) : qe(P);
  let a, h, x, F, $ = !1, D = !1;
  if (/* @__PURE__ */ ue(e) ? (h = () => e.value, $ = /* @__PURE__ */ Fe(e)) : /* @__PURE__ */ ct(e) ? (h = () => d(e), $ = !0) : V(e) ? (D = !0, $ = e.some((P) => /* @__PURE__ */ ct(P) || /* @__PURE__ */ Fe(P)), h = () => e.map((P) => {
    if (/* @__PURE__ */ ue(P))
      return P.value;
    if (/* @__PURE__ */ ct(P))
      return d(P);
    if (H(P))
      return c ? c(P, 2) : P();
  })) : H(e) ? t ? h = c ? () => c(e, 2) : e : h = () => {
    if (x) {
      Je();
      try {
        x();
      } finally {
        Ye();
      }
    }
    const P = lt;
    lt = a;
    try {
      return c ? c(e, 3, [F]) : e(F);
    } finally {
      lt = P;
    }
  } : h = He, t && r) {
    const P = h, Y = r === !0 ? 1 / 0 : r;
    h = () => qe(P(), Y);
  }
  const k = Si(), M = () => {
    a.stop(), k && k.active && en(k.effects, a);
  };
  if (i && t) {
    const P = t;
    t = (...Y) => {
      P(...Y), M();
    };
  }
  let v = D ? new Array(e.length).fill(ss) : ss;
  const I = (P) => {
    if (!(!(a.flags & 1) || !a.dirty && !P))
      if (t) {
        const Y = a.run();
        if (r || $ || (D ? Y.some((ie, j) => Be(ie, v[j])) : Be(Y, v))) {
          x && x();
          const ie = lt;
          lt = a;
          try {
            const j = [
              Y,
              // pass undefined as the old value when it's changed for the first time
              v === ss ? void 0 : D && v[0] === ss ? [] : v,
              F
            ];
            v = Y, c ? c(t, 3, j) : (
              // @ts-expect-error
              t(...j)
            );
          } finally {
            lt = ie;
          }
        }
      } else
        a.run();
  };
  return o && o(I), a = new hr(h), a.scheduler = l ? () => l(I, !1) : I, F = (P) => zi(P, !1, a), x = a.onStop = () => {
    const P = as.get(a);
    if (P) {
      if (c)
        c(P, 4);
      else
        for (const Y of P) Y();
      as.delete(a);
    }
  }, t ? n ? I(!0) : v = a.run() : l ? l(I.bind(null, !0), !0) : a.run(), M.pause = a.pause.bind(a), M.resume = a.resume.bind(a), M.stop = M, M;
}
function qe(e, t = 1 / 0, s) {
  if (t <= 0 || !q(e) || e.__v_skip || (s = s || /* @__PURE__ */ new Map(), (s.get(e) || 0) >= t))
    return e;
  if (s.set(e, t), t--, /* @__PURE__ */ ue(e))
    qe(e.value, t, s);
  else if (V(e))
    for (let n = 0; n < e.length; n++)
      qe(e[n], t, s);
  else if (Ct(e) || gt(e))
    e.forEach((n) => {
      qe(n, t, s);
    });
  else if (cr(e)) {
    for (const n in e)
      qe(e[n], t, s);
    for (const n of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, n) && qe(e[n], t, s);
  }
  return e;
}
/**
* @vue/runtime-core v3.5.30
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function Qt(e, t, s, n) {
  try {
    return n ? e(...n) : e();
  } catch (r) {
    Es(r, t, s);
  }
}
function Ne(e, t, s, n) {
  if (H(e)) {
    const r = Qt(e, t, s, n);
    return r && lr(r) && r.catch((i) => {
      Es(i, t, s);
    }), r;
  }
  if (V(e)) {
    const r = [];
    for (let i = 0; i < e.length; i++)
      r.push(Ne(e[i], t, s, n));
    return r;
  }
}
function Es(e, t, s, n = !0) {
  const r = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: l } = t && t.appContext.config || J;
  if (t) {
    let o = t.parent;
    const c = t.proxy, d = `https://vuejs.org/error-reference/#runtime-${s}`;
    for (; o; ) {
      const a = o.ec;
      if (a) {
        for (let h = 0; h < a.length; h++)
          if (a[h](e, c, d) === !1)
            return;
      }
      o = o.parent;
    }
    if (i) {
      Je(), Qt(i, null, 10, [
        e,
        c,
        d
      ]), Ye();
      return;
    }
  }
  tl(e, s, r, n, l);
}
function tl(e, t, s, n = !0, r = !1) {
  if (r)
    throw e;
  console.error(e);
}
const pe = [];
let Pe = -1;
const _t = [];
let Ze = null, dt = 0;
const Mr = /* @__PURE__ */ Promise.resolve();
let ds = null;
function Or(e) {
  const t = ds || Mr;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function sl(e) {
  let t = Pe + 1, s = pe.length;
  for (; t < s; ) {
    const n = t + s >>> 1, r = pe[n], i = Kt(r);
    i < e || i === e && r.flags & 2 ? t = n + 1 : s = n;
  }
  return t;
}
function an(e) {
  if (!(e.flags & 1)) {
    const t = Kt(e), s = pe[pe.length - 1];
    !s || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= Kt(s) ? pe.push(e) : pe.splice(sl(t), 0, e), e.flags |= 1, Ir();
  }
}
function Ir() {
  ds || (ds = Mr.then(Rr));
}
function nl(e) {
  V(e) ? _t.push(...e) : Ze && e.id === -1 ? Ze.splice(dt + 1, 0, e) : e.flags & 1 || (_t.push(e), e.flags |= 1), Ir();
}
function Sn(e, t, s = Pe + 1) {
  for (; s < pe.length; s++) {
    const n = pe[s];
    if (n && n.flags & 2) {
      if (e && n.id !== e.uid)
        continue;
      pe.splice(s, 1), s--, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
    }
  }
}
function Pr(e) {
  if (_t.length) {
    const t = [...new Set(_t)].sort(
      (s, n) => Kt(s) - Kt(n)
    );
    if (_t.length = 0, Ze) {
      Ze.push(...t);
      return;
    }
    for (Ze = t, dt = 0; dt < Ze.length; dt++) {
      const s = Ze[dt];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    Ze = null, dt = 0;
  }
}
const Kt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function Rr(e) {
  try {
    for (Pe = 0; Pe < pe.length; Pe++) {
      const t = pe[Pe];
      t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Qt(
        t,
        t.i,
        t.i ? 15 : 14
      ), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; Pe < pe.length; Pe++) {
      const t = pe[Pe];
      t && (t.flags &= -2);
    }
    Pe = -1, pe.length = 0, Pr(), ds = null, (pe.length || _t.length) && Rr();
  }
}
let Ce = null, $r = null;
function ps(e) {
  const t = Ce;
  return Ce = e, $r = e && e.type.__scopeId || null, t;
}
function rl(e, t = Ce, s) {
  if (!t || e._n)
    return e;
  const n = (...r) => {
    n._d && ms(-1);
    const i = ps(t);
    let l;
    try {
      l = e(...r);
    } finally {
      ps(i), n._d && ms(1);
    }
    return l;
  };
  return n._n = !0, n._c = !0, n._d = !0, n;
}
function at(e, t) {
  if (Ce === null)
    return e;
  const s = Ts(Ce), n = e.dirs || (e.dirs = []);
  for (let r = 0; r < t.length; r++) {
    let [i, l, o, c = J] = t[r];
    i && (H(i) && (i = {
      mounted: i,
      updated: i
    }), i.deep && qe(l), n.push({
      dir: i,
      instance: s,
      value: l,
      oldValue: void 0,
      arg: o,
      modifiers: c
    }));
  }
  return e;
}
function rt(e, t, s, n) {
  const r = e.dirs, i = t && t.dirs;
  for (let l = 0; l < r.length; l++) {
    const o = r[l];
    i && (o.oldValue = i[l].value);
    let c = o.dir[n];
    c && (Je(), Ne(c, s, 8, [
      e.el,
      o,
      e,
      t
    ]), Ye());
  }
}
function il(e, t) {
  if (he) {
    let s = he.provides;
    const n = he.parent && he.parent.provides;
    n === s && (s = he.provides = Object.create(n)), s[e] = t;
  }
}
function ls(e, t, s = !1) {
  const n = lo();
  if (n || bt) {
    let r = bt ? bt._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (r && e in r)
      return r[e];
    if (arguments.length > 1)
      return s && H(t) ? t.call(n && n.proxy) : t;
  }
}
const ll = /* @__PURE__ */ Symbol.for("v-scx"), ol = () => ls(ll);
function Rt(e, t, s) {
  return Vr(e, t, s);
}
function Vr(e, t, s = J) {
  const { immediate: n, deep: r, flush: i, once: l } = s, o = ae({}, s), c = t && n || !t && i !== "post";
  let d;
  if (qt) {
    if (i === "sync") {
      const F = ol();
      d = F.__watcherHandles || (F.__watcherHandles = []);
    } else if (!c) {
      const F = () => {
      };
      return F.stop = He, F.resume = He, F.pause = He, F;
    }
  }
  const a = he;
  o.call = (F, $, D) => Ne(F, a, $, D);
  let h = !1;
  i === "post" ? o.scheduler = (F) => {
    oe(F, a && a.suspense);
  } : i !== "sync" && (h = !0, o.scheduler = (F, $) => {
    $ ? F() : an(F);
  }), o.augmentJob = (F) => {
    t && (F.flags |= 4), h && (F.flags |= 2, a && (F.id = a.uid, F.i = a));
  };
  const x = el(e, t, o);
  return qt && (d ? d.push(x) : c && x()), x;
}
function cl(e, t, s) {
  const n = this.proxy, r = se(e) ? e.includes(".") ? Br(n, e) : () => n[e] : e.bind(n, n);
  let i;
  H(t) ? i = t : (i = t.handler, s = t);
  const l = Xt(this), o = Vr(r, i.bind(n), s);
  return l(), o;
}
function Br(e, t) {
  const s = t.split(".");
  return () => {
    let n = e;
    for (let r = 0; r < s.length && n; r++)
      n = n[s[r]];
    return n;
  };
}
const Hr = /* @__PURE__ */ Symbol("_vte"), fl = (e) => e.__isTeleport, $t = (e) => e && (e.disabled || e.disabled === ""), Tn = (e) => e && (e.defer || e.defer === ""), Dn = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Mn = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, Ks = (e, t) => {
  const s = e && e.to;
  return se(s) ? t ? t(s) : null : s;
}, jr = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, s, n, r, i, l, o, c, d) {
    const {
      mc: a,
      pc: h,
      pbc: x,
      o: { insert: F, querySelector: $, createText: D, createComment: k }
    } = d, M = $t(t.props);
    let { shapeFlag: v, children: I, dynamicChildren: P } = t;
    if (e == null) {
      const Y = t.el = D(""), ie = t.anchor = D("");
      F(Y, s, n), F(ie, s, n);
      const j = (T, N) => {
        v & 16 && a(
          I,
          T,
          N,
          r,
          i,
          l,
          o,
          c
        );
      }, w = () => {
        const T = t.target = Ks(t.props, $), N = Ws(T, t, D, F);
        T && (l !== "svg" && Dn(T) ? l = "svg" : l !== "mathml" && Mn(T) && (l = "mathml"), r && r.isCE && (r.ce._teleportTargets || (r.ce._teleportTargets = /* @__PURE__ */ new Set())).add(T), M || (j(T, N), os(t, !1)));
      };
      M && (j(s, ie), os(t, !0)), Tn(t.props) ? (t.el.__isMounted = !1, oe(() => {
        w(), delete t.el.__isMounted;
      }, i)) : w();
    } else {
      if (Tn(t.props) && e.el.__isMounted === !1) {
        oe(() => {
          jr.process(
            e,
            t,
            s,
            n,
            r,
            i,
            l,
            o,
            c,
            d
          );
        }, i);
        return;
      }
      t.el = e.el, t.targetStart = e.targetStart;
      const Y = t.anchor = e.anchor, ie = t.target = e.target, j = t.targetAnchor = e.targetAnchor, w = $t(e.props), T = w ? s : ie, N = w ? Y : j;
      if (l === "svg" || Dn(ie) ? l = "svg" : (l === "mathml" || Mn(ie)) && (l = "mathml"), P ? (x(
        e.dynamicChildren,
        P,
        T,
        r,
        i,
        l,
        o
      ), gn(e, t, !0)) : c || h(
        e,
        t,
        T,
        N,
        r,
        i,
        l,
        o,
        !1
      ), M)
        w ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : ns(
          t,
          s,
          Y,
          d,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const G = t.target = Ks(
          t.props,
          $
        );
        G && ns(
          t,
          G,
          null,
          d,
          0
        );
      } else w && ns(
        t,
        ie,
        j,
        d,
        1
      );
      os(t, M);
    }
  },
  remove(e, t, s, { um: n, o: { remove: r } }, i) {
    const {
      shapeFlag: l,
      children: o,
      anchor: c,
      targetStart: d,
      targetAnchor: a,
      target: h,
      props: x
    } = e;
    if (h && (r(d), r(a)), i && r(c), l & 16) {
      const F = i || !$t(x);
      for (let $ = 0; $ < o.length; $++) {
        const D = o[$];
        n(
          D,
          t,
          s,
          F,
          !!D.dynamicChildren
        );
      }
    }
  },
  move: ns,
  hydrate: ul
};
function ns(e, t, s, { o: { insert: n }, m: r }, i = 2) {
  i === 0 && n(e.targetAnchor, t, s);
  const { el: l, anchor: o, shapeFlag: c, children: d, props: a } = e, h = i === 2;
  if (h && n(l, t, s), (!h || $t(a)) && c & 16)
    for (let x = 0; x < d.length; x++)
      r(
        d[x],
        t,
        s,
        2
      );
  h && n(o, t, s);
}
function ul(e, t, s, n, r, i, {
  o: { nextSibling: l, parentNode: o, querySelector: c, insert: d, createText: a }
}, h) {
  function x(k, M) {
    let v = M;
    for (; v; ) {
      if (v && v.nodeType === 8) {
        if (v.data === "teleport start anchor")
          t.targetStart = v;
        else if (v.data === "teleport anchor") {
          t.targetAnchor = v, k._lpa = t.targetAnchor && l(t.targetAnchor);
          break;
        }
      }
      v = l(v);
    }
  }
  function F(k, M) {
    M.anchor = h(
      l(k),
      M,
      o(k),
      s,
      n,
      r,
      i
    );
  }
  const $ = t.target = Ks(
    t.props,
    c
  ), D = $t(t.props);
  if ($) {
    const k = $._lpa || $.firstChild;
    t.shapeFlag & 16 && (D ? (F(e, t), x($, k), t.targetAnchor || Ws(
      $,
      t,
      a,
      d,
      // if target is the same as the main view, insert anchors before current node
      // to avoid hydrating mismatch
      o(e) === $ ? e : null
    )) : (t.anchor = l(e), x($, k), t.targetAnchor || Ws($, t, a, d), h(
      k && l(k),
      t,
      $,
      s,
      n,
      r,
      i
    ))), os(t, D);
  } else D && t.shapeFlag & 16 && (F(e, t), t.targetStart = e, t.targetAnchor = l(e));
  return t.anchor && l(t.anchor);
}
const al = jr;
function os(e, t) {
  const s = e.ctx;
  if (s && s.ut) {
    let n, r;
    for (t ? (n = e.el, r = e.anchor) : (n = e.targetStart, r = e.targetAnchor); n && n !== r; )
      n.nodeType === 1 && n.setAttribute("data-v-owner", s.uid), n = n.nextSibling;
    s.ut();
  }
}
function Ws(e, t, s, n, r = null) {
  const i = t.targetStart = s(""), l = t.targetAnchor = s("");
  return i[Hr] = l, e && (n(i, e, r), n(l, e, r)), l;
}
const dl = /* @__PURE__ */ Symbol("_leaveCb");
function dn(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, dn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function Nr(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function On(e, t) {
  let s;
  return !!((s = Object.getOwnPropertyDescriptor(e, t)) && !s.configurable);
}
const hs = /* @__PURE__ */ new WeakMap();
function Vt(e, t, s, n, r = !1) {
  if (V(e)) {
    e.forEach(
      (D, k) => Vt(
        D,
        t && (V(t) ? t[k] : t),
        s,
        n,
        r
      )
    );
    return;
  }
  if (Bt(n) && !r) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && Vt(e, t, s, n.component.subTree);
    return;
  }
  const i = n.shapeFlag & 4 ? Ts(n.component) : n.el, l = r ? null : i, { i: o, r: c } = e, d = t && t.r, a = o.refs === J ? o.refs = {} : o.refs, h = o.setupState, x = /* @__PURE__ */ U(h), F = h === J ? ir : (D) => On(a, D) ? !1 : K(x, D), $ = (D, k) => !(k && On(a, k));
  if (d != null && d !== c) {
    if (In(t), se(d))
      a[d] = null, F(d) && (h[d] = null);
    else if (/* @__PURE__ */ ue(d)) {
      const D = t;
      $(d, D.k) && (d.value = null), D.k && (a[D.k] = null);
    }
  }
  if (H(c))
    Qt(c, o, 12, [l, a]);
  else {
    const D = se(c), k = /* @__PURE__ */ ue(c);
    if (D || k) {
      const M = () => {
        if (e.f) {
          const v = D ? F(c) ? h[c] : a[c] : $() || !e.k ? c.value : a[e.k];
          if (r)
            V(v) && en(v, i);
          else if (V(v))
            v.includes(i) || v.push(i);
          else if (D)
            a[c] = [i], F(c) && (h[c] = a[c]);
          else {
            const I = [i];
            $(c, e.k) && (c.value = I), e.k && (a[e.k] = I);
          }
        } else D ? (a[c] = l, F(c) && (h[c] = l)) : k && ($(c, e.k) && (c.value = l), e.k && (a[e.k] = l));
      };
      if (l) {
        const v = () => {
          M(), hs.delete(e);
        };
        v.id = -1, hs.set(e, v), oe(v, s);
      } else
        In(e), M();
    }
  }
}
function In(e) {
  const t = hs.get(e);
  t && (t.flags |= 8, hs.delete(e));
}
Cs().requestIdleCallback;
Cs().cancelIdleCallback;
const Bt = (e) => !!e.type.__asyncLoader, kr = (e) => e.type.__isKeepAlive;
function pl(e, t) {
  Lr(e, "a", t);
}
function hl(e, t) {
  Lr(e, "da", t);
}
function Lr(e, t, s = he) {
  const n = e.__wdc || (e.__wdc = () => {
    let r = s;
    for (; r; ) {
      if (r.isDeactivated)
        return;
      r = r.parent;
    }
    return e();
  });
  if (ws(t, n, s), s) {
    let r = s.parent;
    for (; r && r.parent; )
      kr(r.parent.vnode) && gl(n, t, s, r), r = r.parent;
  }
}
function gl(e, t, s, n) {
  const r = ws(
    t,
    e,
    n,
    !0
    /* prepend */
  );
  Ur(() => {
    en(n[t], r);
  }, s);
}
function ws(e, t, s = he, n = !1) {
  if (s) {
    const r = s[e] || (s[e] = []), i = t.__weh || (t.__weh = (...l) => {
      Je();
      const o = Xt(s), c = Ne(t, s, e, l);
      return o(), Ye(), c;
    });
    return n ? r.unshift(i) : r.push(i), i;
  }
}
const Xe = (e) => (t, s = he) => {
  (!qt || e === "sp") && ws(e, (...n) => t(...n), s);
}, ml = Xe("bm"), _l = Xe("m"), bl = Xe(
  "bu"
), vl = Xe("u"), yl = Xe(
  "bum"
), Ur = Xe("um"), xl = Xe(
  "sp"
), Cl = Xe("rtg"), Fl = Xe("rtc");
function El(e, t = he) {
  ws("ec", e, t);
}
const wl = /* @__PURE__ */ Symbol.for("v-ndc");
function Tt(e, t, s, n) {
  let r;
  const i = s, l = V(e);
  if (l || se(e)) {
    const o = l && /* @__PURE__ */ ct(e);
    let c = !1, d = !1;
    o && (c = !/* @__PURE__ */ Fe(e), d = /* @__PURE__ */ Qe(e), e = Fs(e)), r = new Array(e.length);
    for (let a = 0, h = e.length; a < h; a++)
      r[a] = t(
        c ? d ? vt(Ae(e[a])) : Ae(e[a]) : e[a],
        a,
        void 0,
        i
      );
  } else if (typeof e == "number") {
    r = new Array(e);
    for (let o = 0; o < e; o++)
      r[o] = t(o + 1, o, void 0, i);
  } else if (q(e))
    if (e[Symbol.iterator])
      r = Array.from(
        e,
        (o, c) => t(o, c, void 0, i)
      );
    else {
      const o = Object.keys(e);
      r = new Array(o.length);
      for (let c = 0, d = o.length; c < d; c++) {
        const a = o[c];
        r[c] = t(e[a], a, c, i);
      }
    }
  else
    r = [];
  return r;
}
const qs = (e) => e ? ci(e) ? Ts(e) : qs(e.parent) : null, Ht = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ ae(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => qs(e.parent),
    $root: (e) => qs(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Wr(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      an(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Or.bind(e.proxy)),
    $watch: (e) => cl.bind(e)
  })
), $s = (e, t) => e !== J && !e.__isScriptSetup && K(e, t), Al = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: s, setupState: n, data: r, props: i, accessCache: l, type: o, appContext: c } = e;
    if (t[0] !== "$") {
      const x = l[t];
      if (x !== void 0)
        switch (x) {
          case 1:
            return n[t];
          case 2:
            return r[t];
          case 4:
            return s[t];
          case 3:
            return i[t];
        }
      else {
        if ($s(n, t))
          return l[t] = 1, n[t];
        if (r !== J && K(r, t))
          return l[t] = 2, r[t];
        if (K(i, t))
          return l[t] = 3, i[t];
        if (s !== J && K(s, t))
          return l[t] = 4, s[t];
        Gs && (l[t] = 0);
      }
    }
    const d = Ht[t];
    let a, h;
    if (d)
      return t === "$attrs" && fe(e.attrs, "get", ""), d(e);
    if (
      // css module (injected by vue-loader)
      (a = o.__cssModules) && (a = a[t])
    )
      return a;
    if (s !== J && K(s, t))
      return l[t] = 4, s[t];
    if (
      // global properties
      h = c.config.globalProperties, K(h, t)
    )
      return h[t];
  },
  set({ _: e }, t, s) {
    const { data: n, setupState: r, ctx: i } = e;
    return $s(r, t) ? (r[t] = s, !0) : n !== J && K(n, t) ? (n[t] = s, !0) : K(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (i[t] = s, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: s, ctx: n, appContext: r, props: i, type: l }
  }, o) {
    let c;
    return !!(s[o] || e !== J && o[0] !== "$" && K(e, o) || $s(t, o) || K(i, o) || K(n, o) || K(Ht, o) || K(r.config.globalProperties, o) || (c = l.__cssModules) && c[o]);
  },
  defineProperty(e, t, s) {
    return s.get != null ? e._.accessCache[t] = 0 : K(s, "value") && this.set(e, t, s.value, null), Reflect.defineProperty(e, t, s);
  }
};
function Pn(e) {
  return V(e) ? e.reduce(
    (t, s) => (t[s] = null, t),
    {}
  ) : e;
}
let Gs = !0;
function Sl(e) {
  const t = Wr(e), s = e.proxy, n = e.ctx;
  Gs = !1, t.beforeCreate && Rn(t.beforeCreate, e, "bc");
  const {
    // state
    data: r,
    computed: i,
    methods: l,
    watch: o,
    provide: c,
    inject: d,
    // lifecycle
    created: a,
    beforeMount: h,
    mounted: x,
    beforeUpdate: F,
    updated: $,
    activated: D,
    deactivated: k,
    beforeDestroy: M,
    beforeUnmount: v,
    destroyed: I,
    unmounted: P,
    render: Y,
    renderTracked: ie,
    renderTriggered: j,
    errorCaptured: w,
    serverPrefetch: T,
    // public API
    expose: N,
    inheritAttrs: G,
    // assets
    components: Se,
    directives: ne,
    filters: le
  } = t;
  if (d && Tl(d, n, null), l)
    for (const z in l) {
      const Q = l[z];
      H(Q) && (n[z] = Q.bind(s));
    }
  if (r) {
    const z = r.call(s, s);
    q(z) && (e.data = /* @__PURE__ */ Yt(z));
  }
  if (Gs = !0, i)
    for (const z in i) {
      const Q = i[z], st = H(Q) ? Q.bind(s, s) : H(Q.get) ? Q.get.bind(s, s) : He, Zt = !H(Q) && H(Q.set) ? Q.set.bind(s) : He, nt = Nt({
        get: st,
        set: Zt
      });
      Object.defineProperty(n, z, {
        enumerable: !0,
        configurable: !0,
        get: () => nt.value,
        set: (Te) => nt.value = Te
      });
    }
  if (o)
    for (const z in o)
      Kr(o[z], n, s, z);
  if (c) {
    const z = H(c) ? c.call(s) : c;
    Reflect.ownKeys(z).forEach((Q) => {
      il(Q, z[Q]);
    });
  }
  a && Rn(a, e, "c");
  function te(z, Q) {
    V(Q) ? Q.forEach((st) => z(st.bind(s))) : Q && z(Q.bind(s));
  }
  if (te(ml, h), te(_l, x), te(bl, F), te(vl, $), te(pl, D), te(hl, k), te(El, w), te(Fl, ie), te(Cl, j), te(yl, v), te(Ur, P), te(xl, T), V(N))
    if (N.length) {
      const z = e.exposed || (e.exposed = {});
      N.forEach((Q) => {
        Object.defineProperty(z, Q, {
          get: () => s[Q],
          set: (st) => s[Q] = st,
          enumerable: !0
        });
      });
    } else e.exposed || (e.exposed = {});
  Y && e.render === He && (e.render = Y), G != null && (e.inheritAttrs = G), Se && (e.components = Se), ne && (e.directives = ne), T && Nr(e);
}
function Tl(e, t, s = He) {
  V(e) && (e = Js(e));
  for (const n in e) {
    const r = e[n];
    let i;
    q(r) ? "default" in r ? i = ls(
      r.from || n,
      r.default,
      !0
    ) : i = ls(r.from || n) : i = ls(r), /* @__PURE__ */ ue(i) ? Object.defineProperty(t, n, {
      enumerable: !0,
      configurable: !0,
      get: () => i.value,
      set: (l) => i.value = l
    }) : t[n] = i;
  }
}
function Rn(e, t, s) {
  Ne(
    V(e) ? e.map((n) => n.bind(t.proxy)) : e.bind(t.proxy),
    t,
    s
  );
}
function Kr(e, t, s, n) {
  let r = n.includes(".") ? Br(s, n) : () => s[n];
  if (se(e)) {
    const i = t[e];
    H(i) && Rt(r, i);
  } else if (H(e))
    Rt(r, e.bind(s));
  else if (q(e))
    if (V(e))
      e.forEach((i) => Kr(i, t, s, n));
    else {
      const i = H(e.handler) ? e.handler.bind(s) : t[e.handler];
      H(i) && Rt(r, i, e);
    }
}
function Wr(e) {
  const t = e.type, { mixins: s, extends: n } = t, {
    mixins: r,
    optionsCache: i,
    config: { optionMergeStrategies: l }
  } = e.appContext, o = i.get(t);
  let c;
  return o ? c = o : !r.length && !s && !n ? c = t : (c = {}, r.length && r.forEach(
    (d) => gs(c, d, l, !0)
  ), gs(c, t, l)), q(t) && i.set(t, c), c;
}
function gs(e, t, s, n = !1) {
  const { mixins: r, extends: i } = t;
  i && gs(e, i, s, !0), r && r.forEach(
    (l) => gs(e, l, s, !0)
  );
  for (const l in t)
    if (!(n && l === "expose")) {
      const o = Dl[l] || s && s[l];
      e[l] = o ? o(e[l], t[l]) : t[l];
    }
  return e;
}
const Dl = {
  data: $n,
  props: Vn,
  emits: Vn,
  // objects
  methods: Mt,
  computed: Mt,
  // lifecycle
  beforeCreate: de,
  created: de,
  beforeMount: de,
  mounted: de,
  beforeUpdate: de,
  updated: de,
  beforeDestroy: de,
  beforeUnmount: de,
  destroyed: de,
  unmounted: de,
  activated: de,
  deactivated: de,
  errorCaptured: de,
  serverPrefetch: de,
  // assets
  components: Mt,
  directives: Mt,
  // watch
  watch: Ol,
  // provide / inject
  provide: $n,
  inject: Ml
};
function $n(e, t) {
  return t ? e ? function() {
    return ae(
      H(e) ? e.call(this, this) : e,
      H(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function Ml(e, t) {
  return Mt(Js(e), Js(t));
}
function Js(e) {
  if (V(e)) {
    const t = {};
    for (let s = 0; s < e.length; s++)
      t[e[s]] = e[s];
    return t;
  }
  return e;
}
function de(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function Mt(e, t) {
  return e ? ae(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Vn(e, t) {
  return e ? V(e) && V(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : ae(
    /* @__PURE__ */ Object.create(null),
    Pn(e),
    Pn(t ?? {})
  ) : t;
}
function Ol(e, t) {
  if (!e) return t;
  if (!t) return e;
  const s = ae(/* @__PURE__ */ Object.create(null), e);
  for (const n in t)
    s[n] = de(e[n], t[n]);
  return s;
}
function qr() {
  return {
    app: null,
    config: {
      isNativeTag: ir,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: /* @__PURE__ */ Object.create(null),
    optionsCache: /* @__PURE__ */ new WeakMap(),
    propsCache: /* @__PURE__ */ new WeakMap(),
    emitsCache: /* @__PURE__ */ new WeakMap()
  };
}
let Il = 0;
function Pl(e, t) {
  return function(n, r = null) {
    H(n) || (n = ae({}, n)), r != null && !q(r) && (r = null);
    const i = qr(), l = /* @__PURE__ */ new WeakSet(), o = [];
    let c = !1;
    const d = i.app = {
      _uid: Il++,
      _component: n,
      _props: r,
      _container: null,
      _context: i,
      _instance: null,
      version: ho,
      get config() {
        return i.config;
      },
      set config(a) {
      },
      use(a, ...h) {
        return l.has(a) || (a && H(a.install) ? (l.add(a), a.install(d, ...h)) : H(a) && (l.add(a), a(d, ...h))), d;
      },
      mixin(a) {
        return i.mixins.includes(a) || i.mixins.push(a), d;
      },
      component(a, h) {
        return h ? (i.components[a] = h, d) : i.components[a];
      },
      directive(a, h) {
        return h ? (i.directives[a] = h, d) : i.directives[a];
      },
      mount(a, h, x) {
        if (!c) {
          const F = d._ceVNode || be(n, r);
          return F.appContext = i, x === !0 ? x = "svg" : x === !1 && (x = void 0), e(F, a, x), c = !0, d._container = a, a.__vue_app__ = d, Ts(F.component);
        }
      },
      onUnmount(a) {
        o.push(a);
      },
      unmount() {
        c && (Ne(
          o,
          d._instance,
          16
        ), e(null, d._container), delete d._container.__vue_app__);
      },
      provide(a, h) {
        return i.provides[a] = h, d;
      },
      runWithContext(a) {
        const h = bt;
        bt = d;
        try {
          return a();
        } finally {
          bt = h;
        }
      }
    };
    return d;
  };
}
let bt = null;
const Rl = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ee(t)}Modifiers`] || e[`${ft(t)}Modifiers`];
function $l(e, t, ...s) {
  if (e.isUnmounted) return;
  const n = e.vnode.props || J;
  let r = s;
  const i = t.startsWith("update:"), l = i && Rl(n, t.slice(7));
  l && (l.trim && (r = s.map((a) => se(a) ? a.trim() : a)), l.number && (r = s.map(xs)));
  let o, c = n[o = Ms(t)] || // also try camelCase event handler (#2249)
  n[o = Ms(Ee(t))];
  !c && i && (c = n[o = Ms(ft(t))]), c && Ne(
    c,
    e,
    6,
    r
  );
  const d = n[o + "Once"];
  if (d) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[o])
      return;
    e.emitted[o] = !0, Ne(
      d,
      e,
      6,
      r
    );
  }
}
const Vl = /* @__PURE__ */ new WeakMap();
function Gr(e, t, s = !1) {
  const n = s ? Vl : t.emitsCache, r = n.get(e);
  if (r !== void 0)
    return r;
  const i = e.emits;
  let l = {}, o = !1;
  if (!H(e)) {
    const c = (d) => {
      const a = Gr(d, t, !0);
      a && (o = !0, ae(l, a));
    };
    !s && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
  }
  return !i && !o ? (q(e) && n.set(e, null), null) : (V(i) ? i.forEach((c) => l[c] = null) : ae(l, i), q(e) && n.set(e, l), l);
}
function As(e, t) {
  return !e || !vs(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), K(e, t[0].toLowerCase() + t.slice(1)) || K(e, ft(t)) || K(e, t));
}
function Bn(e) {
  const {
    type: t,
    vnode: s,
    proxy: n,
    withProxy: r,
    propsOptions: [i],
    slots: l,
    attrs: o,
    emit: c,
    render: d,
    renderCache: a,
    props: h,
    data: x,
    setupState: F,
    ctx: $,
    inheritAttrs: D
  } = e, k = ps(e);
  let M, v;
  try {
    if (s.shapeFlag & 4) {
      const P = r || n, Y = P;
      M = Ve(
        d.call(
          Y,
          P,
          a,
          h,
          F,
          x,
          $
        )
      ), v = o;
    } else {
      const P = t;
      M = Ve(
        P.length > 1 ? P(
          h,
          { attrs: o, slots: l, emit: c }
        ) : P(
          h,
          null
        )
      ), v = t.props ? o : Bl(o);
    }
  } catch (P) {
    jt.length = 0, Es(P, e, 1), M = be(tt);
  }
  let I = M;
  if (v && D !== !1) {
    const P = Object.keys(v), { shapeFlag: Y } = I;
    P.length && Y & 7 && (i && P.some(zs) && (v = Hl(
      v,
      i
    )), I = yt(I, v, !1, !0));
  }
  return s.dirs && (I = yt(I, null, !1, !0), I.dirs = I.dirs ? I.dirs.concat(s.dirs) : s.dirs), s.transition && dn(I, s.transition), M = I, ps(k), M;
}
const Bl = (e) => {
  let t;
  for (const s in e)
    (s === "class" || s === "style" || vs(s)) && ((t || (t = {}))[s] = e[s]);
  return t;
}, Hl = (e, t) => {
  const s = {};
  for (const n in e)
    (!zs(n) || !(n.slice(9) in t)) && (s[n] = e[n]);
  return s;
};
function jl(e, t, s) {
  const { props: n, children: r, component: i } = e, { props: l, children: o, patchFlag: c } = t, d = i.emitsOptions;
  if (t.dirs || t.transition)
    return !0;
  if (s && c >= 0) {
    if (c & 1024)
      return !0;
    if (c & 16)
      return n ? Hn(n, l, d) : !!l;
    if (c & 8) {
      const a = t.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        const x = a[h];
        if (Jr(l, n, x) && !As(d, x))
          return !0;
      }
    }
  } else
    return (r || o) && (!o || !o.$stable) ? !0 : n === l ? !1 : n ? l ? Hn(n, l, d) : !0 : !!l;
  return !1;
}
function Hn(e, t, s) {
  const n = Object.keys(t);
  if (n.length !== Object.keys(e).length)
    return !0;
  for (let r = 0; r < n.length; r++) {
    const i = n[r];
    if (Jr(t, e, i) && !As(s, i))
      return !0;
  }
  return !1;
}
function Jr(e, t, s) {
  const n = e[s], r = t[s];
  return s === "style" && q(n) && q(r) ? !Ft(n, r) : n !== r;
}
function Nl({ vnode: e, parent: t }, s) {
  for (; t; ) {
    const n = t.subTree;
    if (n.suspense && n.suspense.activeBranch === e && (n.el = e.el), n === e)
      (e = t.vnode).el = s, t = t.parent;
    else
      break;
  }
}
const Yr = {}, Qr = () => Object.create(Yr), Xr = (e) => Object.getPrototypeOf(e) === Yr;
function kl(e, t, s, n = !1) {
  const r = {}, i = Qr();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), Zr(e, t, r, i);
  for (const l in e.propsOptions[0])
    l in r || (r[l] = void 0);
  s ? e.props = n ? r : /* @__PURE__ */ qi(r) : e.type.props ? e.props = r : e.props = i, e.attrs = i;
}
function Ll(e, t, s, n) {
  const {
    props: r,
    attrs: i,
    vnode: { patchFlag: l }
  } = e, o = /* @__PURE__ */ U(r), [c] = e.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (n || l > 0) && !(l & 16)
  ) {
    if (l & 8) {
      const a = e.vnode.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        let x = a[h];
        if (As(e.emitsOptions, x))
          continue;
        const F = t[x];
        if (c)
          if (K(i, x))
            F !== i[x] && (i[x] = F, d = !0);
          else {
            const $ = Ee(x);
            r[$] = Ys(
              c,
              o,
              $,
              F,
              e,
              !1
            );
          }
        else
          F !== i[x] && (i[x] = F, d = !0);
      }
    }
  } else {
    Zr(e, t, r, i) && (d = !0);
    let a;
    for (const h in o)
      (!t || // for camelCase
      !K(t, h) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((a = ft(h)) === h || !K(t, a))) && (c ? s && // for camelCase
      (s[h] !== void 0 || // for kebab-case
      s[a] !== void 0) && (r[h] = Ys(
        c,
        o,
        h,
        void 0,
        e,
        !0
      )) : delete r[h]);
    if (i !== o)
      for (const h in i)
        (!t || !K(t, h)) && (delete i[h], d = !0);
  }
  d && We(e.attrs, "set", "");
}
function Zr(e, t, s, n) {
  const [r, i] = e.propsOptions;
  let l = !1, o;
  if (t)
    for (let c in t) {
      if (Ot(c))
        continue;
      const d = t[c];
      let a;
      r && K(r, a = Ee(c)) ? !i || !i.includes(a) ? s[a] = d : (o || (o = {}))[a] = d : As(e.emitsOptions, c) || (!(c in n) || d !== n[c]) && (n[c] = d, l = !0);
    }
  if (i) {
    const c = /* @__PURE__ */ U(s), d = o || J;
    for (let a = 0; a < i.length; a++) {
      const h = i[a];
      s[h] = Ys(
        r,
        c,
        h,
        d[h],
        e,
        !K(d, h)
      );
    }
  }
  return l;
}
function Ys(e, t, s, n, r, i) {
  const l = e[s];
  if (l != null) {
    const o = K(l, "default");
    if (o && n === void 0) {
      const c = l.default;
      if (l.type !== Function && !l.skipFactory && H(c)) {
        const { propsDefaults: d } = r;
        if (s in d)
          n = d[s];
        else {
          const a = Xt(r);
          n = d[s] = c.call(
            null,
            t
          ), a();
        }
      } else
        n = c;
      r.ce && r.ce._setProp(s, n);
    }
    l[
      0
      /* shouldCast */
    ] && (i && !o ? n = !1 : l[
      1
      /* shouldCastTrue */
    ] && (n === "" || n === ft(s)) && (n = !0));
  }
  return n;
}
const Ul = /* @__PURE__ */ new WeakMap();
function zr(e, t, s = !1) {
  const n = s ? Ul : t.propsCache, r = n.get(e);
  if (r)
    return r;
  const i = e.props, l = {}, o = [];
  let c = !1;
  if (!H(e)) {
    const a = (h) => {
      c = !0;
      const [x, F] = zr(h, t, !0);
      ae(l, x), F && o.push(...F);
    };
    !s && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  if (!i && !c)
    return q(e) && n.set(e, ht), ht;
  if (V(i))
    for (let a = 0; a < i.length; a++) {
      const h = Ee(i[a]);
      jn(h) && (l[h] = J);
    }
  else if (i)
    for (const a in i) {
      const h = Ee(a);
      if (jn(h)) {
        const x = i[a], F = l[h] = V(x) || H(x) ? { type: x } : ae({}, x), $ = F.type;
        let D = !1, k = !0;
        if (V($))
          for (let M = 0; M < $.length; ++M) {
            const v = $[M], I = H(v) && v.name;
            if (I === "Boolean") {
              D = !0;
              break;
            } else I === "String" && (k = !1);
          }
        else
          D = H($) && $.name === "Boolean";
        F[
          0
          /* shouldCast */
        ] = D, F[
          1
          /* shouldCastTrue */
        ] = k, (D || K(F, "default")) && o.push(h);
      }
    }
  const d = [l, o];
  return q(e) && n.set(e, d), d;
}
function jn(e) {
  return e[0] !== "$" && !Ot(e);
}
const pn = (e) => e === "_" || e === "_ctx" || e === "$stable", hn = (e) => V(e) ? e.map(Ve) : [Ve(e)], Kl = (e, t, s) => {
  if (t._n)
    return t;
  const n = rl((...r) => hn(t(...r)), s);
  return n._c = !1, n;
}, ei = (e, t, s) => {
  const n = e._ctx;
  for (const r in e) {
    if (pn(r)) continue;
    const i = e[r];
    if (H(i))
      t[r] = Kl(r, i, n);
    else if (i != null) {
      const l = hn(i);
      t[r] = () => l;
    }
  }
}, ti = (e, t) => {
  const s = hn(t);
  e.slots.default = () => s;
}, si = (e, t, s) => {
  for (const n in t)
    (s || !pn(n)) && (e[n] = t[n]);
}, Wl = (e, t, s) => {
  const n = e.slots = Qr();
  if (e.vnode.shapeFlag & 32) {
    const r = t._;
    r ? (si(n, t, s), s && ur(n, "_", r, !0)) : ei(t, n);
  } else t && ti(e, t);
}, ql = (e, t, s) => {
  const { vnode: n, slots: r } = e;
  let i = !0, l = J;
  if (n.shapeFlag & 32) {
    const o = t._;
    o ? s && o === 1 ? i = !1 : si(r, t, s) : (i = !t.$stable, ei(t, r)), l = t;
  } else t && (ti(e, t), l = { default: 1 });
  if (i)
    for (const o in r)
      !pn(o) && l[o] == null && delete r[o];
}, oe = Xl;
function Gl(e) {
  return Jl(e);
}
function Jl(e, t) {
  const s = Cs();
  s.__VUE__ = !0;
  const {
    insert: n,
    remove: r,
    patchProp: i,
    createElement: l,
    createText: o,
    createComment: c,
    setText: d,
    setElementText: a,
    parentNode: h,
    nextSibling: x,
    setScopeId: F = He,
    insertStaticContent: $
  } = e, D = (f, u, p, b = null, g = null, m = null, E = void 0, C = null, y = !!u.dynamicChildren) => {
    if (f === u)
      return;
    f && !Dt(f, u) && (b = zt(f), Te(f, g, m, !0), f = null), u.patchFlag === -2 && (y = !1, u.dynamicChildren = null);
    const { type: _, ref: R, shapeFlag: A } = u;
    switch (_) {
      case Ss:
        k(f, u, p, b);
        break;
      case tt:
        M(f, u, p, b);
        break;
      case cs:
        f == null && v(u, p, b, E);
        break;
      case ce:
        Se(
          f,
          u,
          p,
          b,
          g,
          m,
          E,
          C,
          y
        );
        break;
      default:
        A & 1 ? Y(
          f,
          u,
          p,
          b,
          g,
          m,
          E,
          C,
          y
        ) : A & 6 ? ne(
          f,
          u,
          p,
          b,
          g,
          m,
          E,
          C,
          y
        ) : (A & 64 || A & 128) && _.process(
          f,
          u,
          p,
          b,
          g,
          m,
          E,
          C,
          y,
          wt
        );
    }
    R != null && g ? Vt(R, f && f.ref, m, u || f, !u) : R == null && f && f.ref != null && Vt(f.ref, null, m, f, !0);
  }, k = (f, u, p, b) => {
    if (f == null)
      n(
        u.el = o(u.children),
        p,
        b
      );
    else {
      const g = u.el = f.el;
      u.children !== f.children && d(g, u.children);
    }
  }, M = (f, u, p, b) => {
    f == null ? n(
      u.el = c(u.children || ""),
      p,
      b
    ) : u.el = f.el;
  }, v = (f, u, p, b) => {
    [f.el, f.anchor] = $(
      f.children,
      u,
      p,
      b,
      f.el,
      f.anchor
    );
  }, I = ({ el: f, anchor: u }, p, b) => {
    let g;
    for (; f && f !== u; )
      g = x(f), n(f, p, b), f = g;
    n(u, p, b);
  }, P = ({ el: f, anchor: u }) => {
    let p;
    for (; f && f !== u; )
      p = x(f), r(f), f = p;
    r(u);
  }, Y = (f, u, p, b, g, m, E, C, y) => {
    if (u.type === "svg" ? E = "svg" : u.type === "math" && (E = "mathml"), f == null)
      ie(
        u,
        p,
        b,
        g,
        m,
        E,
        C,
        y
      );
    else {
      const _ = f.el && f.el._isVueCE ? f.el : null;
      try {
        _ && _._beginPatch(), T(
          f,
          u,
          g,
          m,
          E,
          C,
          y
        );
      } finally {
        _ && _._endPatch();
      }
    }
  }, ie = (f, u, p, b, g, m, E, C) => {
    let y, _;
    const { props: R, shapeFlag: A, transition: O, dirs: B } = f;
    if (y = f.el = l(
      f.type,
      m,
      R && R.is,
      R
    ), A & 8 ? a(y, f.children) : A & 16 && w(
      f.children,
      y,
      null,
      b,
      g,
      Vs(f, m),
      E,
      C
    ), B && rt(f, null, b, "created"), j(y, f, f.scopeId, E, b), R) {
      for (const X in R)
        X !== "value" && !Ot(X) && i(y, X, null, R[X], m, b);
      "value" in R && i(y, "value", null, R.value, m), (_ = R.onVnodeBeforeMount) && Ie(_, b, f);
    }
    B && rt(f, null, b, "beforeMount");
    const L = Yl(g, O);
    L && O.beforeEnter(y), n(y, u, p), ((_ = R && R.onVnodeMounted) || L || B) && oe(() => {
      _ && Ie(_, b, f), L && O.enter(y), B && rt(f, null, b, "mounted");
    }, g);
  }, j = (f, u, p, b, g) => {
    if (p && F(f, p), b)
      for (let m = 0; m < b.length; m++)
        F(f, b[m]);
    if (g) {
      let m = g.subTree;
      if (u === m || ii(m.type) && (m.ssContent === u || m.ssFallback === u)) {
        const E = g.vnode;
        j(
          f,
          E,
          E.scopeId,
          E.slotScopeIds,
          g.parent
        );
      }
    }
  }, w = (f, u, p, b, g, m, E, C, y = 0) => {
    for (let _ = y; _ < f.length; _++) {
      const R = f[_] = C ? Ke(f[_]) : Ve(f[_]);
      D(
        null,
        R,
        u,
        p,
        b,
        g,
        m,
        E,
        C
      );
    }
  }, T = (f, u, p, b, g, m, E) => {
    const C = u.el = f.el;
    let { patchFlag: y, dynamicChildren: _, dirs: R } = u;
    y |= f.patchFlag & 16;
    const A = f.props || J, O = u.props || J;
    let B;
    if (p && it(p, !1), (B = O.onVnodeBeforeUpdate) && Ie(B, p, u, f), R && rt(u, f, p, "beforeUpdate"), p && it(p, !0), (A.innerHTML && O.innerHTML == null || A.textContent && O.textContent == null) && a(C, ""), _ ? N(
      f.dynamicChildren,
      _,
      C,
      p,
      b,
      Vs(u, g),
      m
    ) : E || Q(
      f,
      u,
      C,
      null,
      p,
      b,
      Vs(u, g),
      m,
      !1
    ), y > 0) {
      if (y & 16)
        G(C, A, O, p, g);
      else if (y & 2 && A.class !== O.class && i(C, "class", null, O.class, g), y & 4 && i(C, "style", A.style, O.style, g), y & 8) {
        const L = u.dynamicProps;
        for (let X = 0; X < L.length; X++) {
          const W = L[X], ge = A[W], me = O[W];
          (me !== ge || W === "value") && i(C, W, ge, me, g, p);
        }
      }
      y & 1 && f.children !== u.children && a(C, u.children);
    } else !E && _ == null && G(C, A, O, p, g);
    ((B = O.onVnodeUpdated) || R) && oe(() => {
      B && Ie(B, p, u, f), R && rt(u, f, p, "updated");
    }, b);
  }, N = (f, u, p, b, g, m, E) => {
    for (let C = 0; C < u.length; C++) {
      const y = f[C], _ = u[C], R = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        y.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (y.type === ce || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !Dt(y, _) || // - In the case of a component, it could contain anything.
        y.shapeFlag & 198) ? h(y.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          p
        )
      );
      D(
        y,
        _,
        R,
        null,
        b,
        g,
        m,
        E,
        !0
      );
    }
  }, G = (f, u, p, b, g) => {
    if (u !== p) {
      if (u !== J)
        for (const m in u)
          !Ot(m) && !(m in p) && i(
            f,
            m,
            u[m],
            null,
            g,
            b
          );
      for (const m in p) {
        if (Ot(m)) continue;
        const E = p[m], C = u[m];
        E !== C && m !== "value" && i(f, m, C, E, g, b);
      }
      "value" in p && i(f, "value", u.value, p.value, g);
    }
  }, Se = (f, u, p, b, g, m, E, C, y) => {
    const _ = u.el = f ? f.el : o(""), R = u.anchor = f ? f.anchor : o("");
    let { patchFlag: A, dynamicChildren: O, slotScopeIds: B } = u;
    B && (C = C ? C.concat(B) : B), f == null ? (n(_, p, b), n(R, p, b), w(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      u.children || [],
      p,
      R,
      g,
      m,
      E,
      C,
      y
    )) : A > 0 && A & 64 && O && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    f.dynamicChildren && f.dynamicChildren.length === O.length ? (N(
      f.dynamicChildren,
      O,
      p,
      g,
      m,
      E,
      C
    ), // #2080 if the stable fragment has a key, it's a <template v-for> that may
    //  get moved around. Make sure all root level vnodes inherit el.
    // #2134 or if it's a component root, it may also get moved around
    // as the component is being moved.
    (u.key != null || g && u === g.subTree) && gn(
      f,
      u,
      !0
      /* shallow */
    )) : Q(
      f,
      u,
      p,
      R,
      g,
      m,
      E,
      C,
      y
    );
  }, ne = (f, u, p, b, g, m, E, C, y) => {
    u.slotScopeIds = C, f == null ? u.shapeFlag & 512 ? g.ctx.activate(
      u,
      p,
      b,
      E,
      y
    ) : le(
      u,
      p,
      b,
      g,
      m,
      E,
      y
    ) : xe(f, u, y);
  }, le = (f, u, p, b, g, m, E) => {
    const C = f.component = io(
      f,
      b,
      g
    );
    if (kr(f) && (C.ctx.renderer = wt), oo(C, !1, E), C.asyncDep) {
      if (g && g.registerDep(C, te, E), !f.el) {
        const y = C.subTree = be(tt);
        M(null, y, u, p), f.placeholder = y.el;
      }
    } else
      te(
        C,
        f,
        u,
        p,
        g,
        m,
        E
      );
  }, xe = (f, u, p) => {
    const b = u.component = f.component;
    if (jl(f, u, p))
      if (b.asyncDep && !b.asyncResolved) {
        z(b, u, p);
        return;
      } else
        b.next = u, b.update();
    else
      u.el = f.el, b.vnode = u;
  }, te = (f, u, p, b, g, m, E) => {
    const C = () => {
      if (f.isMounted) {
        let { next: A, bu: O, u: B, parent: L, vnode: X } = f;
        {
          const Me = ni(f);
          if (Me) {
            A && (A.el = X.el, z(f, A, E)), Me.asyncDep.then(() => {
              oe(() => {
                f.isUnmounted || _();
              }, g);
            });
            return;
          }
        }
        let W = A, ge;
        it(f, !1), A ? (A.el = X.el, z(f, A, E)) : A = X, O && is(O), (ge = A.props && A.props.onVnodeBeforeUpdate) && Ie(ge, L, A, X), it(f, !0);
        const me = Bn(f), De = f.subTree;
        f.subTree = me, D(
          De,
          me,
          // parent may have changed if it's in a teleport
          h(De.el),
          // anchor may have changed if it's in a fragment
          zt(De),
          f,
          g,
          m
        ), A.el = me.el, W === null && Nl(f, me.el), B && oe(B, g), (ge = A.props && A.props.onVnodeUpdated) && oe(
          () => Ie(ge, L, A, X),
          g
        );
      } else {
        let A;
        const { el: O, props: B } = u, { bm: L, m: X, parent: W, root: ge, type: me } = f, De = Bt(u);
        it(f, !1), L && is(L), !De && (A = B && B.onVnodeBeforeMount) && Ie(A, W, u), it(f, !0);
        {
          ge.ce && ge.ce._hasShadowRoot() && ge.ce._injectChildStyle(
            me,
            f.parent ? f.parent.type : void 0
          );
          const Me = f.subTree = Bn(f);
          D(
            null,
            Me,
            p,
            b,
            f,
            g,
            m
          ), u.el = Me.el;
        }
        if (X && oe(X, g), !De && (A = B && B.onVnodeMounted)) {
          const Me = u;
          oe(
            () => Ie(A, W, Me),
            g
          );
        }
        (u.shapeFlag & 256 || W && Bt(W.vnode) && W.vnode.shapeFlag & 256) && f.a && oe(f.a, g), f.isMounted = !0, u = p = b = null;
      }
    };
    f.scope.on();
    const y = f.effect = new hr(C);
    f.scope.off();
    const _ = f.update = y.run.bind(y), R = f.job = y.runIfDirty.bind(y);
    R.i = f, R.id = f.uid, y.scheduler = () => an(R), it(f, !0), _();
  }, z = (f, u, p) => {
    u.component = f;
    const b = f.vnode.props;
    f.vnode = u, f.next = null, Ll(f, u.props, b, p), ql(f, u.children, p), Je(), Sn(f), Ye();
  }, Q = (f, u, p, b, g, m, E, C, y = !1) => {
    const _ = f && f.children, R = f ? f.shapeFlag : 0, A = u.children, { patchFlag: O, shapeFlag: B } = u;
    if (O > 0) {
      if (O & 128) {
        Zt(
          _,
          A,
          p,
          b,
          g,
          m,
          E,
          C,
          y
        );
        return;
      } else if (O & 256) {
        st(
          _,
          A,
          p,
          b,
          g,
          m,
          E,
          C,
          y
        );
        return;
      }
    }
    B & 8 ? (R & 16 && Et(_, g, m), A !== _ && a(p, A)) : R & 16 ? B & 16 ? Zt(
      _,
      A,
      p,
      b,
      g,
      m,
      E,
      C,
      y
    ) : Et(_, g, m, !0) : (R & 8 && a(p, ""), B & 16 && w(
      A,
      p,
      b,
      g,
      m,
      E,
      C,
      y
    ));
  }, st = (f, u, p, b, g, m, E, C, y) => {
    f = f || ht, u = u || ht;
    const _ = f.length, R = u.length, A = Math.min(_, R);
    let O;
    for (O = 0; O < A; O++) {
      const B = u[O] = y ? Ke(u[O]) : Ve(u[O]);
      D(
        f[O],
        B,
        p,
        null,
        g,
        m,
        E,
        C,
        y
      );
    }
    _ > R ? Et(
      f,
      g,
      m,
      !0,
      !1,
      A
    ) : w(
      u,
      p,
      b,
      g,
      m,
      E,
      C,
      y,
      A
    );
  }, Zt = (f, u, p, b, g, m, E, C, y) => {
    let _ = 0;
    const R = u.length;
    let A = f.length - 1, O = R - 1;
    for (; _ <= A && _ <= O; ) {
      const B = f[_], L = u[_] = y ? Ke(u[_]) : Ve(u[_]);
      if (Dt(B, L))
        D(
          B,
          L,
          p,
          null,
          g,
          m,
          E,
          C,
          y
        );
      else
        break;
      _++;
    }
    for (; _ <= A && _ <= O; ) {
      const B = f[A], L = u[O] = y ? Ke(u[O]) : Ve(u[O]);
      if (Dt(B, L))
        D(
          B,
          L,
          p,
          null,
          g,
          m,
          E,
          C,
          y
        );
      else
        break;
      A--, O--;
    }
    if (_ > A) {
      if (_ <= O) {
        const B = O + 1, L = B < R ? u[B].el : b;
        for (; _ <= O; )
          D(
            null,
            u[_] = y ? Ke(u[_]) : Ve(u[_]),
            p,
            L,
            g,
            m,
            E,
            C,
            y
          ), _++;
      }
    } else if (_ > O)
      for (; _ <= A; )
        Te(f[_], g, m, !0), _++;
    else {
      const B = _, L = _, X = /* @__PURE__ */ new Map();
      for (_ = L; _ <= O; _++) {
        const ve = u[_] = y ? Ke(u[_]) : Ve(u[_]);
        ve.key != null && X.set(ve.key, _);
      }
      let W, ge = 0;
      const me = O - L + 1;
      let De = !1, Me = 0;
      const At = new Array(me);
      for (_ = 0; _ < me; _++) At[_] = 0;
      for (_ = B; _ <= A; _++) {
        const ve = f[_];
        if (ge >= me) {
          Te(ve, g, m, !0);
          continue;
        }
        let Oe;
        if (ve.key != null)
          Oe = X.get(ve.key);
        else
          for (W = L; W <= O; W++)
            if (At[W - L] === 0 && Dt(ve, u[W])) {
              Oe = W;
              break;
            }
        Oe === void 0 ? Te(ve, g, m, !0) : (At[Oe - L] = _ + 1, Oe >= Me ? Me = Oe : De = !0, D(
          ve,
          u[Oe],
          p,
          null,
          g,
          m,
          E,
          C,
          y
        ), ge++);
      }
      const yn = De ? Ql(At) : ht;
      for (W = yn.length - 1, _ = me - 1; _ >= 0; _--) {
        const ve = L + _, Oe = u[ve], xn = u[ve + 1], Cn = ve + 1 < R ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          xn.el || ri(xn)
        ) : b;
        At[_] === 0 ? D(
          null,
          Oe,
          p,
          Cn,
          g,
          m,
          E,
          C,
          y
        ) : De && (W < 0 || _ !== yn[W] ? nt(Oe, p, Cn, 2) : W--);
      }
    }
  }, nt = (f, u, p, b, g = null) => {
    const { el: m, type: E, transition: C, children: y, shapeFlag: _ } = f;
    if (_ & 6) {
      nt(f.component.subTree, u, p, b);
      return;
    }
    if (_ & 128) {
      f.suspense.move(u, p, b);
      return;
    }
    if (_ & 64) {
      E.move(f, u, p, wt);
      return;
    }
    if (E === ce) {
      n(m, u, p);
      for (let A = 0; A < y.length; A++)
        nt(y[A], u, p, b);
      n(f.anchor, u, p);
      return;
    }
    if (E === cs) {
      I(f, u, p);
      return;
    }
    if (b !== 2 && _ & 1 && C)
      if (b === 0)
        C.beforeEnter(m), n(m, u, p), oe(() => C.enter(m), g);
      else {
        const { leave: A, delayLeave: O, afterLeave: B } = C, L = () => {
          f.ctx.isUnmounted ? r(m) : n(m, u, p);
        }, X = () => {
          m._isLeaving && m[dl](
            !0
            /* cancelled */
          ), A(m, () => {
            L(), B && B();
          });
        };
        O ? O(m, L, X) : X();
      }
    else
      n(m, u, p);
  }, Te = (f, u, p, b = !1, g = !1) => {
    const {
      type: m,
      props: E,
      ref: C,
      children: y,
      dynamicChildren: _,
      shapeFlag: R,
      patchFlag: A,
      dirs: O,
      cacheIndex: B
    } = f;
    if (A === -2 && (g = !1), C != null && (Je(), Vt(C, null, p, f, !0), Ye()), B != null && (u.renderCache[B] = void 0), R & 256) {
      u.ctx.deactivate(f);
      return;
    }
    const L = R & 1 && O, X = !Bt(f);
    let W;
    if (X && (W = E && E.onVnodeBeforeUnmount) && Ie(W, u, f), R & 6)
      hi(f.component, p, b);
    else {
      if (R & 128) {
        f.suspense.unmount(p, b);
        return;
      }
      L && rt(f, null, u, "beforeUnmount"), R & 64 ? f.type.remove(
        f,
        u,
        p,
        wt,
        b
      ) : _ && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !_.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (m !== ce || A > 0 && A & 64) ? Et(
        _,
        u,
        p,
        !1,
        !0
      ) : (m === ce && A & 384 || !g && R & 16) && Et(y, u, p), b && bn(f);
    }
    (X && (W = E && E.onVnodeUnmounted) || L) && oe(() => {
      W && Ie(W, u, f), L && rt(f, null, u, "unmounted");
    }, p);
  }, bn = (f) => {
    const { type: u, el: p, anchor: b, transition: g } = f;
    if (u === ce) {
      pi(p, b);
      return;
    }
    if (u === cs) {
      P(f);
      return;
    }
    const m = () => {
      r(p), g && !g.persisted && g.afterLeave && g.afterLeave();
    };
    if (f.shapeFlag & 1 && g && !g.persisted) {
      const { leave: E, delayLeave: C } = g, y = () => E(p, m);
      C ? C(f.el, m, y) : y();
    } else
      m();
  }, pi = (f, u) => {
    let p;
    for (; f !== u; )
      p = x(f), r(f), f = p;
    r(u);
  }, hi = (f, u, p) => {
    const { bum: b, scope: g, job: m, subTree: E, um: C, m: y, a: _ } = f;
    Nn(y), Nn(_), b && is(b), g.stop(), m && (m.flags |= 8, Te(E, f, u, p)), C && oe(C, u), oe(() => {
      f.isUnmounted = !0;
    }, u);
  }, Et = (f, u, p, b = !1, g = !1, m = 0) => {
    for (let E = m; E < f.length; E++)
      Te(f[E], u, p, b, g);
  }, zt = (f) => {
    if (f.shapeFlag & 6)
      return zt(f.component.subTree);
    if (f.shapeFlag & 128)
      return f.suspense.next();
    const u = x(f.anchor || f.el), p = u && u[Hr];
    return p ? x(p) : u;
  };
  let Ds = !1;
  const vn = (f, u, p) => {
    let b;
    f == null ? u._vnode && (Te(u._vnode, null, null, !0), b = u._vnode.component) : D(
      u._vnode || null,
      f,
      u,
      null,
      null,
      null,
      p
    ), u._vnode = f, Ds || (Ds = !0, Sn(b), Pr(), Ds = !1);
  }, wt = {
    p: D,
    um: Te,
    m: nt,
    r: bn,
    mt: le,
    mc: w,
    pc: Q,
    pbc: N,
    n: zt,
    o: e
  };
  return {
    render: vn,
    hydrate: void 0,
    createApp: Pl(vn)
  };
}
function Vs({ type: e, props: t }, s) {
  return s === "svg" && e === "foreignObject" || s === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : s;
}
function it({ effect: e, job: t }, s) {
  s ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Yl(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function gn(e, t, s = !1) {
  const n = e.children, r = t.children;
  if (V(n) && V(r))
    for (let i = 0; i < n.length; i++) {
      const l = n[i];
      let o = r[i];
      o.shapeFlag & 1 && !o.dynamicChildren && ((o.patchFlag <= 0 || o.patchFlag === 32) && (o = r[i] = Ke(r[i]), o.el = l.el), !s && o.patchFlag !== -2 && gn(l, o)), o.type === Ss && (o.patchFlag === -1 && (o = r[i] = Ke(o)), o.el = l.el), o.type === tt && !o.el && (o.el = l.el);
    }
}
function Ql(e) {
  const t = e.slice(), s = [0];
  let n, r, i, l, o;
  const c = e.length;
  for (n = 0; n < c; n++) {
    const d = e[n];
    if (d !== 0) {
      if (r = s[s.length - 1], e[r] < d) {
        t[n] = r, s.push(n);
        continue;
      }
      for (i = 0, l = s.length - 1; i < l; )
        o = i + l >> 1, e[s[o]] < d ? i = o + 1 : l = o;
      d < e[s[i]] && (i > 0 && (t[n] = s[i - 1]), s[i] = n);
    }
  }
  for (i = s.length, l = s[i - 1]; i-- > 0; )
    s[i] = l, l = t[l];
  return s;
}
function ni(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : ni(t);
}
function Nn(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
function ri(e) {
  if (e.placeholder)
    return e.placeholder;
  const t = e.component;
  return t ? ri(t.subTree) : null;
}
const ii = (e) => e.__isSuspense;
function Xl(e, t) {
  t && t.pendingBranch ? V(e) ? t.effects.push(...e) : t.effects.push(e) : nl(e);
}
const ce = /* @__PURE__ */ Symbol.for("v-fgt"), Ss = /* @__PURE__ */ Symbol.for("v-txt"), tt = /* @__PURE__ */ Symbol.for("v-cmt"), cs = /* @__PURE__ */ Symbol.for("v-stc"), jt = [];
let ye = null;
function ee(e = !1) {
  jt.push(ye = e ? null : []);
}
function Zl() {
  jt.pop(), ye = jt[jt.length - 1] || null;
}
let Wt = 1;
function ms(e, t = !1) {
  Wt += e, e < 0 && ye && t && (ye.hasOnce = !0);
}
function li(e) {
  return e.dynamicChildren = Wt > 0 ? ye || ht : null, Zl(), Wt > 0 && ye && ye.push(e), e;
}
function re(e, t, s, n, r, i) {
  return li(
    S(
      e,
      t,
      s,
      n,
      r,
      i,
      !0
    )
  );
}
function mn(e, t, s, n, r) {
  return li(
    be(
      e,
      t,
      s,
      n,
      r,
      !0
    )
  );
}
function _s(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function Dt(e, t) {
  return e.type === t.type && e.key === t.key;
}
const oi = ({ key: e }) => e ?? null, fs = ({
  ref: e,
  ref_key: t,
  ref_for: s
}) => (typeof e == "number" && (e = "" + e), e != null ? se(e) || /* @__PURE__ */ ue(e) || H(e) ? { i: Ce, r: e, k: t, f: !!s } : e : null);
function S(e, t = null, s = null, n = 0, r = null, i = e === ce ? 0 : 1, l = !1, o = !1) {
  const c = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && oi(t),
    ref: t && fs(t),
    scopeId: $r,
    slotScopeIds: null,
    children: s,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: i,
    patchFlag: n,
    dynamicProps: r,
    dynamicChildren: null,
    appContext: null,
    ctx: Ce
  };
  return o ? (_n(c, s), i & 128 && e.normalize(c)) : s && (c.shapeFlag |= se(s) ? 8 : 16), Wt > 0 && // avoid a block node from tracking itself
  !l && // has current parent block
  ye && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (c.patchFlag > 0 || i & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  c.patchFlag !== 32 && ye.push(c), c;
}
const be = zl;
function zl(e, t = null, s = null, n = 0, r = null, i = !1) {
  if ((!e || e === wl) && (e = tt), _s(e)) {
    const o = yt(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return s && _n(o, s), Wt > 0 && !i && ye && (o.shapeFlag & 6 ? ye[ye.indexOf(e)] = o : ye.push(o)), o.patchFlag = -2, o;
  }
  if (ao(e) && (e = e.__vccOpts), t) {
    t = eo(t);
    let { class: o, style: c } = t;
    o && !se(o) && (t.class = mt(o)), q(c) && (/* @__PURE__ */ un(c) && !V(c) && (c = ae({}, c)), t.style = Re(c));
  }
  const l = se(e) ? 1 : ii(e) ? 128 : fl(e) ? 64 : q(e) ? 4 : H(e) ? 2 : 0;
  return S(
    e,
    t,
    s,
    n,
    r,
    l,
    i,
    !0
  );
}
function eo(e) {
  return e ? /* @__PURE__ */ un(e) || Xr(e) ? ae({}, e) : e : null;
}
function yt(e, t, s = !1, n = !1) {
  const { props: r, ref: i, patchFlag: l, children: o, transition: c } = e, d = t ? so(r || {}, t) : r, a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: d,
    key: d && oi(d),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      s && i ? V(i) ? i.concat(fs(t)) : [i, fs(t)] : fs(t)
    ) : i,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: o,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== ce ? l === -1 ? 16 : l | 16 : l,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: c,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && yt(e.ssContent),
    ssFallback: e.ssFallback && yt(e.ssFallback),
    placeholder: e.placeholder,
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return c && n && dn(
    a,
    c.clone(a)
  ), a;
}
function pt(e = " ", t = 0) {
  return be(Ss, null, e, t);
}
function to(e, t) {
  const s = be(cs, null, e);
  return s.staticCount = t, s;
}
function et(e = "", t = !1) {
  return t ? (ee(), mn(tt, null, e)) : be(tt, null, e);
}
function Ve(e) {
  return e == null || typeof e == "boolean" ? be(tt) : V(e) ? be(
    ce,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : _s(e) ? Ke(e) : be(Ss, null, String(e));
}
function Ke(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : yt(e);
}
function _n(e, t) {
  let s = 0;
  const { shapeFlag: n } = e;
  if (t == null)
    t = null;
  else if (V(t))
    s = 16;
  else if (typeof t == "object")
    if (n & 65) {
      const r = t.default;
      r && (r._c && (r._d = !1), _n(e, r()), r._c && (r._d = !0));
      return;
    } else {
      s = 32;
      const r = t._;
      !r && !Xr(t) ? t._ctx = Ce : r === 3 && Ce && (Ce.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else H(t) ? (t = { default: t, _ctx: Ce }, s = 32) : (t = String(t), n & 64 ? (s = 16, t = [pt(t)]) : s = 8);
  e.children = t, e.shapeFlag |= s;
}
function so(...e) {
  const t = {};
  for (let s = 0; s < e.length; s++) {
    const n = e[s];
    for (const r in n)
      if (r === "class")
        t.class !== n.class && (t.class = mt([t.class, n.class]));
      else if (r === "style")
        t.style = Re([t.style, n.style]);
      else if (vs(r)) {
        const i = t[r], l = n[r];
        l && i !== l && !(V(i) && i.includes(l)) && (t[r] = i ? [].concat(i, l) : l);
      } else r !== "" && (t[r] = n[r]);
  }
  return t;
}
function Ie(e, t, s, n = null) {
  Ne(e, t, 7, [
    s,
    n
  ]);
}
const no = qr();
let ro = 0;
function io(e, t, s) {
  const n = e.type, r = (t ? t.appContext : e.appContext) || no, i = {
    uid: ro++,
    vnode: e,
    type: n,
    parent: t,
    appContext: r,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new Ai(
      !0
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: t ? t.provides : Object.create(r.provides),
    ids: t ? t.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: zr(n, r),
    emitsOptions: Gr(n, r),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: J,
    // inheritAttrs
    inheritAttrs: n.inheritAttrs,
    // state
    ctx: J,
    data: J,
    props: J,
    attrs: J,
    slots: J,
    refs: J,
    setupState: J,
    setupContext: null,
    // suspense related
    suspense: s,
    suspenseId: s ? s.pendingId : 0,
    asyncDep: null,
    asyncResolved: !1,
    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: !1,
    isUnmounted: !1,
    isDeactivated: !1,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  };
  return i.ctx = { _: i }, i.root = t ? t.root : i, i.emit = $l.bind(null, i), e.ce && e.ce(i), i;
}
let he = null;
const lo = () => he || Ce;
let bs, Qs;
{
  const e = Cs(), t = (s, n) => {
    let r;
    return (r = e[s]) || (r = e[s] = []), r.push(n), (i) => {
      r.length > 1 ? r.forEach((l) => l(i)) : r[0](i);
    };
  };
  bs = t(
    "__VUE_INSTANCE_SETTERS__",
    (s) => he = s
  ), Qs = t(
    "__VUE_SSR_SETTERS__",
    (s) => qt = s
  );
}
const Xt = (e) => {
  const t = he;
  return bs(e), e.scope.on(), () => {
    e.scope.off(), bs(t);
  };
}, kn = () => {
  he && he.scope.off(), bs(null);
};
function ci(e) {
  return e.vnode.shapeFlag & 4;
}
let qt = !1;
function oo(e, t = !1, s = !1) {
  t && Qs(t);
  const { props: n, children: r } = e.vnode, i = ci(e);
  kl(e, n, i, t), Wl(e, r, s || t);
  const l = i ? co(e, t) : void 0;
  return t && Qs(!1), l;
}
function co(e, t) {
  const s = e.type;
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Al);
  const { setup: n } = s;
  if (n) {
    Je();
    const r = e.setupContext = n.length > 1 ? uo(e) : null, i = Xt(e), l = Qt(
      n,
      e,
      0,
      [
        e.props,
        r
      ]
    ), o = lr(l);
    if (Ye(), i(), (o || e.sp) && !Bt(e) && Nr(e), o) {
      if (l.then(kn, kn), t)
        return l.then((c) => {
          Ln(e, c);
        }).catch((c) => {
          Es(c, e, 0);
        });
      e.asyncDep = l;
    } else
      Ln(e, l);
  } else
    fi(e);
}
function Ln(e, t, s) {
  H(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : q(t) && (e.setupState = Dr(t)), fi(e);
}
function fi(e, t, s) {
  const n = e.type;
  e.render || (e.render = n.render || He);
  {
    const r = Xt(e);
    Je();
    try {
      Sl(e);
    } finally {
      Ye(), r();
    }
  }
}
const fo = {
  get(e, t) {
    return fe(e, "get", ""), e[t];
  }
};
function uo(e) {
  const t = (s) => {
    e.exposed = s || {};
  };
  return {
    attrs: new Proxy(e.attrs, fo),
    slots: e.slots,
    emit: e.emit,
    expose: t
  };
}
function Ts(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Dr(Gi(e.exposed)), {
    get(t, s) {
      if (s in t)
        return t[s];
      if (s in Ht)
        return Ht[s](e);
    },
    has(t, s) {
      return s in t || s in Ht;
    }
  })) : e.proxy;
}
function ao(e) {
  return H(e) && "__vccOpts" in e;
}
const Nt = (e, t) => /* @__PURE__ */ Zi(e, t, qt);
function po(e, t, s) {
  try {
    ms(-1);
    const n = arguments.length;
    return n === 2 ? q(t) && !V(t) ? _s(t) ? be(e, null, [t]) : be(e, t) : be(e, null, t) : (n > 3 ? s = Array.prototype.slice.call(arguments, 2) : n === 3 && _s(s) && (s = [s]), be(e, t, s));
  } finally {
    ms(1);
  }
}
const ho = "3.5.30";
/**
* @vue/runtime-dom v3.5.30
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let Xs;
const Un = typeof window < "u" && window.trustedTypes;
if (Un)
  try {
    Xs = /* @__PURE__ */ Un.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
const ui = Xs ? (e) => Xs.createHTML(e) : (e) => e, go = "http://www.w3.org/2000/svg", mo = "http://www.w3.org/1998/Math/MathML", Le = typeof document < "u" ? document : null, Kn = Le && /* @__PURE__ */ Le.createElement("template"), _o = {
  insert: (e, t, s) => {
    t.insertBefore(e, s || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, s, n) => {
    const r = t === "svg" ? Le.createElementNS(go, e) : t === "mathml" ? Le.createElementNS(mo, e) : s ? Le.createElement(e, { is: s }) : Le.createElement(e);
    return e === "select" && n && n.multiple != null && r.setAttribute("multiple", n.multiple), r;
  },
  createText: (e) => Le.createTextNode(e),
  createComment: (e) => Le.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => Le.querySelector(e),
  setScopeId(e, t) {
    e.setAttribute(t, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(e, t, s, n, r, i) {
    const l = s ? s.previousSibling : t.lastChild;
    if (r && (r === i || r.nextSibling))
      for (; t.insertBefore(r.cloneNode(!0), s), !(r === i || !(r = r.nextSibling)); )
        ;
    else {
      Kn.innerHTML = ui(
        n === "svg" ? `<svg>${e}</svg>` : n === "mathml" ? `<math>${e}</math>` : e
      );
      const o = Kn.content;
      if (n === "svg" || n === "mathml") {
        const c = o.firstChild;
        for (; c.firstChild; )
          o.appendChild(c.firstChild);
        o.removeChild(c);
      }
      t.insertBefore(o, s);
    }
    return [
      // first
      l ? l.nextSibling : t.firstChild,
      // last
      s ? s.previousSibling : t.lastChild
    ];
  }
}, bo = /* @__PURE__ */ Symbol("_vtc");
function vo(e, t, s) {
  const n = e[bo];
  n && (t = (t ? [t, ...n] : [...n]).join(" ")), t == null ? e.removeAttribute("class") : s ? e.setAttribute("class", t) : e.className = t;
}
const Wn = /* @__PURE__ */ Symbol("_vod"), yo = /* @__PURE__ */ Symbol("_vsh"), xo = /* @__PURE__ */ Symbol(""), Co = /(?:^|;)\s*display\s*:/;
function Fo(e, t, s) {
  const n = e.style, r = se(s);
  let i = !1;
  if (s && !r) {
    if (t)
      if (se(t))
        for (const l of t.split(";")) {
          const o = l.slice(0, l.indexOf(":")).trim();
          s[o] == null && us(n, o, "");
        }
      else
        for (const l in t)
          s[l] == null && us(n, l, "");
    for (const l in s)
      l === "display" && (i = !0), us(n, l, s[l]);
  } else if (r) {
    if (t !== s) {
      const l = n[xo];
      l && (s += ";" + l), n.cssText = s, i = Co.test(s);
    }
  } else t && e.removeAttribute("style");
  Wn in e && (e[Wn] = i ? n.display : "", e[yo] && (n.display = "none"));
}
const qn = /\s*!important$/;
function us(e, t, s) {
  if (V(s))
    s.forEach((n) => us(e, t, n));
  else if (s == null && (s = ""), t.startsWith("--"))
    e.setProperty(t, s);
  else {
    const n = Eo(e, t);
    qn.test(s) ? e.setProperty(
      ft(n),
      s.replace(qn, ""),
      "important"
    ) : e[n] = s;
  }
}
const Gn = ["Webkit", "Moz", "ms"], Bs = {};
function Eo(e, t) {
  const s = Bs[t];
  if (s)
    return s;
  let n = Ee(t);
  if (n !== "filter" && n in e)
    return Bs[t] = n;
  n = fr(n);
  for (let r = 0; r < Gn.length; r++) {
    const i = Gn[r] + n;
    if (i in e)
      return Bs[t] = i;
  }
  return t;
}
const Jn = "http://www.w3.org/1999/xlink";
function Yn(e, t, s, n, r, i = Ei(t)) {
  n && t.startsWith("xlink:") ? s == null ? e.removeAttributeNS(Jn, t.slice(6, t.length)) : e.setAttributeNS(Jn, t, s) : s == null || i && !ar(s) ? e.removeAttribute(t) : e.setAttribute(
    t,
    i ? "" : je(s) ? String(s) : s
  );
}
function Qn(e, t, s, n, r) {
  if (t === "innerHTML" || t === "textContent") {
    s != null && (e[t] = t === "innerHTML" ? ui(s) : s);
    return;
  }
  const i = e.tagName;
  if (t === "value" && i !== "PROGRESS" && // custom elements may use _value internally
  !i.includes("-")) {
    const o = i === "OPTION" ? e.getAttribute("value") || "" : e.value, c = s == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(s);
    (o !== c || !("_value" in e)) && (e.value = c), s == null && e.removeAttribute(t), e._value = s;
    return;
  }
  let l = !1;
  if (s === "" || s == null) {
    const o = typeof e[t];
    o === "boolean" ? s = ar(s) : s == null && o === "string" ? (s = "", l = !0) : o === "number" && (s = 0, l = !0);
  }
  try {
    e[t] = s;
  } catch {
  }
  l && e.removeAttribute(r || t);
}
function ze(e, t, s, n) {
  e.addEventListener(t, s, n);
}
function wo(e, t, s, n) {
  e.removeEventListener(t, s, n);
}
const Xn = /* @__PURE__ */ Symbol("_vei");
function Ao(e, t, s, n, r = null) {
  const i = e[Xn] || (e[Xn] = {}), l = i[t];
  if (n && l)
    l.value = n;
  else {
    const [o, c] = So(t);
    if (n) {
      const d = i[t] = Mo(
        n,
        r
      );
      ze(e, o, d, c);
    } else l && (wo(e, o, l, c), i[t] = void 0);
  }
}
const Zn = /(?:Once|Passive|Capture)$/;
function So(e) {
  let t;
  if (Zn.test(e)) {
    t = {};
    let n;
    for (; n = e.match(Zn); )
      e = e.slice(0, e.length - n[0].length), t[n[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : ft(e.slice(2)), t];
}
let Hs = 0;
const To = /* @__PURE__ */ Promise.resolve(), Do = () => Hs || (To.then(() => Hs = 0), Hs = Date.now());
function Mo(e, t) {
  const s = (n) => {
    if (!n._vts)
      n._vts = Date.now();
    else if (n._vts <= s.attached)
      return;
    Ne(
      Oo(n, s.value),
      t,
      5,
      [n]
    );
  };
  return s.value = e, s.attached = Do(), s;
}
function Oo(e, t) {
  if (V(t)) {
    const s = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      s.call(e), e._stopped = !0;
    }, t.map(
      (n) => (r) => !r._stopped && n && n(r)
    );
  } else
    return t;
}
const zn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Io = (e, t, s, n, r, i) => {
  const l = r === "svg";
  t === "class" ? vo(e, n, l) : t === "style" ? Fo(e, s, n) : vs(t) ? zs(t) || Ao(e, t, s, n, i) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Po(e, t, n, l)) ? (Qn(e, t, n), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Yn(e, t, n, l, i, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (Ro(e, t) || // @ts-expect-error _def is private
  e._def.__asyncLoader && (/[A-Z]/.test(t) || !se(n))) ? Qn(e, Ee(t), n, i, t) : (t === "true-value" ? e._trueValue = n : t === "false-value" && (e._falseValue = n), Yn(e, t, n, l));
};
function Po(e, t, s, n) {
  if (n)
    return !!(t === "innerHTML" || t === "textContent" || t in e && zn(t) && H(s));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const r = e.tagName;
    if (r === "IMG" || r === "VIDEO" || r === "CANVAS" || r === "SOURCE")
      return !1;
  }
  return zn(t) && se(s) ? !1 : t in e;
}
function Ro(e, t) {
  const s = (
    // @ts-expect-error _def is private
    e._def.props
  );
  if (!s)
    return !1;
  const n = Ee(t);
  return Array.isArray(s) ? s.some((r) => Ee(r) === n) : Object.keys(s).some((r) => Ee(r) === n);
}
const xt = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return V(t) ? (s) => is(t, s) : t;
};
function $o(e) {
  e.target.composing = !0;
}
function er(e) {
  const t = e.target;
  t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
const Ge = /* @__PURE__ */ Symbol("_assign");
function tr(e, t, s) {
  return t && (e = e.trim()), s && (e = xs(e)), e;
}
const Vo = {
  created(e, { modifiers: { lazy: t, trim: s, number: n } }, r) {
    e[Ge] = xt(r);
    const i = n || r.props && r.props.type === "number";
    ze(e, t ? "change" : "input", (l) => {
      l.target.composing || e[Ge](tr(e.value, s, i));
    }), (s || i) && ze(e, "change", () => {
      e.value = tr(e.value, s, i);
    }), t || (ze(e, "compositionstart", $o), ze(e, "compositionend", er), ze(e, "change", er));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: s, modifiers: { lazy: n, trim: r, number: i } }, l) {
    if (e[Ge] = xt(l), e.composing) return;
    const o = (i || e.type === "number") && !/^0\d/.test(e.value) ? xs(e.value) : e.value, c = t ?? "";
    o !== c && (document.activeElement === e && e.type !== "range" && (n && t === s || r && e.value.trim() === c) || (e.value = c));
  }
}, rs = {
  // #4096 array checkboxes need to be deep traversed
  deep: !0,
  created(e, t, s) {
    e[Ge] = xt(s), ze(e, "change", () => {
      const n = e._modelValue, r = Gt(e), i = e.checked, l = e[Ge];
      if (V(n)) {
        const o = sn(n, r), c = o !== -1;
        if (i && !c)
          l(n.concat(r));
        else if (!i && c) {
          const d = [...n];
          d.splice(o, 1), l(d);
        }
      } else if (Ct(n)) {
        const o = new Set(n);
        i ? o.add(r) : o.delete(r), l(o);
      } else
        l(ai(e, i));
    });
  },
  // set initial checked on mount to wait for true-value/false-value
  mounted: sr,
  beforeUpdate(e, t, s) {
    e[Ge] = xt(s), sr(e, t, s);
  }
};
function sr(e, { value: t, oldValue: s }, n) {
  e._modelValue = t;
  let r;
  if (V(t))
    r = sn(t, n.props.value) > -1;
  else if (Ct(t))
    r = t.has(n.props.value);
  else {
    if (t === s) return;
    r = Ft(t, ai(e, !0));
  }
  e.checked !== r && (e.checked = r);
}
const Bo = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: s } }, n) {
    const r = Ct(t);
    ze(e, "change", () => {
      const i = Array.prototype.filter.call(e.options, (l) => l.selected).map(
        (l) => s ? xs(Gt(l)) : Gt(l)
      );
      e[Ge](
        e.multiple ? r ? new Set(i) : i : i[0]
      ), e._assigning = !0, Or(() => {
        e._assigning = !1;
      });
    }), e[Ge] = xt(n);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    nr(e, t);
  },
  beforeUpdate(e, t, s) {
    e[Ge] = xt(s);
  },
  updated(e, { value: t }) {
    e._assigning || nr(e, t);
  }
};
function nr(e, t) {
  const s = e.multiple, n = V(t);
  if (!(s && !n && !Ct(t))) {
    for (let r = 0, i = e.options.length; r < i; r++) {
      const l = e.options[r], o = Gt(l);
      if (s)
        if (n) {
          const c = typeof o;
          c === "string" || c === "number" ? l.selected = t.some((d) => String(d) === String(o)) : l.selected = sn(t, o) > -1;
        } else
          l.selected = t.has(o);
      else if (Ft(Gt(l), t)) {
        e.selectedIndex !== r && (e.selectedIndex = r);
        return;
      }
    }
    !s && e.selectedIndex !== -1 && (e.selectedIndex = -1);
  }
}
function Gt(e) {
  return "_value" in e ? e._value : e.value;
}
function ai(e, t) {
  const s = t ? "_trueValue" : "_falseValue";
  return s in e ? e[s] : t;
}
const Ho = /* @__PURE__ */ ae({ patchProp: Io }, _o);
let rr;
function jo() {
  return rr || (rr = Gl(Ho));
}
const No = (...e) => {
  const t = jo().createApp(...e), { mount: s } = t;
  return t.mount = (n) => {
    const r = Lo(n);
    if (!r) return;
    const i = t._component;
    !H(i) && !i.render && !i.template && (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
    const l = s(r, !1, ko(r));
    return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), l;
  }, t;
};
function ko(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function Lo(e) {
  return se(e) ? document.querySelector(e) : e;
}
const di = (e, t) => {
  const s = e.__vccOpts || e;
  for (const [n, r] of t)
    s[n] = r;
  return s;
}, Uo = {
  class: "relative",
  ref: "wrapper"
}, Ko = { class: "block text-sm font-medium text-gray-700 mb-1" }, Wo = { class: "text-xs font-mono text-gray-600 truncate" }, qo = {
  key: 0,
  class: "picker-panel"
}, Go = { class: "picker-layout" }, Jo = { class: "picker-left" }, Yo = { class: "color-grid" }, Qo = ["onClick"], Xo = {
  key: 0,
  class: "grid-cell no-fill"
}, Zo = ["onClick"], zo = ["onClick"], ec = { class: "hex-row" }, tc = ["value"], sc = {
  key: 0,
  class: "copied-text"
}, nc = { class: "picker-right" }, rc = { class: "picker-top-row" }, ic = { class: "hsv-sliders" }, lc = { class: "hsv-row" }, oc = ["value"], cc = ["value"], fc = { class: "hsv-row" }, uc = ["value"], ac = ["value"], dc = { class: "hsv-row" }, pc = ["value"], hc = ["value"], gc = {
  __name: "ColorPicker",
  props: {
    label: { type: String, default: "Color" },
    modelValue: { type: String, default: "" }
  },
  emits: ["update:modelValue"],
  setup(e, { emit: t }) {
    const s = e, n = t, r = /* @__PURE__ */ Ue(!1), i = /* @__PURE__ */ Ue(!1), l = /* @__PURE__ */ Ue(""), o = typeof window < "u" && "EyeDropper" in window, c = /* @__PURE__ */ Yt({ h: 210, s: 85, v: 94 });
    Rt(r, (j) => {
      if (j && s.modelValue) {
        const w = a(s.modelValue);
        c.h = w.h, c.s = w.s, c.v = w.v, l.value = "";
      }
    });
    function d(j, w, T) {
      w /= 100, T /= 100;
      const N = T * w, G = N * (1 - Math.abs(j / 60 % 2 - 1)), Se = T - N;
      let ne, le, xe;
      j < 60 ? (ne = N, le = G, xe = 0) : j < 120 ? (ne = G, le = N, xe = 0) : j < 180 ? (ne = 0, le = N, xe = G) : j < 240 ? (ne = 0, le = G, xe = N) : j < 300 ? (ne = G, le = 0, xe = N) : (ne = N, le = 0, xe = G);
      const te = (z) => Math.round((z + Se) * 255).toString(16).padStart(2, "0");
      return `#${te(ne)}${te(le)}${te(xe)}`.toUpperCase();
    }
    function a(j) {
      j = j.replace("#", "");
      const w = parseInt(j.substr(0, 2), 16) / 255, T = parseInt(j.substr(2, 2), 16) / 255, N = parseInt(j.substr(4, 2), 16) / 255, G = Math.max(w, T, N), Se = Math.min(w, T, N), ne = G - Se;
      let le = 0;
      const xe = G === 0 ? 0 : ne / G, te = G;
      return ne !== 0 && (G === w ? le = 60 * ((T - N) / ne + (T < N ? 6 : 0)) : G === T ? le = 60 * ((N - w) / ne + 2) : le = 60 * ((w - T) / ne + 4)), le < 0 && (le += 360), { h: Math.round(le), s: Math.round(xe * 100), v: Math.round(te * 100) };
    }
    function h(j, w, T) {
      return Math.max(w, Math.min(T, j));
    }
    const x = Nt(() => d(c.h, c.s, c.v)), F = Nt(() => `linear-gradient(to right, #888, hsl(${c.h},100%,50%))`), $ = Nt(() => `linear-gradient(to right, #000, hsl(${c.h},100%,50%))`), D = [
      "#FF2600",
      "#FF9300",
      "#FFFB00",
      "#00F900",
      "#00FDFF",
      "#0433FF",
      "#FF40FF",
      "#942192",
      "#AA7942",
      "#FFFFFF",
      "#8E8E93",
      "#000000"
    ], k = [
      null,
      "#FFFFFF",
      "#EBEBEB",
      "#D6D6D6",
      "#C0C0C0",
      "#ABABAB",
      "#939393",
      "#7A7A7A",
      "#5F5F5F",
      "#444444",
      "#232323",
      "#000000"
    ], M = [
      [
        "#00313F",
        "#001D4C",
        "#12013B",
        "#2E043E",
        "#3D071C",
        "#5C0700",
        "#5B1B01",
        "#573501",
        "#563D01",
        "#666101",
        "#4F5604",
        "#263D0F"
      ],
      [
        "#014D63",
        "#002F7B",
        "#1B0853",
        "#430E59",
        "#56102A",
        "#821100",
        "#7C2A01",
        "#7B4A02",
        "#775801",
        "#8C8700",
        "#707607",
        "#375819"
      ],
      [
        "#026E8E",
        "#0142A9",
        "#2C1276",
        "#61187C",
        "#781A3E",
        "#B61A01",
        "#AD3F00",
        "#A96801",
        "#A77B01",
        "#C4BC01",
        "#9BA60E",
        "#4F7A28"
      ],
      [
        "#018DB4",
        "#0157D7",
        "#371A96",
        "#7B209E",
        "#9A234E",
        "#E22400",
        "#DA5100",
        "#D48601",
        "#D29F01",
        "#F5EC00",
        "#C5D117",
        "#679C33"
      ],
      [
        "#00A2D7",
        "#0062FE",
        "#4E22B3",
        "#992ABD",
        "#BF2E66",
        "#FF4112",
        "#FF6A01",
        "#FEAA00",
        "#FEC802",
        "#FFFC40",
        "#DAEB38",
        "#77BB40"
      ],
      [
        "#00C7FC",
        "#3A8AFC",
        "#5E30EA",
        "#BD39F3",
        "#E53C7A",
        "#FF6251",
        "#FF8548",
        "#FEB440",
        "#FECA3E",
        "#FFF86B",
        "#E4EF65",
        "#97D25F"
      ],
      [
        "#52D4FD",
        "#74A7FF",
        "#864EFE",
        "#D258FE",
        "#EC719F",
        "#FF8D81",
        "#FEA57D",
        "#FFC879",
        "#FFD876",
        "#FFF894",
        "#EAF48F",
        "#B1DE8B"
      ],
      [
        "#93D9F7",
        "#A4C7FF",
        "#B18CFF",
        "#DF90FC",
        "#F4A4C1",
        "#FFB5AE",
        "#FFC4AA",
        "#FED9A8",
        "#FFE4A9",
        "#FEFBB8",
        "#F2F8B8",
        "#CBE8B5"
      ],
      [
        "#D1E6F1",
        "#D4E4FE",
        "#D7CEFD",
        "#F0CAFD",
        "#F9D2E2",
        "#FFDBD9",
        "#FEE2D5",
        "#FFEDD6",
        "#FFF2D4",
        "#FEFCDD",
        "#F7FADB",
        "#E0EDD4"
      ]
    ];
    function v(j) {
      const w = a(j);
      c.h = w.h, c.s = w.s, c.v = w.v, l.value = j;
    }
    function I(j) {
      const w = j.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(w)) {
        const T = a(w);
        c.h = T.h, c.s = T.s, c.v = T.v;
      }
    }
    function P() {
      navigator.clipboard.writeText(x.value), i.value = !0, setTimeout(() => {
        i.value = !1;
      }, 2e3);
    }
    async function Y() {
      try {
        const T = (await new window.EyeDropper().open()).sRGBHex.toUpperCase(), N = a(T);
        c.h = N.h, c.s = N.s, c.v = N.v, l.value = "";
      } catch {
      }
    }
    function ie() {
      n("update:modelValue", x.value), r.value = !1;
    }
    return (j, w) => (ee(), re("div", Uo, [
      S("label", Ko, kt(e.label), 1),
      S("button", {
        type: "button",
        class: "flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 bg-white transition-colors w-full",
        onClick: w[0] || (w[0] = (T) => r.value = !r.value)
      }, [
        S("span", {
          class: "w-6 h-6 rounded shrink-0 border border-gray-100",
          style: Re({ backgroundColor: e.modelValue || "#3B82F6" })
        }, null, 4),
        S("span", Wo, kt(e.modelValue || "#3B82F6"), 1),
        w[9] || (w[9] = S("span", { class: "ml-auto text-gray-400 text-[10px]" }, "▼", -1))
      ]),
      (ee(), mn(al, { to: "body" }, [
        r.value ? (ee(), re("div", {
          key: 0,
          class: "fixed inset-0 z-40",
          onClick: w[1] || (w[1] = (T) => r.value = !1)
        })) : et("", !0)
      ])),
      r.value ? (ee(), re("div", qo, [
        S("div", Go, [
          S("div", Jo, [
            S("div", Yo, [
              (ee(), re(ce, null, Tt(D, (T, N) => S("div", {
                key: "t-" + N,
                class: mt(["grid-cell", { selected: l.value === T }]),
                style: Re({ backgroundColor: T }),
                onClick: (G) => v(T)
              }, null, 14, Qo)), 64)),
              (ee(), re(ce, null, Tt(12, (T) => S("div", {
                key: "sp-" + T,
                class: "grid-spacer"
              })), 64)),
              (ee(), re(ce, null, Tt(k, (T, N) => (ee(), re(ce, {
                key: "g-" + N
              }, [
                T === null ? (ee(), re("div", Xo)) : (ee(), re("div", {
                  key: 1,
                  class: mt(["grid-cell", { selected: l.value === T }]),
                  style: Re({ backgroundColor: T }),
                  onClick: (G) => v(T)
                }, null, 14, Zo))
              ], 64))), 64)),
              (ee(), re(ce, null, Tt(M, (T, N) => (ee(), re(ce, {
                key: "r-" + N
              }, [
                (ee(!0), re(ce, null, Tt(T, (G, Se) => (ee(), re("div", {
                  key: "c-" + N + "-" + Se,
                  class: mt(["grid-cell", { selected: l.value === G }]),
                  style: Re({ backgroundColor: G }),
                  onClick: (ne) => v(G)
                }, null, 14, zo))), 128))
              ], 64))), 64))
            ]),
            S("div", ec, [
              S("input", {
                type: "text",
                value: x.value,
                maxlength: "7",
                class: "hex-input",
                onInput: w[2] || (w[2] = (T) => I(T))
              }, null, 40, tc),
              S("button", {
                class: "hex-btn",
                title: "Copy hex",
                onClick: P
              }, [...w[10] || (w[10] = [
                S("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round"
                }, [
                  S("rect", {
                    x: "9",
                    y: "9",
                    width: "13",
                    height: "13",
                    rx: "2"
                  }),
                  S("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })
                ], -1)
              ])]),
              i.value ? (ee(), re("span", sc, "Copied")) : et("", !0),
              Tr(o) ? (ee(), re("button", {
                key: 1,
                class: "hex-btn",
                title: "Pick from screen",
                onClick: Y
              }, [...w[11] || (w[11] = [
                S("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round"
                }, [
                  S("path", { d: "m2 22 1-1h3l9-9" }),
                  S("path", { d: "M3 21v-3l9-9" }),
                  S("path", { d: "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4" })
                ], -1)
              ])])) : et("", !0)
            ])
          ]),
          S("div", nc, [
            S("div", rc, [
              S("div", {
                class: "swatch-large",
                style: Re({ backgroundColor: x.value })
              }, null, 4)
            ]),
            S("div", ic, [
              S("div", lc, [
                w[12] || (w[12] = S("label", null, "H", -1)),
                S("input", {
                  type: "range",
                  class: "hue-slider",
                  min: "0",
                  max: "360",
                  value: c.h,
                  onInput: w[3] || (w[3] = (T) => {
                    c.h = +T.target.value, l.value = "";
                  })
                }, null, 40, oc),
                S("input", {
                  type: "number",
                  min: "0",
                  max: "360",
                  value: c.h,
                  onInput: w[4] || (w[4] = (T) => {
                    c.h = h(+T.target.value, 0, 360), l.value = "";
                  })
                }, null, 40, cc)
              ]),
              S("div", fc, [
                w[13] || (w[13] = S("label", null, "S", -1)),
                S("input", {
                  type: "range",
                  class: "sat-slider",
                  min: "0",
                  max: "100",
                  value: c.s,
                  style: Re({ background: F.value }),
                  onInput: w[5] || (w[5] = (T) => {
                    c.s = +T.target.value, l.value = "";
                  })
                }, null, 44, uc),
                S("input", {
                  type: "number",
                  min: "0",
                  max: "100",
                  value: c.s,
                  onInput: w[6] || (w[6] = (T) => {
                    c.s = h(+T.target.value, 0, 100), l.value = "";
                  })
                }, null, 40, ac)
              ]),
              S("div", dc, [
                w[14] || (w[14] = S("label", null, "V", -1)),
                S("input", {
                  type: "range",
                  class: "val-slider",
                  min: "0",
                  max: "100",
                  value: c.v,
                  style: Re({ background: $.value }),
                  onInput: w[7] || (w[7] = (T) => {
                    c.v = +T.target.value, l.value = "";
                  })
                }, null, 44, pc),
                S("input", {
                  type: "number",
                  min: "0",
                  max: "100",
                  value: c.v,
                  onInput: w[8] || (w[8] = (T) => {
                    c.v = h(+T.target.value, 0, 100), l.value = "";
                  })
                }, null, 40, hc)
              ])
            ]),
            S("button", {
              class: "apply-btn",
              onClick: ie
            }, "Apply")
          ])
        ])
      ])) : et("", !0)
    ], 512));
  }
}, mc = /* @__PURE__ */ di(gc, [["__scopeId", "data-v-311f91ec"]]), _c = { class: "pp-fmt-editor" }, bc = { class: "pp-fmt-header" }, vc = { class: "pp-fmt-section" }, yc = { class: "pp-fmt-validate-row" }, xc = ["disabled"], Cc = {
  key: 0,
  class: "pp-fmt-ok"
}, Fc = {
  key: 1,
  class: "pp-fmt-err"
}, Ec = { class: "pp-fmt-section" }, wc = { class: "pp-fmt-style-row" }, Ac = { class: "pp-fmt-style-row" }, Sc = { class: "pp-fmt-style-row" }, Tc = { class: "pp-fmt-style-row" }, Dc = { class: "pp-fmt-footer" }, Mc = ["disabled"], Oc = {
  __name: "FormatRuleEditor",
  props: {
    rootDoctype: { type: String, required: !0 },
    fieldName: { type: String, required: !0 },
    rule: { type: Object, required: !0 }
  },
  emits: ["update:rule", "validated", "apply", "clear", "cancel"],
  setup(e, { emit: t }) {
    const s = e, n = t, r = /* @__PURE__ */ Yt({
      condition_sql: "",
      color: "",
      font_weight: "",
      italic: 0,
      underline: 0,
      last_validated_sql: ""
    }), i = /* @__PURE__ */ Ue(""), l = /* @__PURE__ */ Ue(!1), o = /* @__PURE__ */ Ue(!1), c = /* @__PURE__ */ Ue(""), d = /* @__PURE__ */ Ue(!1), a = /* @__PURE__ */ Ue(!1);
    function h(M) {
      r.condition_sql = M.condition_sql || "", r.color = M.color || "", r.font_weight = M.font_weight || "", r.italic = M.italic ? 1 : 0, r.underline = M.underline ? 1 : 0, r.last_validated_sql = M.last_validated_sql || "", d.value = !!(r.color || "").trim(), a.value = !!(r.font_weight || "").trim(), r.last_validated_sql && (r.condition_sql || "").trim() ? (i.value = (r.condition_sql || "").trim(), o.value = !0, c.value = "") : (i.value = "", o.value = !1);
    }
    Rt(
      () => s.rule,
      (M) => h(M || {}),
      { immediate: !0, deep: !0 }
    );
    const x = Nt(() => {
      const M = (r.condition_sql || "").trim();
      return !!r.last_validated_sql && M === i.value;
    });
    function F() {
      o.value = !1, c.value = "", (r.condition_sql || "").trim() !== i.value && (r.last_validated_sql = ""), n("update:rule", { ...r });
    }
    function $() {
      d.value || (r.color = "", F());
    }
    function D() {
      a.value || (r.font_weight = "", F());
    }
    function k() {
      const M = (r.condition_sql || "").trim();
      if (!M) {
        o.value = !1, c.value = "Expression is empty.";
        return;
      }
      l.value = !0, o.value = !1, c.value = "", frappe.call({
        method: "nce_events.api.panel_api_pkg.format_rules.validate_format_rule",
        args: {
          root_doctype: s.rootDoctype,
          field_name: s.fieldName,
          condition_sql: M
        },
        callback(v) {
          l.value = !1;
          const I = v.message || {};
          I.ok ? (r.last_validated_sql = I.resolved_sql || "", i.value = M, o.value = !0, c.value = "", n("validated", r.last_validated_sql), n("update:rule", { ...r })) : (o.value = !1, c.value = I.error || "Validation failed.");
        },
        error() {
          l.value = !1, o.value = !1, c.value = "Validation request failed.";
        }
      });
    }
    return (M, v) => (ee(), re("div", _c, [
      S("div", bc, [
        S("div", null, [
          v[10] || (v[10] = S("strong", null, "Field:", -1)),
          pt(" " + kt(e.fieldName), 1)
        ]),
        S("button", {
          type: "button",
          class: "btn btn-xs btn-default",
          onClick: v[0] || (v[0] = (I) => M.$emit("clear"))
        }, "Clear")
      ]),
      S("div", vc, [
        v[11] || (v[11] = S("label", { class: "pp-fmt-label" }, "Condition (SQL):", -1)),
        at(S("textarea", {
          "onUpdate:modelValue": v[1] || (v[1] = (I) => r.condition_sql = I),
          class: "pp-fmt-textarea",
          rows: "4",
          placeholder: "status = 'Cancelled' AND price > 0",
          onInput: F
        }, null, 544), [
          [Vo, r.condition_sql]
        ]),
        v[12] || (v[12] = S("p", { class: "pp-fmt-hint" }, " Reference any column. Bare = root; <dt>.<field> = related ", -1)),
        S("div", yc, [
          S("button", {
            type: "button",
            class: "btn btn-xs btn-primary",
            disabled: l.value,
            onClick: k
          }, " Validate ", 8, xc),
          o.value ? (ee(), re("span", Cc, "✓ Valid")) : et("", !0),
          c.value ? (ee(), re("span", Fc, "✗ " + kt(c.value), 1)) : et("", !0)
        ])
      ]),
      S("div", Ec, [
        v[18] || (v[18] = S("div", { class: "pp-fmt-label" }, "Styles (any combination):", -1)),
        S("div", wc, [
          S("label", null, [
            at(S("input", {
              "onUpdate:modelValue": v[2] || (v[2] = (I) => d.value = I),
              type: "checkbox",
              onChange: $
            }, null, 544), [
              [rs, d.value]
            ]),
            v[13] || (v[13] = pt(" Color ", -1))
          ]),
          d.value ? (ee(), mn(mc, {
            key: 0,
            modelValue: r.color,
            "onUpdate:modelValue": [
              v[3] || (v[3] = (I) => r.color = I),
              F
            ],
            label: "Color"
          }, null, 8, ["modelValue"])) : et("", !0)
        ]),
        S("div", Ac, [
          S("label", null, [
            at(S("input", {
              "onUpdate:modelValue": v[4] || (v[4] = (I) => a.value = I),
              type: "checkbox",
              onChange: D
            }, null, 544), [
              [rs, a.value]
            ]),
            v[14] || (v[14] = pt(" Font Weight ", -1))
          ]),
          a.value ? at((ee(), re("select", {
            key: 0,
            "onUpdate:modelValue": v[5] || (v[5] = (I) => r.font_weight = I),
            class: "pp-fmt-select",
            onChange: F
          }, [...v[15] || (v[15] = [
            to('<option value="200" data-v-1422b6d2>200</option><option value="300" data-v-1422b6d2>300</option><option value="400" data-v-1422b6d2>400</option><option value="500" data-v-1422b6d2>500</option><option value="600" data-v-1422b6d2>600</option><option value="700" data-v-1422b6d2>700</option><option value="800" data-v-1422b6d2>800</option>', 7)
          ])], 544)), [
            [Bo, r.font_weight]
          ]) : et("", !0)
        ]),
        S("div", Sc, [
          S("label", null, [
            at(S("input", {
              "onUpdate:modelValue": v[6] || (v[6] = (I) => r.italic = I),
              type: "checkbox",
              "true-value": 1,
              "false-value": 0,
              onChange: F
            }, null, 544), [
              [rs, r.italic]
            ]),
            v[16] || (v[16] = pt(" Italic ", -1))
          ])
        ]),
        S("div", Tc, [
          S("label", null, [
            at(S("input", {
              "onUpdate:modelValue": v[7] || (v[7] = (I) => r.underline = I),
              type: "checkbox",
              "true-value": 1,
              "false-value": 0,
              onChange: F
            }, null, 544), [
              [rs, r.underline]
            ]),
            v[17] || (v[17] = pt(" Underline ", -1))
          ])
        ])
      ]),
      S("div", Dc, [
        S("button", {
          type: "button",
          class: "btn btn-sm btn-default",
          onClick: v[8] || (v[8] = (I) => M.$emit("cancel"))
        }, "Cancel"),
        S("button", {
          type: "button",
          class: "btn btn-sm btn-primary",
          disabled: !x.value,
          onClick: v[9] || (v[9] = (I) => M.$emit("apply", { ...r }))
        }, " Apply ", 8, Mc)
      ])
    ]));
  }
}, Ic = /* @__PURE__ */ di(Oc, [["__scopeId", "data-v-1422b6d2"]]);
function Rc(e, t) {
  const s = t.rule || {}, n = No({
    setup() {
      return () => po(Ic, {
        rootDoctype: t.rootDoctype,
        fieldName: t.fieldName,
        rule: s,
        "onUpdate:rule": (r) => {
          var i;
          Object.assign(s, r), (i = t.onUpdate) == null || i.call(t, r);
        },
        onValidated: (r) => {
          s.last_validated_sql = r;
        },
        onApply: (r) => {
          var i;
          return (i = t.onApply) == null ? void 0 : i.call(t, r);
        },
        onClear: () => {
          var r;
          return (r = t.onClear) == null ? void 0 : r.call(t);
        },
        onCancel: () => {
          var r;
          return (r = t.onCancel) == null ? void 0 : r.call(t);
        }
      });
    }
  });
  return n.mount(e), n;
}
export {
  Rc as mountFormatRuleEditor
};
