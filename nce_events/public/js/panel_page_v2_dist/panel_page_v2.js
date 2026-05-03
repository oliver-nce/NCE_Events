(function () {
	"use strict";
	/**
	 * @vue/shared v3.5.30
	 * (c) 2018-present Yuxi (Evan) You and Vue contributors
	 * @license MIT
	 **/ function ro(e) {
		const t = Object.create(null);
		for (const n of e.split(",")) t[n] = 1;
		return (n) => n in t;
	}
	const ye = {},
		Lt = [],
		lt = () => {},
		Go = () => !1,
		xn = (e) =>
			e.charCodeAt(0) === 111 &&
			e.charCodeAt(1) === 110 &&
			(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97),
		ao = (e) => e.startsWith("onUpdate:"),
		Pe = Object.assign,
		co = (e, t) => {
			const n = e.indexOf(t);
			n > -1 && e.splice(n, 1);
		},
		ci = Object.prototype.hasOwnProperty,
		_e = (e, t) => ci.call(e, t),
		le = Array.isArray,
		jt = (e) => tn(e) === "[object Map]",
		Vt = (e) => tn(e) === "[object Set]",
		Zo = (e) => tn(e) === "[object Date]",
		fe = (e) => typeof e == "function",
		Fe = (e) => typeof e == "string",
		et = (e) => typeof e == "symbol",
		xe = (e) => e !== null && typeof e == "object",
		Qo = (e) => (xe(e) || fe(e)) && fe(e.then) && fe(e.catch),
		el = Object.prototype.toString,
		tn = (e) => el.call(e),
		ui = (e) => tn(e).slice(8, -1),
		tl = (e) => tn(e) === "[object Object]",
		Cn = (e) => Fe(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e,
		nn = ro(
			",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
		),
		Sn = (e) => {
			const t = Object.create(null);
			return (n) => t[n] || (t[n] = e(n));
		},
		fi = /-\w/g,
		Le = Sn((e) => e.replace(fi, (t) => t.slice(1).toUpperCase())),
		di = /\B([A-Z])/g,
		mt = Sn((e) => e.replace(di, "-$1").toLowerCase()),
		$n = Sn((e) => e.charAt(0).toUpperCase() + e.slice(1)),
		uo = Sn((e) => (e ? `on${$n(e)}` : "")),
		je = (e, t) => !Object.is(e, t),
		kn = (e, ...t) => {
			for (let n = 0; n < e.length; n++) e[n](...t);
		},
		nl = (e, t, n, o = !1) => {
			Object.defineProperty(e, t, {
				configurable: !0,
				enumerable: !1,
				writable: o,
				value: n,
			});
		},
		Fn = (e) => {
			const t = parseFloat(e);
			return isNaN(t) ? e : t;
		};
	let ol;
	const Dn = () =>
		ol ||
		(ol =
			typeof globalThis < "u"
				? globalThis
				: typeof self < "u"
				? self
				: typeof window < "u"
				? window
				: typeof global < "u"
				? global
				: {});
	function Re(e) {
		if (le(e)) {
			const t = {};
			for (let n = 0; n < e.length; n++) {
				const o = e[n],
					l = Fe(o) ? gi(o) : Re(o);
				if (l) for (const s in l) t[s] = l[s];
			}
			return t;
		} else if (Fe(e) || xe(e)) return e;
	}
	const pi = /;(?![^(]*\))/g,
		mi = /:([^]+)/,
		hi = /\/\*[^]*?\*\//g;
	function gi(e) {
		const t = {};
		return (
			e
				.replace(hi, "")
				.split(pi)
				.forEach((n) => {
					if (n) {
						const o = n.split(mi);
						o.length > 1 && (t[o[0].trim()] = o[1].trim());
					}
				}),
			t
		);
	}
	function Ve(e) {
		let t = "";
		if (Fe(e)) t = e;
		else if (le(e))
			for (let n = 0; n < e.length; n++) {
				const o = Ve(e[n]);
				o && (t += o + " ");
			}
		else if (xe(e)) for (const n in e) e[n] && (t += n + " ");
		return t.trim();
	}
	const vi = ro("itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly");
	function ll(e) {
		return !!e || e === "";
	}
	function yi(e, t) {
		if (e.length !== t.length) return !1;
		let n = !0;
		for (let o = 0; n && o < e.length; o++) n = Bt(e[o], t[o]);
		return n;
	}
	function Bt(e, t) {
		if (e === t) return !0;
		let n = Zo(e),
			o = Zo(t);
		if (n || o) return n && o ? e.getTime() === t.getTime() : !1;
		if (((n = et(e)), (o = et(t)), n || o)) return e === t;
		if (((n = le(e)), (o = le(t)), n || o)) return n && o ? yi(e, t) : !1;
		if (((n = xe(e)), (o = xe(t)), n || o)) {
			if (!n || !o) return !1;
			const l = Object.keys(e).length,
				s = Object.keys(t).length;
			if (l !== s) return !1;
			for (const i in e) {
				const r = e.hasOwnProperty(i),
					a = t.hasOwnProperty(i);
				if ((r && !a) || (!r && a) || !Bt(e[i], t[i])) return !1;
			}
		}
		return String(e) === String(t);
	}
	function fo(e, t) {
		return e.findIndex((n) => Bt(n, t));
	}
	const sl = (e) => !!(e && e.__v_isRef === !0),
		G = (e) =>
			Fe(e)
				? e
				: e == null
				? ""
				: le(e) || (xe(e) && (e.toString === el || !fe(e.toString)))
				? sl(e)
					? G(e.value)
					: JSON.stringify(e, il, 2)
				: String(e),
		il = (e, t) =>
			sl(t)
				? il(e, t.value)
				: jt(t)
				? {
						[`Map(${t.size})`]: [...t.entries()].reduce(
							(n, [o, l], s) => ((n[po(o, s) + " =>"] = l), n),
							{}
						),
				  }
				: Vt(t)
				? { [`Set(${t.size})`]: [...t.values()].map((n) => po(n)) }
				: et(t)
				? po(t)
				: xe(t) && !le(t) && !tl(t)
				? String(t)
				: t,
		po = (e, t = "") => {
			var n;
			return et(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
		};
	/**
	 * @vue/reactivity v3.5.30
	 * (c) 2018-present Yuxi (Evan) You and Vue contributors
	 * @license MIT
	 **/ let Ke;
	class _i {
		constructor(t = !1) {
			(this.detached = t),
				(this._active = !0),
				(this._on = 0),
				(this.effects = []),
				(this.cleanups = []),
				(this._isPaused = !1),
				(this.__v_skip = !0),
				(this.parent = Ke),
				!t && Ke && (this.index = (Ke.scopes || (Ke.scopes = [])).push(this) - 1);
		}
		get active() {
			return this._active;
		}
		pause() {
			if (this._active) {
				this._isPaused = !0;
				let t, n;
				if (this.scopes)
					for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].pause();
				for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].pause();
			}
		}
		resume() {
			if (this._active && this._isPaused) {
				this._isPaused = !1;
				let t, n;
				if (this.scopes)
					for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].resume();
				for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].resume();
			}
		}
		run(t) {
			if (this._active) {
				const n = Ke;
				try {
					return (Ke = this), t();
				} finally {
					Ke = n;
				}
			}
		}
		on() {
			++this._on === 1 && ((this.prevScope = Ke), (Ke = this));
		}
		off() {
			this._on > 0 && --this._on === 0 && ((Ke = this.prevScope), (this.prevScope = void 0));
		}
		stop(t) {
			if (this._active) {
				this._active = !1;
				let n, o;
				for (n = 0, o = this.effects.length; n < o; n++) this.effects[n].stop();
				for (this.effects.length = 0, n = 0, o = this.cleanups.length; n < o; n++)
					this.cleanups[n]();
				if (((this.cleanups.length = 0), this.scopes)) {
					for (n = 0, o = this.scopes.length; n < o; n++) this.scopes[n].stop(!0);
					this.scopes.length = 0;
				}
				if (!this.detached && this.parent && !t) {
					const l = this.parent.scopes.pop();
					l &&
						l !== this &&
						((this.parent.scopes[this.index] = l), (l.index = this.index));
				}
				this.parent = void 0;
			}
		}
	}
	function bi() {
		return Ke;
	}
	let $e;
	const mo = new WeakSet();
	class rl {
		constructor(t) {
			(this.fn = t),
				(this.deps = void 0),
				(this.depsTail = void 0),
				(this.flags = 5),
				(this.next = void 0),
				(this.cleanup = void 0),
				(this.scheduler = void 0),
				Ke && Ke.active && Ke.effects.push(this);
		}
		pause() {
			this.flags |= 64;
		}
		resume() {
			this.flags & 64 &&
				((this.flags &= -65), mo.has(this) && (mo.delete(this), this.trigger()));
		}
		notify() {
			(this.flags & 2 && !(this.flags & 32)) || this.flags & 8 || cl(this);
		}
		run() {
			if (!(this.flags & 1)) return this.fn();
			(this.flags |= 2), ml(this), ul(this);
			const t = $e,
				n = tt;
			($e = this), (tt = !0);
			try {
				return this.fn();
			} finally {
				fl(this), ($e = t), (tt = n), (this.flags &= -3);
			}
		}
		stop() {
			if (this.flags & 1) {
				for (let t = this.deps; t; t = t.nextDep) yo(t);
				(this.deps = this.depsTail = void 0),
					ml(this),
					this.onStop && this.onStop(),
					(this.flags &= -2);
			}
		}
		trigger() {
			this.flags & 64 ? mo.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
		}
		runIfDirty() {
			vo(this) && this.run();
		}
		get dirty() {
			return vo(this);
		}
	}
	let al = 0,
		on,
		ln;
	function cl(e, t = !1) {
		if (((e.flags |= 8), t)) {
			(e.next = ln), (ln = e);
			return;
		}
		(e.next = on), (on = e);
	}
	function ho() {
		al++;
	}
	function go() {
		if (--al > 0) return;
		if (ln) {
			let t = ln;
			for (ln = void 0; t; ) {
				const n = t.next;
				(t.next = void 0), (t.flags &= -9), (t = n);
			}
		}
		let e;
		for (; on; ) {
			let t = on;
			for (on = void 0; t; ) {
				const n = t.next;
				if (((t.next = void 0), (t.flags &= -9), t.flags & 1))
					try {
						t.trigger();
					} catch (o) {
						e || (e = o);
					}
				t = n;
			}
		}
		if (e) throw e;
	}
	function ul(e) {
		for (let t = e.deps; t; t = t.nextDep)
			(t.version = -1), (t.prevActiveLink = t.dep.activeLink), (t.dep.activeLink = t);
	}
	function fl(e) {
		let t,
			n = e.depsTail,
			o = n;
		for (; o; ) {
			const l = o.prevDep;
			o.version === -1 ? (o === n && (n = l), yo(o), wi(o)) : (t = o),
				(o.dep.activeLink = o.prevActiveLink),
				(o.prevActiveLink = void 0),
				(o = l);
		}
		(e.deps = t), (e.depsTail = n);
	}
	function vo(e) {
		for (let t = e.deps; t; t = t.nextDep)
			if (
				t.dep.version !== t.version ||
				(t.dep.computed && (dl(t.dep.computed) || t.dep.version !== t.version))
			)
				return !0;
		return !!e._dirty;
	}
	function dl(e) {
		if (
			(e.flags & 4 && !(e.flags & 16)) ||
			((e.flags &= -17), e.globalVersion === sn) ||
			((e.globalVersion = sn),
			!e.isSSR && e.flags & 128 && ((!e.deps && !e._dirty) || !vo(e)))
		)
			return;
		e.flags |= 2;
		const t = e.dep,
			n = $e,
			o = tt;
		($e = e), (tt = !0);
		try {
			ul(e);
			const l = e.fn(e._value);
			(t.version === 0 || je(l, e._value)) &&
				((e.flags |= 128), (e._value = l), t.version++);
		} catch (l) {
			throw (t.version++, l);
		} finally {
			($e = n), (tt = o), fl(e), (e.flags &= -3);
		}
	}
	function yo(e, t = !1) {
		const { dep: n, prevSub: o, nextSub: l } = e;
		if (
			(o && ((o.nextSub = l), (e.prevSub = void 0)),
			l && ((l.prevSub = o), (e.nextSub = void 0)),
			n.subs === e && ((n.subs = o), !o && n.computed))
		) {
			n.computed.flags &= -5;
			for (let s = n.computed.deps; s; s = s.nextDep) yo(s, !0);
		}
		!t && !--n.sc && n.map && n.map.delete(n.key);
	}
	function wi(e) {
		const { prevDep: t, nextDep: n } = e;
		t && ((t.nextDep = n), (e.prevDep = void 0)), n && ((n.prevDep = t), (e.nextDep = void 0));
	}
	let tt = !0;
	const pl = [];
	function st() {
		pl.push(tt), (tt = !1);
	}
	function it() {
		const e = pl.pop();
		tt = e === void 0 ? !0 : e;
	}
	function ml(e) {
		const { cleanup: t } = e;
		if (((e.cleanup = void 0), t)) {
			const n = $e;
			$e = void 0;
			try {
				t();
			} finally {
				$e = n;
			}
		}
	}
	let sn = 0;
	class xi {
		constructor(t, n) {
			(this.sub = t),
				(this.dep = n),
				(this.version = n.version),
				(this.nextDep =
					this.prevDep =
					this.nextSub =
					this.prevSub =
					this.prevActiveLink =
						void 0);
		}
	}
	class Tn {
		constructor(t) {
			(this.computed = t),
				(this.version = 0),
				(this.activeLink = void 0),
				(this.subs = void 0),
				(this.map = void 0),
				(this.key = void 0),
				(this.sc = 0),
				(this.__v_skip = !0);
		}
		track(t) {
			if (!$e || !tt || $e === this.computed) return;
			let n = this.activeLink;
			if (n === void 0 || n.sub !== $e)
				(n = this.activeLink = new xi($e, this)),
					$e.deps
						? ((n.prevDep = $e.depsTail), ($e.depsTail.nextDep = n), ($e.depsTail = n))
						: ($e.deps = $e.depsTail = n),
					hl(n);
			else if (n.version === -1 && ((n.version = this.version), n.nextDep)) {
				const o = n.nextDep;
				(o.prevDep = n.prevDep),
					n.prevDep && (n.prevDep.nextDep = o),
					(n.prevDep = $e.depsTail),
					(n.nextDep = void 0),
					($e.depsTail.nextDep = n),
					($e.depsTail = n),
					$e.deps === n && ($e.deps = o);
			}
			return n;
		}
		trigger(t) {
			this.version++, sn++, this.notify(t);
		}
		notify(t) {
			ho();
			try {
				for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
			} finally {
				go();
			}
		}
	}
	function hl(e) {
		if ((e.dep.sc++, e.sub.flags & 4)) {
			const t = e.dep.computed;
			if (t && !e.dep.subs) {
				t.flags |= 20;
				for (let o = t.deps; o; o = o.nextDep) hl(o);
			}
			const n = e.dep.subs;
			n !== e && ((e.prevSub = n), n && (n.nextSub = e)), (e.dep.subs = e);
		}
	}
	const Nn = new WeakMap(),
		Nt = Symbol(""),
		_o = Symbol(""),
		rn = Symbol("");
	function Be(e, t, n) {
		if (tt && $e) {
			let o = Nn.get(e);
			o || Nn.set(e, (o = new Map()));
			let l = o.get(n);
			l || (o.set(n, (l = new Tn())), (l.map = o), (l.key = n)), l.track();
		}
	}
	function ht(e, t, n, o, l, s) {
		const i = Nn.get(e);
		if (!i) {
			sn++;
			return;
		}
		const r = (a) => {
			a && a.trigger();
		};
		if ((ho(), t === "clear")) i.forEach(r);
		else {
			const a = le(e),
				u = a && Cn(n);
			if (a && n === "length") {
				const c = Number(o);
				i.forEach((f, h) => {
					(h === "length" || h === rn || (!et(h) && h >= c)) && r(f);
				});
			} else
				switch (((n !== void 0 || i.has(void 0)) && r(i.get(n)), u && r(i.get(rn)), t)) {
					case "add":
						a ? u && r(i.get("length")) : (r(i.get(Nt)), jt(e) && r(i.get(_o)));
						break;
					case "delete":
						a || (r(i.get(Nt)), jt(e) && r(i.get(_o)));
						break;
					case "set":
						jt(e) && r(i.get(Nt));
						break;
				}
		}
		go();
	}
	function Ci(e, t) {
		const n = Nn.get(e);
		return n && n.get(t);
	}
	function Ht(e) {
		const t = ve(e);
		return t === e ? t : (Be(t, "iterate", rn), Je(e) ? t : t.map(nt));
	}
	function En(e) {
		return Be((e = ve(e)), "iterate", rn), e;
	}
	function rt(e, t) {
		return vt(e) ? qt(Et(e) ? nt(t) : t) : nt(t);
	}
	const Si = {
		__proto__: null,
		[Symbol.iterator]() {
			return bo(this, Symbol.iterator, (e) => rt(this, e));
		},
		concat(...e) {
			return Ht(this).concat(...e.map((t) => (le(t) ? Ht(t) : t)));
		},
		entries() {
			return bo(this, "entries", (e) => ((e[1] = rt(this, e[1])), e));
		},
		every(e, t) {
			return gt(this, "every", e, t, void 0, arguments);
		},
		filter(e, t) {
			return gt(this, "filter", e, t, (n) => n.map((o) => rt(this, o)), arguments);
		},
		find(e, t) {
			return gt(this, "find", e, t, (n) => rt(this, n), arguments);
		},
		findIndex(e, t) {
			return gt(this, "findIndex", e, t, void 0, arguments);
		},
		findLast(e, t) {
			return gt(this, "findLast", e, t, (n) => rt(this, n), arguments);
		},
		findLastIndex(e, t) {
			return gt(this, "findLastIndex", e, t, void 0, arguments);
		},
		forEach(e, t) {
			return gt(this, "forEach", e, t, void 0, arguments);
		},
		includes(...e) {
			return wo(this, "includes", e);
		},
		indexOf(...e) {
			return wo(this, "indexOf", e);
		},
		join(e) {
			return Ht(this).join(e);
		},
		lastIndexOf(...e) {
			return wo(this, "lastIndexOf", e);
		},
		map(e, t) {
			return gt(this, "map", e, t, void 0, arguments);
		},
		pop() {
			return an(this, "pop");
		},
		push(...e) {
			return an(this, "push", e);
		},
		reduce(e, ...t) {
			return gl(this, "reduce", e, t);
		},
		reduceRight(e, ...t) {
			return gl(this, "reduceRight", e, t);
		},
		shift() {
			return an(this, "shift");
		},
		some(e, t) {
			return gt(this, "some", e, t, void 0, arguments);
		},
		splice(...e) {
			return an(this, "splice", e);
		},
		toReversed() {
			return Ht(this).toReversed();
		},
		toSorted(e) {
			return Ht(this).toSorted(e);
		},
		toSpliced(...e) {
			return Ht(this).toSpliced(...e);
		},
		unshift(...e) {
			return an(this, "unshift", e);
		},
		values() {
			return bo(this, "values", (e) => rt(this, e));
		},
	};
	function bo(e, t, n) {
		const o = En(e),
			l = o[t]();
		return (
			o !== e &&
				!Je(e) &&
				((l._next = l.next),
				(l.next = () => {
					const s = l._next();
					return s.done || (s.value = n(s.value)), s;
				})),
			l
		);
	}
	const $i = Array.prototype;
	function gt(e, t, n, o, l, s) {
		const i = En(e),
			r = i !== e && !Je(e),
			a = i[t];
		if (a !== $i[t]) {
			const f = a.apply(e, s);
			return r ? nt(f) : f;
		}
		let u = n;
		i !== e &&
			(r
				? (u = function (f, h) {
						return n.call(this, rt(e, f), h, e);
				  })
				: n.length > 2 &&
				  (u = function (f, h) {
						return n.call(this, f, h, e);
				  }));
		const c = a.call(i, u, o);
		return r && l ? l(c) : c;
	}
	function gl(e, t, n, o) {
		const l = En(e),
			s = l !== e && !Je(e);
		let i = n,
			r = !1;
		l !== e &&
			(s
				? ((r = o.length === 0),
				  (i = function (u, c, f) {
						return r && ((r = !1), (u = rt(e, u))), n.call(this, u, rt(e, c), f, e);
				  }))
				: n.length > 3 &&
				  (i = function (u, c, f) {
						return n.call(this, u, c, f, e);
				  }));
		const a = l[t](i, ...o);
		return r ? rt(e, a) : a;
	}
	function wo(e, t, n) {
		const o = ve(e);
		Be(o, "iterate", rn);
		const l = o[t](...n);
		return (l === -1 || l === !1) && Mn(n[0]) ? ((n[0] = ve(n[0])), o[t](...n)) : l;
	}
	function an(e, t, n = []) {
		st(), ho();
		const o = ve(e)[t].apply(e, n);
		return go(), it(), o;
	}
	const ki = ro("__proto__,__v_isRef,__isVue"),
		vl = new Set(
			Object.getOwnPropertyNames(Symbol)
				.filter((e) => e !== "arguments" && e !== "caller")
				.map((e) => Symbol[e])
				.filter(et)
		);
	function Fi(e) {
		et(e) || (e = String(e));
		const t = ve(this);
		return Be(t, "has", e), t.hasOwnProperty(e);
	}
	class yl {
		constructor(t = !1, n = !1) {
			(this._isReadonly = t), (this._isShallow = n);
		}
		get(t, n, o) {
			if (n === "__v_skip") return t.__v_skip;
			const l = this._isReadonly,
				s = this._isShallow;
			if (n === "__v_isReactive") return !l;
			if (n === "__v_isReadonly") return l;
			if (n === "__v_isShallow") return s;
			if (n === "__v_raw")
				return o === (l ? (s ? Sl : Cl) : s ? xl : wl).get(t) ||
					Object.getPrototypeOf(t) === Object.getPrototypeOf(o)
					? t
					: void 0;
			const i = le(t);
			if (!l) {
				let a;
				if (i && (a = Si[n])) return a;
				if (n === "hasOwnProperty") return Fi;
			}
			const r = Reflect.get(t, n, Ne(t) ? t : o);
			if ((et(n) ? vl.has(n) : ki(n)) || (l || Be(t, "get", n), s)) return r;
			if (Ne(r)) {
				const a = i && Cn(n) ? r : r.value;
				return l && xe(a) ? Co(a) : a;
			}
			return xe(r) ? (l ? Co(r) : Ae(r)) : r;
		}
	}
	class _l extends yl {
		constructor(t = !1) {
			super(!1, t);
		}
		set(t, n, o, l) {
			let s = t[n];
			const i = le(t) && Cn(n);
			if (!this._isShallow) {
				const u = vt(s);
				if ((!Je(o) && !vt(o) && ((s = ve(s)), (o = ve(o))), !i && Ne(s) && !Ne(o)))
					return u || (s.value = o), !0;
			}
			const r = i ? Number(n) < t.length : _e(t, n),
				a = Reflect.set(t, n, o, Ne(t) ? t : l);
			return t === ve(l) && (r ? je(o, s) && ht(t, "set", n, o) : ht(t, "add", n, o)), a;
		}
		deleteProperty(t, n) {
			const o = _e(t, n);
			t[n];
			const l = Reflect.deleteProperty(t, n);
			return l && o && ht(t, "delete", n, void 0), l;
		}
		has(t, n) {
			const o = Reflect.has(t, n);
			return (!et(n) || !vl.has(n)) && Be(t, "has", n), o;
		}
		ownKeys(t) {
			return Be(t, "iterate", le(t) ? "length" : Nt), Reflect.ownKeys(t);
		}
	}
	class bl extends yl {
		constructor(t = !1) {
			super(!0, t);
		}
		set(t, n) {
			return !0;
		}
		deleteProperty(t, n) {
			return !0;
		}
	}
	const Di = new _l(),
		Ti = new bl(),
		Ni = new _l(!0),
		Ei = new bl(!0),
		xo = (e) => e,
		Rn = (e) => Reflect.getPrototypeOf(e);
	function Ri(e, t, n) {
		return function (...o) {
			const l = this.__v_raw,
				s = ve(l),
				i = jt(s),
				r = e === "entries" || (e === Symbol.iterator && i),
				a = e === "keys" && i,
				u = l[e](...o),
				c = n ? xo : t ? qt : nt;
			return (
				!t && Be(s, "iterate", a ? _o : Nt),
				Pe(Object.create(u), {
					next() {
						const { value: f, done: h } = u.next();
						return h
							? { value: f, done: h }
							: { value: r ? [c(f[0]), c(f[1])] : c(f), done: h };
					},
				})
			);
		};
	}
	function On(e) {
		return function (...t) {
			return e === "delete" ? !1 : e === "clear" ? void 0 : this;
		};
	}
	function Oi(e, t) {
		const n = {
			get(l) {
				const s = this.__v_raw,
					i = ve(s),
					r = ve(l);
				e || (je(l, r) && Be(i, "get", l), Be(i, "get", r));
				const { has: a } = Rn(i),
					u = t ? xo : e ? qt : nt;
				if (a.call(i, l)) return u(s.get(l));
				if (a.call(i, r)) return u(s.get(r));
				s !== i && s.get(l);
			},
			get size() {
				const l = this.__v_raw;
				return !e && Be(ve(l), "iterate", Nt), l.size;
			},
			has(l) {
				const s = this.__v_raw,
					i = ve(s),
					r = ve(l);
				return (
					e || (je(l, r) && Be(i, "has", l), Be(i, "has", r)),
					l === r ? s.has(l) : s.has(l) || s.has(r)
				);
			},
			forEach(l, s) {
				const i = this,
					r = i.__v_raw,
					a = ve(r),
					u = t ? xo : e ? qt : nt;
				return !e && Be(a, "iterate", Nt), r.forEach((c, f) => l.call(s, u(c), u(f), i));
			},
		};
		return (
			Pe(
				n,
				e
					? { add: On("add"), set: On("set"), delete: On("delete"), clear: On("clear") }
					: {
							add(l) {
								const s = ve(this),
									i = Rn(s),
									r = ve(l),
									a = !t && !Je(l) && !vt(l) ? r : l;
								return (
									i.has.call(s, a) ||
										(je(l, a) && i.has.call(s, l)) ||
										(je(r, a) && i.has.call(s, r)) ||
										(s.add(a), ht(s, "add", a, a)),
									this
								);
							},
							set(l, s) {
								!t && !Je(s) && !vt(s) && (s = ve(s));
								const i = ve(this),
									{ has: r, get: a } = Rn(i);
								let u = r.call(i, l);
								u || ((l = ve(l)), (u = r.call(i, l)));
								const c = a.call(i, l);
								return (
									i.set(l, s),
									u ? je(s, c) && ht(i, "set", l, s) : ht(i, "add", l, s),
									this
								);
							},
							delete(l) {
								const s = ve(this),
									{ has: i, get: r } = Rn(s);
								let a = i.call(s, l);
								a || ((l = ve(l)), (a = i.call(s, l))), r && r.call(s, l);
								const u = s.delete(l);
								return a && ht(s, "delete", l, void 0), u;
							},
							clear() {
								const l = ve(this),
									s = l.size !== 0,
									i = l.clear();
								return s && ht(l, "clear", void 0, void 0), i;
							},
					  }
			),
			["keys", "values", "entries", Symbol.iterator].forEach((l) => {
				n[l] = Ri(l, e, t);
			}),
			n
		);
	}
	function Pn(e, t) {
		const n = Oi(e, t);
		return (o, l, s) =>
			l === "__v_isReactive"
				? !e
				: l === "__v_isReadonly"
				? e
				: l === "__v_raw"
				? o
				: Reflect.get(_e(n, l) && l in o ? n : o, l, s);
	}
	const Pi = { get: Pn(!1, !1) },
		Ai = { get: Pn(!1, !0) },
		Mi = { get: Pn(!0, !1) },
		Ii = { get: Pn(!0, !0) },
		wl = new WeakMap(),
		xl = new WeakMap(),
		Cl = new WeakMap(),
		Sl = new WeakMap();
	function Li(e) {
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
	function ji(e) {
		return e.__v_skip || !Object.isExtensible(e) ? 0 : Li(ui(e));
	}
	function Ae(e) {
		return vt(e) ? e : An(e, !1, Di, Pi, wl);
	}
	function Vi(e) {
		return An(e, !1, Ni, Ai, xl);
	}
	function Co(e) {
		return An(e, !0, Ti, Mi, Cl);
	}
	function Sd(e) {
		return An(e, !0, Ei, Ii, Sl);
	}
	function An(e, t, n, o, l) {
		if (!xe(e) || (e.__v_raw && !(t && e.__v_isReactive))) return e;
		const s = ji(e);
		if (s === 0) return e;
		const i = l.get(e);
		if (i) return i;
		const r = new Proxy(e, s === 2 ? o : n);
		return l.set(e, r), r;
	}
	function Et(e) {
		return vt(e) ? Et(e.__v_raw) : !!(e && e.__v_isReactive);
	}
	function vt(e) {
		return !!(e && e.__v_isReadonly);
	}
	function Je(e) {
		return !!(e && e.__v_isShallow);
	}
	function Mn(e) {
		return e ? !!e.__v_raw : !1;
	}
	function ve(e) {
		const t = e && e.__v_raw;
		return t ? ve(t) : e;
	}
	function Bi(e) {
		return !_e(e, "__v_skip") && Object.isExtensible(e) && nl(e, "__v_skip", !0), e;
	}
	const nt = (e) => (xe(e) ? Ae(e) : e),
		qt = (e) => (xe(e) ? Co(e) : e);
	function Ne(e) {
		return e ? e.__v_isRef === !0 : !1;
	}
	function X(e) {
		return kl(e, !1);
	}
	function $l(e) {
		return kl(e, !0);
	}
	function kl(e, t) {
		return Ne(e) ? e : new Hi(e, t);
	}
	class Hi {
		constructor(t, n) {
			(this.dep = new Tn()),
				(this.__v_isRef = !0),
				(this.__v_isShallow = !1),
				(this._rawValue = n ? t : ve(t)),
				(this._value = n ? t : nt(t)),
				(this.__v_isShallow = n);
		}
		get value() {
			return this.dep.track(), this._value;
		}
		set value(t) {
			const n = this._rawValue,
				o = this.__v_isShallow || Je(t) || vt(t);
			(t = o ? t : ve(t)),
				je(t, n) &&
					((this._rawValue = t), (this._value = o ? t : nt(t)), this.dep.trigger());
		}
	}
	function R(e) {
		return Ne(e) ? e.value : e;
	}
	const qi = {
		get: (e, t, n) => (t === "__v_raw" ? e : R(Reflect.get(e, t, n))),
		set: (e, t, n, o) => {
			const l = e[t];
			return Ne(l) && !Ne(n) ? ((l.value = n), !0) : Reflect.set(e, t, n, o);
		},
	};
	function Fl(e) {
		return Et(e) ? e : new Proxy(e, qi);
	}
	class Ui {
		constructor(t) {
			(this.__v_isRef = !0), (this._value = void 0);
			const n = (this.dep = new Tn()),
				{ get: o, set: l } = t(n.track.bind(n), n.trigger.bind(n));
			(this._get = o), (this._set = l);
		}
		get value() {
			return (this._value = this._get());
		}
		set value(t) {
			this._set(t);
		}
	}
	function Wi(e) {
		return new Ui(e);
	}
	class Ki {
		constructor(t, n, o) {
			(this._object = t),
				(this._key = n),
				(this._defaultValue = o),
				(this.__v_isRef = !0),
				(this._value = void 0),
				(this._raw = ve(t));
			let l = !0,
				s = t;
			if (!le(t) || !Cn(String(n)))
				do l = !Mn(s) || Je(s);
				while (l && (s = s.__v_raw));
			this._shallow = l;
		}
		get value() {
			let t = this._object[this._key];
			return (
				this._shallow && (t = R(t)), (this._value = t === void 0 ? this._defaultValue : t)
			);
		}
		set value(t) {
			if (this._shallow && Ne(this._raw[this._key])) {
				const n = this._object[this._key];
				if (Ne(n)) {
					n.value = t;
					return;
				}
			}
			this._object[this._key] = t;
		}
		get dep() {
			return Ci(this._raw, this._key);
		}
	}
	class zi {
		constructor(t) {
			(this._getter = t),
				(this.__v_isRef = !0),
				(this.__v_isReadonly = !0),
				(this._value = void 0);
		}
		get value() {
			return (this._value = this._getter());
		}
	}
	function In(e, t, n) {
		return Ne(e) ? e : fe(e) ? new zi(e) : xe(e) && arguments.length > 1 ? Yi(e, t, n) : X(e);
	}
	function Yi(e, t, n) {
		return new Ki(e, t, n);
	}
	class Ji {
		constructor(t, n, o) {
			(this.fn = t),
				(this.setter = n),
				(this._value = void 0),
				(this.dep = new Tn(this)),
				(this.__v_isRef = !0),
				(this.deps = void 0),
				(this.depsTail = void 0),
				(this.flags = 16),
				(this.globalVersion = sn - 1),
				(this.next = void 0),
				(this.effect = this),
				(this.__v_isReadonly = !n),
				(this.isSSR = o);
		}
		notify() {
			if (((this.flags |= 16), !(this.flags & 8) && $e !== this)) return cl(this, !0), !0;
		}
		get value() {
			const t = this.dep.track();
			return dl(this), t && (t.version = this.dep.version), this._value;
		}
		set value(t) {
			this.setter && this.setter(t);
		}
	}
	function Xi(e, t, n = !1) {
		let o, l;
		return fe(e) ? (o = e) : ((o = e.get), (l = e.set)), new Ji(o, l, n);
	}
	const Ln = {},
		jn = new WeakMap();
	let Rt;
	function Gi(e, t = !1, n = Rt) {
		if (n) {
			let o = jn.get(n);
			o || jn.set(n, (o = [])), o.push(e);
		}
	}
	function Zi(e, t, n = ye) {
		const { immediate: o, deep: l, once: s, scheduler: i, augmentJob: r, call: a } = n,
			u = (O) => (l ? O : Je(O) || l === !1 || l === 0 ? yt(O, 1) : yt(O));
		let c,
			f,
			h,
			v,
			b = !1,
			w = !1;
		if (
			(Ne(e)
				? ((f = () => e.value), (b = Je(e)))
				: Et(e)
				? ((f = () => u(e)), (b = !0))
				: le(e)
				? ((w = !0),
				  (b = e.some((O) => Et(O) || Je(O))),
				  (f = () =>
						e.map((O) => {
							if (Ne(O)) return O.value;
							if (Et(O)) return u(O);
							if (fe(O)) return a ? a(O, 2) : O();
						})))
				: fe(e)
				? t
					? (f = a ? () => a(e, 2) : e)
					: (f = () => {
							if (h) {
								st();
								try {
									h();
								} finally {
									it();
								}
							}
							const O = Rt;
							Rt = c;
							try {
								return a ? a(e, 3, [v]) : e(v);
							} finally {
								Rt = O;
							}
					  })
				: (f = lt),
			t && l)
		) {
			const O = f,
				x = l === !0 ? 1 / 0 : l;
			f = () => yt(O(), x);
		}
		const D = bi(),
			S = () => {
				c.stop(), D && D.active && co(D.effects, c);
			};
		if (s && t) {
			const O = t;
			t = (...x) => {
				O(...x), S();
			};
		}
		let N = w ? new Array(e.length).fill(Ln) : Ln;
		const j = (O) => {
			if (!(!(c.flags & 1) || (!c.dirty && !O)))
				if (t) {
					const x = c.run();
					if (l || b || (w ? x.some((E, L) => je(E, N[L])) : je(x, N))) {
						h && h();
						const E = Rt;
						Rt = c;
						try {
							const L = [x, N === Ln ? void 0 : w && N[0] === Ln ? [] : N, v];
							(N = x), a ? a(t, 3, L) : t(...L);
						} finally {
							Rt = E;
						}
					}
				} else c.run();
		};
		return (
			r && r(j),
			(c = new rl(f)),
			(c.scheduler = i ? () => i(j, !1) : j),
			(v = (O) => Gi(O, !1, c)),
			(h = c.onStop =
				() => {
					const O = jn.get(c);
					if (O) {
						if (a) a(O, 4);
						else for (const x of O) x();
						jn.delete(c);
					}
				}),
			t ? (o ? j(!0) : (N = c.run())) : i ? i(j.bind(null, !0), !0) : c.run(),
			(S.pause = c.pause.bind(c)),
			(S.resume = c.resume.bind(c)),
			(S.stop = S),
			S
		);
	}
	function yt(e, t = 1 / 0, n) {
		if (t <= 0 || !xe(e) || e.__v_skip || ((n = n || new Map()), (n.get(e) || 0) >= t))
			return e;
		if ((n.set(e, t), t--, Ne(e))) yt(e.value, t, n);
		else if (le(e)) for (let o = 0; o < e.length; o++) yt(e[o], t, n);
		else if (Vt(e) || jt(e))
			e.forEach((o) => {
				yt(o, t, n);
			});
		else if (tl(e)) {
			for (const o in e) yt(e[o], t, n);
			for (const o of Object.getOwnPropertySymbols(e))
				Object.prototype.propertyIsEnumerable.call(e, o) && yt(e[o], t, n);
		}
		return e;
	}
	/**
	 * @vue/runtime-core v3.5.30
	 * (c) 2018-present Yuxi (Evan) You and Vue contributors
	 * @license MIT
	 **/ const cn = [];
	let So = !1;
	function $d(e, ...t) {
		if (So) return;
		(So = !0), st();
		const n = cn.length ? cn[cn.length - 1].component : null,
			o = n && n.appContext.config.warnHandler,
			l = Qi();
		if (o)
			Ut(o, n, 11, [
				e +
					t
						.map((s) => {
							var i, r;
							return (r = (i = s.toString) == null ? void 0 : i.call(s)) != null
								? r
								: JSON.stringify(s);
						})
						.join(""),
				n && n.proxy,
				l.map(({ vnode: s }) => `at <${Es(n, s.type)}>`).join(`
`),
				l,
			]);
		else {
			const s = [`[Vue warn]: ${e}`, ...t];
			l.length &&
				s.push(
					`
`,
					...er(l)
				),
				console.warn(...s);
		}
		it(), (So = !1);
	}
	function Qi() {
		let e = cn[cn.length - 1];
		if (!e) return [];
		const t = [];
		for (; e; ) {
			const n = t[0];
			n && n.vnode === e ? n.recurseCount++ : t.push({ vnode: e, recurseCount: 0 });
			const o = e.component && e.component.parent;
			e = o && o.vnode;
		}
		return t;
	}
	function er(e) {
		const t = [];
		return (
			e.forEach((n, o) => {
				t.push(
					...(o === 0
						? []
						: [
								`
`,
						  ]),
					...tr(n)
				);
			}),
			t
		);
	}
	function tr({ vnode: e, recurseCount: t }) {
		const n = t > 0 ? `... (${t} recursive calls)` : "",
			o = e.component ? e.component.parent == null : !1,
			l = ` at <${Es(e.component, e.type, o)}`,
			s = ">" + n;
		return e.props ? [l, ...nr(e.props), s] : [l + s];
	}
	function nr(e) {
		const t = [],
			n = Object.keys(e);
		return (
			n.slice(0, 3).forEach((o) => {
				t.push(...Dl(o, e[o]));
			}),
			n.length > 3 && t.push(" ..."),
			t
		);
	}
	function Dl(e, t, n) {
		return Fe(t)
			? ((t = JSON.stringify(t)), n ? t : [`${e}=${t}`])
			: typeof t == "number" || typeof t == "boolean" || t == null
			? n
				? t
				: [`${e}=${t}`]
			: Ne(t)
			? ((t = Dl(e, ve(t.value), !0)), n ? t : [`${e}=Ref<`, t, ">"])
			: fe(t)
			? [`${e}=fn${t.name ? `<${t.name}>` : ""}`]
			: ((t = ve(t)), n ? t : [`${e}=`, t]);
	}
	function Ut(e, t, n, o) {
		try {
			return o ? e(...o) : e();
		} catch (l) {
			Vn(l, t, n);
		}
	}
	function at(e, t, n, o) {
		if (fe(e)) {
			const l = Ut(e, t, n, o);
			return (
				l &&
					Qo(l) &&
					l.catch((s) => {
						Vn(s, t, n);
					}),
				l
			);
		}
		if (le(e)) {
			const l = [];
			for (let s = 0; s < e.length; s++) l.push(at(e[s], t, n, o));
			return l;
		}
	}
	function Vn(e, t, n, o = !0) {
		const l = t ? t.vnode : null,
			{ errorHandler: s, throwUnhandledErrorInProduction: i } =
				(t && t.appContext.config) || ye;
		if (t) {
			let r = t.parent;
			const a = t.proxy,
				u = `https://vuejs.org/error-reference/#runtime-${n}`;
			for (; r; ) {
				const c = r.ec;
				if (c) {
					for (let f = 0; f < c.length; f++) if (c[f](e, a, u) === !1) return;
				}
				r = r.parent;
			}
			if (s) {
				st(), Ut(s, null, 10, [e, a, u]), it();
				return;
			}
		}
		or(e, n, l, o, i);
	}
	function or(e, t, n, o = !0, l = !1) {
		if (l) throw e;
		console.error(e);
	}
	const Ue = [];
	let ct = -1;
	const Wt = [];
	let kt = null,
		Kt = 0;
	const Tl = Promise.resolve();
	let Bn = null;
	function _t(e) {
		const t = Bn || Tl;
		return e ? t.then(this ? e.bind(this) : e) : t;
	}
	function lr(e) {
		let t = ct + 1,
			n = Ue.length;
		for (; t < n; ) {
			const o = (t + n) >>> 1,
				l = Ue[o],
				s = un(l);
			s < e || (s === e && l.flags & 2) ? (t = o + 1) : (n = o);
		}
		return t;
	}
	function $o(e) {
		if (!(e.flags & 1)) {
			const t = un(e),
				n = Ue[Ue.length - 1];
			!n || (!(e.flags & 2) && t >= un(n)) ? Ue.push(e) : Ue.splice(lr(t), 0, e),
				(e.flags |= 1),
				Nl();
		}
	}
	function Nl() {
		Bn || (Bn = Tl.then(Ol));
	}
	function sr(e) {
		le(e)
			? Wt.push(...e)
			: kt && e.id === -1
			? kt.splice(Kt + 1, 0, e)
			: e.flags & 1 || (Wt.push(e), (e.flags |= 1)),
			Nl();
	}
	function El(e, t, n = ct + 1) {
		for (; n < Ue.length; n++) {
			const o = Ue[n];
			if (o && o.flags & 2) {
				if (e && o.id !== e.uid) continue;
				Ue.splice(n, 1),
					n--,
					o.flags & 4 && (o.flags &= -2),
					o(),
					o.flags & 4 || (o.flags &= -2);
			}
		}
	}
	function Rl(e) {
		if (Wt.length) {
			const t = [...new Set(Wt)].sort((n, o) => un(n) - un(o));
			if (((Wt.length = 0), kt)) {
				kt.push(...t);
				return;
			}
			for (kt = t, Kt = 0; Kt < kt.length; Kt++) {
				const n = kt[Kt];
				n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), (n.flags &= -2);
			}
			(kt = null), (Kt = 0);
		}
	}
	const un = (e) => (e.id == null ? (e.flags & 2 ? -1 : 1 / 0) : e.id);
	function Ol(e) {
		try {
			for (ct = 0; ct < Ue.length; ct++) {
				const t = Ue[ct];
				t &&
					!(t.flags & 8) &&
					(t.flags & 4 && (t.flags &= -2),
					Ut(t, t.i, t.i ? 15 : 14),
					t.flags & 4 || (t.flags &= -2));
			}
		} finally {
			for (; ct < Ue.length; ct++) {
				const t = Ue[ct];
				t && (t.flags &= -2);
			}
			(ct = -1), (Ue.length = 0), Rl(), (Bn = null), (Ue.length || Wt.length) && Ol();
		}
	}
	let Me = null,
		Pl = null;
	function Hn(e) {
		const t = Me;
		return (Me = e), (Pl = (e && e.type.__scopeId) || null), t;
	}
	function Ot(e, t = Me, n) {
		if (!t || e._n) return e;
		const o = (...l) => {
			o._d && xs(-1);
			const s = Hn(t);
			let i;
			try {
				i = e(...l);
			} finally {
				Hn(s), o._d && xs(1);
			}
			return i;
		};
		return (o._n = !0), (o._c = !0), (o._d = !0), o;
	}
	function ot(e, t) {
		if (Me === null) return e;
		const n = Qn(Me),
			o = e.dirs || (e.dirs = []);
		for (let l = 0; l < t.length; l++) {
			let [s, i, r, a = ye] = t[l];
			s &&
				(fe(s) && (s = { mounted: s, updated: s }),
				s.deep && yt(i),
				o.push({ dir: s, instance: n, value: i, oldValue: void 0, arg: r, modifiers: a }));
		}
		return e;
	}
	function Pt(e, t, n, o) {
		const l = e.dirs,
			s = t && t.dirs;
		for (let i = 0; i < l.length; i++) {
			const r = l[i];
			s && (r.oldValue = s[i].value);
			let a = r.dir[o];
			a && (st(), at(a, n, 8, [e.el, r, e, t]), it());
		}
	}
	function Al(e, t) {
		if (qe) {
			let n = qe.provides;
			const o = qe.parent && qe.parent.provides;
			o === n && (n = qe.provides = Object.create(o)), (n[e] = t);
		}
	}
	function zt(e, t, n = !1) {
		const o = $s();
		if (o || Xt) {
			let l = Xt
				? Xt._context.provides
				: o
				? o.parent == null || o.ce
					? o.vnode.appContext && o.vnode.appContext.provides
					: o.parent.provides
				: void 0;
			if (l && e in l) return l[e];
			if (arguments.length > 1) return n && fe(t) ? t.call(o && o.proxy) : t;
		}
	}
	const ir = Symbol.for("v-scx"),
		rr = () => zt(ir);
	function ar(e, t) {
		return ko(e, null, { flush: "sync" });
	}
	function ze(e, t, n) {
		return ko(e, t, n);
	}
	function ko(e, t, n = ye) {
		const { immediate: o, deep: l, flush: s, once: i } = n,
			r = Pe({}, n),
			a = (t && o) || (!t && s !== "post");
		let u;
		if (_n) {
			if (s === "sync") {
				const v = rr();
				u = v.__watcherHandles || (v.__watcherHandles = []);
			} else if (!a) {
				const v = () => {};
				return (v.stop = lt), (v.resume = lt), (v.pause = lt), v;
			}
		}
		const c = qe;
		r.call = (v, b, w) => at(v, c, b, w);
		let f = !1;
		s === "post"
			? (r.scheduler = (v) => {
					He(v, c && c.suspense);
			  })
			: s !== "sync" &&
			  ((f = !0),
			  (r.scheduler = (v, b) => {
					b ? v() : $o(v);
			  })),
			(r.augmentJob = (v) => {
				t && (v.flags |= 4), f && ((v.flags |= 2), c && ((v.id = c.uid), (v.i = c)));
			});
		const h = Zi(e, t, r);
		return _n && (u ? u.push(h) : a && h()), h;
	}
	function cr(e, t, n) {
		const o = this.proxy,
			l = Fe(e) ? (e.includes(".") ? Ml(o, e) : () => o[e]) : e.bind(o, o);
		let s;
		fe(t) ? (s = t) : ((s = t.handler), (n = t));
		const i = yn(this),
			r = ko(l, s.bind(o), n);
		return i(), r;
	}
	function Ml(e, t) {
		const n = t.split(".");
		return () => {
			let o = e;
			for (let l = 0; l < n.length && o; l++) o = o[n[l]];
			return o;
		};
	}
	const Il = Symbol("_vte"),
		ur = (e) => e.__isTeleport,
		fn = (e) => e && (e.disabled || e.disabled === ""),
		Ll = (e) => e && (e.defer || e.defer === ""),
		jl = (e) => typeof SVGElement < "u" && e instanceof SVGElement,
		Vl = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement,
		Fo = (e, t) => {
			const n = e && e.to;
			return Fe(n) ? (t ? t(n) : null) : n;
		},
		Bl = {
			name: "Teleport",
			__isTeleport: !0,
			process(e, t, n, o, l, s, i, r, a, u) {
				const {
						mc: c,
						pc: f,
						pbc: h,
						o: { insert: v, querySelector: b, createText: w, createComment: D },
					} = u,
					S = fn(t.props);
				let { shapeFlag: N, children: j, dynamicChildren: O } = t;
				if (e == null) {
					const x = (t.el = w("")),
						E = (t.anchor = w(""));
					v(x, n, o), v(E, n, o);
					const L = (B, K) => {
							N & 16 && c(j, B, K, l, s, i, r, a);
						},
						H = () => {
							const B = (t.target = Fo(t.props, b)),
								K = Do(B, t, w, v);
							B &&
								(i !== "svg" && jl(B)
									? (i = "svg")
									: i !== "mathml" && Vl(B) && (i = "mathml"),
								l &&
									l.isCE &&
									(
										l.ce._teleportTargets ||
										(l.ce._teleportTargets = new Set())
									).add(B),
								S || (L(B, K), Un(t, !1)));
						};
					S && (L(n, E), Un(t, !0)),
						Ll(t.props)
							? ((t.el.__isMounted = !1),
							  He(() => {
									H(), delete t.el.__isMounted;
							  }, s))
							: H();
				} else {
					if (Ll(t.props) && e.el.__isMounted === !1) {
						He(() => {
							Bl.process(e, t, n, o, l, s, i, r, a, u);
						}, s);
						return;
					}
					(t.el = e.el), (t.targetStart = e.targetStart);
					const x = (t.anchor = e.anchor),
						E = (t.target = e.target),
						L = (t.targetAnchor = e.targetAnchor),
						H = fn(e.props),
						B = H ? n : E,
						K = H ? x : L;
					if (
						(i === "svg" || jl(E)
							? (i = "svg")
							: (i === "mathml" || Vl(E)) && (i = "mathml"),
						O
							? (h(e.dynamicChildren, O, B, l, s, i, r), Vo(e, t, !0))
							: a || f(e, t, B, K, l, s, i, r, !1),
						S)
					)
						H
							? t.props &&
							  e.props &&
							  t.props.to !== e.props.to &&
							  (t.props.to = e.props.to)
							: qn(t, n, x, u, 1);
					else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
						const oe = (t.target = Fo(t.props, b));
						oe && qn(t, oe, null, u, 0);
					} else H && qn(t, E, L, u, 1);
					Un(t, S);
				}
			},
			remove(e, t, n, { um: o, o: { remove: l } }, s) {
				const {
					shapeFlag: i,
					children: r,
					anchor: a,
					targetStart: u,
					targetAnchor: c,
					target: f,
					props: h,
				} = e;
				if ((f && (l(u), l(c)), s && l(a), i & 16)) {
					const v = s || !fn(h);
					for (let b = 0; b < r.length; b++) {
						const w = r[b];
						o(w, t, n, v, !!w.dynamicChildren);
					}
				}
			},
			move: qn,
			hydrate: fr,
		};
	function qn(e, t, n, { o: { insert: o }, m: l }, s = 2) {
		s === 0 && o(e.targetAnchor, t, n);
		const { el: i, anchor: r, shapeFlag: a, children: u, props: c } = e,
			f = s === 2;
		if ((f && o(i, t, n), (!f || fn(c)) && a & 16))
			for (let h = 0; h < u.length; h++) l(u[h], t, n, 2);
		f && o(r, t, n);
	}
	function fr(
		e,
		t,
		n,
		o,
		l,
		s,
		{ o: { nextSibling: i, parentNode: r, querySelector: a, insert: u, createText: c } },
		f
	) {
		function h(D, S) {
			let N = S;
			for (; N; ) {
				if (N && N.nodeType === 8) {
					if (N.data === "teleport start anchor") t.targetStart = N;
					else if (N.data === "teleport anchor") {
						(t.targetAnchor = N), (D._lpa = t.targetAnchor && i(t.targetAnchor));
						break;
					}
				}
				N = i(N);
			}
		}
		function v(D, S) {
			S.anchor = f(i(D), S, r(D), n, o, l, s);
		}
		const b = (t.target = Fo(t.props, a)),
			w = fn(t.props);
		if (b) {
			const D = b._lpa || b.firstChild;
			t.shapeFlag & 16 &&
				(w
					? (v(e, t), h(b, D), t.targetAnchor || Do(b, t, c, u, r(e) === b ? e : null))
					: ((t.anchor = i(e)),
					  h(b, D),
					  t.targetAnchor || Do(b, t, c, u),
					  f(D && i(D), t, b, n, o, l, s))),
				Un(t, w);
		} else w && t.shapeFlag & 16 && (v(e, t), (t.targetStart = e), (t.targetAnchor = i(e)));
		return t.anchor && i(t.anchor);
	}
	const Hl = Bl;
	function Un(e, t) {
		const n = e.ctx;
		if (n && n.ut) {
			let o, l;
			for (
				t ? ((o = e.el), (l = e.anchor)) : ((o = e.targetStart), (l = e.targetAnchor));
				o && o !== l;

			)
				o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), (o = o.nextSibling);
			n.ut();
		}
	}
	function Do(e, t, n, o, l = null) {
		const s = (t.targetStart = n("")),
			i = (t.targetAnchor = n(""));
		return (s[Il] = i), e && (o(s, e, l), o(i, e, l)), i;
	}
	const dr = Symbol("_leaveCb");
	function To(e, t) {
		e.shapeFlag & 6 && e.component
			? ((e.transition = t), To(e.component.subTree, t))
			: e.shapeFlag & 128
			? ((e.ssContent.transition = t.clone(e.ssContent)),
			  (e.ssFallback.transition = t.clone(e.ssFallback)))
			: (e.transition = t);
	}
	function ql(e) {
		e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
	}
	function Ul(e, t) {
		let n;
		return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
	}
	const Wn = new WeakMap();
	function dn(e, t, n, o, l = !1) {
		if (le(e)) {
			e.forEach((w, D) => dn(w, t && (le(t) ? t[D] : t), n, o, l));
			return;
		}
		if (Yt(o) && !l) {
			o.shapeFlag & 512 &&
				o.type.__asyncResolved &&
				o.component.subTree.component &&
				dn(e, t, n, o.component.subTree);
			return;
		}
		const s = o.shapeFlag & 4 ? Qn(o.component) : o.el,
			i = l ? null : s,
			{ i: r, r: a } = e,
			u = t && t.r,
			c = r.refs === ye ? (r.refs = {}) : r.refs,
			f = r.setupState,
			h = ve(f),
			v = f === ye ? Go : (w) => (Ul(c, w) ? !1 : _e(h, w)),
			b = (w, D) => !(D && Ul(c, D));
		if (u != null && u !== a) {
			if ((Wl(t), Fe(u))) (c[u] = null), v(u) && (f[u] = null);
			else if (Ne(u)) {
				const w = t;
				b(u, w.k) && (u.value = null), w.k && (c[w.k] = null);
			}
		}
		if (fe(a)) Ut(a, r, 12, [i, c]);
		else {
			const w = Fe(a),
				D = Ne(a);
			if (w || D) {
				const S = () => {
					if (e.f) {
						const N = w ? (v(a) ? f[a] : c[a]) : b() || !e.k ? a.value : c[e.k];
						if (l) le(N) && co(N, s);
						else if (le(N)) N.includes(s) || N.push(s);
						else if (w) (c[a] = [s]), v(a) && (f[a] = c[a]);
						else {
							const j = [s];
							b(a, e.k) && (a.value = j), e.k && (c[e.k] = j);
						}
					} else
						w
							? ((c[a] = i), v(a) && (f[a] = i))
							: D && (b(a, e.k) && (a.value = i), e.k && (c[e.k] = i));
				};
				if (i) {
					const N = () => {
						S(), Wn.delete(e);
					};
					(N.id = -1), Wn.set(e, N), He(N, n);
				} else Wl(e), S();
			}
		}
	}
	function Wl(e) {
		const t = Wn.get(e);
		t && ((t.flags |= 8), Wn.delete(e));
	}
	Dn().requestIdleCallback, Dn().cancelIdleCallback;
	const Yt = (e) => !!e.type.__asyncLoader,
		Kl = (e) => e.type.__isKeepAlive;
	function pr(e, t) {
		zl(e, "a", t);
	}
	function mr(e, t) {
		zl(e, "da", t);
	}
	function zl(e, t, n = qe) {
		const o =
			e.__wdc ||
			(e.__wdc = () => {
				let l = n;
				for (; l; ) {
					if (l.isDeactivated) return;
					l = l.parent;
				}
				return e();
			});
		if ((Kn(t, o, n), n)) {
			let l = n.parent;
			for (; l && l.parent; ) Kl(l.parent.vnode) && hr(o, t, n, l), (l = l.parent);
		}
	}
	function hr(e, t, n, o) {
		const l = Kn(t, e, o, !0);
		Jt(() => {
			co(o[t], l);
		}, n);
	}
	function Kn(e, t, n = qe, o = !1) {
		if (n) {
			const l = n[e] || (n[e] = []),
				s =
					t.__weh ||
					(t.__weh = (...i) => {
						st();
						const r = yn(n),
							a = at(t, n, e, i);
						return r(), it(), a;
					});
			return o ? l.unshift(s) : l.push(s), s;
		}
	}
	const bt =
			(e) =>
			(t, n = qe) => {
				(!_n || e === "sp") && Kn(e, (...o) => t(...o), n);
			},
		gr = bt("bm"),
		At = bt("m"),
		vr = bt("bu"),
		yr = bt("u"),
		No = bt("bum"),
		Jt = bt("um"),
		_r = bt("sp"),
		br = bt("rtg"),
		wr = bt("rtc");
	function xr(e, t = qe) {
		Kn("ec", e, t);
	}
	const Cr = "components",
		Yl = Symbol.for("v-ndc");
	function Sr(e) {
		return Fe(e) ? $r(Cr, e, !1) || e : e || Yl;
	}
	function $r(e, t, n = !0, o = !1) {
		const l = Me || qe;
		if (l) {
			const s = l.type;
			{
				const r = Ns(s, !1);
				if (r && (r === t || r === Le(t) || r === $n(Le(t)))) return s;
			}
			const i = Jl(l[e] || s[e], t) || Jl(l.appContext[e], t);
			return !i && o ? s : i;
		}
	}
	function Jl(e, t) {
		return e && (e[t] || e[Le(t)] || e[$n(Le(t))]);
	}
	function be(e, t, n, o) {
		let l;
		const s = n,
			i = le(e);
		if (i || Fe(e)) {
			const r = i && Et(e);
			let a = !1,
				u = !1;
			r && ((a = !Je(e)), (u = vt(e)), (e = En(e))), (l = new Array(e.length));
			for (let c = 0, f = e.length; c < f; c++)
				l[c] = t(a ? (u ? qt(nt(e[c])) : nt(e[c])) : e[c], c, void 0, s);
		} else if (typeof e == "number") {
			l = new Array(e);
			for (let r = 0; r < e; r++) l[r] = t(r + 1, r, void 0, s);
		} else if (xe(e))
			if (e[Symbol.iterator]) l = Array.from(e, (r, a) => t(r, a, void 0, s));
			else {
				const r = Object.keys(e);
				l = new Array(r.length);
				for (let a = 0, u = r.length; a < u; a++) {
					const c = r[a];
					l[a] = t(e[c], c, a, s);
				}
			}
		else l = [];
		return l;
	}
	function Eo(e, t, n = {}, o, l) {
		if (Me.ce || (Me.parent && Yt(Me.parent) && Me.parent.ce)) {
			const u = Object.keys(n).length > 0;
			return (
				t !== "default" && (n.name = t), _(), Te(ce, null, [Oe("slot", n, o)], u ? -2 : 64)
			);
		}
		let s = e[t];
		s && s._c && (s._d = !1), _();
		const i = s && Xl(s(n)),
			r = n.key || (i && i.key),
			a = Te(
				ce,
				{ key: (r && !et(r) ? r : `_${t}`) + (!i && o ? "_fb" : "") },
				i || [],
				i && e._ === 1 ? 64 : -2
			);
		return s && s._c && (s._d = !0), a;
	}
	function Xl(e) {
		return e.some((t) => (Ho(t) ? !(t.type === wt || (t.type === ce && !Xl(t.children))) : !0))
			? e
			: null;
	}
	const Ro = (e) => (e ? (Fs(e) ? Qn(e) : Ro(e.parent)) : null),
		pn = Pe(Object.create(null), {
			$: (e) => e,
			$el: (e) => e.vnode.el,
			$data: (e) => e.data,
			$props: (e) => e.props,
			$attrs: (e) => e.attrs,
			$slots: (e) => e.slots,
			$refs: (e) => e.refs,
			$parent: (e) => Ro(e.parent),
			$root: (e) => Ro(e.root),
			$host: (e) => e.ce,
			$emit: (e) => e.emit,
			$options: (e) => es(e),
			$forceUpdate: (e) =>
				e.f ||
				(e.f = () => {
					$o(e.update);
				}),
			$nextTick: (e) => e.n || (e.n = _t.bind(e.proxy)),
			$watch: (e) => cr.bind(e),
		}),
		Oo = (e, t) => e !== ye && !e.__isScriptSetup && _e(e, t),
		kr = {
			get({ _: e }, t) {
				if (t === "__v_skip") return !0;
				const {
					ctx: n,
					setupState: o,
					data: l,
					props: s,
					accessCache: i,
					type: r,
					appContext: a,
				} = e;
				if (t[0] !== "$") {
					const h = i[t];
					if (h !== void 0)
						switch (h) {
							case 1:
								return o[t];
							case 2:
								return l[t];
							case 4:
								return n[t];
							case 3:
								return s[t];
						}
					else {
						if (Oo(o, t)) return (i[t] = 1), o[t];
						if (l !== ye && _e(l, t)) return (i[t] = 2), l[t];
						if (_e(s, t)) return (i[t] = 3), s[t];
						if (n !== ye && _e(n, t)) return (i[t] = 4), n[t];
						Po && (i[t] = 0);
					}
				}
				const u = pn[t];
				let c, f;
				if (u) return t === "$attrs" && Be(e.attrs, "get", ""), u(e);
				if ((c = r.__cssModules) && (c = c[t])) return c;
				if (n !== ye && _e(n, t)) return (i[t] = 4), n[t];
				if (((f = a.config.globalProperties), _e(f, t))) return f[t];
			},
			set({ _: e }, t, n) {
				const { data: o, setupState: l, ctx: s } = e;
				return Oo(l, t)
					? ((l[t] = n), !0)
					: o !== ye && _e(o, t)
					? ((o[t] = n), !0)
					: _e(e.props, t) || (t[0] === "$" && t.slice(1) in e)
					? !1
					: ((s[t] = n), !0);
			},
			has(
				{
					_: {
						data: e,
						setupState: t,
						accessCache: n,
						ctx: o,
						appContext: l,
						props: s,
						type: i,
					},
				},
				r
			) {
				let a;
				return !!(
					n[r] ||
					(e !== ye && r[0] !== "$" && _e(e, r)) ||
					Oo(t, r) ||
					_e(s, r) ||
					_e(o, r) ||
					_e(pn, r) ||
					_e(l.config.globalProperties, r) ||
					((a = i.__cssModules) && a[r])
				);
			},
			defineProperty(e, t, n) {
				return (
					n.get != null
						? (e._.accessCache[t] = 0)
						: _e(n, "value") && this.set(e, t, n.value, null),
					Reflect.defineProperty(e, t, n)
				);
			},
		};
	function zn(e) {
		return le(e) ? e.reduce((t, n) => ((t[n] = null), t), {}) : e;
	}
	function Gl(e, t) {
		return !e || !t ? e || t : le(e) && le(t) ? e.concat(t) : Pe({}, zn(e), zn(t));
	}
	let Po = !0;
	function Fr(e) {
		const t = es(e),
			n = e.proxy,
			o = e.ctx;
		(Po = !1), t.beforeCreate && Zl(t.beforeCreate, e, "bc");
		const {
			data: l,
			computed: s,
			methods: i,
			watch: r,
			provide: a,
			inject: u,
			created: c,
			beforeMount: f,
			mounted: h,
			beforeUpdate: v,
			updated: b,
			activated: w,
			deactivated: D,
			beforeDestroy: S,
			beforeUnmount: N,
			destroyed: j,
			unmounted: O,
			render: x,
			renderTracked: E,
			renderTriggered: L,
			errorCaptured: H,
			serverPrefetch: B,
			expose: K,
			inheritAttrs: oe,
			components: pe,
			directives: Q,
			filters: Z,
		} = t;
		if ((u && Dr(u, o, null), i))
			for (const ie in i) {
				const ne = i[ie];
				fe(ne) && (o[ie] = ne.bind(n));
			}
		if (l) {
			const ie = l.call(n, n);
			xe(ie) && (e.data = Ae(ie));
		}
		if (((Po = !0), s))
			for (const ie in s) {
				const ne = s[ie],
					Ce = fe(ne) ? ne.bind(n, n) : fe(ne.get) ? ne.get.bind(n, n) : lt,
					ke = !fe(ne) && fe(ne.set) ? ne.set.bind(n) : lt,
					Ye = de({ get: Ce, set: ke });
				Object.defineProperty(o, ie, {
					enumerable: !0,
					configurable: !0,
					get: () => Ye.value,
					set: (Ie) => (Ye.value = Ie),
				});
			}
		if (r) for (const ie in r) Ql(r[ie], o, n, ie);
		if (a) {
			const ie = fe(a) ? a.call(n) : a;
			Reflect.ownKeys(ie).forEach((ne) => {
				Al(ne, ie[ne]);
			});
		}
		c && Zl(c, e, "c");
		function se(ie, ne) {
			le(ne) ? ne.forEach((Ce) => ie(Ce.bind(n))) : ne && ie(ne.bind(n));
		}
		if (
			(se(gr, f),
			se(At, h),
			se(vr, v),
			se(yr, b),
			se(pr, w),
			se(mr, D),
			se(xr, H),
			se(wr, E),
			se(br, L),
			se(No, N),
			se(Jt, O),
			se(_r, B),
			le(K))
		)
			if (K.length) {
				const ie = e.exposed || (e.exposed = {});
				K.forEach((ne) => {
					Object.defineProperty(ie, ne, {
						get: () => n[ne],
						set: (Ce) => (n[ne] = Ce),
						enumerable: !0,
					});
				});
			} else e.exposed || (e.exposed = {});
		x && e.render === lt && (e.render = x),
			oe != null && (e.inheritAttrs = oe),
			pe && (e.components = pe),
			Q && (e.directives = Q),
			B && ql(e);
	}
	function Dr(e, t, n = lt) {
		le(e) && (e = Ao(e));
		for (const o in e) {
			const l = e[o];
			let s;
			xe(l)
				? "default" in l
					? (s = zt(l.from || o, l.default, !0))
					: (s = zt(l.from || o))
				: (s = zt(l)),
				Ne(s)
					? Object.defineProperty(t, o, {
							enumerable: !0,
							configurable: !0,
							get: () => s.value,
							set: (i) => (s.value = i),
					  })
					: (t[o] = s);
		}
	}
	function Zl(e, t, n) {
		at(le(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy), t, n);
	}
	function Ql(e, t, n, o) {
		let l = o.includes(".") ? Ml(n, o) : () => n[o];
		if (Fe(e)) {
			const s = t[e];
			fe(s) && ze(l, s);
		} else if (fe(e)) ze(l, e.bind(n));
		else if (xe(e))
			if (le(e)) e.forEach((s) => Ql(s, t, n, o));
			else {
				const s = fe(e.handler) ? e.handler.bind(n) : t[e.handler];
				fe(s) && ze(l, s, e);
			}
	}
	function es(e) {
		const t = e.type,
			{ mixins: n, extends: o } = t,
			{
				mixins: l,
				optionsCache: s,
				config: { optionMergeStrategies: i },
			} = e.appContext,
			r = s.get(t);
		let a;
		return (
			r
				? (a = r)
				: !l.length && !n && !o
				? (a = t)
				: ((a = {}), l.length && l.forEach((u) => Yn(a, u, i, !0)), Yn(a, t, i)),
			xe(t) && s.set(t, a),
			a
		);
	}
	function Yn(e, t, n, o = !1) {
		const { mixins: l, extends: s } = t;
		s && Yn(e, s, n, !0), l && l.forEach((i) => Yn(e, i, n, !0));
		for (const i in t)
			if (!(o && i === "expose")) {
				const r = Tr[i] || (n && n[i]);
				e[i] = r ? r(e[i], t[i]) : t[i];
			}
		return e;
	}
	const Tr = {
		data: ts,
		props: ns,
		emits: ns,
		methods: mn,
		computed: mn,
		beforeCreate: We,
		created: We,
		beforeMount: We,
		mounted: We,
		beforeUpdate: We,
		updated: We,
		beforeDestroy: We,
		beforeUnmount: We,
		destroyed: We,
		unmounted: We,
		activated: We,
		deactivated: We,
		errorCaptured: We,
		serverPrefetch: We,
		components: mn,
		directives: mn,
		watch: Er,
		provide: ts,
		inject: Nr,
	};
	function ts(e, t) {
		return t
			? e
				? function () {
						return Pe(fe(e) ? e.call(this, this) : e, fe(t) ? t.call(this, this) : t);
				  }
				: t
			: e;
	}
	function Nr(e, t) {
		return mn(Ao(e), Ao(t));
	}
	function Ao(e) {
		if (le(e)) {
			const t = {};
			for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
			return t;
		}
		return e;
	}
	function We(e, t) {
		return e ? [...new Set([].concat(e, t))] : t;
	}
	function mn(e, t) {
		return e ? Pe(Object.create(null), e, t) : t;
	}
	function ns(e, t) {
		return e
			? le(e) && le(t)
				? [...new Set([...e, ...t])]
				: Pe(Object.create(null), zn(e), zn(t ?? {}))
			: t;
	}
	function Er(e, t) {
		if (!e) return t;
		if (!t) return e;
		const n = Pe(Object.create(null), e);
		for (const o in t) n[o] = We(e[o], t[o]);
		return n;
	}
	function os() {
		return {
			app: null,
			config: {
				isNativeTag: Go,
				performance: !1,
				globalProperties: {},
				optionMergeStrategies: {},
				errorHandler: void 0,
				warnHandler: void 0,
				compilerOptions: {},
			},
			mixins: [],
			components: {},
			directives: {},
			provides: Object.create(null),
			optionsCache: new WeakMap(),
			propsCache: new WeakMap(),
			emitsCache: new WeakMap(),
		};
	}
	let Rr = 0;
	function Or(e, t) {
		return function (o, l = null) {
			fe(o) || (o = Pe({}, o)), l != null && !xe(l) && (l = null);
			const s = os(),
				i = new WeakSet(),
				r = [];
			let a = !1;
			const u = (s.app = {
				_uid: Rr++,
				_component: o,
				_props: l,
				_container: null,
				_context: s,
				_instance: null,
				version: da,
				get config() {
					return s.config;
				},
				set config(c) {},
				use(c, ...f) {
					return (
						i.has(c) ||
							(c && fe(c.install)
								? (i.add(c), c.install(u, ...f))
								: fe(c) && (i.add(c), c(u, ...f))),
						u
					);
				},
				mixin(c) {
					return s.mixins.includes(c) || s.mixins.push(c), u;
				},
				component(c, f) {
					return f ? ((s.components[c] = f), u) : s.components[c];
				},
				directive(c, f) {
					return f ? ((s.directives[c] = f), u) : s.directives[c];
				},
				mount(c, f, h) {
					if (!a) {
						const v = u._ceVNode || Oe(o, l);
						return (
							(v.appContext = s),
							h === !0 ? (h = "svg") : h === !1 && (h = void 0),
							e(v, c, h),
							(a = !0),
							(u._container = c),
							(c.__vue_app__ = u),
							Qn(v.component)
						);
					}
				},
				onUnmount(c) {
					r.push(c);
				},
				unmount() {
					a &&
						(at(r, u._instance, 16),
						e(null, u._container),
						delete u._container.__vue_app__);
				},
				provide(c, f) {
					return (s.provides[c] = f), u;
				},
				runWithContext(c) {
					const f = Xt;
					Xt = u;
					try {
						return c();
					} finally {
						Xt = f;
					}
				},
			});
			return u;
		};
	}
	let Xt = null;
	function Pr(e, t, n = ye) {
		const o = $s(),
			l = Le(t),
			s = mt(t),
			i = ls(e, l),
			r = Wi((a, u) => {
				let c,
					f = ye,
					h;
				return (
					ar(() => {
						const v = e[l];
						je(c, v) && ((c = v), u());
					}),
					{
						get() {
							return a(), n.get ? n.get(c) : c;
						},
						set(v) {
							const b = n.set ? n.set(v) : v;
							if (!je(b, c) && !(f !== ye && je(v, f))) return;
							const w = o.vnode.props;
							(w &&
								(t in w || l in w || s in w) &&
								(`onUpdate:${t}` in w ||
									`onUpdate:${l}` in w ||
									`onUpdate:${s}` in w)) ||
								((c = v), u()),
								o.emit(`update:${t}`, b),
								je(v, b) && je(v, f) && !je(b, h) && u(),
								(f = v),
								(h = b);
						},
					}
				);
			});
		return (
			(r[Symbol.iterator] = () => {
				let a = 0;
				return {
					next() {
						return a < 2 ? { value: a++ ? i || ye : r, done: !1 } : { done: !0 };
					},
				};
			}),
			r
		);
	}
	const ls = (e, t) =>
		t === "modelValue" || t === "model-value"
			? e.modelModifiers
			: e[`${t}Modifiers`] || e[`${Le(t)}Modifiers`] || e[`${mt(t)}Modifiers`];
	function Ar(e, t, ...n) {
		if (e.isUnmounted) return;
		const o = e.vnode.props || ye;
		let l = n;
		const s = t.startsWith("update:"),
			i = s && ls(o, t.slice(7));
		i && (i.trim && (l = n.map((c) => (Fe(c) ? c.trim() : c))), i.number && (l = n.map(Fn)));
		let r,
			a = o[(r = uo(t))] || o[(r = uo(Le(t)))];
		!a && s && (a = o[(r = uo(mt(t)))]), a && at(a, e, 6, l);
		const u = o[r + "Once"];
		if (u) {
			if (!e.emitted) e.emitted = {};
			else if (e.emitted[r]) return;
			(e.emitted[r] = !0), at(u, e, 6, l);
		}
	}
	const Mr = new WeakMap();
	function ss(e, t, n = !1) {
		const o = n ? Mr : t.emitsCache,
			l = o.get(e);
		if (l !== void 0) return l;
		const s = e.emits;
		let i = {},
			r = !1;
		if (!fe(e)) {
			const a = (u) => {
				const c = ss(u, t, !0);
				c && ((r = !0), Pe(i, c));
			};
			!n && t.mixins.length && t.mixins.forEach(a),
				e.extends && a(e.extends),
				e.mixins && e.mixins.forEach(a);
		}
		return !s && !r
			? (xe(e) && o.set(e, null), null)
			: (le(s) ? s.forEach((a) => (i[a] = null)) : Pe(i, s), xe(e) && o.set(e, i), i);
	}
	function Jn(e, t) {
		return !e || !xn(t)
			? !1
			: ((t = t.slice(2).replace(/Once$/, "")),
			  _e(e, t[0].toLowerCase() + t.slice(1)) || _e(e, mt(t)) || _e(e, t));
	}
	function kd() {}
	function is(e) {
		const {
				type: t,
				vnode: n,
				proxy: o,
				withProxy: l,
				propsOptions: [s],
				slots: i,
				attrs: r,
				emit: a,
				render: u,
				renderCache: c,
				props: f,
				data: h,
				setupState: v,
				ctx: b,
				inheritAttrs: w,
			} = e,
			D = Hn(e);
		let S, N;
		try {
			if (n.shapeFlag & 4) {
				const O = l || o,
					x = O;
				(S = ut(u.call(x, O, c, f, v, h, b))), (N = r);
			} else {
				const O = t;
				(S = ut(O.length > 1 ? O(f, { attrs: r, slots: i, emit: a }) : O(f, null))),
					(N = t.props ? r : Ir(r));
			}
		} catch (O) {
			(hn.length = 0), Vn(O, e, 1), (S = Oe(wt));
		}
		let j = S;
		if (N && w !== !1) {
			const O = Object.keys(N),
				{ shapeFlag: x } = j;
			O.length && x & 7 && (s && O.some(ao) && (N = Lr(N, s)), (j = Gt(j, N, !1, !0)));
		}
		return (
			n.dirs &&
				((j = Gt(j, null, !1, !0)), (j.dirs = j.dirs ? j.dirs.concat(n.dirs) : n.dirs)),
			n.transition && To(j, n.transition),
			(S = j),
			Hn(D),
			S
		);
	}
	const Ir = (e) => {
			let t;
			for (const n in e)
				(n === "class" || n === "style" || xn(n)) && ((t || (t = {}))[n] = e[n]);
			return t;
		},
		Lr = (e, t) => {
			const n = {};
			for (const o in e) (!ao(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
			return n;
		};
	function jr(e, t, n) {
		const { props: o, children: l, component: s } = e,
			{ props: i, children: r, patchFlag: a } = t,
			u = s.emitsOptions;
		if (t.dirs || t.transition) return !0;
		if (n && a >= 0) {
			if (a & 1024) return !0;
			if (a & 16) return o ? rs(o, i, u) : !!i;
			if (a & 8) {
				const c = t.dynamicProps;
				for (let f = 0; f < c.length; f++) {
					const h = c[f];
					if (as(i, o, h) && !Jn(u, h)) return !0;
				}
			}
		} else
			return (l || r) && (!r || !r.$stable)
				? !0
				: o === i
				? !1
				: o
				? i
					? rs(o, i, u)
					: !0
				: !!i;
		return !1;
	}
	function rs(e, t, n) {
		const o = Object.keys(t);
		if (o.length !== Object.keys(e).length) return !0;
		for (let l = 0; l < o.length; l++) {
			const s = o[l];
			if (as(t, e, s) && !Jn(n, s)) return !0;
		}
		return !1;
	}
	function as(e, t, n) {
		const o = e[n],
			l = t[n];
		return n === "style" && xe(o) && xe(l) ? !Bt(o, l) : o !== l;
	}
	function Vr({ vnode: e, parent: t }, n) {
		for (; t; ) {
			const o = t.subTree;
			if ((o.suspense && o.suspense.activeBranch === e && (o.el = e.el), o === e))
				((e = t.vnode).el = n), (t = t.parent);
			else break;
		}
	}
	const cs = {},
		us = () => Object.create(cs),
		fs = (e) => Object.getPrototypeOf(e) === cs;
	function Br(e, t, n, o = !1) {
		const l = {},
			s = us();
		(e.propsDefaults = Object.create(null)), ds(e, t, l, s);
		for (const i in e.propsOptions[0]) i in l || (l[i] = void 0);
		n ? (e.props = o ? l : Vi(l)) : e.type.props ? (e.props = l) : (e.props = s),
			(e.attrs = s);
	}
	function Hr(e, t, n, o) {
		const {
				props: l,
				attrs: s,
				vnode: { patchFlag: i },
			} = e,
			r = ve(l),
			[a] = e.propsOptions;
		let u = !1;
		if ((o || i > 0) && !(i & 16)) {
			if (i & 8) {
				const c = e.vnode.dynamicProps;
				for (let f = 0; f < c.length; f++) {
					let h = c[f];
					if (Jn(e.emitsOptions, h)) continue;
					const v = t[h];
					if (a)
						if (_e(s, h)) v !== s[h] && ((s[h] = v), (u = !0));
						else {
							const b = Le(h);
							l[b] = Mo(a, r, b, v, e, !1);
						}
					else v !== s[h] && ((s[h] = v), (u = !0));
				}
			}
		} else {
			ds(e, t, l, s) && (u = !0);
			let c;
			for (const f in r)
				(!t || (!_e(t, f) && ((c = mt(f)) === f || !_e(t, c)))) &&
					(a
						? n &&
						  (n[f] !== void 0 || n[c] !== void 0) &&
						  (l[f] = Mo(a, r, f, void 0, e, !0))
						: delete l[f]);
			if (s !== r) for (const f in s) (!t || !_e(t, f)) && (delete s[f], (u = !0));
		}
		u && ht(e.attrs, "set", "");
	}
	function ds(e, t, n, o) {
		const [l, s] = e.propsOptions;
		let i = !1,
			r;
		if (t)
			for (let a in t) {
				if (nn(a)) continue;
				const u = t[a];
				let c;
				l && _e(l, (c = Le(a)))
					? !s || !s.includes(c)
						? (n[c] = u)
						: ((r || (r = {}))[c] = u)
					: Jn(e.emitsOptions, a) ||
					  ((!(a in o) || u !== o[a]) && ((o[a] = u), (i = !0)));
			}
		if (s) {
			const a = ve(n),
				u = r || ye;
			for (let c = 0; c < s.length; c++) {
				const f = s[c];
				n[f] = Mo(l, a, f, u[f], e, !_e(u, f));
			}
		}
		return i;
	}
	function Mo(e, t, n, o, l, s) {
		const i = e[n];
		if (i != null) {
			const r = _e(i, "default");
			if (r && o === void 0) {
				const a = i.default;
				if (i.type !== Function && !i.skipFactory && fe(a)) {
					const { propsDefaults: u } = l;
					if (n in u) o = u[n];
					else {
						const c = yn(l);
						(o = u[n] = a.call(null, t)), c();
					}
				} else o = a;
				l.ce && l.ce._setProp(n, o);
			}
			i[0] && (s && !r ? (o = !1) : i[1] && (o === "" || o === mt(n)) && (o = !0));
		}
		return o;
	}
	const qr = new WeakMap();
	function ps(e, t, n = !1) {
		const o = n ? qr : t.propsCache,
			l = o.get(e);
		if (l) return l;
		const s = e.props,
			i = {},
			r = [];
		let a = !1;
		if (!fe(e)) {
			const c = (f) => {
				a = !0;
				const [h, v] = ps(f, t, !0);
				Pe(i, h), v && r.push(...v);
			};
			!n && t.mixins.length && t.mixins.forEach(c),
				e.extends && c(e.extends),
				e.mixins && e.mixins.forEach(c);
		}
		if (!s && !a) return xe(e) && o.set(e, Lt), Lt;
		if (le(s))
			for (let c = 0; c < s.length; c++) {
				const f = Le(s[c]);
				ms(f) && (i[f] = ye);
			}
		else if (s)
			for (const c in s) {
				const f = Le(c);
				if (ms(f)) {
					const h = s[c],
						v = (i[f] = le(h) || fe(h) ? { type: h } : Pe({}, h)),
						b = v.type;
					let w = !1,
						D = !0;
					if (le(b))
						for (let S = 0; S < b.length; ++S) {
							const N = b[S],
								j = fe(N) && N.name;
							if (j === "Boolean") {
								w = !0;
								break;
							} else j === "String" && (D = !1);
						}
					else w = fe(b) && b.name === "Boolean";
					(v[0] = w), (v[1] = D), (w || _e(v, "default")) && r.push(f);
				}
			}
		const u = [i, r];
		return xe(e) && o.set(e, u), u;
	}
	function ms(e) {
		return e[0] !== "$" && !nn(e);
	}
	const Io = (e) => e === "_" || e === "_ctx" || e === "$stable",
		Lo = (e) => (le(e) ? e.map(ut) : [ut(e)]),
		Ur = (e, t, n) => {
			if (t._n) return t;
			const o = Ot((...l) => Lo(t(...l)), n);
			return (o._c = !1), o;
		},
		hs = (e, t, n) => {
			const o = e._ctx;
			for (const l in e) {
				if (Io(l)) continue;
				const s = e[l];
				if (fe(s)) t[l] = Ur(l, s, o);
				else if (s != null) {
					const i = Lo(s);
					t[l] = () => i;
				}
			}
		},
		gs = (e, t) => {
			const n = Lo(t);
			e.slots.default = () => n;
		},
		vs = (e, t, n) => {
			for (const o in t) (n || !Io(o)) && (e[o] = t[o]);
		},
		Wr = (e, t, n) => {
			const o = (e.slots = us());
			if (e.vnode.shapeFlag & 32) {
				const l = t._;
				l ? (vs(o, t, n), n && nl(o, "_", l, !0)) : hs(t, o);
			} else t && gs(e, t);
		},
		Kr = (e, t, n) => {
			const { vnode: o, slots: l } = e;
			let s = !0,
				i = ye;
			if (o.shapeFlag & 32) {
				const r = t._;
				r ? (n && r === 1 ? (s = !1) : vs(l, t, n)) : ((s = !t.$stable), hs(t, l)),
					(i = t);
			} else t && (gs(e, t), (i = { default: 1 }));
			if (s) for (const r in l) !Io(r) && i[r] == null && delete l[r];
		},
		He = Gr;
	function zr(e) {
		return Yr(e);
	}
	function Yr(e, t) {
		const n = Dn();
		n.__VUE__ = !0;
		const {
				insert: o,
				remove: l,
				patchProp: s,
				createElement: i,
				createText: r,
				createComment: a,
				setText: u,
				setElementText: c,
				parentNode: f,
				nextSibling: h,
				setScopeId: v = lt,
				insertStaticContent: b,
			} = e,
			w = (
				p,
				g,
				d,
				m = null,
				y = null,
				F = null,
				I = void 0,
				T = null,
				V = !!g.dynamicChildren
			) => {
				if (p === g) return;
				p && !vn(p, g) && ((m = q(p)), Ie(p, y, F, !0), (p = null)),
					g.patchFlag === -2 && ((V = !1), (g.dynamicChildren = null));
				const { type: $, ref: Y, shapeFlag: W } = g;
				switch ($) {
					case Xn:
						D(p, g, d, m);
						break;
					case wt:
						S(p, g, d, m);
						break;
					case Bo:
						p == null && N(g, d, m, I);
						break;
					case ce:
						pe(p, g, d, m, y, F, I, T, V);
						break;
					default:
						W & 1
							? x(p, g, d, m, y, F, I, T, V)
							: W & 6
							? Q(p, g, d, m, y, F, I, T, V)
							: (W & 64 || W & 128) && $.process(p, g, d, m, y, F, I, T, V, me);
				}
				Y != null && y
					? dn(Y, p && p.ref, F, g || p, !g)
					: Y == null && p && p.ref != null && dn(p.ref, null, F, p, !0);
			},
			D = (p, g, d, m) => {
				if (p == null) o((g.el = r(g.children)), d, m);
				else {
					const y = (g.el = p.el);
					g.children !== p.children && u(y, g.children);
				}
			},
			S = (p, g, d, m) => {
				p == null ? o((g.el = a(g.children || "")), d, m) : (g.el = p.el);
			},
			N = (p, g, d, m) => {
				[p.el, p.anchor] = b(p.children, g, d, m, p.el, p.anchor);
			},
			j = ({ el: p, anchor: g }, d, m) => {
				let y;
				for (; p && p !== g; ) (y = h(p)), o(p, d, m), (p = y);
				o(g, d, m);
			},
			O = ({ el: p, anchor: g }) => {
				let d;
				for (; p && p !== g; ) (d = h(p)), l(p), (p = d);
				l(g);
			},
			x = (p, g, d, m, y, F, I, T, V) => {
				if (
					(g.type === "svg" ? (I = "svg") : g.type === "math" && (I = "mathml"),
					p == null)
				)
					E(g, d, m, y, F, I, T, V);
				else {
					const $ = p.el && p.el._isVueCE ? p.el : null;
					try {
						$ && $._beginPatch(), B(p, g, y, F, I, T, V);
					} finally {
						$ && $._endPatch();
					}
				}
			},
			E = (p, g, d, m, y, F, I, T) => {
				let V, $;
				const { props: Y, shapeFlag: W, transition: te, dirs: k } = p;
				if (
					((V = p.el = i(p.type, F, Y && Y.is, Y)),
					W & 8
						? c(V, p.children)
						: W & 16 && H(p.children, V, null, m, y, jo(p, F), I, T),
					k && Pt(p, null, m, "created"),
					L(V, p, p.scopeId, I, m),
					Y)
				) {
					for (const M in Y) M !== "value" && !nn(M) && s(V, M, null, Y[M], F, m);
					"value" in Y && s(V, "value", null, Y.value, F),
						($ = Y.onVnodeBeforeMount) && ft($, m, p);
				}
				k && Pt(p, null, m, "beforeMount");
				const P = Jr(y, te);
				P && te.beforeEnter(V),
					o(V, g, d),
					(($ = Y && Y.onVnodeMounted) || P || k) &&
						He(() => {
							$ && ft($, m, p), P && te.enter(V), k && Pt(p, null, m, "mounted");
						}, y);
			},
			L = (p, g, d, m, y) => {
				if ((d && v(p, d), m)) for (let F = 0; F < m.length; F++) v(p, m[F]);
				if (y) {
					let F = y.subTree;
					if (g === F || (ws(F.type) && (F.ssContent === g || F.ssFallback === g))) {
						const I = y.vnode;
						L(p, I, I.scopeId, I.slotScopeIds, y.parent);
					}
				}
			},
			H = (p, g, d, m, y, F, I, T, V = 0) => {
				for (let $ = V; $ < p.length; $++) {
					const Y = (p[$] = T ? xt(p[$]) : ut(p[$]));
					w(null, Y, g, d, m, y, F, I, T);
				}
			},
			B = (p, g, d, m, y, F, I) => {
				const T = (g.el = p.el);
				let { patchFlag: V, dynamicChildren: $, dirs: Y } = g;
				V |= p.patchFlag & 16;
				const W = p.props || ye,
					te = g.props || ye;
				let k;
				if (
					(d && Mt(d, !1),
					(k = te.onVnodeBeforeUpdate) && ft(k, d, g, p),
					Y && Pt(g, p, d, "beforeUpdate"),
					d && Mt(d, !0),
					((W.innerHTML && te.innerHTML == null) ||
						(W.textContent && te.textContent == null)) &&
						c(T, ""),
					$
						? K(p.dynamicChildren, $, T, d, m, jo(g, y), F)
						: I || ne(p, g, T, null, d, m, jo(g, y), F, !1),
					V > 0)
				) {
					if (V & 16) oe(T, W, te, d, y);
					else if (
						(V & 2 && W.class !== te.class && s(T, "class", null, te.class, y),
						V & 4 && s(T, "style", W.style, te.style, y),
						V & 8)
					) {
						const P = g.dynamicProps;
						for (let M = 0; M < P.length; M++) {
							const J = P[M],
								re = W[J],
								we = te[J];
							(we !== re || J === "value") && s(T, J, re, we, y, d);
						}
					}
					V & 1 && p.children !== g.children && c(T, g.children);
				} else !I && $ == null && oe(T, W, te, d, y);
				((k = te.onVnodeUpdated) || Y) &&
					He(() => {
						k && ft(k, d, g, p), Y && Pt(g, p, d, "updated");
					}, m);
			},
			K = (p, g, d, m, y, F, I) => {
				for (let T = 0; T < g.length; T++) {
					const V = p[T],
						$ = g[T],
						Y =
							V.el && (V.type === ce || !vn(V, $) || V.shapeFlag & 198)
								? f(V.el)
								: d;
					w(V, $, Y, null, m, y, F, I, !0);
				}
			},
			oe = (p, g, d, m, y) => {
				if (g !== d) {
					if (g !== ye)
						for (const F in g) !nn(F) && !(F in d) && s(p, F, g[F], null, y, m);
					for (const F in d) {
						if (nn(F)) continue;
						const I = d[F],
							T = g[F];
						I !== T && F !== "value" && s(p, F, T, I, y, m);
					}
					"value" in d && s(p, "value", g.value, d.value, y);
				}
			},
			pe = (p, g, d, m, y, F, I, T, V) => {
				const $ = (g.el = p ? p.el : r("")),
					Y = (g.anchor = p ? p.anchor : r(""));
				let { patchFlag: W, dynamicChildren: te, slotScopeIds: k } = g;
				k && (T = T ? T.concat(k) : k),
					p == null
						? (o($, d, m), o(Y, d, m), H(g.children || [], d, Y, y, F, I, T, V))
						: W > 0 &&
						  W & 64 &&
						  te &&
						  p.dynamicChildren &&
						  p.dynamicChildren.length === te.length
						? (K(p.dynamicChildren, te, d, y, F, I, T),
						  (g.key != null || (y && g === y.subTree)) && Vo(p, g, !0))
						: ne(p, g, d, Y, y, F, I, T, V);
			},
			Q = (p, g, d, m, y, F, I, T, V) => {
				(g.slotScopeIds = T),
					p == null
						? g.shapeFlag & 512
							? y.ctx.activate(g, d, m, I, V)
							: Z(g, d, m, y, F, I, V)
						: he(p, g, V);
			},
			Z = (p, g, d, m, y, F, I) => {
				const T = (p.component = la(p, m, y));
				if ((Kl(p) && (T.ctx.renderer = me), sa(T, !1, I), T.asyncDep)) {
					if ((y && y.registerDep(T, se, I), !p.el)) {
						const V = (T.subTree = Oe(wt));
						S(null, V, g, d), (p.placeholder = V.el);
					}
				} else se(T, p, g, d, y, F, I);
			},
			he = (p, g, d) => {
				const m = (g.component = p.component);
				if (jr(p, g, d))
					if (m.asyncDep && !m.asyncResolved) {
						ie(m, g, d);
						return;
					} else (m.next = g), m.update();
				else (g.el = p.el), (m.vnode = g);
			},
			se = (p, g, d, m, y, F, I) => {
				const T = () => {
					if (p.isMounted) {
						let { next: W, bu: te, u: k, parent: P, vnode: M } = p;
						{
							const ge = ys(p);
							if (ge) {
								W && ((W.el = M.el), ie(p, W, I)),
									ge.asyncDep.then(() => {
										He(() => {
											p.isUnmounted || $();
										}, y);
									});
								return;
							}
						}
						let J = W,
							re;
						Mt(p, !1),
							W ? ((W.el = M.el), ie(p, W, I)) : (W = M),
							te && kn(te),
							(re = W.props && W.props.onVnodeBeforeUpdate) && ft(re, P, W, M),
							Mt(p, !0);
						const we = is(p),
							ae = p.subTree;
						(p.subTree = we),
							w(ae, we, f(ae.el), q(ae), p, y, F),
							(W.el = we.el),
							J === null && Vr(p, we.el),
							k && He(k, y),
							(re = W.props && W.props.onVnodeUpdated) &&
								He(() => ft(re, P, W, M), y);
					} else {
						let W;
						const { el: te, props: k } = g,
							{ bm: P, m: M, parent: J, root: re, type: we } = p,
							ae = Yt(g);
						Mt(p, !1),
							P && kn(P),
							!ae && (W = k && k.onVnodeBeforeMount) && ft(W, J, g),
							Mt(p, !0);
						{
							re.ce &&
								re.ce._hasShadowRoot() &&
								re.ce._injectChildStyle(we, p.parent ? p.parent.type : void 0);
							const ge = (p.subTree = is(p));
							w(null, ge, d, m, p, y, F), (g.el = ge.el);
						}
						if ((M && He(M, y), !ae && (W = k && k.onVnodeMounted))) {
							const ge = g;
							He(() => ft(W, J, ge), y);
						}
						(g.shapeFlag & 256 || (J && Yt(J.vnode) && J.vnode.shapeFlag & 256)) &&
							p.a &&
							He(p.a, y),
							(p.isMounted = !0),
							(g = d = m = null);
					}
				};
				p.scope.on();
				const V = (p.effect = new rl(T));
				p.scope.off();
				const $ = (p.update = V.run.bind(V)),
					Y = (p.job = V.runIfDirty.bind(V));
				(Y.i = p), (Y.id = p.uid), (V.scheduler = () => $o(Y)), Mt(p, !0), $();
			},
			ie = (p, g, d) => {
				g.component = p;
				const m = p.vnode.props;
				(p.vnode = g),
					(p.next = null),
					Hr(p, g.props, m, d),
					Kr(p, g.children, d),
					st(),
					El(p),
					it();
			},
			ne = (p, g, d, m, y, F, I, T, V = !1) => {
				const $ = p && p.children,
					Y = p ? p.shapeFlag : 0,
					W = g.children,
					{ patchFlag: te, shapeFlag: k } = g;
				if (te > 0) {
					if (te & 128) {
						ke($, W, d, m, y, F, I, T, V);
						return;
					} else if (te & 256) {
						Ce($, W, d, m, y, F, I, T, V);
						return;
					}
				}
				k & 8
					? (Y & 16 && Ge($, y, F), W !== $ && c(d, W))
					: Y & 16
					? k & 16
						? ke($, W, d, m, y, F, I, T, V)
						: Ge($, y, F, !0)
					: (Y & 8 && c(d, ""), k & 16 && H(W, d, m, y, F, I, T, V));
			},
			Ce = (p, g, d, m, y, F, I, T, V) => {
				(p = p || Lt), (g = g || Lt);
				const $ = p.length,
					Y = g.length,
					W = Math.min($, Y);
				let te;
				for (te = 0; te < W; te++) {
					const k = (g[te] = V ? xt(g[te]) : ut(g[te]));
					w(p[te], k, d, null, y, F, I, T, V);
				}
				$ > Y ? Ge(p, y, F, !0, !1, W) : H(g, d, m, y, F, I, T, V, W);
			},
			ke = (p, g, d, m, y, F, I, T, V) => {
				let $ = 0;
				const Y = g.length;
				let W = p.length - 1,
					te = Y - 1;
				for (; $ <= W && $ <= te; ) {
					const k = p[$],
						P = (g[$] = V ? xt(g[$]) : ut(g[$]));
					if (vn(k, P)) w(k, P, d, null, y, F, I, T, V);
					else break;
					$++;
				}
				for (; $ <= W && $ <= te; ) {
					const k = p[W],
						P = (g[te] = V ? xt(g[te]) : ut(g[te]));
					if (vn(k, P)) w(k, P, d, null, y, F, I, T, V);
					else break;
					W--, te--;
				}
				if ($ > W) {
					if ($ <= te) {
						const k = te + 1,
							P = k < Y ? g[k].el : m;
						for (; $ <= te; )
							w(null, (g[$] = V ? xt(g[$]) : ut(g[$])), d, P, y, F, I, T, V), $++;
					}
				} else if ($ > te) for (; $ <= W; ) Ie(p[$], y, F, !0), $++;
				else {
					const k = $,
						P = $,
						M = new Map();
					for ($ = P; $ <= te; $++) {
						const Ze = (g[$] = V ? xt(g[$]) : ut(g[$]));
						Ze.key != null && M.set(Ze.key, $);
					}
					let J,
						re = 0;
					const we = te - P + 1;
					let ae = !1,
						ge = 0;
					const Se = new Array(we);
					for ($ = 0; $ < we; $++) Se[$] = 0;
					for ($ = k; $ <= W; $++) {
						const Ze = p[$];
						if (re >= we) {
							Ie(Ze, y, F, !0);
							continue;
						}
						let pt;
						if (Ze.key != null) pt = M.get(Ze.key);
						else
							for (J = P; J <= te; J++)
								if (Se[J - P] === 0 && vn(Ze, g[J])) {
									pt = J;
									break;
								}
						pt === void 0
							? Ie(Ze, y, F, !0)
							: ((Se[pt - P] = $ + 1),
							  pt >= ge ? (ge = pt) : (ae = !0),
							  w(Ze, g[pt], d, null, y, F, I, T, V),
							  re++);
					}
					const en = ae ? Xr(Se) : Lt;
					for (J = en.length - 1, $ = we - 1; $ >= 0; $--) {
						const Ze = P + $,
							pt = g[Ze],
							ri = g[Ze + 1],
							ai = Ze + 1 < Y ? ri.el || bs(ri) : m;
						Se[$] === 0
							? w(null, pt, d, ai, y, F, I, T, V)
							: ae && (J < 0 || $ !== en[J] ? Ye(pt, d, ai, 2) : J--);
					}
				}
			},
			Ye = (p, g, d, m, y = null) => {
				const { el: F, type: I, transition: T, children: V, shapeFlag: $ } = p;
				if ($ & 6) {
					Ye(p.component.subTree, g, d, m);
					return;
				}
				if ($ & 128) {
					p.suspense.move(g, d, m);
					return;
				}
				if ($ & 64) {
					I.move(p, g, d, me);
					return;
				}
				if (I === ce) {
					o(F, g, d);
					for (let W = 0; W < V.length; W++) Ye(V[W], g, d, m);
					o(p.anchor, g, d);
					return;
				}
				if (I === Bo) {
					j(p, g, d);
					return;
				}
				if (m !== 2 && $ & 1 && T)
					if (m === 0) T.beforeEnter(F), o(F, g, d), He(() => T.enter(F), y);
					else {
						const { leave: W, delayLeave: te, afterLeave: k } = T,
							P = () => {
								p.ctx.isUnmounted ? l(F) : o(F, g, d);
							},
							M = () => {
								F._isLeaving && F[dr](!0),
									W(F, () => {
										P(), k && k();
									});
							};
						te ? te(F, P, M) : M();
					}
				else o(F, g, d);
			},
			Ie = (p, g, d, m = !1, y = !1) => {
				const {
					type: F,
					props: I,
					ref: T,
					children: V,
					dynamicChildren: $,
					shapeFlag: Y,
					patchFlag: W,
					dirs: te,
					cacheIndex: k,
				} = p;
				if (
					(W === -2 && (y = !1),
					T != null && (st(), dn(T, null, d, p, !0), it()),
					k != null && (g.renderCache[k] = void 0),
					Y & 256)
				) {
					g.ctx.deactivate(p);
					return;
				}
				const P = Y & 1 && te,
					M = !Yt(p);
				let J;
				if ((M && (J = I && I.onVnodeBeforeUnmount) && ft(J, g, p), Y & 6))
					Tt(p.component, d, m);
				else {
					if (Y & 128) {
						p.suspense.unmount(d, m);
						return;
					}
					P && Pt(p, null, g, "beforeUnmount"),
						Y & 64
							? p.type.remove(p, g, d, me, m)
							: $ && !$.hasOnce && (F !== ce || (W > 0 && W & 64))
							? Ge($, g, d, !1, !0)
							: ((F === ce && W & 384) || (!y && Y & 16)) && Ge(V, g, d),
						m && $t(p);
				}
				((M && (J = I && I.onVnodeUnmounted)) || P) &&
					He(() => {
						J && ft(J, g, p), P && Pt(p, null, g, "unmounted");
					}, d);
			},
			$t = (p) => {
				const { type: g, el: d, anchor: m, transition: y } = p;
				if (g === ce) {
					Dt(d, m);
					return;
				}
				if (g === Bo) {
					O(p);
					return;
				}
				const F = () => {
					l(d), y && !y.persisted && y.afterLeave && y.afterLeave();
				};
				if (p.shapeFlag & 1 && y && !y.persisted) {
					const { leave: I, delayLeave: T } = y,
						V = () => I(d, F);
					T ? T(p.el, F, V) : V();
				} else F();
			},
			Dt = (p, g) => {
				let d;
				for (; p !== g; ) (d = h(p)), l(p), (p = d);
				l(g);
			},
			Tt = (p, g, d) => {
				const { bum: m, scope: y, job: F, subTree: I, um: T, m: V, a: $ } = p;
				_s(V),
					_s($),
					m && kn(m),
					y.stop(),
					F && ((F.flags |= 8), Ie(I, p, g, d)),
					T && He(T, g),
					He(() => {
						p.isUnmounted = !0;
					}, g);
			},
			Ge = (p, g, d, m = !1, y = !1, F = 0) => {
				for (let I = F; I < p.length; I++) Ie(p[I], g, d, m, y);
			},
			q = (p) => {
				if (p.shapeFlag & 6) return q(p.component.subTree);
				if (p.shapeFlag & 128) return p.suspense.next();
				const g = h(p.anchor || p.el),
					d = g && g[Il];
				return d ? h(d) : g;
			};
		let z = !1;
		const U = (p, g, d) => {
				let m;
				p == null
					? g._vnode && (Ie(g._vnode, null, null, !0), (m = g._vnode.component))
					: w(g._vnode || null, p, g, null, null, null, d),
					(g._vnode = p),
					z || ((z = !0), El(m), Rl(), (z = !1));
			},
			me = { p: w, um: Ie, m: Ye, r: $t, mt: Z, mc: H, pc: ne, pbc: K, n: q, o: e };
		return { render: U, hydrate: void 0, createApp: Or(U) };
	}
	function jo({ type: e, props: t }, n) {
		return (n === "svg" && e === "foreignObject") ||
			(n === "mathml" &&
				e === "annotation-xml" &&
				t &&
				t.encoding &&
				t.encoding.includes("html"))
			? void 0
			: n;
	}
	function Mt({ effect: e, job: t }, n) {
		n ? ((e.flags |= 32), (t.flags |= 4)) : ((e.flags &= -33), (t.flags &= -5));
	}
	function Jr(e, t) {
		return (!e || (e && !e.pendingBranch)) && t && !t.persisted;
	}
	function Vo(e, t, n = !1) {
		const o = e.children,
			l = t.children;
		if (le(o) && le(l))
			for (let s = 0; s < o.length; s++) {
				const i = o[s];
				let r = l[s];
				r.shapeFlag & 1 &&
					!r.dynamicChildren &&
					((r.patchFlag <= 0 || r.patchFlag === 32) &&
						((r = l[s] = xt(l[s])), (r.el = i.el)),
					!n && r.patchFlag !== -2 && Vo(i, r)),
					r.type === Xn && (r.patchFlag === -1 && (r = l[s] = xt(r)), (r.el = i.el)),
					r.type === wt && !r.el && (r.el = i.el);
			}
	}
	function Xr(e) {
		const t = e.slice(),
			n = [0];
		let o, l, s, i, r;
		const a = e.length;
		for (o = 0; o < a; o++) {
			const u = e[o];
			if (u !== 0) {
				if (((l = n[n.length - 1]), e[l] < u)) {
					(t[o] = l), n.push(o);
					continue;
				}
				for (s = 0, i = n.length - 1; s < i; )
					(r = (s + i) >> 1), e[n[r]] < u ? (s = r + 1) : (i = r);
				u < e[n[s]] && (s > 0 && (t[o] = n[s - 1]), (n[s] = o));
			}
		}
		for (s = n.length, i = n[s - 1]; s-- > 0; ) (n[s] = i), (i = t[i]);
		return n;
	}
	function ys(e) {
		const t = e.subTree.component;
		if (t) return t.asyncDep && !t.asyncResolved ? t : ys(t);
	}
	function _s(e) {
		if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
	}
	function bs(e) {
		if (e.placeholder) return e.placeholder;
		const t = e.component;
		return t ? bs(t.subTree) : null;
	}
	const ws = (e) => e.__isSuspense;
	function Gr(e, t) {
		t && t.pendingBranch ? (le(e) ? t.effects.push(...e) : t.effects.push(e)) : sr(e);
	}
	const ce = Symbol.for("v-fgt"),
		Xn = Symbol.for("v-txt"),
		wt = Symbol.for("v-cmt"),
		Bo = Symbol.for("v-stc"),
		hn = [];
	let Xe = null;
	function _(e = !1) {
		hn.push((Xe = e ? null : []));
	}
	function Zr() {
		hn.pop(), (Xe = hn[hn.length - 1] || null);
	}
	let gn = 1;
	function xs(e, t = !1) {
		(gn += e), e < 0 && Xe && t && (Xe.hasOnce = !0);
	}
	function Cs(e) {
		return (e.dynamicChildren = gn > 0 ? Xe || Lt : null), Zr(), gn > 0 && Xe && Xe.push(e), e;
	}
	function C(e, t, n, o, l, s) {
		return Cs(A(e, t, n, o, l, s, !0));
	}
	function Te(e, t, n, o, l) {
		return Cs(Oe(e, t, n, o, l, !0));
	}
	function Ho(e) {
		return e ? e.__v_isVNode === !0 : !1;
	}
	function vn(e, t) {
		return e.type === t.type && e.key === t.key;
	}
	const Ss = ({ key: e }) => e ?? null,
		Gn = ({ ref: e, ref_key: t, ref_for: n }) => (
			typeof e == "number" && (e = "" + e),
			e != null ? (Fe(e) || Ne(e) || fe(e) ? { i: Me, r: e, k: t, f: !!n } : e) : null
		);
	function A(e, t = null, n = null, o = 0, l = null, s = e === ce ? 0 : 1, i = !1, r = !1) {
		const a = {
			__v_isVNode: !0,
			__v_skip: !0,
			type: e,
			props: t,
			key: t && Ss(t),
			ref: t && Gn(t),
			scopeId: Pl,
			slotScopeIds: null,
			children: n,
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
			shapeFlag: s,
			patchFlag: o,
			dynamicProps: l,
			dynamicChildren: null,
			appContext: null,
			ctx: Me,
		};
		return (
			r ? (qo(a, n), s & 128 && e.normalize(a)) : n && (a.shapeFlag |= Fe(n) ? 8 : 16),
			gn > 0 && !i && Xe && (a.patchFlag > 0 || s & 6) && a.patchFlag !== 32 && Xe.push(a),
			a
		);
	}
	const Oe = Qr;
	function Qr(e, t = null, n = null, o = 0, l = null, s = !1) {
		if (((!e || e === Yl) && (e = wt), Ho(e))) {
			const r = Gt(e, t, !0);
			return (
				n && qo(r, n),
				gn > 0 && !s && Xe && (r.shapeFlag & 6 ? (Xe[Xe.indexOf(e)] = r) : Xe.push(r)),
				(r.patchFlag = -2),
				r
			);
		}
		if ((fa(e) && (e = e.__vccOpts), t)) {
			t = ea(t);
			let { class: r, style: a } = t;
			r && !Fe(r) && (t.class = Ve(r)),
				xe(a) && (Mn(a) && !le(a) && (a = Pe({}, a)), (t.style = Re(a)));
		}
		const i = Fe(e) ? 1 : ws(e) ? 128 : ur(e) ? 64 : xe(e) ? 4 : fe(e) ? 2 : 0;
		return A(e, t, n, o, l, i, s, !0);
	}
	function ea(e) {
		return e ? (Mn(e) || fs(e) ? Pe({}, e) : e) : null;
	}
	function Gt(e, t, n = !1, o = !1) {
		const { props: l, ref: s, patchFlag: i, children: r, transition: a } = e,
			u = t ? ta(l || {}, t) : l,
			c = {
				__v_isVNode: !0,
				__v_skip: !0,
				type: e.type,
				props: u,
				key: u && Ss(u),
				ref: t && t.ref ? (n && s ? (le(s) ? s.concat(Gn(t)) : [s, Gn(t)]) : Gn(t)) : s,
				scopeId: e.scopeId,
				slotScopeIds: e.slotScopeIds,
				children: r,
				target: e.target,
				targetStart: e.targetStart,
				targetAnchor: e.targetAnchor,
				staticCount: e.staticCount,
				shapeFlag: e.shapeFlag,
				patchFlag: t && e.type !== ce ? (i === -1 ? 16 : i | 16) : i,
				dynamicProps: e.dynamicProps,
				dynamicChildren: e.dynamicChildren,
				appContext: e.appContext,
				dirs: e.dirs,
				transition: a,
				component: e.component,
				suspense: e.suspense,
				ssContent: e.ssContent && Gt(e.ssContent),
				ssFallback: e.ssFallback && Gt(e.ssFallback),
				placeholder: e.placeholder,
				el: e.el,
				anchor: e.anchor,
				ctx: e.ctx,
				ce: e.ce,
			};
		return a && o && To(c, a.clone(c)), c;
	}
	function Qe(e = " ", t = 0) {
		return Oe(Xn, null, e, t);
	}
	function ue(e = "", t = !1) {
		return t ? (_(), Te(wt, null, e)) : Oe(wt, null, e);
	}
	function ut(e) {
		return e == null || typeof e == "boolean"
			? Oe(wt)
			: le(e)
			? Oe(ce, null, e.slice())
			: Ho(e)
			? xt(e)
			: Oe(Xn, null, String(e));
	}
	function xt(e) {
		return (e.el === null && e.patchFlag !== -1) || e.memo ? e : Gt(e);
	}
	function qo(e, t) {
		let n = 0;
		const { shapeFlag: o } = e;
		if (t == null) t = null;
		else if (le(t)) n = 16;
		else if (typeof t == "object")
			if (o & 65) {
				const l = t.default;
				l && (l._c && (l._d = !1), qo(e, l()), l._c && (l._d = !0));
				return;
			} else {
				n = 32;
				const l = t._;
				!l && !fs(t)
					? (t._ctx = Me)
					: l === 3 &&
					  Me &&
					  (Me.slots._ === 1 ? (t._ = 1) : ((t._ = 2), (e.patchFlag |= 1024)));
			}
		else
			fe(t)
				? ((t = { default: t, _ctx: Me }), (n = 32))
				: ((t = String(t)), o & 64 ? ((n = 16), (t = [Qe(t)])) : (n = 8));
		(e.children = t), (e.shapeFlag |= n);
	}
	function ta(...e) {
		const t = {};
		for (let n = 0; n < e.length; n++) {
			const o = e[n];
			for (const l in o)
				if (l === "class") t.class !== o.class && (t.class = Ve([t.class, o.class]));
				else if (l === "style") t.style = Re([t.style, o.style]);
				else if (xn(l)) {
					const s = t[l],
						i = o[l];
					i && s !== i && !(le(s) && s.includes(i)) && (t[l] = s ? [].concat(s, i) : i);
				} else l !== "" && (t[l] = o[l]);
		}
		return t;
	}
	function ft(e, t, n, o = null) {
		at(e, t, 7, [n, o]);
	}
	const na = os();
	let oa = 0;
	function la(e, t, n) {
		const o = e.type,
			l = (t ? t.appContext : e.appContext) || na,
			s = {
				uid: oa++,
				vnode: e,
				type: o,
				parent: t,
				appContext: l,
				root: null,
				next: null,
				subTree: null,
				effect: null,
				update: null,
				job: null,
				scope: new _i(!0),
				render: null,
				proxy: null,
				exposed: null,
				exposeProxy: null,
				withProxy: null,
				provides: t ? t.provides : Object.create(l.provides),
				ids: t ? t.ids : ["", 0, 0],
				accessCache: null,
				renderCache: [],
				components: null,
				directives: null,
				propsOptions: ps(o, l),
				emitsOptions: ss(o, l),
				emit: null,
				emitted: null,
				propsDefaults: ye,
				inheritAttrs: o.inheritAttrs,
				ctx: ye,
				data: ye,
				props: ye,
				attrs: ye,
				slots: ye,
				refs: ye,
				setupState: ye,
				setupContext: null,
				suspense: n,
				suspenseId: n ? n.pendingId : 0,
				asyncDep: null,
				asyncResolved: !1,
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
				sp: null,
			};
		return (
			(s.ctx = { _: s }),
			(s.root = t ? t.root : s),
			(s.emit = Ar.bind(null, s)),
			e.ce && e.ce(s),
			s
		);
	}
	let qe = null;
	const $s = () => qe || Me;
	let Zn, Uo;
	{
		const e = Dn(),
			t = (n, o) => {
				let l;
				return (
					(l = e[n]) || (l = e[n] = []),
					l.push(o),
					(s) => {
						l.length > 1 ? l.forEach((i) => i(s)) : l[0](s);
					}
				);
			};
		(Zn = t("__VUE_INSTANCE_SETTERS__", (n) => (qe = n))),
			(Uo = t("__VUE_SSR_SETTERS__", (n) => (_n = n)));
	}
	const yn = (e) => {
			const t = qe;
			return (
				Zn(e),
				e.scope.on(),
				() => {
					e.scope.off(), Zn(t);
				}
			);
		},
		ks = () => {
			qe && qe.scope.off(), Zn(null);
		};
	function Fs(e) {
		return e.vnode.shapeFlag & 4;
	}
	let _n = !1;
	function sa(e, t = !1, n = !1) {
		t && Uo(t);
		const { props: o, children: l } = e.vnode,
			s = Fs(e);
		Br(e, o, s, t), Wr(e, l, n || t);
		const i = s ? ia(e, t) : void 0;
		return t && Uo(!1), i;
	}
	function ia(e, t) {
		const n = e.type;
		(e.accessCache = Object.create(null)), (e.proxy = new Proxy(e.ctx, kr));
		const { setup: o } = n;
		if (o) {
			st();
			const l = (e.setupContext = o.length > 1 ? aa(e) : null),
				s = yn(e),
				i = Ut(o, e, 0, [e.props, l]),
				r = Qo(i);
			if ((it(), s(), (r || e.sp) && !Yt(e) && ql(e), r)) {
				if ((i.then(ks, ks), t))
					return i
						.then((a) => {
							Ds(e, a);
						})
						.catch((a) => {
							Vn(a, e, 0);
						});
				e.asyncDep = i;
			} else Ds(e, i);
		} else Ts(e);
	}
	function Ds(e, t, n) {
		fe(t)
			? e.type.__ssrInlineRender
				? (e.ssrRender = t)
				: (e.render = t)
			: xe(t) && (e.setupState = Fl(t)),
			Ts(e);
	}
	function Ts(e, t, n) {
		const o = e.type;
		e.render || (e.render = o.render || lt);
		{
			const l = yn(e);
			st();
			try {
				Fr(e);
			} finally {
				it(), l();
			}
		}
	}
	const ra = {
		get(e, t) {
			return Be(e, "get", ""), e[t];
		},
	};
	function aa(e) {
		const t = (n) => {
			e.exposed = n || {};
		};
		return { attrs: new Proxy(e.attrs, ra), slots: e.slots, emit: e.emit, expose: t };
	}
	function Qn(e) {
		return e.exposed
			? e.exposeProxy ||
					(e.exposeProxy = new Proxy(Fl(Bi(e.exposed)), {
						get(t, n) {
							if (n in t) return t[n];
							if (n in pn) return pn[n](e);
						},
						has(t, n) {
							return n in t || n in pn;
						},
					}))
			: e.proxy;
	}
	const ca = /(?:^|[-_])\w/g,
		ua = (e) => e.replace(ca, (t) => t.toUpperCase()).replace(/[-_]/g, "");
	function Ns(e, t = !0) {
		return fe(e) ? e.displayName || e.name : e.name || (t && e.__name);
	}
	function Es(e, t, n = !1) {
		let o = Ns(t);
		if (!o && t.__file) {
			const l = t.__file.match(/([^/\\]+)\.\w+$/);
			l && (o = l[1]);
		}
		if (!o && e) {
			const l = (s) => {
				for (const i in s) if (s[i] === t) return i;
			};
			o =
				l(e.components) ||
				(e.parent && l(e.parent.type.components)) ||
				l(e.appContext.components);
		}
		return o ? ua(o) : n ? "App" : "Anonymous";
	}
	function fa(e) {
		return fe(e) && "__vccOpts" in e;
	}
	const de = (e, t) => Xi(e, t, _n),
		da = "3.5.30";
	/**
	 * @vue/runtime-dom v3.5.30
	 * (c) 2018-present Yuxi (Evan) You and Vue contributors
	 * @license MIT
	 **/ let Wo;
	const Rs = typeof window < "u" && window.trustedTypes;
	if (Rs)
		try {
			Wo = Rs.createPolicy("vue", { createHTML: (e) => e });
		} catch {}
	const Os = Wo ? (e) => Wo.createHTML(e) : (e) => e,
		pa = "http://www.w3.org/2000/svg",
		ma = "http://www.w3.org/1998/Math/MathML",
		Ct = typeof document < "u" ? document : null,
		Ps = Ct && Ct.createElement("template"),
		ha = {
			insert: (e, t, n) => {
				t.insertBefore(e, n || null);
			},
			remove: (e) => {
				const t = e.parentNode;
				t && t.removeChild(e);
			},
			createElement: (e, t, n, o) => {
				const l =
					t === "svg"
						? Ct.createElementNS(pa, e)
						: t === "mathml"
						? Ct.createElementNS(ma, e)
						: n
						? Ct.createElement(e, { is: n })
						: Ct.createElement(e);
				return (
					e === "select" &&
						o &&
						o.multiple != null &&
						l.setAttribute("multiple", o.multiple),
					l
				);
			},
			createText: (e) => Ct.createTextNode(e),
			createComment: (e) => Ct.createComment(e),
			setText: (e, t) => {
				e.nodeValue = t;
			},
			setElementText: (e, t) => {
				e.textContent = t;
			},
			parentNode: (e) => e.parentNode,
			nextSibling: (e) => e.nextSibling,
			querySelector: (e) => Ct.querySelector(e),
			setScopeId(e, t) {
				e.setAttribute(t, "");
			},
			insertStaticContent(e, t, n, o, l, s) {
				const i = n ? n.previousSibling : t.lastChild;
				if (l && (l === s || l.nextSibling))
					for (
						;
						t.insertBefore(l.cloneNode(!0), n), !(l === s || !(l = l.nextSibling));

					);
				else {
					Ps.innerHTML = Os(
						o === "svg" ? `<svg>${e}</svg>` : o === "mathml" ? `<math>${e}</math>` : e
					);
					const r = Ps.content;
					if (o === "svg" || o === "mathml") {
						const a = r.firstChild;
						for (; a.firstChild; ) r.appendChild(a.firstChild);
						r.removeChild(a);
					}
					t.insertBefore(r, n);
				}
				return [i ? i.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
			},
		},
		ga = Symbol("_vtc");
	function va(e, t, n) {
		const o = e[ga];
		o && (t = (t ? [t, ...o] : [...o]).join(" ")),
			t == null
				? e.removeAttribute("class")
				: n
				? e.setAttribute("class", t)
				: (e.className = t);
	}
	const eo = Symbol("_vod"),
		As = Symbol("_vsh"),
		ya = {
			name: "show",
			beforeMount(e, { value: t }, { transition: n }) {
				(e[eo] = e.style.display === "none" ? "" : e.style.display),
					n && t ? n.beforeEnter(e) : bn(e, t);
			},
			mounted(e, { value: t }, { transition: n }) {
				n && t && n.enter(e);
			},
			updated(e, { value: t, oldValue: n }, { transition: o }) {
				!t != !n &&
					(o
						? t
							? (o.beforeEnter(e), bn(e, !0), o.enter(e))
							: o.leave(e, () => {
									bn(e, !1);
							  })
						: bn(e, t));
			},
			beforeUnmount(e, { value: t }) {
				bn(e, t);
			},
		};
	function bn(e, t) {
		(e.style.display = t ? e[eo] : "none"), (e[As] = !t);
	}
	const _a = Symbol(""),
		ba = /(?:^|;)\s*display\s*:/;
	function wa(e, t, n) {
		const o = e.style,
			l = Fe(n);
		let s = !1;
		if (n && !l) {
			if (t)
				if (Fe(t))
					for (const i of t.split(";")) {
						const r = i.slice(0, i.indexOf(":")).trim();
						n[r] == null && to(o, r, "");
					}
				else for (const i in t) n[i] == null && to(o, i, "");
			for (const i in n) i === "display" && (s = !0), to(o, i, n[i]);
		} else if (l) {
			if (t !== n) {
				const i = o[_a];
				i && (n += ";" + i), (o.cssText = n), (s = ba.test(n));
			}
		} else t && e.removeAttribute("style");
		eo in e && ((e[eo] = s ? o.display : ""), e[As] && (o.display = "none"));
	}
	const Ms = /\s*!important$/;
	function to(e, t, n) {
		if (le(n)) n.forEach((o) => to(e, t, o));
		else if ((n == null && (n = ""), t.startsWith("--"))) e.setProperty(t, n);
		else {
			const o = xa(e, t);
			Ms.test(n) ? e.setProperty(mt(o), n.replace(Ms, ""), "important") : (e[o] = n);
		}
	}
	const Is = ["Webkit", "Moz", "ms"],
		Ko = {};
	function xa(e, t) {
		const n = Ko[t];
		if (n) return n;
		let o = Le(t);
		if (o !== "filter" && o in e) return (Ko[t] = o);
		o = $n(o);
		for (let l = 0; l < Is.length; l++) {
			const s = Is[l] + o;
			if (s in e) return (Ko[t] = s);
		}
		return t;
	}
	const Ls = "http://www.w3.org/1999/xlink";
	function js(e, t, n, o, l, s = vi(t)) {
		o && t.startsWith("xlink:")
			? n == null
				? e.removeAttributeNS(Ls, t.slice(6, t.length))
				: e.setAttributeNS(Ls, t, n)
			: n == null || (s && !ll(n))
			? e.removeAttribute(t)
			: e.setAttribute(t, s ? "" : et(n) ? String(n) : n);
	}
	function Vs(e, t, n, o, l) {
		if (t === "innerHTML" || t === "textContent") {
			n != null && (e[t] = t === "innerHTML" ? Os(n) : n);
			return;
		}
		const s = e.tagName;
		if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
			const r = s === "OPTION" ? e.getAttribute("value") || "" : e.value,
				a = n == null ? (e.type === "checkbox" ? "on" : "") : String(n);
			(r !== a || !("_value" in e)) && (e.value = a),
				n == null && e.removeAttribute(t),
				(e._value = n);
			return;
		}
		let i = !1;
		if (n === "" || n == null) {
			const r = typeof e[t];
			r === "boolean"
				? (n = ll(n))
				: n == null && r === "string"
				? ((n = ""), (i = !0))
				: r === "number" && ((n = 0), (i = !0));
		}
		try {
			e[t] = n;
		} catch {}
		i && e.removeAttribute(l || t);
	}
	function Ft(e, t, n, o) {
		e.addEventListener(t, n, o);
	}
	function Ca(e, t, n, o) {
		e.removeEventListener(t, n, o);
	}
	const Bs = Symbol("_vei");
	function Sa(e, t, n, o, l = null) {
		const s = e[Bs] || (e[Bs] = {}),
			i = s[t];
		if (o && i) i.value = o;
		else {
			const [r, a] = $a(t);
			if (o) {
				const u = (s[t] = Da(o, l));
				Ft(e, r, u, a);
			} else i && (Ca(e, r, i, a), (s[t] = void 0));
		}
	}
	const Hs = /(?:Once|Passive|Capture)$/;
	function $a(e) {
		let t;
		if (Hs.test(e)) {
			t = {};
			let o;
			for (; (o = e.match(Hs)); )
				(e = e.slice(0, e.length - o[0].length)), (t[o[0].toLowerCase()] = !0);
		}
		return [e[2] === ":" ? e.slice(3) : mt(e.slice(2)), t];
	}
	let zo = 0;
	const ka = Promise.resolve(),
		Fa = () => zo || (ka.then(() => (zo = 0)), (zo = Date.now()));
	function Da(e, t) {
		const n = (o) => {
			if (!o._vts) o._vts = Date.now();
			else if (o._vts <= n.attached) return;
			at(Ta(o, n.value), t, 5, [o]);
		};
		return (n.value = e), (n.attached = Fa()), n;
	}
	function Ta(e, t) {
		if (le(t)) {
			const n = e.stopImmediatePropagation;
			return (
				(e.stopImmediatePropagation = () => {
					n.call(e), (e._stopped = !0);
				}),
				t.map((o) => (l) => !l._stopped && o && o(l))
			);
		} else return t;
	}
	const qs = (e) =>
			e.charCodeAt(0) === 111 &&
			e.charCodeAt(1) === 110 &&
			e.charCodeAt(2) > 96 &&
			e.charCodeAt(2) < 123,
		Na = (e, t, n, o, l, s) => {
			const i = l === "svg";
			t === "class"
				? va(e, o, i)
				: t === "style"
				? wa(e, n, o)
				: xn(t)
				? ao(t) || Sa(e, t, n, o, s)
				: (
						t[0] === "."
							? ((t = t.slice(1)), !0)
							: t[0] === "^"
							? ((t = t.slice(1)), !1)
							: Ea(e, t, o, i)
				  )
				? (Vs(e, t, o),
				  !e.tagName.includes("-") &&
						(t === "value" || t === "checked" || t === "selected") &&
						js(e, t, o, i, s, t !== "value"))
				: e._isVueCE && (Ra(e, t) || (e._def.__asyncLoader && (/[A-Z]/.test(t) || !Fe(o))))
				? Vs(e, Le(t), o, s, t)
				: (t === "true-value"
						? (e._trueValue = o)
						: t === "false-value" && (e._falseValue = o),
				  js(e, t, o, i));
		};
	function Ea(e, t, n, o) {
		if (o) return !!(t === "innerHTML" || t === "textContent" || (t in e && qs(t) && fe(n)));
		if (
			t === "spellcheck" ||
			t === "draggable" ||
			t === "translate" ||
			t === "autocorrect" ||
			(t === "sandbox" && e.tagName === "IFRAME") ||
			t === "form" ||
			(t === "list" && e.tagName === "INPUT") ||
			(t === "type" && e.tagName === "TEXTAREA")
		)
			return !1;
		if (t === "width" || t === "height") {
			const l = e.tagName;
			if (l === "IMG" || l === "VIDEO" || l === "CANVAS" || l === "SOURCE") return !1;
		}
		return qs(t) && Fe(n) ? !1 : t in e;
	}
	function Ra(e, t) {
		const n = e._def.props;
		if (!n) return !1;
		const o = Le(t);
		return Array.isArray(n)
			? n.some((l) => Le(l) === o)
			: Object.keys(n).some((l) => Le(l) === o);
	}
	const Zt = (e) => {
		const t = e.props["onUpdate:modelValue"] || !1;
		return le(t) ? (n) => kn(t, n) : t;
	};
	function Oa(e) {
		e.target.composing = !0;
	}
	function Us(e) {
		const t = e.target;
		t.composing && ((t.composing = !1), t.dispatchEvent(new Event("input")));
	}
	const St = Symbol("_assign");
	function Ws(e, t, n) {
		return t && (e = e.trim()), n && (e = Fn(e)), e;
	}
	const It = {
			created(e, { modifiers: { lazy: t, trim: n, number: o } }, l) {
				e[St] = Zt(l);
				const s = o || (l.props && l.props.type === "number");
				Ft(e, t ? "change" : "input", (i) => {
					i.target.composing || e[St](Ws(e.value, n, s));
				}),
					(n || s) &&
						Ft(e, "change", () => {
							e.value = Ws(e.value, n, s);
						}),
					t ||
						(Ft(e, "compositionstart", Oa),
						Ft(e, "compositionend", Us),
						Ft(e, "change", Us));
			},
			mounted(e, { value: t }) {
				e.value = t ?? "";
			},
			beforeUpdate(
				e,
				{ value: t, oldValue: n, modifiers: { lazy: o, trim: l, number: s } },
				i
			) {
				if (((e[St] = Zt(i)), e.composing)) return;
				const r =
						(s || e.type === "number") && !/^0\d/.test(e.value)
							? Fn(e.value)
							: e.value,
					a = t ?? "";
				r !== a &&
					((document.activeElement === e &&
						e.type !== "range" &&
						((o && t === n) || (l && e.value.trim() === a))) ||
						(e.value = a));
			},
		},
		Pa = {
			deep: !0,
			created(e, t, n) {
				(e[St] = Zt(n)),
					Ft(e, "change", () => {
						const o = e._modelValue,
							l = wn(e),
							s = e.checked,
							i = e[St];
						if (le(o)) {
							const r = fo(o, l),
								a = r !== -1;
							if (s && !a) i(o.concat(l));
							else if (!s && a) {
								const u = [...o];
								u.splice(r, 1), i(u);
							}
						} else if (Vt(o)) {
							const r = new Set(o);
							s ? r.add(l) : r.delete(l), i(r);
						} else i(Js(e, s));
					});
			},
			mounted: Ks,
			beforeUpdate(e, t, n) {
				(e[St] = Zt(n)), Ks(e, t, n);
			},
		};
	function Ks(e, { value: t, oldValue: n }, o) {
		e._modelValue = t;
		let l;
		if (le(t)) l = fo(t, o.props.value) > -1;
		else if (Vt(t)) l = t.has(o.props.value);
		else {
			if (t === n) return;
			l = Bt(t, Js(e, !0));
		}
		e.checked !== l && (e.checked = l);
	}
	const zs = {
		deep: !0,
		created(e, { value: t, modifiers: { number: n } }, o) {
			const l = Vt(t);
			Ft(e, "change", () => {
				const s = Array.prototype.filter
					.call(e.options, (i) => i.selected)
					.map((i) => (n ? Fn(wn(i)) : wn(i)));
				e[St](e.multiple ? (l ? new Set(s) : s) : s[0]),
					(e._assigning = !0),
					_t(() => {
						e._assigning = !1;
					});
			}),
				(e[St] = Zt(o));
		},
		mounted(e, { value: t }) {
			Ys(e, t);
		},
		beforeUpdate(e, t, n) {
			e[St] = Zt(n);
		},
		updated(e, { value: t }) {
			e._assigning || Ys(e, t);
		},
	};
	function Ys(e, t) {
		const n = e.multiple,
			o = le(t);
		if (!(n && !o && !Vt(t))) {
			for (let l = 0, s = e.options.length; l < s; l++) {
				const i = e.options[l],
					r = wn(i);
				if (n)
					if (o) {
						const a = typeof r;
						a === "string" || a === "number"
							? (i.selected = t.some((u) => String(u) === String(r)))
							: (i.selected = fo(t, r) > -1);
					} else i.selected = t.has(r);
				else if (Bt(wn(i), t)) {
					e.selectedIndex !== l && (e.selectedIndex = l);
					return;
				}
			}
			!n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
		}
	}
	function wn(e) {
		return "_value" in e ? e._value : e.value;
	}
	function Js(e, t) {
		const n = t ? "_trueValue" : "_falseValue";
		return n in e ? e[n] : t;
	}
	const Aa = ["ctrl", "shift", "alt", "meta"],
		Ma = {
			stop: (e) => e.stopPropagation(),
			prevent: (e) => e.preventDefault(),
			self: (e) => e.target !== e.currentTarget,
			ctrl: (e) => !e.ctrlKey,
			shift: (e) => !e.shiftKey,
			alt: (e) => !e.altKey,
			meta: (e) => !e.metaKey,
			left: (e) => "button" in e && e.button !== 0,
			middle: (e) => "button" in e && e.button !== 1,
			right: (e) => "button" in e && e.button !== 2,
			exact: (e, t) => Aa.some((n) => e[`${n}Key`] && !t.includes(n)),
		},
		Ee = (e, t) => {
			if (!e) return e;
			const n = e._withMods || (e._withMods = {}),
				o = t.join(".");
			return (
				n[o] ||
				(n[o] = (l, ...s) => {
					for (let i = 0; i < t.length; i++) {
						const r = Ma[t[i]];
						if (r && r(l, t)) return;
					}
					return e(l, ...s);
				})
			);
		},
		Ia = {
			esc: "escape",
			space: " ",
			up: "arrow-up",
			left: "arrow-left",
			right: "arrow-right",
			down: "arrow-down",
			delete: "backspace",
		},
		no = (e, t) => {
			const n = e._withKeys || (e._withKeys = {}),
				o = t.join(".");
			return (
				n[o] ||
				(n[o] = (l) => {
					if (!("key" in l)) return;
					const s = mt(l.key);
					if (t.some((i) => i === s || Ia[i] === s)) return e(l);
				})
			);
		},
		La = Pe({ patchProp: Na }, ha);
	let Xs;
	function ja() {
		return Xs || (Xs = zr(La));
	}
	const Va = (...e) => {
		const t = ja().createApp(...e),
			{ mount: n } = t;
		return (
			(t.mount = (o) => {
				const l = Ha(o);
				if (!l) return;
				const s = t._component;
				!fe(s) && !s.render && !s.template && (s.template = l.innerHTML),
					l.nodeType === 1 && (l.textContent = "");
				const i = n(l, !1, Ba(l));
				return (
					l instanceof Element &&
						(l.removeAttribute("v-cloak"), l.setAttribute("data-v-app", "")),
					i
				);
			}),
			t
		);
	};
	function Ba(e) {
		if (e instanceof SVGElement) return "svg";
		if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
	}
	function Ha(e) {
		return Fe(e) ? document.querySelector(e) : e;
	}
	function qa() {
		const e = Ae([]);
		let t = 0;
		function n(s, i, r) {
			e.push({ id: ++t, cardDefName: s, doctype: i, recordName: r });
		}
		function o() {
			e.pop();
		}
		function l(s) {
			n(s.cardDefName, s.doctype, s.name);
		}
		return { cardStack: e, openCardModal: n, closeTopCard: o, onOpenCard: l };
	}
	function Ua(e) {
		if (!e || typeof e != "object") return null;
		const t = e.cardDefName ?? e.card_def_name,
			n = e.doctype,
			o = e.recordName ?? e.record_name ?? e.name;
		return !t || !n || !o ? null : { cardDefName: t, doctype: n, recordName: o };
	}
	function oo(e) {
		if (!e) return [];
		const t = e._panelRows;
		return t == null
			? Array.isArray(e.rows)
				? e.rows
				: []
			: Array.isArray(t)
			? t
			: typeof t == "object" && Array.isArray(t.value)
			? t.value
			: [];
	}
	function Wa({ openPanels: e, showFormDialog: t, sourcePanelId: n, docName: o }) {
		const l = de(() => {
				if (!R(t) || R(n) == null || !R(o))
					return { canPrev: !1, canNext: !1, index: -1, total: 0 };
				const a = e.find((h) => h.id === R(n));
				if (!a) return { canPrev: !1, canNext: !1, index: -1, total: 0 };
				const u = oo(a),
					c = u.findIndex((h) => h && h.name === R(o)),
					f = u.length;
				return { canPrev: c > 0, canNext: c >= 0 && c < f - 1, index: c, total: f };
			}),
			s = de(() => {
				const { index: a, total: u } = l.value;
				return u <= 1 || a < 0 ? "" : `${a + 1} / ${u}`;
			});
		function i() {
			const a = e.find((f) => f.id === R(n));
			if (!a) return;
			const u = oo(a),
				c = u.findIndex((f) => f && f.name === R(o));
			c <= 0 || (o.value = u[c - 1].name);
		}
		function r() {
			const a = e.find((f) => f.id === R(n));
			if (!a) return;
			const u = oo(a),
				c = u.findIndex((f) => f && f.name === R(o));
			c < 0 || c >= u.length - 1 || (o.value = u[c + 1].name);
		}
		return {
			formDialogNavInfo: l,
			formDialogNavLabel: s,
			onFormDialogNavPrev: i,
			onFormDialogNavNext: r,
		};
	}
	function Ka(e) {
		const t = X(!1),
			n = X(null),
			o = X(null),
			l = X(null),
			s = X(null),
			i = X([]),
			r = X(0),
			a = X(null),
			u = X(null),
			c = X(null),
			f = X(!1),
			h = X(1),
			{ formDialogNavInfo: v, formDialogNavLabel: b } = Wa({
				openPanels: e,
				showFormDialog: t,
				sourcePanelId: s,
				docName: n,
			});
		function w(B, K) {
			var pe, Q;
			if (
				!((pe = B == null ? void 0 : B.config) != null && pe.form_dialog) ||
				!(K != null && K.name)
			)
				return !1;
			(o.value = B.config.form_dialog),
				(l.value = B.doctype),
				(n.value = K.name),
				(s.value = B.id);
			const oe = (Q = B.config) == null ? void 0 : Q.required_fields;
			return (i.value = Array.isArray(oe) ? oe.slice() : []), (t.value = !0), !0;
		}
		function D() {
			(t.value = !1),
				(i.value = []),
				(n.value = null),
				(o.value = null),
				(l.value = null),
				(s.value = null),
				(a.value = null),
				(u.value = null),
				(c.value = null),
				(f.value = !1),
				(h.value = 1);
		}
		function S() {
			const B = l.value;
			(t.value = !1),
				(i.value = []),
				(n.value = null),
				(o.value = null),
				(l.value = null),
				(s.value = null),
				(a.value = null),
				(u.value = null),
				(c.value = null),
				(f.value = !1),
				(h.value = 1);
			const K = e.find((oe) => oe.doctype === B);
			K && K._reload && K._reload();
		}
		function N() {
			return e.find((B) => B.id === s.value);
		}
		function j(B) {
			const K = oo(N()),
				oe = K.findIndex((Q) => Q && Q.name === n.value);
			if (oe < 0) return null;
			const pe = oe + (B === "prev" ? -1 : 1);
			return pe < 0 || pe >= K.length ? null : K[pe].name;
		}
		function O(B) {
			const K = j(B);
			K && ((a.value = K), (u.value = o.value), (c.value = l.value));
		}
		function x() {
			(f.value = !0), (h.value = 1);
			const B = performance.now(),
				K = 300;
			function oe(pe) {
				const Q = pe - B,
					Z = Math.min(Q / K, 1);
				(h.value = 1 - Z * Z),
					Z < 1
						? requestAnimationFrame(oe)
						: ((r.value = 1 - r.value),
						  (n.value = a.value),
						  (o.value = u.value),
						  (l.value = c.value),
						  (a.value = null),
						  (u.value = null),
						  (c.value = null),
						  (h.value = 1),
						  (f.value = !1));
			}
			requestAnimationFrame(oe);
		}
		function E() {
			v.value.canPrev && (O("prev"), setTimeout(x, 300));
		}
		function L() {
			v.value.canNext && (O("next"), setTimeout(x, 300));
		}
		function H() {
			const B = l.value;
			if (!B) return;
			const K = e.find((oe) => oe.doctype === B);
			K && K._reload && K._reload();
		}
		return {
			showFormDialog: t,
			formDialogDocName: n,
			formDialogDefinition: o,
			formDialogDoctype: l,
			formDialogRequiredFields: i,
			formDialogSourcePanelId: s,
			formDialogNavInfo: v,
			formDialogNavLabel: b,
			onFormDialogNavPrev: E,
			onFormDialogNavNext: L,
			openFormDialogFromPanelRow: w,
			onFormDialogClose: D,
			onFormDialogSaved: S,
			reloadPanelForFormDialogDoctype: H,
			formDialogSlot: r,
			formDialogPendingDocName: a,
			formDialogPendingDefinition: u,
			formDialogPendingDoctype: c,
			formDialogDissolving: f,
			formDialogDissolveOpacity: h,
		};
	}
	function dt(e, t) {
		return new Promise((n, o) => {
			frappe.call({
				method: e,
				args: t,
				callback: (l) => (l.message != null ? n(l.message) : o("Empty response")),
				error: o,
			});
		});
	}
	function Gs(e, t = {}) {
		const n = $l(null),
			o = X([]),
			l = X([]),
			s = X(0),
			i = X(0),
			r = X(!1),
			a = X(null),
			u = X([]);
		let c = [];
		const f = X([]);
		let h = 0;
		function v() {
			return dt("nce_events.api.panel_api.get_panel_config", { root_doctype: e });
		}
		function b(x = {}) {
			return dt("nce_events.api.panel_api.get_panel_data", {
				root_doctype: e,
				filters: JSON.stringify({ ...t, ...x }),
			});
		}
		function w(x) {
			if (!x) return x;
			const E = String(x).trim().toLowerCase();
			if (E === "today") {
				const B = new Date();
				return B.setHours(0, 0, 0, 0), B.toISOString().slice(0, 10);
			}
			const L = E.match(/^(\d+)\s+(day|month|year)s?\s+ago$/);
			if (L) {
				const B = parseInt(L[1], 10),
					K = L[2],
					oe = new Date();
				return (
					oe.setHours(0, 0, 0, 0),
					K === "day" && oe.setDate(oe.getDate() - B),
					K === "month" && oe.setMonth(oe.getMonth() - B),
					K === "year" && oe.setFullYear(oe.getFullYear() - B),
					oe.toISOString().slice(0, 10)
				);
			}
			const H = E.match(
				/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/
			);
			if (H) {
				const B = H[1] === "-" ? -1 : 1,
					K = parseInt(H[2], 10) * B,
					oe = H[3],
					pe = new Date();
				return (
					pe.setHours(0, 0, 0, 0),
					oe === "day" && pe.setDate(pe.getDate() + K),
					oe === "month" && pe.setMonth(pe.getMonth() + K),
					oe === "year" && pe.setFullYear(pe.getFullYear() + K),
					pe.toISOString().slice(0, 10)
				);
			}
			if (/^(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))$/.test(E)) {
				const B = new Date();
				return B.setHours(0, 0, 0, 0), B.toISOString().slice(0, 10);
			}
			return x;
		}
		function D(x, E) {
			return E.length
				? x.filter((L) => {
						for (const H of E) {
							if (!H.field) continue;
							const B = L[H.field],
								K = H.value;
							if (B == null) {
								if (H.op !== "!=") return !1;
								continue;
							}
							const oe = String(B).trim(),
								pe = String(w(K) ?? "").trim(),
								Q = /^\d{4}-\d{2}-\d{2}/;
							if (Q.test(oe) && Q.test(pe)) {
								const Ce = oe.slice(0, 10),
									ke = pe.slice(0, 10);
								switch (H.op) {
									case "=":
										if (Ce !== ke) return !1;
										break;
									case "!=":
										if (Ce === ke) return !1;
										break;
									case ">":
										if (!(Ce > ke)) return !1;
										break;
									case "<":
										if (!(Ce < ke)) return !1;
										break;
									case ">=":
										if (!(Ce >= ke)) return !1;
										break;
									case "<=":
										if (!(Ce <= ke)) return !1;
										break;
									default:
										if (Ce !== ke) return !1;
								}
								continue;
							}
							const Z = oe.toLowerCase(),
								he = pe.toLowerCase(),
								se = parseFloat(oe),
								ie = parseFloat(pe),
								ne = !isNaN(se) && !isNaN(ie);
							switch (H.op) {
								case "=":
									if (Z !== he) return !1;
									break;
								case "!=":
									if (Z === he) return !1;
									break;
								case ">":
									if (ne ? se <= ie : Z <= he) return !1;
									break;
								case "<":
									if (ne ? se >= ie : Z >= he) return !1;
									break;
								case ">=":
									if (ne ? se < ie : Z < he) return !1;
									break;
								case "<=":
									if (ne ? se > ie : Z > he) return !1;
									break;
								case "like":
									if (!Z.includes(he)) return !1;
									break;
								case "in": {
									if (
										!he
											.split(",")
											.map((ke) => ke.trim())
											.includes(Z)
									)
										return !1;
									break;
								}
								default:
									if (Z !== he) return !1;
							}
						}
						return !0;
				  })
				: x;
		}
		function S() {
			const x = f.value.filter((L) => L.field && String(L.value ?? "") !== ""),
				E = x.length > 0 ? x : c;
			(l.value = D(u.value, E)), (s.value = l.value.length);
		}
		async function N() {
			const x = ++h;
			(r.value = !0), (a.value = null);
			try {
				const [E, L] = await Promise.all([v(), b()]);
				if (x !== h) return;
				(n.value = E),
					(o.value = L.columns || []),
					(u.value = L.rows || []),
					(c = L.default_filters || []),
					S(),
					(i.value = L.full_count ?? 0),
					(r.value = !1);
			} catch (E) {
				if (x !== h) return;
				(a.value = String(E)),
					console.error(`Panel load error [${e}]:`, E),
					(r.value = !1);
			}
		}
		async function j() {
			const x = ++h;
			(r.value = !0), (a.value = null);
			try {
				const [E, L] = await Promise.all([v(), b()]);
				if (x !== h) return;
				(n.value = E),
					(o.value = L.columns || []),
					(u.value = L.rows || []),
					(c = L.default_filters || []),
					S(),
					(i.value = L.full_count ?? 0),
					(r.value = !1);
			} catch (E) {
				if (x !== h) return;
				(a.value = String(E)),
					console.error(`Panel reload error [${e}]:`, E),
					(r.value = !1);
			}
		}
		function O(x = []) {
			(f.value = x), S();
		}
		return {
			config: n,
			columns: o,
			rows: l,
			total: s,
			fullTotal: i,
			loading: r,
			error: a,
			load: N,
			reload: j,
			setFilters: O,
		};
	}
	const De = (e, t) => {
			const n = e.__vccOpts || e;
			for (const [o, l] of t) n[o] = l;
			return n;
		},
		za = { class: "ppv2-float-body" };
	let Ya = 100;
	function Zs() {
		return ++Ya;
	}
	const Qs = De(
			{
				__name: "PanelFloat",
				props: {
					initX: { type: Number, default: 40 },
					initY: { type: Number, default: 60 },
					initW: { type: Number, default: 900 },
					initH: { type: Number, default: 550 },
				},
				emits: ["close"],
				setup(e, { emit: t }) {
					const n = e,
						o = X(n.initX),
						l = X(n.initY),
						s = X(n.initW),
						i = X(n.initH),
						r = X(Zs()),
						a = X(null),
						u = de(() => ({
							transform: `translate3d(${o.value}px, ${l.value}px, 0)`,
							width: s.value + "px",
							height: i.value + "px",
							zIndex: r.value,
						}));
					function c() {
						r.value = Zs();
					}
					function f(b) {
						const w = document.createElement("div");
						return (
							(w.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;cursor:${b};`),
							document.body.appendChild(w),
							w
						);
					}
					function h(b) {
						const w = b.clientX,
							D = b.clientY,
							S = o.value,
							N = l.value,
							j = a.value,
							O = f("move");
						function x(L) {
							const H = S + L.clientX - w,
								B = Math.max(0, N + L.clientY - D);
							j.style.transform = `translate3d(${H}px, ${B}px, 0)`;
						}
						function E(L) {
							document.body.removeChild(O);
							const H = Math.abs(L.clientX - w),
								B = Math.abs(L.clientY - D);
							H < 10 && B < 10 && c(),
								(o.value = S + L.clientX - w),
								(l.value = Math.max(0, N + L.clientY - D)),
								document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", E);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", E);
					}
					function v(b) {
						c();
						const w = b.clientX,
							D = b.clientY,
							S = s.value,
							N = i.value,
							j = a.value,
							O = f("nwse-resize"),
							x = j.getBoundingClientRect(),
							E = document.createElement("div");
						(E.style.cssText = `position:fixed;left:${x.left}px;top:${x.top}px;width:${S}px;height:${N}px;border:1px solid var(--bg-header, #4a5568);z-index:999998;pointer-events:none;box-sizing:border-box;`),
							document.body.appendChild(E);
						function L(B) {
							(E.style.width = Math.max(300, S + B.clientX - w) + "px"),
								(E.style.height = Math.max(200, N + B.clientY - D) + "px");
						}
						function H(B) {
							document.body.removeChild(O),
								document.body.removeChild(E),
								(s.value = Math.max(300, S + B.clientX - w)),
								(i.value = Math.max(200, N + B.clientY - D)),
								document.removeEventListener("mousemove", L),
								document.removeEventListener("mouseup", H);
						}
						document.addEventListener("mousemove", L),
							document.addEventListener("mouseup", H);
					}
					return (b, w) => (
						_(),
						C(
							"div",
							{
								ref_key: "floatEl",
								ref: a,
								class: "ppv2-float",
								style: Re(u.value),
							},
							[
								A(
									"div",
									{
										class: "ppv2-float-header",
										onMousedown: Ee(h, ["prevent"]),
									},
									[Eo(b.$slots, "header", {}, void 0)],
									32
								),
								A("div", za, [Eo(b.$slots, "default", {}, void 0)]),
								A(
									"div",
									{
										class: "ppv2-float-footer",
										onMousedown: Ee(h, ["prevent"]),
									},
									[Eo(b.$slots, "footer", {}, void 0)],
									32
								),
								A(
									"div",
									{
										class: "ppv2-resize-handle",
										onMousedown: Ee(v, ["prevent"]),
									},
									null,
									32
								),
							],
							4
						)
					);
				},
			},
			[["__scopeId", "data-v-ea83bc6b"]]
		),
		Ja = { key: 0, class: "ppv2-filter-widget" },
		Xa = ["onUpdate:modelValue", "onChange"],
		Ga = ["value"],
		Za = { key: 0, class: "ppv2-filter-ops" },
		Qa = ["onClick"],
		ec = ["value", "onInput"],
		tc = ["value", "onInput"],
		nc = ["onUpdate:modelValue"],
		oc = ["onClick"],
		lc = { key: 1, class: "ppv2-loading" },
		sc = { key: 2, class: "ppv2-error" },
		ic = { key: 3, class: "ppv2-body" },
		rc = { class: "ppv2-table" },
		ac = ["onMousedown"],
		cc = { key: 0, class: "ppv2-action-th" },
		uc = ["onClick", "onContextmenu"],
		fc = ["href"],
		dc = ["onClick"],
		pc = { key: 0, class: "ppv2-action-td" },
		mc = ["onClick"],
		hc = ["onClick"],
		gc = ["onClick"],
		ei = De(
			{
				__name: "PanelTable",
				props: {
					title: { type: String, default: "" },
					columns: { type: Array, default: () => [] },
					rows: { type: Array, default: () => [] },
					total: { type: Number, default: 0 },
					loading: { type: Boolean, default: !1 },
					error: { type: String, default: null },
					selectedName: { type: String, default: null },
					showEmail: { type: Boolean, default: !1 },
					showSms: { type: Boolean, default: !1 },
					config: { type: Object, default: () => ({}) },
					defaultFilters: { type: Array, default: () => [] },
					showFilter: { type: Boolean, default: !1 },
				},
				emits: [
					"row-click",
					"row-drop",
					"close",
					"drill",
					"sheets",
					"email",
					"sms",
					"filter-change",
					"email-one",
					"sms-one",
					"refresh",
					"show-filter",
				],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = ["=", "!=", ">", "<", ">=", "<=", "like", "in"],
						s = ["=", ">", "<"],
						i = Ae([]),
						r = Ae({}),
						a = X(null);
					let u = null;
					function c(q, z) {
						q.ctrlKey ? (q.preventDefault(), o("row-drop", z)) : o("row-click", z);
					}
					function f(q, z) {
						q.ctrlKey && (q.preventDefault(), o("row-drop", z));
					}
					function h(q, z, U) {
						const me = z.slice(0, 20),
							ee = 50,
							p = 500,
							g = Math.max(200, (U || 800) - 160),
							d = q.map((I) => {
								let T = 0;
								me.forEach((Y) => {
									const W = ne(Y, I.fieldname);
									T += String(W ?? "").length;
								});
								const V = (I.label || I.fieldname).length,
									$ = me.length > 0 ? T / me.length : V;
								return Math.max($, V, 2);
							});
						let m = d.reduce((I, T) => I + T, 0);
						m <= 0 && (m = 1);
						let y = d.map((I) => Math.min(p, Math.max(ee, Math.round((I / m) * g))));
						const F = y.reduce((I, T) => I + T, 0);
						if (F > g && F > 0) {
							const I = g / F;
							y = y.map((T) => Math.floor(T * I));
						}
						return y;
					}
					ze(
						() => [n.rows, n.columns],
						() => {
							var q;
							(q = n.columns) != null &&
								q.length &&
								_t(() => {
									const z = a.value,
										U =
											(z == null ? void 0 : z.offsetWidth) ??
											(z == null ? void 0 : z.clientWidth) ??
											0;
									h(n.columns, n.rows || [], U).forEach((ee, p) => {
										r[p] = ee;
									});
								});
						},
						{ immediate: !0 }
					);
					const v = de(() => (n.config.email_field || "").trim().toLowerCase()),
						b = de(() => (n.config.sms_field || "").trim().toLowerCase()),
						w = de(() => !!v.value),
						D = de(() => !!b.value),
						S = de(() => n.columns),
						N = de(() => {
							const q = {};
							return (
								(n.config.bold_fields || []).forEach((z) => {
									q[z.toLowerCase()] = !0;
								}),
								q
							);
						}),
						j = de(() => {
							const q = {};
							return (
								(n.config.gender_color_fields || []).forEach((z) => {
									q[z.toLowerCase()] = !0;
								}),
								q
							);
						}),
						O = de(() => (n.config.gender_column || "").trim().toLowerCase()),
						x = de(() => (n.config.male_hex || "").trim()),
						E = de(() => (n.config.female_hex || "").trim()),
						L = de(() => n.config.tint_by_gender || {}),
						H = new Set(["Date", "Datetime"]);
					function B(q) {
						return n.columns.find((z) => z.fieldname === q) || null;
					}
					function K(q) {
						if (!q) return !1;
						const z = B(q);
						return z && z.fieldtype
							? H.has(z.fieldtype)
							: /date|_at$/.test(q.toLowerCase());
					}
					function oe(q) {
						return K(q.field) ? s : l;
					}
					function pe(q) {
						(q.value = ""),
							(q._sqlDate = ""),
							(q._daysAgo = ""),
							K(q.field) && !s.includes(q.op) && (q.op = ">"),
							!K(q.field) && !l.includes(q.op) && (q.op = "=");
					}
					function Q(q, z) {
						(q._sqlDate = z), (q._daysAgo = ""), (q.value = z);
					}
					function Z(q, z) {
						(q._daysAgo = z), (q._sqlDate = ""), (q.value = z ? z + " days ago" : "");
					}
					ze(
						() => n.defaultFilters,
						(q) => {
							!q ||
								!q.length ||
								i.some((U) => U.field && String(U.value ?? "") !== "") ||
								(i.splice(
									0,
									i.length,
									...q.map((U) => {
										let me = "",
											ee = "";
										return (
											U.value &&
												(/days ago|month|today/i.test(U.value)
													? (ee = U.value
															.replace(/\s*days ago$/i, "")
															.trim())
													: (me = U.value)),
											{
												field: U.field,
												op: U.op,
												value: U.value,
												_sqlDate: me,
												_daysAgo: ee,
											}
										);
									})
								),
								o("show-filter", !0),
								se());
						},
						{ immediate: !0 }
					);
					function he() {
						return i
							.filter((q) => q.field && String(q.value || "") !== "")
							.map((q) => ({ field: q.field, op: q.op, value: q.value }));
					}
					function se() {
						u && clearTimeout(u), o("filter-change", he());
					}
					function ie() {
						u && clearTimeout(u),
							(u = setTimeout(() => o("filter-change", he()), 1200));
					}
					function ne(q, z) {
						return z ? q[z] ?? q[z.toLowerCase()] ?? q[z.toUpperCase()] ?? null : null;
					}
					function Ce(q, z) {
						const U = ne(q, z.fieldname);
						return U == null
							? ""
							: typeof U == "object"
							? JSON.stringify(U)
							: String(U);
					}
					function ke(q, z) {
						return `/app/${q.toLowerCase().replace(/ /g, "-")}/${encodeURIComponent(
							z
						)}`;
					}
					function Ye(q) {
						const z = ne(q, v.value);
						return z && String(z).includes("@");
					}
					function Ie(q) {
						const z = ne(q, b.value);
						return z && /[\d+]/.test(String(z));
					}
					function $t(q) {
						const z = ne(q, b.value);
						if (!z) return;
						const U = String(z).replace(/\s+/g, "");
						window.open("tel:" + U, "_self");
					}
					function Dt(q, z) {
						if (!q) return !1;
						const U = String(q).toLowerCase().trim();
						return z === "male"
							? U === "male" || U === "m" || U === "boy"
							: z === "female"
							? U === "female" || U === "f" || U === "girl"
							: !1;
					}
					function Tt(q, z) {
						const U = z.fieldname.toLowerCase(),
							me = {};
						if (j.value[U]) {
							const ee = L.value[U];
							if (ee === "Male" && x.value)
								(me.fontWeight = "700"), (me.color = x.value);
							else if (ee === "Female" && E.value)
								(me.fontWeight = "700"), (me.color = E.value);
							else {
								const p = ne(q, O.value);
								Dt(p, "male") && x.value
									? ((me.fontWeight = "700"), (me.color = x.value))
									: Dt(p, "female") &&
									  E.value &&
									  ((me.fontWeight = "700"), (me.color = E.value));
							}
						} else N.value[U] && (me.fontWeight = "700");
						return me;
					}
					function Ge(q, z) {
						const U = q.clientX,
							ee = q.target.parentElement.offsetWidth;
						function p(d) {
							r[z] = Math.max(40, ee + d.clientX - U);
						}
						function g() {
							document.removeEventListener("mousemove", p),
								document.removeEventListener("mouseup", g);
						}
						document.addEventListener("mousemove", p),
							document.addEventListener("mouseup", g);
					}
					return (q, z) => (
						_(),
						C(
							"div",
							{ ref_key: "panelRef", ref: a, class: "ppv2-panel" },
							[
								n.showFilter
									? (_(),
									  C("div", Ja, [
											(_(!0),
											C(
												ce,
												null,
												be(
													i,
													(U, me) => (
														_(),
														C(
															"div",
															{ key: me, class: "ppv2-filter-row" },
															[
																ot(
																	A(
																		"select",
																		{
																			"onUpdate:modelValue":
																				(ee) =>
																					(U.field = ee),
																			class: "ppv2-filter-col",
																			onChange: (ee) => {
																				pe(U), se();
																			},
																		},
																		[
																			z[2] ||
																				(z[2] = A(
																					"option",
																					{ value: "" },
																					"— column —",
																					-1
																				)),
																			(_(!0),
																			C(
																				ce,
																				null,
																				be(
																					e.columns,
																					(ee) => (
																						_(),
																						C(
																							"option",
																							{
																								key: ee.fieldname,
																								value: ee.fieldname,
																							},
																							G(
																								ee.label
																							),
																							9,
																							Ga
																						)
																					)
																				),
																				128
																			)),
																		],
																		40,
																		Xa
																	),
																	[[zs, U.field]]
																),
																U.field
																	? (_(),
																	  C("span", Za, [
																			(_(!0),
																			C(
																				ce,
																				null,
																				be(
																					oe(U),
																					(ee) => (
																						_(),
																						C(
																							"button",
																							{
																								key: ee,
																								class: Ve(
																									[
																										"ppv2-op-btn",
																										{
																											active:
																												U.op ===
																												ee,
																										},
																									]
																								),
																								onClick:
																									(
																										p
																									) => {
																										(U.op =
																											ee),
																											se();
																									},
																							},
																							G(ee),
																							11,
																							Qa
																						)
																					)
																				),
																				128
																			)),
																	  ]))
																	: ue("", !0),
																U.field && K(U.field)
																	? (_(),
																	  C(
																			ce,
																			{ key: 1 },
																			[
																				A(
																					"input",
																					{
																						value:
																							U._sqlDate ||
																							"",
																						class: "ppv2-filter-val",
																						placeholder:
																							"Enter a SQL date e.g. 1950-06-08",
																						onInput: (
																							ee
																						) => {
																							Q(
																								U,
																								ee
																									.target
																									.value
																							),
																								ie();
																						},
																					},
																					null,
																					40,
																					ec
																				),
																				A(
																					"input",
																					{
																						value:
																							U._daysAgo ||
																							"",
																						class: "ppv2-filter-val",
																						placeholder:
																							"OR enter days ago e.g. 30",
																						onInput: (
																							ee
																						) => {
																							Z(
																								U,
																								ee
																									.target
																									.value
																							),
																								ie();
																						},
																					},
																					null,
																					40,
																					tc
																				),
																			],
																			64
																	  ))
																	: U.field
																	? ot(
																			(_(),
																			C(
																				"input",
																				{
																					key: 2,
																					"onUpdate:modelValue":
																						(ee) =>
																							(U.value =
																								ee),
																					class: "ppv2-filter-val",
																					placeholder:
																						"value",
																					onInput: ie,
																				},
																				null,
																				40,
																				nc
																			)),
																			[[It, U.value]]
																	  )
																	: ue("", !0),
																U.field
																	? (_(),
																	  C(
																			"button",
																			{
																				key: 3,
																				class: "ppv2-filter-rm",
																				onClick: (ee) => {
																					i.splice(
																						me,
																						1
																					),
																						se();
																				},
																			},
																			"×",
																			8,
																			oc
																	  ))
																	: ue("", !0),
															]
														)
													)
												),
												128
											)),
											A(
												"button",
												{
													class: "ppv2-filter-add",
													onClick:
														z[0] ||
														(z[0] = (U) =>
															i.push({
																field: "",
																op: ">",
																value: "",
															})),
												},
												"Add Filter ▼"
											),
									  ]))
									: ue("", !0),
								e.loading
									? (_(), C("div", lc, "Loading…"))
									: e.error
									? (_(), C("div", sc, G(e.error), 1))
									: e.config
									? (_(),
									  C("div", ic, [
											A("table", rc, [
												A("thead", null, [
													A("tr", null, [
														(_(!0),
														C(
															ce,
															null,
															be(
																S.value,
																(U, me) => (
																	_(),
																	C(
																		"th",
																		{
																			key: U.fieldname,
																			style: Re({
																				width: r[me]
																					? r[me] + "px"
																					: "auto",
																				minWidth: "40px",
																			}),
																		},
																		[
																			Qe(
																				G(U.label) + " ",
																				1
																			),
																			A(
																				"div",
																				{
																					class: "ppv2-col-resize",
																					onMousedown:
																						Ee(
																							(ee) =>
																								Ge(
																									ee,
																									me
																								),
																							[
																								"prevent",
																							]
																						),
																				},
																				null,
																				40,
																				ac
																			),
																		],
																		4
																	)
																)
															),
															128
														)),
														w.value || D.value
															? (_(), C("th", cc))
															: ue("", !0),
													]),
												]),
												A("tbody", null, [
													(_(!0),
													C(
														ce,
														null,
														be(
															e.rows,
															(U, me) => (
																_(),
																C(
																	"tr",
																	{
																		key: U.name || me,
																		class: Ve({
																			"ppv2-alt":
																				me % 2 === 1,
																			"ppv2-selected":
																				e.selectedName ===
																				U.name,
																		}),
																		onClick: (ee) => c(ee, U),
																		onContextmenu: (ee) =>
																			f(ee, U),
																	},
																	[
																		(_(!0),
																		C(
																			ce,
																			null,
																			be(
																				S.value,
																				(ee) => (
																					_(),
																					C(
																						"td",
																						{
																							key: ee.fieldname,
																							style: Re(
																								Tt(
																									U,
																									ee
																								)
																							),
																						},
																						[
																							ee.is_link &&
																							ee.link_doctype &&
																							ne(
																								U,
																								ee.fieldname
																							)
																								? (_(),
																								  C(
																										"a",
																										{
																											key: 0,
																											class: "ppv2-link-val",
																											href: ke(
																												ee.link_doctype,
																												ne(
																													U,
																													ee.fieldname
																												)
																											),
																											target: "_blank",
																											onClick:
																												z[1] ||
																												(z[1] =
																													Ee(() => {}, [
																														"stop",
																													])),
																										},
																										G(
																											Ce(
																												U,
																												ee
																											)
																										),
																										9,
																										fc
																								  ))
																								: ee.is_related_link &&
																								  ee.related_doctype
																								? (_(),
																								  C(
																										"span",
																										{
																											key: 1,
																											class: "ppv2-related-link",
																											onClick:
																												Ee(
																													(
																														p
																													) =>
																														q.$emit(
																															"drill",
																															{
																																doctype:
																																	ee.related_doctype,
																																linkField:
																																	ee.related_link_field,
																																rowName:
																																	U.name,
																																parentRow:
																																	U,
																															}
																														),
																													[
																														"stop",
																													]
																												),
																										},
																										G(
																											Ce(
																												U,
																												ee
																											)
																										),
																										9,
																										dc
																								  ))
																								: (_(),
																								  C(
																										ce,
																										{
																											key: 2,
																										},
																										[
																											Qe(
																												G(
																													Ce(
																														U,
																														ee
																													)
																												),
																												1
																											),
																										],
																										64
																								  )),
																						],
																						4
																					)
																				)
																			),
																			128
																		)),
																		w.value || D.value
																			? (_(),
																			  C("td", pc, [
																					w.value &&
																					Ye(U)
																						? (_(),
																						  C(
																								"button",
																								{
																									key: 0,
																									class: "ppv2-row-btn",
																									title: "Send email",
																									onClick:
																										Ee(
																											(
																												ee
																											) =>
																												q.$emit(
																													"email-one",
																													U
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(z[3] ||
																										(z[3] =
																											[
																												A(
																													"i",
																													{
																														class: "fa fa-envelope",
																													},
																													null,
																													-1
																												),
																											])),
																								],
																								8,
																								mc
																						  ))
																						: ue(
																								"",
																								!0
																						  ),
																					D.value &&
																					Ie(U)
																						? (_(),
																						  C(
																								"button",
																								{
																									key: 1,
																									class: "ppv2-row-btn",
																									title: "Call",
																									onClick:
																										Ee(
																											(
																												ee
																											) =>
																												$t(
																													U
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(z[4] ||
																										(z[4] =
																											[
																												A(
																													"i",
																													{
																														class: "fa fa-phone",
																													},
																													null,
																													-1
																												),
																											])),
																								],
																								8,
																								hc
																						  ))
																						: ue(
																								"",
																								!0
																						  ),
																					D.value &&
																					Ie(U)
																						? (_(),
																						  C(
																								"button",
																								{
																									key: 2,
																									class: "ppv2-row-btn",
																									title: "Send SMS",
																									onClick:
																										Ee(
																											(
																												ee
																											) =>
																												q.$emit(
																													"sms-one",
																													U
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(z[5] ||
																										(z[5] =
																											[
																												A(
																													"i",
																													{
																														class: "fa fa-comment",
																													},
																													null,
																													-1
																												),
																											])),
																								],
																								8,
																								gc
																						  ))
																						: ue(
																								"",
																								!0
																						  ),
																			  ]))
																			: ue("", !0),
																	],
																	42,
																	uc
																)
															)
														),
														128
													)),
												]),
											]),
									  ]))
									: ue("", !0),
							],
							512
						)
					);
				},
			},
			[["__scopeId", "data-v-de862b0f"]]
		),
		vc = {
			"Section Break": 1,
			"Column Break": 1,
			"Tab Break": 1,
			HTML: 1,
			Fold: 1,
			Heading: 1,
			Button: 1,
			"Table MultiSelect": 1,
		},
		yc = {
			name: 1,
			owner: 1,
			creation: 1,
			modified: 1,
			modified_by: 1,
			docstatus: 1,
			idx: 1,
			parent: 1,
			parentfield: 1,
			parenttype: 1,
		};
	function _c() {
		const e = Ae([]),
			t = Ae({});
		function n() {
			e.splice(0), Object.keys(t).forEach((r) => delete t[r]);
		}
		function o(r, a, u, c) {
			for (; e.length > c; ) {
				const h = e.pop();
				delete t[h.doctype];
			}
			t[r] = !0;
			const f = Ae({ doctype: r, via_field: a, via_type: u, fields: [], activeField: null });
			return (
				e.push(f),
				new Promise((h) => {
					frappe.model.with_doctype(r, () => {
						const v = frappe.get_meta(r),
							b = [];
						(v.fields || []).forEach((w) => {
							if (!vc[w.fieldtype]) {
								if (w.fieldtype === "Table") {
									b.push({
										fieldname: w.fieldname,
										label: w.label || w.fieldname,
										fieldtype: w.fieldtype,
										options: w.options || "",
										is_link: !1,
										is_table: !0,
									});
									return;
								}
								yc[w.fieldname] ||
									b.push({
										fieldname: w.fieldname,
										label: w.label || w.fieldname,
										fieldtype: w.fieldtype,
										options: w.options || "",
										is_link: w.fieldtype === "Link",
										is_table: !1,
									});
							}
						}),
							c === 0
								? frappe.call({
										method: "nce_events.api.tags.get_pronoun_tags_for_doctype",
										args: { doctype: r },
										freeze: !1,
										callback(w) {
											const D = (w.message || []).map((S) => ({
												fieldname: S.field_name,
												label: S.label || S.field_name,
												jinja_tag: S.jinja_tag || "",
												is_pronoun: !0,
											}));
											(f.fields = D.concat(b)), h();
										},
										error() {
											(f.fields = b), h();
										},
								  })
								: ((f.fields = b), h());
					});
				})
			);
		}
		function l(r, a) {
			if (a.is_pronoun && a.jinja_tag) return a.jinja_tag;
			const u = e.slice(0, r + 1);
			let c = -1;
			for (let f = 1; f < u.length; f++)
				if (u[f].via_type === "Table") {
					c = f;
					break;
				}
			return c === -1 ? bc(u, a) : wc(u, a, c);
		}
		function s(r, a) {
			const u = [];
			for (let c = 0; c <= r; c++) {
				const f = e[c];
				c === 0 || u.push(`${f.via_field} (${f.via_type})`), u.push(f.doctype);
			}
			return u.push(a.fieldname), u.join(" → ");
		}
		function i(r, a, u) {
			let c = r;
			if (a) {
				const f = a.replace(/'/g, "\\'");
				c = c.replace(/\{\{([^}]+)\}\}/g, (h, v) => `{{ ${v.trim()} | default('${f}') }}`);
			}
			return (
				u &&
					(c = c.replace(/\{\{([^}]+)\}\}/g, (f, h) => {
						const v = h.trim();
						return v.includes("| safe") ? f : `{{ ${v} | safe }}`;
					})),
				c
			);
		}
		return {
			columns: e,
			visited: t,
			reset: n,
			loadColumn: o,
			buildTag: l,
			buildPath: s,
			applyFilters: i,
		};
	}
	function bc(e, t) {
		const n = e.length - 1;
		if (n === 0) return `{{ doc.${t.fieldname} }}`;
		if (n === 1)
			return `{{ frappe.db.get_value('${e[1].doctype}', doc.${e[1].via_field}, '${t.fieldname}') }}`;
		if (n === 2)
			return `{{ frappe.db.get_value('${e[2].doctype}', frappe.db.get_value('${e[1].doctype}', doc.${e[1].via_field}, '${e[2].via_field}'), '${t.fieldname}') }}`;
		const o = [];
		o.push(`{% set hop1 = frappe.get_doc('${e[1].doctype}', doc.${e[1].via_field}) %}`);
		for (let l = 2; l < e.length; l++)
			o.push(
				`{% set hop${l} = frappe.get_doc('${e[l].doctype}', hop${l - 1}.${
					e[l].via_field
				}) %}`
			);
		return (
			o.push(`{{ hop${e.length - 1}.${t.fieldname} }}`),
			o.join(`
`)
		);
	}
	function wc(e, t, n) {
		const o = e.slice(0, n),
			l = e[n].via_field,
			s = e.slice(n),
			i = o.length - 1,
			r = [];
		let a;
		if (i === 0) a = `doc.${l}`;
		else if (i === 1)
			r.push(
				`{% set parent_doc = frappe.get_doc('${o[1].doctype}', doc.${o[1].via_field}) %}`
			),
				(a = `parent_doc.${l}`);
		else {
			r.push(`{% set hop1 = frappe.get_doc('${o[1].doctype}', doc.${o[1].via_field}) %}`);
			for (let f = 2; f < o.length; f++)
				r.push(
					`{% set hop${f} = frappe.get_doc('${o[f].doctype}', hop${f - 1}.${
						o[f].via_field
					}) %}`
				);
			a = `hop${o.length - 1}.${l}`;
		}
		const u = s.length - 1;
		let c;
		if (u === 0) c = `{{ row.${t.fieldname} }}`;
		else if (u === 1)
			c = `{{ frappe.db.get_value('${s[1].doctype}', row.${s[1].via_field}, '${t.fieldname}') }}`;
		else {
			const f = [];
			f.push(`{% set rh1 = frappe.get_doc('${s[1].doctype}', row.${s[1].via_field}) %}`);
			for (let h = 2; h < s.length; h++)
				f.push(
					`{% set rh${h} = frappe.get_doc('${s[h].doctype}', rh${h - 1}.${
						s[h].via_field
					}) %}`
				);
			f.push(`{{ rh${s.length - 1}.${t.fieldname} }}`),
				(c = f.join(`
`));
		}
		return (
			r.push(`{% for row in ${a} %}`),
			r.push(c),
			r.push("{% endfor %}"),
			r.join(`
`)
		);
	}
	const xc = { class: "tf-column" },
		Cc = { class: "tf-col-header" },
		Sc = { class: "tf-col-count" },
		$c = { class: "tf-tiles" },
		kc = ["title", "onClick"],
		Fc = { class: "tf-tile-top" },
		Dc = { class: "tf-tile-label" },
		Tc = { key: 0, class: "tf-tile-arrow" },
		Nc = { class: "tf-tile-meta" },
		Ec = { class: "tf-tile-fieldname" },
		Rc = { class: "tf-tile-badge" },
		Oc = De(
			{
				__name: "TagColumn",
				props: {
					col: { type: Object, required: !0 },
					colIndex: { type: Number, default: 0 },
					columns: { type: Array, default: () => [] },
				},
				emits: ["navigate", "select-field"],
				setup(e, { emit: t }) {
					const n = e,
						o = t;
					function l(a) {
						if (!(a.is_link || a.is_table) || !a.options) return !1;
						for (let u = 0; u < n.colIndex; u++)
							if (n.columns[u] && n.columns[u].doctype === a.options) return !0;
						return !1;
					}
					function s(a) {
						const u = ["tf-tile"];
						return (
							a.is_pronoun
								? u.push("tf-tile-pronoun")
								: l(a)
								? u.push("tf-tile-circular")
								: a.is_link
								? u.push("tf-tile-link")
								: a.is_table && u.push("tf-tile-table"),
							n.col.activeField === a.fieldname && u.push("tf-tile-active"),
							u.join(" ")
						);
					}
					function i(a) {
						if (a.is_pronoun) return "pronoun";
						let u = a.fieldtype;
						return (
							(a.is_link || a.is_table) && a.options && (u += ` → ${a.options}`), u
						);
					}
					function r(a) {
						l(a) ||
							(a.is_link || a.is_table ? o("navigate", a) : o("select-field", a));
					}
					return (a, u) => (
						_(),
						C("div", xc, [
							A("div", Cc, [
								Qe(G(e.col.doctype) + " ", 1),
								A("span", Sc, G(e.col.fields.length) + " fields", 1),
							]),
							A("div", $c, [
								(_(!0),
								C(
									ce,
									null,
									be(
										e.col.fields,
										(c) => (
											_(),
											C(
												"div",
												{
													key: c.fieldname,
													class: Ve(s(c)),
													title: l(c)
														? `Circular: ${c.options} already visited`
														: "",
													onClick: (f) => r(c),
												},
												[
													A("div", Fc, [
														A("span", Dc, G(c.label), 1),
														(c.is_link || c.is_table) && !l(c)
															? (_(), C("span", Tc, "▶"))
															: ue("", !0),
													]),
													A("div", Nc, [
														A("span", Ec, G(c.fieldname), 1),
														A("span", Rc, G(i(c)), 1),
													]),
												],
												10,
												kc
											)
										)
									),
									128
								)),
							]),
						])
					);
				},
			},
			[["__scopeId", "data-v-0ee1bc18"]]
		),
		Pc = { class: "tf-tag-body" },
		Ac = { class: "tf-actions" },
		Mc = { class: "tf-check-label" },
		Ic = { class: "tf-btn-group" },
		Lc = De(
			{
				__name: "TagDialog",
				props: {
					field: { type: Object, required: !0 },
					baseTag: { type: String, required: !0 },
					path: { type: String, default: "" },
					initTop: { type: Number, default: 100 },
					initLeft: { type: Number, default: 160 },
					applyFilters: { type: Function, required: !0 },
				},
				emits: ["close"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = X(""),
						s = X(!1),
						i = X(n.initTop),
						r = X(n.initLeft),
						a = X(100050),
						u = de(() => n.applyFilters(n.baseTag, l.value, s.value)),
						c = de(() => ({
							top: i.value + "px",
							left: r.value + "px",
							zIndex: a.value,
						}));
					function f() {
						a.value = a.value + 1;
					}
					function h(D, S) {
						const N = document.createElement("div");
						(N.textContent = "Tag is on the clipboard"),
							Object.assign(N.style, {
								position: "fixed",
								top: D + "px",
								left: S + "px",
								padding: "10px 18px",
								background: "#126BC4",
								color: "#fff",
								fontWeight: "600",
								fontSize: "13px",
								borderRadius: "6px",
								boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
								zIndex: "100060",
								pointerEvents: "none",
								opacity: "1",
								transition: "opacity 0.6s ease",
							}),
							document.body.appendChild(N),
							setTimeout(() => {
								N.style.opacity = "0";
							}, 1400),
							setTimeout(() => {
								N.remove();
							}, 2e3);
					}
					function v(D) {
						const S = document.createElement("textarea");
						(S.value = D),
							(S.style.cssText = "position:fixed;opacity:0"),
							document.body.appendChild(S),
							S.select(),
							document.execCommand("copy"),
							S.remove();
					}
					function b() {
						const D = u.value,
							S = i.value,
							N = r.value;
						o("close"),
							navigator.clipboard
								? navigator.clipboard.writeText(D).catch(() => v(D))
								: v(D),
							h(S, N);
					}
					function w(D) {
						const S = D.clientX,
							N = D.clientY,
							j = i.value,
							O = r.value;
						function x(L) {
							(i.value = Math.max(0, j + L.clientY - N)),
								(r.value = O + L.clientX - S);
						}
						function E() {
							document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", E);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", E);
					}
					return (D, S) => (
						_(),
						C(
							"div",
							{ class: "tf-tag-panel", style: Re(c.value), onMousedown: f },
							[
								A(
									"div",
									{ class: "tf-tag-header", onMousedown: Ee(w, ["prevent"]) },
									[
										A("span", null, G(e.field.label), 1),
										A(
											"button",
											{
												class: "tf-close",
												onClick: S[0] || (S[0] = (N) => D.$emit("close")),
											},
											"×"
										),
									],
									32
								),
								A("div", Pc, [
									S[5] ||
										(S[5] = A(
											"div",
											{ class: "tf-lbl" },
											"Fallback Value",
											-1
										)),
									ot(
										A(
											"input",
											{
												"onUpdate:modelValue":
													S[1] || (S[1] = (N) => (l.value = N)),
												type: "text",
												class: "tf-input",
												placeholder: "e.g. Student (leave empty for none)",
											},
											null,
											512
										),
										[[It, l.value]]
									),
									A("div", Ac, [
										A("label", Mc, [
											ot(
												A(
													"input",
													{
														"onUpdate:modelValue":
															S[2] || (S[2] = (N) => (s.value = N)),
														type: "checkbox",
													},
													null,
													512
												),
												[[Pa, s.value]]
											),
											S[4] || (S[4] = Qe(" Is this HTML? ", -1)),
										]),
										A("div", Ic, [
											A(
												"button",
												{
													class: "btn btn-default btn-sm",
													onClick:
														S[3] || (S[3] = (N) => D.$emit("close")),
												},
												"Cancel"
											),
											A(
												"button",
												{ class: "btn btn-primary btn-sm", onClick: b },
												"Copy Tag to Clipboard"
											),
										]),
									]),
								]),
							],
							36
						)
					);
				},
			},
			[["__scopeId", "data-v-4770fb02"]]
		),
		jc = De(
			{
				__name: "TagFinder",
				props: {
					rootDoctype: { type: String, required: !0 },
					initX: { type: Number, default: -1 },
					initY: { type: Number, default: 80 },
				},
				emits: ["close"],
				setup(e) {
					const t = e,
						n = _c(),
						o = Ae([]),
						l = X(null),
						s = X(t.initX >= 0 ? t.initX : window.innerWidth - 560),
						i = X(t.initY),
						r = X(10060),
						a = X(null),
						u = X(null),
						c = de(() => {
							const D = {
								left: s.value + "px",
								top: i.value + "px",
								zIndex: r.value,
							};
							return (
								a.value && (D.width = a.value + "px"),
								u.value && (D.maxHeight = u.value + "px"),
								D
							);
						});
					function f() {
						r.value = r.value + 1;
					}
					function h(D) {
						f();
						const S = D.clientX,
							N = D.clientY,
							j = s.value,
							O = i.value;
						function x(L) {
							(s.value = j + L.clientX - S),
								(i.value = Math.max(0, O + L.clientY - N));
						}
						function E() {
							document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", E);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", E);
					}
					function v(D) {
						f();
						const S = D.clientX,
							N = D.clientY,
							j = D.target.parentElement,
							O = j.offsetWidth,
							x = j.offsetHeight;
						function E(H) {
							(a.value = Math.max(260, O + H.clientX - S)),
								(u.value = Math.max(200, x + H.clientY - N));
						}
						function L() {
							document.removeEventListener("mousemove", E),
								document.removeEventListener("mouseup", L);
						}
						document.addEventListener("mousemove", E),
							document.addEventListener("mouseup", L);
					}
					At(() => {
						n.loadColumn(t.rootDoctype, null, null, 0);
					});
					async function b(D, S) {
						(n.columns[S].activeField = D.fieldname),
							await n.loadColumn(
								D.options,
								D.fieldname,
								D.is_table ? "Table" : "Link",
								S + 1
							),
							await _t(),
							l.value && (l.value.scrollLeft = l.value.scrollWidth),
							a.value;
					}
					function w(D, S) {
						var O;
						const N = n.buildTag(S, D),
							j = D.is_pronoun
								? `${((O = n.columns[0]) == null ? void 0 : O.doctype) || ""} → ${
										D.fieldname
								  } (pronoun)`
								: n.buildPath(S, D);
						o.push({ field: D, baseTag: N, path: j });
					}
					return (D, S) => (
						_(),
						C(
							"div",
							{ class: "tf-float", style: Re(c.value), onMousedown: f },
							[
								A(
									"div",
									{ class: "tf-header", onMousedown: Ee(h, ["prevent"]) },
									[
										A("span", null, "Tag Finder: " + G(e.rootDoctype), 1),
										A(
											"button",
											{
												class: "tf-close",
												onClick: S[0] || (S[0] = (N) => D.$emit("close")),
											},
											"×"
										),
									],
									32
								),
								A(
									"div",
									{ ref_key: "bodyEl", ref: l, class: "tf-body" },
									[
										(_(!0),
										C(
											ce,
											null,
											be(
												R(n).columns,
												(N, j) => (
													_(),
													Te(
														Oc,
														{
															key: j,
															col: N,
															"col-index": j,
															columns: R(n).columns,
															onNavigate: (O) => b(O, j),
															onSelectField: (O) => w(O, j),
														},
														null,
														8,
														[
															"col",
															"col-index",
															"columns",
															"onNavigate",
															"onSelectField",
														]
													)
												)
											),
											128
										)),
									],
									512
								),
								A(
									"div",
									{ class: "tf-footer", onMousedown: Ee(h, ["prevent"]) },
									" Tag Finder: " + G(e.rootDoctype),
									33
								),
								A(
									"div",
									{ class: "tf-resize-handle", onMousedown: Ee(v, ["prevent"]) },
									null,
									32
								),
								(_(),
								Te(Hl, { to: "body" }, [
									(_(!0),
									C(
										ce,
										null,
										be(
											o,
											(N, j) => (
												_(),
												Te(
													Lc,
													{
														key: j,
														field: N.field,
														"base-tag": N.baseTag,
														path: N.path,
														"apply-filters": R(n).applyFilters,
														"init-top": 100 + j * 24,
														"init-left": 160 + j * 24,
														onClose: (O) => o.splice(j, 1),
													},
													null,
													8,
													[
														"field",
														"base-tag",
														"path",
														"apply-filters",
														"init-top",
														"init-left",
														"onClose",
													]
												)
											)
										),
										128
									)),
								])),
							],
							36
						)
					);
				},
			},
			[["__scopeId", "data-v-c80feddc"]]
		);
	function lo(e, t) {
		return new Promise((n, o) => {
			frappe.db.get_doc(e, t).then(n).catch(o);
		});
	}
	function Vc(e) {
		const t = $l(null),
			n = X(null),
			o = X({}),
			l = X({}),
			s = X(!1),
			i = X(null);
		async function r(f, h, v, b) {
			var N, j;
			const w = f.split(".");
			if (w.length === 1) return (h == null ? void 0 : h[w[0]]) ?? null;
			let D = h,
				S = v;
			for (let O = 0; O < w.length - 1; O++) {
				const x = w[O],
					E = D == null ? void 0 : D[x];
				if (!E) return null;
				const L =
					(j = (N = b == null ? void 0 : b[S]) == null ? void 0 : N.fields) == null
						? void 0
						: j.find((B) => B.fieldname === x && B.fieldtype === "Link");
				if (!(L != null && L.options)) return null;
				(D = await lo(L.options, E)), (S = L.options);
			}
			return (D == null ? void 0 : D[w[w.length - 1]]) ?? null;
		}
		async function a(f, h) {
			var v, b;
			(s.value = !0), (i.value = null);
			try {
				const w = await lo("Card Definition", f);
				t.value = w;
				const D = w.root_doctype,
					S = await dt("frappe.client.get_doctype", { doctype: D });
				o.value = { ...o.value, [D]: S };
				const N = await lo(D, h);
				n.value = N;
				const j = {},
					O = new Set();
				for (const x of w.fields_list || [])
					(v = x.path) != null && v.includes(".") && O.add(x.path);
				for (const x of w.displays || [])
					(b = x.path) != null && b.includes(".") && O.add(x.path);
				for (const x of O) j[x] = await r(x, N, D, o.value);
				l.value = j;
			} catch (w) {
				i.value = String(w);
			} finally {
				s.value = !1;
			}
		}
		async function u(f, h) {
			var w;
			const v = (w = t.value) == null ? void 0 : w.root_doctype,
				b = n.value;
			!v ||
				!(b != null && b.name) ||
				(await frappe.db.set_value(v, b.name, f, h), (n.value = { ...n.value, [f]: h }));
		}
		async function c() {
			var D, S, N;
			const f = n.value,
				h = (D = t.value) == null ? void 0 : D.root_doctype;
			if (!(f != null && f.name) || !h) return;
			const v = await lo(h, f.name);
			n.value = v;
			const b = {},
				w = new Set();
			for (const j of t.value.fields_list || [])
				(S = j.path) != null && S.includes(".") && w.add(j.path);
			for (const j of t.value.displays || [])
				(N = j.path) != null && N.includes(".") && w.add(j.path);
			for (const j of w) b[j] = await r(j, v, h, o.value);
			l.value = b;
		}
		return {
			cardDef: t,
			record: n,
			meta: o,
			resolvedHops: l,
			loading: s,
			error: i,
			load: a,
			saveField: u,
			refresh: c,
		};
	}
	const Bc = { class: "actions-panel" },
		Hc = ["onClick"],
		qc = De(
			{
				__name: "ActionsPanel",
				props: {
					actions: { type: Array, default: () => [] },
					scripts: { type: Array, default: () => [] },
					record: { type: Object, default: null },
				},
				emits: ["open-card", "refresh"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = de(() =>
							[...(n.actions || [])].sort(
								(a, u) => (a.sort_order || 0) - (u.sort_order || 0)
							)
						);
					function s(a) {
						return (n.scripts || []).find((u) => u.script_name === a);
					}
					function i(a) {
						return !a || !n.record
							? a
							: a.replace(/\{\{\s*(\w+)\s*\}\}/g, (u, c) => n.record[c] || "");
					}
					async function r(a) {
						const u = s(a.action_script);
						if (!u) {
							frappe.msgprint(`Script "${a.action_script}" not found`);
							return;
						}
						switch (u.script_type) {
							case "server":
								await new Promise((c, f) => {
									frappe.call({
										method: u.method,
										args: { name: n.record.name },
										callback: () => {
											frappe.show_alert({
												message: `${a.label} completed`,
												indicator: "green",
											}),
												o("refresh"),
												c();
										},
										error: f,
									});
								});
								break;
							case "open_url":
								window.open(i(u.method), "_blank");
								break;
							case "open_card":
								o("open-card", {
									cardDefName: u.method,
									doctype: n.record.doctype,
									name: n.record.name,
								});
								break;
							case "frappe_action":
								u.method === "print" &&
									window.open(
										`/printview?doctype=${n.record.doctype}&name=${n.record.name}`,
										"_blank"
									);
								break;
							default:
								console.warn("Unknown script type:", u.script_type);
						}
					}
					return (a, u) => (
						_(),
						C("div", Bc, [
							(_(!0),
							C(
								ce,
								null,
								be(
									l.value,
									(c) => (
										_(),
										C(
											"button",
											{
												key: c.name || c.label,
												class: "action-btn",
												onClick: (f) => r(c),
											},
											G(c.label),
											9,
											Hc
										)
									)
								),
								128
							)),
						])
					);
				},
			},
			[["__scopeId", "data-v-2400ccbd"]]
		),
		Uc = { key: 0, class: "tab-bar" },
		Wc = ["onClick"],
		Kc = De(
			{
				__name: "TabBar",
				props: {
					tabs: { type: Array, default: () => [] },
					activeTab: { type: String, default: "" },
				},
				emits: ["update:activeTab"],
				setup(e) {
					const t = e,
						n = de(() =>
							[...(t.tabs || [])].sort(
								(l, s) => (l.sort_order || 0) - (s.sort_order || 0)
							)
						),
						o = de(() => {
							var s;
							const l = n.value;
							return l.length <= 1 && (s = l[0]) != null && s.hide_bar
								? !1
								: l.length > 1;
						});
					return (l, s) =>
						o.value
							? (_(),
							  C("div", Uc, [
									(_(!0),
									C(
										ce,
										null,
										be(
											n.value,
											(i) => (
												_(),
												C(
													"button",
													{
														key: i.label,
														class: Ve([
															"tab-btn",
															{ active: e.activeTab === i.label },
														]),
														onClick: (r) =>
															l.$emit("update:activeTab", i.label),
													},
													G(i.label),
													11,
													Wc
												)
											)
										),
										128
									)),
							  ]))
							: ue("", !0);
				},
			},
			[["__scopeId", "data-v-abb6b668"]]
		),
		zc = { class: "field-widget" },
		Yc = ["readonly"],
		Jc = ["step", "readonly"],
		Xc = ["readonly"],
		Gc = ["checked", "disabled"],
		Zc = ["disabled"],
		Qc = ["value"],
		eu = ["readonly"],
		tu = ["readonly"],
		nu = De(
			{
				__name: "FieldWidget",
				props: {
					config: { type: Object, required: !0 },
					record: { type: Object, default: null },
					meta: { type: Object, default: () => ({}) },
				},
				emits: ["save-field"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = de(() => {
							var v;
							return (v = n.record) == null ? void 0 : v.doctype;
						}),
						s = de(() => {
							var v, b, w;
							return (
								l.value &&
								((w =
									(b = (v = n.meta) == null ? void 0 : v[l.value]) == null
										? void 0
										: b.fields) == null
									? void 0
									: w.find((D) => D.fieldname === n.config.path))
							);
						}),
						i = de(() => {
							var b;
							const v = ((b = s.value) == null ? void 0 : b.fieldtype) || "Data";
							return v === "Int" || v === "Float" || v === "Currency"
								? "number"
								: v === "Select"
								? "select"
								: v === "Date"
								? "date"
								: v === "Check"
								? "checkbox"
								: ["Small Text", "Text", "Text Editor"].includes(v)
								? "textarea"
								: "text";
						}),
						r = de(() => {
							var b;
							return ((b = s.value) == null ? void 0 : b.fieldtype) === "Int"
								? "1"
								: "0.01";
						}),
						a = de(() => {
							var b;
							const v = (b = s.value) == null ? void 0 : b.options;
							return !v || typeof v != "string"
								? []
								: v
										.split(
											`
`
										)
										.filter(Boolean);
						}),
						u = de(() => {
							var b;
							const v = n.config.path;
							return v != null && v.includes(".")
								? null
								: ((b = n.record) == null ? void 0 : b[v]) ?? "";
						}),
						c = X("");
					ze(
						u,
						(v) => {
							var w;
							const b = v == null ? "" : String(v);
							((w = s.value) == null ? void 0 : w.fieldtype) === "Check"
								? (c.value = !!v && v !== "0" && v !== 0)
								: (c.value = b);
						},
						{ immediate: !0 }
					);
					function f() {
						var D;
						if (!n.config.editable) return;
						const v = n.config.path;
						if (v != null && v.includes(".")) return;
						const b = u.value;
						let w = c.value;
						((D = s.value) == null ? void 0 : D.fieldtype) === "Check" &&
							(w = w ? 1 : 0),
							String(b) !== String(w) && o("save-field", { fieldname: v, value: w });
					}
					function h(v) {
						(c.value = v.target.checked), f();
					}
					return (v, b) => {
						var w, D;
						return (
							_(),
							C("div", zc, [
								A(
									"label",
									{
										class: Ve([
											"field-label",
											{ required: (w = s.value) == null ? void 0 : w.reqd },
										]),
									},
									G(((D = s.value) == null ? void 0 : D.label) || e.config.path),
									3
								),
								i.value === "text"
									? ot(
											(_(),
											C(
												"input",
												{
													key: 0,
													type: "text",
													"onUpdate:modelValue":
														b[0] || (b[0] = (S) => (c.value = S)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												Yc
											)),
											[[It, c.value]]
									  )
									: i.value === "number"
									? ot(
											(_(),
											C(
												"input",
												{
													key: 1,
													type: "number",
													step: r.value,
													"onUpdate:modelValue":
														b[1] || (b[1] = (S) => (c.value = S)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												Jc
											)),
											[[It, c.value]]
									  )
									: i.value === "date"
									? ot(
											(_(),
											C(
												"input",
												{
													key: 2,
													type: "date",
													"onUpdate:modelValue":
														b[2] || (b[2] = (S) => (c.value = S)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												Xc
											)),
											[[It, c.value]]
									  )
									: i.value === "checkbox"
									? (_(),
									  C(
											"input",
											{
												key: 3,
												type: "checkbox",
												checked: c.value,
												disabled: !e.config.editable,
												class: "field-input",
												onChange: h,
											},
											null,
											40,
											Gc
									  ))
									: i.value === "select"
									? ot(
											(_(),
											C(
												"select",
												{
													key: 4,
													"onUpdate:modelValue":
														b[3] || (b[3] = (S) => (c.value = S)),
													disabled: !e.config.editable,
													class: "field-input",
													onChange: f,
												},
												[
													b[6] ||
														(b[6] = A(
															"option",
															{ value: "" },
															null,
															-1
														)),
													(_(!0),
													C(
														ce,
														null,
														be(
															a.value,
															(S) => (
																_(),
																C(
																	"option",
																	{ key: S, value: S },
																	G(S),
																	9,
																	Qc
																)
															)
														),
														128
													)),
												],
												40,
												Zc
											)),
											[[zs, c.value]]
									  )
									: i.value === "textarea"
									? ot(
											(_(),
											C(
												"textarea",
												{
													key: 5,
													"onUpdate:modelValue":
														b[4] || (b[4] = (S) => (c.value = S)),
													readonly: !e.config.editable,
													class: "field-input",
													rows: "3",
													onBlur: f,
												},
												null,
												40,
												eu
											)),
											[[It, c.value]]
									  )
									: ot(
											(_(),
											C(
												"input",
												{
													key: 6,
													type: "text",
													"onUpdate:modelValue":
														b[5] || (b[5] = (S) => (c.value = S)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												tu
											)),
											[[It, c.value]]
									  ),
							])
						);
					};
				},
			},
			[["__scopeId", "data-v-c878e916"]]
		),
		ou = { class: "display-widget" },
		lu = { class: "display-label" },
		su = { class: "display-value" },
		iu = De(
			{
				__name: "DisplayWidget",
				props: {
					config: { type: Object, required: !0 },
					record: { type: Object, default: null },
					resolvedHops: { type: Object, default: () => ({}) },
				},
				setup(e) {
					const t = e,
						n = de(() => {
							var l, s, i;
							return (l = t.config.path) != null && l.includes(".")
								? ((s = t.resolvedHops) == null ? void 0 : s[t.config.path]) ?? ""
								: ((i = t.record) == null ? void 0 : i[t.config.path]) ?? "";
						}),
						o = de(() => {
							if (t.config.label) return t.config.label;
							const l = (t.config.path || "").split(".");
							return (l[l.length - 1] || t.config.path)
								.replace(/_/g, " ")
								.replace(/\b\w/g, (i) => i.toUpperCase());
						});
					return (l, s) => (
						_(),
						C("div", ou, [A("label", lu, G(o.value), 1), A("span", su, G(n.value), 1)])
					);
				},
			},
			[["__scopeId", "data-v-bb9316e1"]]
		),
		ru = De(
			{
				__name: "WidgetGrid",
				props: {
					widgets: { type: Array, required: !0 },
					gridColumns: { type: Number, default: 12 },
					gridRows: { type: Number, default: 10 },
					cellSize: { type: Number, default: 50 },
					record: { type: Object, default: null },
					meta: { type: Object, default: () => ({}) },
					resolvedHops: { type: Object, default: () => ({}) },
					scripts: { type: Array, default: () => [] },
				},
				emits: ["save-field", "open-card"],
				setup(e) {
					const t = e,
						n = { field: nu, display: iu },
						o = de(() => ({
							display: "grid",
							gridTemplateColumns: `repeat(${t.gridColumns}, ${t.cellSize}px)`,
							gridTemplateRows: `repeat(${t.gridRows}, ${t.cellSize}px)`,
							gap: "4px",
						}));
					function l(s) {
						return {
							gridColumn: `${s.x + 1} / span ${s.w}`,
							gridRow: `${s.y + 1} / span ${s.h}`,
							overflow: "hidden",
						};
					}
					return (s, i) => (
						_(),
						C(
							"div",
							{ class: "widget-grid", style: Re(o.value) },
							[
								(_(!0),
								C(
									ce,
									null,
									be(
										e.widgets,
										(r) => (
											_(),
											C(
												"div",
												{
													key: r.id || r.type + "-" + r.x + "-" + r.y,
													class: "widget-item",
													style: Re(l(r)),
												},
												[
													(_(),
													Te(
														Sr(n[r.type]),
														{
															config: r.config,
															record: e.record,
															meta: e.meta,
															"resolved-hops": e.resolvedHops,
															scripts: e.scripts,
															onSaveField:
																i[0] ||
																(i[0] = (...a) =>
																	s.$emit("save-field", ...a)),
															onOpenCard:
																i[1] ||
																(i[1] = (...a) =>
																	s.$emit("open-card", ...a)),
														},
														null,
														40,
														[
															"config",
															"record",
															"meta",
															"resolved-hops",
															"scripts",
														]
													)),
												],
												4
											)
										)
									),
									128
								)),
							],
							4
						)
					);
				},
			},
			[["__scopeId", "data-v-314f79f2"]]
		),
		au = { class: "card-form-header" },
		cu = { class: "card-title" },
		uu = { class: "card-record-name" },
		fu = { key: 0, class: "card-loading" },
		du = { key: 1, class: "card-error" },
		pu = { key: 2, class: "card-form-body" },
		mu = { class: "card-form-content" },
		hu = De(
			{
				__name: "CardForm",
				props: {
					cardDefName: { type: String, required: !0 },
					doctype: { type: String, required: !0 },
					recordName: { type: String, required: !0 },
				},
				emits: ["open-card", "close"],
				setup(e) {
					const t = e,
						n = Vc(t.doctype),
						{
							cardDef: o,
							record: l,
							meta: s,
							resolvedHops: i,
							loading: r,
							error: a,
							load: u,
							saveField: c,
							refresh: f,
						} = n,
						h = X("");
					function v() {
						const N = o.value;
						if (!N) return [];
						const j = h.value,
							O = [];
						for (const x of N.fields_list || [])
							x.tab === j &&
								O.push({
									type: "field",
									id: `field-${x.path}-${x.idx || O.length}`,
									x: x.x ?? 0,
									y: x.y ?? 0,
									w: x.w ?? 3,
									h: x.h ?? 1,
									config: { path: x.path, editable: x.editable !== 0 },
								});
						for (const x of N.displays || [])
							x.tab === j &&
								O.push({
									type: "display",
									id: `display-${x.path}-${x.idx || O.length}`,
									x: x.x ?? 0,
									y: x.y ?? 0,
									w: x.w ?? 3,
									h: x.h ?? 1,
									config: { path: x.path, label: x.label },
								});
						return O;
					}
					const b = de(v),
						w = de(() => {
							var j;
							const N = (j = o.value) == null ? void 0 : j.styles_json;
							if (!N || !N.trim()) return {};
							try {
								const O = JSON.parse(N),
									x = {};
								for (const [E, L] of Object.entries(O))
									E.startsWith("--") && L != null && (x[E] = String(L));
								return x;
							} catch {
								return {};
							}
						});
					ze(
						() => {
							var N;
							return (N = o.value) == null ? void 0 : N.tabs;
						},
						(N) => {
							const j = [...(N || [])].sort(
								(O, x) => (O.sort_order || 0) - (x.sort_order || 0)
							);
							j.length && !h.value && (h.value = j[0].label || "Home");
						},
						{ immediate: !0 }
					);
					function D({ fieldname: N, value: j }) {
						c(N, j);
					}
					async function S() {
						await f();
					}
					return (
						At(async () => {
							var O;
							await u(t.cardDefName, t.recordName);
							const j = [...(((O = o.value) == null ? void 0 : O.tabs) || [])].sort(
								(x, E) => (x.sort_order || 0) - (E.sort_order || 0)
							);
							j.length && !h.value && (h.value = j[0].label || "Home");
						}),
						(N, j) => {
							var O, x, E, L, H, B, K, oe, pe;
							return (
								_(),
								C(
									"div",
									{ class: "card-form", style: Re(w.value) },
									[
										A("div", au, [
											A(
												"span",
												cu,
												G(
													((O = R(o)) == null ? void 0 : O.title) ||
														e.doctype
												),
												1
											),
											A("span", uu, G(e.recordName), 1),
											A(
												"button",
												{
													class: "card-close-btn",
													onClick:
														j[0] || (j[0] = (Q) => N.$emit("close")),
												},
												"×"
											),
										]),
										R(r)
											? (_(), C("div", fu, "Loading…"))
											: R(a)
											? (_(), C("div", du, G(R(a)), 1))
											: (_(),
											  C("div", pu, [
													(E =
														(x = R(o)) == null ? void 0 : x.actions) !=
														null && E.length
														? (_(),
														  Te(
																qc,
																{
																	key: 0,
																	actions: R(o).actions,
																	scripts: R(o).scripts || [],
																	record: R(l),
																	onOpenCard:
																		j[1] ||
																		(j[1] = (...Q) =>
																			N.$emit(
																				"open-card",
																				...Q
																			)),
																	onRefresh: S,
																},
																null,
																8,
																["actions", "scripts", "record"]
														  ))
														: ue("", !0),
													A("div", mu, [
														(H =
															(L = R(o)) == null
																? void 0
																: L.tabs) != null && H.length
															? (_(),
															  Te(
																	Kc,
																	{
																		key: 0,
																		tabs: R(o).tabs,
																		"active-tab": h.value,
																		"onUpdate:activeTab":
																			j[2] ||
																			(j[2] = (Q) =>
																				(h.value = Q)),
																	},
																	null,
																	8,
																	["tabs", "active-tab"]
															  ))
															: ue("", !0),
														Oe(
															ru,
															{
																widgets: b.value,
																"grid-columns":
																	((B = R(o)) == null
																		? void 0
																		: B.grid_columns) || 12,
																"grid-rows":
																	((K = R(o)) == null
																		? void 0
																		: K.grid_rows) || 10,
																"cell-size":
																	((oe = R(o)) == null
																		? void 0
																		: oe.grid_cell_size) || 50,
																record: R(l),
																meta: R(s),
																"resolved-hops": R(i),
																scripts:
																	((pe = R(o)) == null
																		? void 0
																		: pe.scripts) || [],
																onSaveField: D,
																onOpenCard:
																	j[3] ||
																	(j[3] = (...Q) =>
																		N.$emit(
																			"open-card",
																			...Q
																		)),
															},
															null,
															8,
															[
																"widgets",
																"grid-columns",
																"grid-rows",
																"cell-size",
																"record",
																"meta",
																"resolved-hops",
																"scripts",
															]
														),
													]),
											  ])),
									],
									4
								)
							);
						}
					);
				},
			},
			[["__scopeId", "data-v-66c9291b"]]
		),
		gu = { class: "card-modal" },
		vu = De(
			{
				__name: "CardModal",
				props: {
					cardDefName: { type: String, required: !0 },
					doctype: { type: String, required: !0 },
					recordName: { type: String, required: !0 },
				},
				emits: ["open-card", "close"],
				setup(e, { emit: t }) {
					const n = t;
					function o(l) {
						l.key === "Escape" && n("close");
					}
					return (
						At(() => document.addEventListener("keydown", o)),
						Jt(() => document.removeEventListener("keydown", o)),
						(l, s) => (
							_(),
							Te(Hl, { to: "body" }, [
								A(
									"div",
									{
										class: "card-modal-backdrop",
										onClick:
											s[2] || (s[2] = Ee((i) => l.$emit("close"), ["self"])),
									},
									[
										A("div", gu, [
											Oe(
												hu,
												{
													"card-def-name": e.cardDefName,
													doctype: e.doctype,
													"record-name": e.recordName,
													onOpenCard:
														s[0] ||
														(s[0] = (...i) =>
															l.$emit("open-card", ...i)),
													onClose:
														s[1] || (s[1] = (i) => l.$emit("close")),
												},
												null,
												8,
												["card-def-name", "doctype", "record-name"]
											),
										]),
									]
								),
							])
						)
					);
				},
			},
			[["__scopeId", "data-v-f60d336c"]]
		),
		ti = "nce_fd_load_debug";
	function so() {
		try {
			return localStorage.getItem(ti) === "1";
		} catch {
			return !1;
		}
	}
	const yu = { class: "ppv2-fd-header" },
		_u = { class: "ppv2-fd-header-main" },
		bu = ["disabled"],
		wu = { key: 0, class: "ppv2-fd-nav-pos" },
		xu = ["disabled"],
		Cu = { class: "ppv2-fd-title" },
		Su = De(
			{
				__name: "PanelFormDialogHeader",
				props: {
					rowNavEnabled: { type: Boolean, default: !1 },
					canNavigatePrev: { type: Boolean, default: !1 },
					canNavigateNext: { type: Boolean, default: !1 },
					rowNavLabel: { type: String, default: "" },
					title: { type: String, default: "" },
				},
				emits: ["close", "nav-prev", "nav-next"],
				setup(e) {
					return (t, n) => (
						_(),
						C("div", yu, [
							A("div", _u, [
								e.rowNavEnabled
									? (_(),
									  C(
											"div",
											{
												key: 0,
												class: "ppv2-fd-nav",
												onMousedown:
													n[2] || (n[2] = Ee(() => {}, ["stop"])),
											},
											[
												A(
													"button",
													{
														type: "button",
														class: "ppv2-fd-nav-btn",
														disabled: !e.canNavigatePrev,
														title: "Previous record (panel list) — Alt+←",
														"aria-label": "Previous record",
														onClick:
															n[0] ||
															(n[0] = (o) => t.$emit("nav-prev")),
													},
													[
														...(n[4] ||
															(n[4] = [
																A(
																	"i",
																	{
																		class: "fa fa-chevron-left",
																	},
																	null,
																	-1
																),
															])),
													],
													8,
													bu
												),
												e.rowNavLabel
													? (_(), C("span", wu, G(e.rowNavLabel), 1))
													: ue("", !0),
												A(
													"button",
													{
														type: "button",
														class: "ppv2-fd-nav-btn",
														disabled: !e.canNavigateNext,
														title: "Next record (panel list) — Alt+→",
														"aria-label": "Next record",
														onClick:
															n[1] ||
															(n[1] = (o) => t.$emit("nav-next")),
													},
													[
														...(n[5] ||
															(n[5] = [
																A(
																	"i",
																	{
																		class: "fa fa-chevron-right",
																	},
																	null,
																	-1
																),
															])),
													],
													8,
													xu
												),
											],
											32
									  ))
									: ue("", !0),
								A("span", Cu, G(e.title), 1),
							]),
							A(
								"button",
								{
									class: "ppv2-fd-close",
									type: "button",
									onClick: n[3] || (n[3] = (o) => t.$emit("close")),
								},
								"×"
							),
						])
					);
				},
			},
			[["__scopeId", "data-v-1078548e"]]
		);
	function $u(e) {
		return (
			{
				Data: { component: "FormControl", props: { type: "text" } },
				"Small Text": { component: "FormControl", props: { type: "textarea", rows: 3 } },
				Text: { component: "FormControl", props: { type: "textarea", rows: 5 } },
				"Text Editor": { component: "TextEditor", props: {} },
				Code: { component: "FormControl", props: { type: "textarea", rows: 8 } },
				"HTML Editor": { component: "FormControl", props: { type: "textarea", rows: 8 } },
				"Markdown Editor": {
					component: "FormControl",
					props: { type: "textarea", rows: 8 },
				},
				JSON: { component: "FormControl", props: { type: "textarea", rows: 8 } },
				Int: { component: "FormControl", props: { type: "number", step: 1 } },
				Float: { component: "FormControl", props: { type: "number", step: "any" } },
				Currency: { component: "FormControl", props: { type: "number", step: "any" } },
				Percent: { component: "FormControl", props: { type: "number", min: 0, max: 100 } },
				Date: { component: "DatePicker", props: {} },
				Datetime: { component: "DateTimePicker", props: {} },
				Time: { component: "FormControl", props: { type: "time" } },
				Duration: {
					component: "FormControl",
					props: { type: "text", placeholder: "e.g. 1h 30m" },
				},
				Check: { component: "Checkbox", props: {} },
				Select: { component: "FormControl", props: { type: "select" } },
				Link: { component: "Link", props: {} },
				"Dynamic Link": { component: "Link", props: {} },
				Table: { layout: "table" },
				"Table MultiSelect": { layout: "table_multiselect" },
				Attach: { component: "FileUploader", props: {} },
				"Attach Image": { component: "FileUploader", props: { accept: "image/*" } },
				Password: { component: "FormControl", props: { type: "password" } },
				Phone: { component: "FormControl", props: { type: "tel" } },
				Rating: { component: "Rating", props: {} },
				Color: { component: "FormControl", props: { type: "color" } },
				Autocomplete: { component: "Autocomplete", props: {} },
				Barcode: { component: "FormControl", props: { type: "text" } },
				"Read Only": { component: "ReadOnly", props: {} },
				Signature: { component: "Signature", props: {} },
				Geolocation: { component: "Geolocation", props: {} },
				Icon: { component: "FormControl", props: { type: "text" } },
				Heading: { layout: "heading" },
				HTML: { layout: "html" },
				Image: { layout: "image" },
				Button: { layout: "button" },
				Fold: { layout: "fold" },
				"Tab Break": { layout: "tab" },
				"Section Break": { layout: "section" },
				"Column Break": { layout: "column" },
			}[e.fieldtype] || { component: "FormControl", props: { type: "text" } }
		);
	}
	const ku = De(
			{
				__name: "PanelFormLinkField",
				props: {
					field: { type: Object, required: !0 },
					modelValue: { default: null },
					readOnly: { type: Boolean, default: !1 },
					mandatory: { type: Boolean, default: !1 },
				},
				emits: ["change", "link-change"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = zt("fdSyncingFromLoad", null),
						s = X(null);
					let i = null;
					function r() {
						return { [n.field.fieldname]: n.modelValue ?? "" };
					}
					function a() {
						const c = n.field.fieldname;
						return {
							fieldname: c,
							fieldtype: "Link",
							options: n.field.options || "",
							read_only: n.readOnly ? 1 : 0,
							reqd: n.mandatory ? 1 : 0,
							hidden: 0,
							change() {
								if (l != null && l.value) return;
								const f = this.get_value();
								o("change", { fieldname: c, value: f }),
									o("link-change", { fieldname: c, value: f });
							},
						};
					}
					function u() {
						var f, h;
						if (
							typeof frappe > "u" ||
							!(
								(h = (f = frappe.ui) == null ? void 0 : f.form) != null &&
								h.make_control
							) ||
							!s.value
						)
							return;
						const c = window.$(s.value);
						c.empty(),
							(i = frappe.ui.form.make_control({
								parent: c,
								df: a(),
								render_input: !0,
								doc: r(),
							}));
					}
					return (
						At(() => {
							_t(() => u());
						}),
						ze(
							() => n.modelValue,
							(c) => {
								if (!(i != null && i.set_value)) return;
								const f = i.get_value();
								String(f ?? "") !== String(c ?? "") && i.set_value(c ?? "", !0);
							}
						),
						ze(
							() => [n.readOnly, n.mandatory],
							() => {
								i &&
									((i.df.read_only = n.readOnly ? 1 : 0),
									(i.df.reqd = n.mandatory ? 1 : 0),
									i.refresh());
							}
						),
						No(() => {
							i != null && i.$wrapper && i.$wrapper.remove(), (i = null);
						}),
						(c, f) => (
							_(),
							C(
								"div",
								{ ref_key: "hostRef", ref: s, class: "ppv2-fd-link-frappe" },
								null,
								512
							)
						)
					);
				},
			},
			[["__scopeId", "data-v-ed82237d"]]
		),
		Fu = De(
			{
				__name: "PanelFormDateTimeField",
				props: {
					field: { type: Object, required: !0 },
					modelValue: { default: null },
					readOnly: { type: Boolean, default: !1 },
					mandatory: { type: Boolean, default: !1 },
				},
				emits: ["change"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = zt("fdSyncingFromLoad", null),
						s = X(null);
					let i = null;
					function r() {
						return { [n.field.fieldname]: n.modelValue ?? "" };
					}
					function a() {
						const c = n.field.fieldname,
							f = n.field.fieldtype;
						return {
							fieldname: c,
							fieldtype: f,
							read_only: n.readOnly ? 1 : 0,
							reqd: n.mandatory ? 1 : 0,
							hidden: 0,
							change() {
								if (l != null && l.value) return;
								const h = this.get_value();
								o("change", { fieldname: c, value: h });
							},
						};
					}
					function u() {
						var h, v;
						if (
							typeof frappe > "u" ||
							!(
								(v = (h = frappe.ui) == null ? void 0 : h.form) != null &&
								v.make_control
							) ||
							!s.value
						)
							return;
						const c = n.field.fieldtype;
						if (c !== "Date" && c !== "Datetime") return;
						const f = window.$(s.value);
						f.empty(),
							(i = frappe.ui.form.make_control({
								parent: f,
								df: a(),
								render_input: !0,
								doc: r(),
							}));
					}
					return (
						At(() => {
							_t(() => u());
						}),
						ze(
							() => n.modelValue,
							(c) => {
								if (!(i != null && i.set_value)) return;
								const f = i.get_value();
								String(f ?? "") !== String(c ?? "") && i.set_value(c ?? "", !0);
							}
						),
						ze(
							() => [n.readOnly, n.mandatory, n.field.fieldtype],
							() => {
								i &&
									((i.df.read_only = n.readOnly ? 1 : 0),
									(i.df.reqd = n.mandatory ? 1 : 0),
									i.refresh());
							}
						),
						No(() => {
							i != null && i.$wrapper && i.$wrapper.remove(), (i = null);
						}),
						(c, f) => (
							_(),
							C(
								"div",
								{ ref_key: "hostRef", ref: s, class: "ppv2-fd-datetime-frappe" },
								null,
								512
							)
						)
					);
				},
			},
			[["__scopeId", "data-v-eb9d17e1"]]
		),
		Du = { key: 0, class: "ppv2-fd-table-placeholder" },
		Tu = { key: 1, class: "ppv2-fd-heading" },
		Nu = ["innerHTML"],
		Eu = { key: 3 },
		Ru = { class: "ppv2-fd-label" },
		Ou = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		Pu = ["value", "required", "disabled"],
		Au = ["value"],
		Mu = { key: 1, class: "ppv2-fd-check-row" },
		Iu = ["checked", "disabled"],
		Lu = { key: 4, class: "ppv2-fd-input ppv2-fd-textarea ppv2-fd-readonly-plain" },
		ju = ["value", "required", "disabled", "rows", "placeholder"],
		Vu = { key: 6, class: "ppv2-fd-input ppv2-fd-readonly-plain" },
		Bu = ["type", "value", "required", "disabled", "placeholder", "step", "min", "max"],
		Hu = { key: 8, class: "ppv2-fd-desc" },
		qu = De(
			{
				__name: "PanelFormField",
				props: {
					field: { type: Object, required: !0 },
					modelValue: { default: null },
					visible: { type: Boolean, default: !0 },
					mandatory: { type: Boolean, default: !1 },
					readOnly: { type: Boolean, default: !1 },
					fieldDirty: { type: Boolean, default: !1 },
				},
				emits: ["change", "link-change"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = de(() => $u(n.field));
					function s(h) {
						return String((h == null ? void 0 : h.fieldtype) ?? "").trim();
					}
					const i = de(() => {
							const h = s(n.field).toLowerCase();
							return !!(
								h === "select" ||
								(h === "autocomplete" &&
									(n.field.options || "").includes(`
`))
							);
						}),
						r = de(() => {
							if (s(n.field).toLowerCase() !== "autocomplete") return !1;
							const v = (n.field.options || "").trim();
							return !(
								!v ||
								v.includes(`
`)
							);
						}),
						a = de(() => {
							var v, b;
							return (
								((b = (v = l.value) == null ? void 0 : v.props) == null
									? void 0
									: b.type) === "textarea"
							);
						}),
						u = de(() =>
							!i.value || !n.field.options
								? []
								: n.field.options
										.split(
											`
`
										)
										.map((h) => h.trim())
										.filter(Boolean)
						);
					function c(h) {
						o("change", { fieldname: n.field.fieldname, value: h });
					}
					function f(h) {
						o("change", h), o("link-change", h);
					}
					return (h, v) => {
						var b, w, D, S, N, j, O, x, E, L;
						return ((b = l.value) == null ? void 0 : b.layout) === "table"
							? (_(),
							  C("div", Du, [
									A(
										"span",
										null,
										"Child table: " +
											G(e.field.label) +
											" (" +
											G(e.field.options) +
											")",
										1
									),
									v[4] ||
										(v[4] = A(
											"span",
											{ class: "ppv2-fd-muted" },
											"— not yet supported in dialog view",
											-1
										)),
							  ]))
							: ((w = l.value) == null ? void 0 : w.layout) === "heading"
							? (_(), C("h4", Tu, G(e.field.label), 1))
							: ((D = l.value) == null ? void 0 : D.layout) === "html"
							? (_(), C("div", { key: 2, innerHTML: e.field.options }, null, 8, Nu))
							: ((S = l.value) == null ? void 0 : S.layout) === "button"
							? (_(), C("span", Eu))
							: (N = l.value) != null && N.component
							? ot(
									(_(),
									C(
										"div",
										{
											key: 4,
											class: Ve([
												"ppv2-fd-field",
												{
													"ppv2-fd-field-bold": e.field.bold,
													"ppv2-fd-field-editable": !e.readOnly,
													"ppv2-fd-field-dirty":
														e.fieldDirty && !e.readOnly,
												},
											]),
										},
										[
											A("label", Ru, [
												Qe(G(e.field.label), 1),
												e.mandatory
													? (_(), C("span", Ou, " *"))
													: ue("", !0),
											]),
											i.value
												? (_(),
												  C(
														"select",
														{
															key: 0,
															value: e.modelValue ?? "",
															required: e.mandatory,
															disabled: e.readOnly,
															class: "ppv2-fd-input ppv2-fd-select",
															onChange:
																v[0] ||
																(v[0] = (H) => c(H.target.value)),
														},
														[
															v[5] ||
																(v[5] = A(
																	"option",
																	{ value: "" },
																	"— Select —",
																	-1
																)),
															(_(!0),
															C(
																ce,
																null,
																be(
																	u.value,
																	(H) => (
																		_(),
																		C(
																			"option",
																			{ key: H, value: H },
																			G(H),
																			9,
																			Au
																		)
																	)
																),
																128
															)),
														],
														40,
														Pu
												  ))
												: e.field.fieldtype === "Check"
												? (_(),
												  C("div", Mu, [
														A(
															"input",
															{
																type: "checkbox",
																checked: !!e.modelValue,
																disabled: e.readOnly,
																onChange:
																	v[1] ||
																	(v[1] = (H) =>
																		c(
																			H.target.checked
																				? 1
																				: 0
																		)),
															},
															null,
															40,
															Iu
														),
												  ]))
												: e.field.fieldtype === "Link" || r.value
												? (_(),
												  Te(
														ku,
														{
															key: 2,
															field: e.field,
															"model-value": e.modelValue,
															"read-only": e.readOnly,
															mandatory: e.mandatory,
															onChange: c,
															onLinkChange: f,
														},
														null,
														8,
														[
															"field",
															"model-value",
															"read-only",
															"mandatory",
														]
												  ))
												: e.field.fieldtype === "Date" ||
												  e.field.fieldtype === "Datetime"
												? (_(),
												  Te(
														Fu,
														{
															key: 3,
															field: e.field,
															"model-value": e.modelValue,
															"read-only": e.readOnly,
															mandatory: e.mandatory,
															onChange: c,
														},
														null,
														8,
														[
															"field",
															"model-value",
															"read-only",
															"mandatory",
														]
												  ))
												: a.value && e.readOnly
												? (_(), C("div", Lu, G(e.modelValue || ""), 1))
												: a.value
												? (_(),
												  C(
														"textarea",
														{
															key: 5,
															value: e.modelValue || "",
															required: e.mandatory,
															disabled: e.readOnly,
															rows:
																((j = l.value.props) == null
																	? void 0
																	: j.rows) || 3,
															placeholder: e.field.placeholder || "",
															class: "ppv2-fd-input ppv2-fd-textarea",
															onInput:
																v[2] ||
																(v[2] = (H) => c(H.target.value)),
														},
														null,
														40,
														ju
												  ))
												: e.readOnly
												? (_(), C("div", Vu, G(e.modelValue ?? ""), 1))
												: (_(),
												  C(
														"input",
														{
															key: 7,
															type:
																((O = l.value.props) == null
																	? void 0
																	: O.type) || "text",
															value: e.modelValue ?? "",
															required: e.mandatory,
															disabled: e.readOnly,
															placeholder: e.field.placeholder || "",
															step:
																(x = l.value.props) == null
																	? void 0
																	: x.step,
															min:
																(E = l.value.props) == null
																	? void 0
																	: E.min,
															max:
																(L = l.value.props) == null
																	? void 0
																	: L.max,
															class: "ppv2-fd-input",
															onChange:
																v[3] ||
																(v[3] = (H) => c(H.target.value)),
														},
														null,
														40,
														Bu
												  )),
											e.field.description
												? (_(), C("p", Hu, G(e.field.description), 1))
												: ue("", !0),
										],
										2
									)),
									[[ya, e.visible]]
							  )
							: ue("", !0);
					};
				},
			},
			[["__scopeId", "data-v-d9765eb9"]]
		),
		Uu = { key: 0, class: "ppv2-fd-tab-bar" },
		Wu = ["onClick"],
		Ku = De(
			{
				__name: "PanelFormDialogTabBar",
				props: {
					tabs: { type: Array, default: () => [] },
					activeTab: { type: Number, required: !0 },
				},
				emits: ["update:activeTab"],
				setup(e) {
					return (t, n) =>
						e.tabs.length > 1
							? (_(),
							  C("div", Uu, [
									(_(!0),
									C(
										ce,
										null,
										be(
											e.tabs,
											(o, l) => (
												_(),
												C(
													"button",
													{
														key: l,
														type: "button",
														class: Ve([
															"ppv2-fd-tab-btn",
															{
																"ppv2-fd-tab-active":
																	e.activeTab === l,
															},
														]),
														onClick: (s) =>
															t.$emit("update:activeTab", l),
													},
													G(o.label),
													11,
													Wu
												)
											)
										),
										128
									)),
							  ]))
							: ue("", !0);
				},
			},
			[["__scopeId", "data-v-41553ba8"]]
		),
		zu = { key: 0, class: "ppv2-fd-related-root" },
		Yu = { class: "ppv2-fd-related-meta" },
		Ju = { key: 0, class: "ppv2-fd-related-meta-link" },
		Xu = { key: 1, class: "ppv2-fd-related-meta-link" },
		Gu = { key: 0, class: "ppv2-fd-related-warn" },
		Zu = { key: 1, class: "ppv2-fd-related-hint" },
		Qu = { key: 2, class: "ppv2-fd-related-hint" },
		ef = { key: 0, class: "ppv2-fd-related-rows-loading" },
		tf = { key: 1, class: "ppv2-fd-related-rows-err" },
		nf = { key: 2, class: "ppv2-fd-related-table-wrap" },
		of = { class: "ppv2-fd-related-table" },
		lf = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		sf = ["value", "disabled", "aria-label", "onChange"],
		rf = ["value"],
		af = ["disabled", "checked", "onChange"],
		cf = ["value", "onInput"],
		uf = ["value", "onInput"],
		ff = ["value", "onInput"],
		df = ["value", "onInput"],
		pf = { key: 6, class: "ppv2-fd-related-cell-text" },
		mf = { key: 0, class: "ppv2-fd-related-empty" },
		hf = { key: 4, class: "ppv2-fd-related-schema" },
		gf = { class: "ppv2-fd-related-sizer-row", title: "Drag to resize the label column" },
		vf = { key: 0, class: "ppv2-fd-section-label" },
		yf = { class: "ppv2-fd-related-fn" },
		_f = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		bf = { class: "ppv2-fd-related-ft" },
		wf = { key: 5, class: "ppv2-fd-related-placeholder ppv2-fd-related-placeholder-compact" },
		xf = { class: "ppv2-fd-related-placeholder-text" },
		Cf = { key: 0, class: "ppv2-fd-related-placeholder-sub" },
		Sf = De(
			{
				__name: "PanelFormDialogRelatedTab",
				props: {
					ti: { type: Number, required: !0 },
					tab: { type: Object, required: !0 },
					definitionName: { type: String, default: "" },
					rootDoctype: { type: String, default: "" },
					rootDocName: { type: String, default: null },
					formData: { type: Object, required: !0 },
					originalFormData: { type: Object, default: null },
				},
				emits: ["related-dirty"],
				setup(e, { expose: t, emit: n }) {
					const o = e,
						l = n;
					function s(d) {
						return !d || d.reqd == null
							? !1
							: Number(d.reqd) === 1 || d.reqd === !0 || d.reqd === "1";
					}
					const i = Ae({}),
						r = Ae({}),
						a = Ae({});
					let u = null,
						c = 0,
						f = 0;
					function h(d) {
						return `nce_fd_rel_lblw:${(o.definitionName || "_").trim() || "_"}:${d}`;
					}
					function v(d) {
						try {
							const m = localStorage.getItem(h(d)),
								y = parseInt(String(m), 10);
							if (Number.isFinite(y) && y >= 72 && y <= 640) return y;
						} catch {}
						return null;
					}
					function b(d) {
						let m = 8;
						for (const y of d.sections || [])
							for (const F of y.columns || [])
								for (const I of F.fields || []) {
									const T = String(I.label || I.fieldname || "").length;
									T > m && (m = T);
								}
						return Math.min(480, Math.max(120, Math.round(m * 7.2 + 28)));
					}
					function w() {
						const d = v(o.ti);
						d != null
							? (a[o.ti] = d)
							: o.tab.sections && o.tab.sections.length
							? (a[o.ti] = b(o.tab))
							: (a[o.ti] = 200);
					}
					ze(
						() => o.tab,
						() => {
							w(), D(), N(o.ti);
						},
						{ deep: !0, immediate: !0 }
					);
					function D() {
						for (const d of Object.keys(i)) delete i[d];
						for (const d of Object.keys(r)) delete r[d];
					}
					function S() {
						const d = (o.definitionName || "").trim(),
							m = (o.rootDoctype || "").trim(),
							y = String(o.rootDocName || "").trim();
						return `${d}\0${m}\0${y}`;
					}
					async function N(d) {
						var I;
						const m = o.tab;
						if (
							!((I = m == null ? void 0 : m._related) != null && I.child_row_name) ||
							!o.rootDocName ||
							!String(o.definitionName || "").trim() ||
							!String(o.rootDoctype || "").trim()
						)
							return;
						const y = S(),
							F = (r[d] || 0) + 1;
						(r[d] = F), i[d] || (i[d] = {}), (i[d].loading = !0), (i[d].error = null);
						try {
							const T = await dt(
								"nce_events.api.form_dialog_api.get_form_dialog_related_rows",
								{
									definition: String(o.definitionName).trim(),
									related_row_name: m._related.child_row_name,
									root_doctype: String(o.rootDoctype).trim(),
									root_name: String(o.rootDocName).trim(),
									limit: 500,
								}
							);
							if (r[d] !== F) return;
							i[d].fetchKey = y;
							const V = Array.isArray(T.rows) ? T.rows : [];
							(i[d].baseline = JSON.parse(JSON.stringify(V))),
								(i[d].rows = V.map(($) => ({ ...$ }))),
								(i[d].columns = Array.isArray(T.columns) ? T.columns : []),
								l("related-dirty", !1);
						} catch (T) {
							if (r[d] !== F) return;
							(i[d].rows = []),
								(i[d].baseline = []),
								(i[d].columns = []),
								(i[d].error =
									(T == null ? void 0 : T.message) ||
									String(T) ||
									"Failed to load related rows");
						} finally {
							r[d] === F && (i[d].loading = !1);
						}
					}
					function j(d) {
						return d == null || typeof d != "string"
							? []
							: d
									.split(
										`
`
									)
									.map((m) => m.trim())
									.filter((m) => m.length > 0);
					}
					function O(d) {
						return !!(d && d.fieldtype === "Select");
					}
					function x(d, m) {
						const y = j(d.options),
							F = String(E(m, d) ?? "").trim();
						return F && !y.includes(F) ? [...y, F] : y.length ? y : F ? [F] : [];
					}
					function E(d, m) {
						return !d || !m ? null : d[m.fieldname];
					}
					function L(d, m) {
						const y = E(d, m);
						return y === 1 || y === !0 || y === "1" || y === "Yes";
					}
					function H(d, m) {
						const y = E(d, m);
						if (y == null || y === "") return "";
						if (typeof y == "object")
							try {
								return JSON.stringify(y);
							} catch {
								return String(y);
							}
						return String(y);
					}
					const B = new Set([
						"Link",
						"Dynamic Link",
						"Table",
						"Attach",
						"Attach Image",
						"HTML",
						"Read Only",
						"Button",
						"Barcode",
						"Geolocation",
					]);
					function K(d) {
						if (!d || !(Number(d.editable) === 1 || d.editable === !0)) return !1;
						const m = d.fieldtype;
						return !B.has(m);
					}
					function oe(d) {
						const m = d == null ? void 0 : d.fieldtype;
						return m === "Int" || m === "Float" || m === "Currency";
					}
					function pe(d) {
						return (
							(d == null ? void 0 : d.fieldtype) === "Text" ||
							(d == null ? void 0 : d.fieldtype) === "Long Text"
						);
					}
					function Q(d, m) {
						const y = i[d];
						return !(y != null && y.baseline) || m == null || m === ""
							? null
							: y.baseline.find((F) => F.name === m) ?? null;
					}
					function Z(d, m, y) {
						if (!K(y) || (m == null ? void 0 : m.name) == null || m.name === "")
							return !1;
						const F = Q(d, m.name);
						return F ? !he(m[y.fieldname], F[y.fieldname]) : !1;
					}
					function he(d, m) {
						return d === m || (d == null && m == null)
							? !0
							: d == null || m == null
							? !1
							: ((d === 0 || d === "0" || d === !1) &&
									(m === 0 || m === "0" || m === !1)) ||
							  ((d === 1 || d === "1" || d === !0) &&
									(m === 1 || m === "1" || m === !0))
							? !0
							: String(d) === String(m);
					}
					function se() {
						for (const d of Object.keys(i)) {
							const m = Number(d);
							if (Number.isInteger(m) && Ce(m)) return !0;
						}
						return !1;
					}
					let ie = !1;
					function ne() {
						ie ||
							((ie = !0),
							_t(() => {
								(ie = !1), l("related-dirty", se());
							}));
					}
					function Ce(d) {
						const m = i[d];
						if (!(m != null && m.rows) || !m.baseline) return !1;
						const y = (m.columns || []).filter(K);
						if (!y.length) return !1;
						for (const F of m.rows) {
							const I = F.name;
							if (!I) continue;
							const T = m.baseline.find((V) => V.name === I);
							if (T) {
								for (const V of y)
									if (!he(F[V.fieldname], T[V.fieldname])) return !0;
							}
						}
						return !1;
					}
					function ke(d) {
						var I, T;
						const m = i[d];
						if (
							!((I = m == null ? void 0 : m.rows) != null && I.length) ||
							!((T = m.baseline) != null && T.length)
						)
							return [];
						const y = (m.columns || []).filter(K);
						if (!y.length) return [];
						const F = [];
						for (const V of m.rows) {
							const $ = V.name;
							if (!$) continue;
							const Y = m.baseline.find((te) => te.name === $);
							if (!Y) continue;
							const W = {};
							for (const te of y) {
								const k = te.fieldname;
								he(V[k], Y[k]) || (W[k] = V[k]);
							}
							Object.keys(W).length && F.push({ name: $, values: W });
						}
						return F;
					}
					function Ye(d, m, y) {
						(d[m.fieldname] = y.target.value), ne();
					}
					function Ie(d, m, y) {
						(d[m.fieldname] = y.target.checked ? 1 : 0), ne();
					}
					function $t(d, m) {
						const y = E(d, m);
						return y == null || y === "" ? "" : Number(y);
					}
					function Dt(d, m, y) {
						const F = y.target.value;
						(d[m.fieldname] = F === "" ? null : Number(F)), ne();
					}
					function Tt(d, m) {
						const y = E(d, m);
						return y == null || y === "" ? "" : String(y).slice(0, 10);
					}
					function Ge(d, m, y) {
						(d[m.fieldname] = y.target.value || null), ne();
					}
					function q(d, m, y) {
						(d[m.fieldname] = y.target.value), ne();
					}
					function z() {
						for (const d of Object.keys(i)) {
							const m = Number(d),
								y = i[m];
							if (!(y != null && y.baseline) || !Array.isArray(y.rows)) continue;
							const F = JSON.parse(JSON.stringify(y.baseline));
							y.rows.splice(0, y.rows.length);
							for (const I of F) y.rows.push({ ...I });
						}
						l("related-dirty", !1);
					}
					async function U() {
						var $;
						const d = String(o.rootDocName || "").trim(),
							m = String(o.definitionName || "").trim(),
							y = String(o.rootDoctype || "").trim();
						if (!d || !m || !y) return;
						const F = o.tab,
							I =
								($ = F == null ? void 0 : F._related) == null
									? void 0
									: $.child_row_name;
						if (!I) return;
						const T = ke(o.ti);
						if (!T.length) return;
						await dt("nce_events.api.form_dialog_api.save_form_dialog_related_rows", {
							definition: m,
							related_row_name: I,
							root_doctype: y,
							root_name: d,
							updates: T,
						});
						const V = i[o.ti];
						V != null && V.rows && (V.baseline = JSON.parse(JSON.stringify(V.rows))),
							l("related-dirty", !1);
					}
					t({ saveAllRelatedRows: U, resetRelatedToBaseline: z });
					function me(d) {
						const m = a[d];
						return typeof m == "number" && Number.isFinite(m) ? m : 200;
					}
					function ee(d) {
						if (u == null) return;
						const m = d.clientX - c,
							y = Math.min(640, Math.max(72, f + m));
						a[u] = y;
					}
					function p() {
						if (u != null)
							try {
								localStorage.setItem(h(u), String(a[u]));
							} catch {}
						(u = null),
							window.removeEventListener("mousemove", ee),
							window.removeEventListener("mouseup", p);
					}
					function g(d, m) {
						(u = d),
							(c = m.clientX),
							(f = me(d)),
							window.addEventListener("mousemove", ee),
							window.addEventListener("mouseup", p);
					}
					return (
						Jt(() => {
							window.removeEventListener("mousemove", ee),
								window.removeEventListener("mouseup", p);
						}),
						(d, m) => {
							var y, F, I;
							return e.tab._related
								? (_(),
								  C("div", zu, [
										A("p", Yu, [
											Qe(G(e.tab._related.doctype) + " ", 1),
											e.tab._related.link_field
												? (_(),
												  C(
														"span",
														Ju,
														" · " + G(e.tab._related.link_field),
														1
												  ))
												: ue("", !0),
											e.tab._related.hop_chain &&
											e.tab._related.hop_chain.length
												? (_(),
												  C(
														"span",
														Xu,
														" · " +
															G(e.tab._related.hop_chain.length) +
															"-hop ",
														1
												  ))
												: ue("", !0),
										]),
										e.tab._related.captureError
											? (_(),
											  C(
													"p",
													Gu,
													" Schema note: " +
														G(e.tab._related.captureError),
													1
											  ))
											: ue("", !0),
										e.tab._related.child_row_name
											? e.rootDocName
												? (_(),
												  C(
														ce,
														{ key: 3 },
														[
															(y = i[e.ti]) != null && y.loading
																? (_(),
																  C(
																		"div",
																		ef,
																		" Loading related rows… "
																  ))
																: (F = i[e.ti]) != null && F.error
																? (_(),
																  C(
																		"div",
																		tf,
																		G(i[e.ti].error),
																		1
																  ))
																: (
																		((I = i[e.ti]) == null
																			? void 0
																			: I.columns) || []
																  ).length
																? (_(),
																  C("div", nf, [
																		A("table", of, [
																			A("thead", null, [
																				A("tr", null, [
																					(_(!0),
																					C(
																						ce,
																						null,
																						be(
																							i[e.ti]
																								.columns,
																							(
																								T
																							) => (
																								_(),
																								C(
																									"th",
																									{
																										key: T.fieldname,
																										class: "ppv2-fd-related-th",
																									},
																									[
																										Qe(
																											G(
																												T.label ||
																													T.fieldname
																											),
																											1
																										),
																										s(
																											T
																										)
																											? (_(),
																											  C(
																													"span",
																													lf,
																													" * "
																											  ))
																											: ue(
																													"",
																													!0
																											  ),
																									]
																								)
																							)
																						),
																						128
																					)),
																				]),
																			]),
																			A("tbody", null, [
																				(_(!0),
																				C(
																					ce,
																					null,
																					be(
																						i[e.ti]
																							.rows ||
																							[],
																						(T, V) => (
																							_(),
																							C(
																								"tr",
																								{
																									key: String(
																										T.name !=
																											null
																											? T.name
																											: V
																									),
																								},
																								[
																									(_(
																										!0
																									),
																									C(
																										ce,
																										null,
																										be(
																											i[
																												e
																													.ti
																											]
																												.columns,
																											(
																												$
																											) => (
																												_(),
																												C(
																													"td",
																													{
																														key: $.fieldname,
																														class: Ve(
																															[
																																"ppv2-fd-related-td",
																																{
																																	"ppv2-fd-related-td--editable":
																																		K(
																																			$
																																		),
																																	"ppv2-fd-related-td--dirty":
																																		Z(
																																			e.ti,
																																			T,
																																			$
																																		),
																																},
																															]
																														),
																													},
																													[
																														O(
																															$
																														)
																															? (_(),
																															  C(
																																	"select",
																																	{
																																		key: 0,
																																		class: "ppv2-fd-related-select",
																																		value: String(
																																			E(
																																				T,
																																				$
																																			) ??
																																				""
																																		),
																																		disabled:
																																			!K(
																																				$
																																			),
																																		"aria-label":
																																			$.label ||
																																			$.fieldname,
																																		onChange:
																																			(
																																				Y
																																			) =>
																																				Ye(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	[
																																		m[1] ||
																																			(m[1] =
																																				A(
																																					"option",
																																					{
																																						value: "",
																																					},
																																					"—",
																																					-1
																																				)),
																																		(_(
																																			!0
																																		),
																																		C(
																																			ce,
																																			null,
																																			be(
																																				x(
																																					$,
																																					T
																																				),
																																				(
																																					Y
																																				) => (
																																					_(),
																																					C(
																																						"option",
																																						{
																																							key: Y,
																																							value: Y,
																																						},
																																						G(
																																							Y
																																						),
																																						9,
																																						rf
																																					)
																																				)
																																			),
																																			128
																																		)),
																																	],
																																	40,
																																	sf
																															  ))
																															: $.fieldtype ===
																															  "Check"
																															? (_(),
																															  C(
																																	"input",
																																	{
																																		key: 1,
																																		type: "checkbox",
																																		class: "ppv2-fd-related-check",
																																		disabled:
																																			!K(
																																				$
																																			),
																																		checked:
																																			L(
																																				T,
																																				$
																																			),
																																		onChange:
																																			(
																																				Y
																																			) =>
																																				Ie(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	null,
																																	40,
																																	af
																															  ))
																															: K(
																																	$
																															  ) &&
																															  oe(
																																	$
																															  )
																															? (_(),
																															  C(
																																	"input",
																																	{
																																		key: 2,
																																		type: "number",
																																		class: "ppv2-fd-related-inp",
																																		value: $t(
																																			T,
																																			$
																																		),
																																		onInput:
																																			(
																																				Y
																																			) =>
																																				Dt(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	null,
																																	40,
																																	cf
																															  ))
																															: K(
																																	$
																															  ) &&
																															  $.fieldtype ===
																																	"Date"
																															? (_(),
																															  C(
																																	"input",
																																	{
																																		key: 3,
																																		type: "date",
																																		class: "ppv2-fd-related-inp",
																																		value: Tt(
																																			T,
																																			$
																																		),
																																		onInput:
																																			(
																																				Y
																																			) =>
																																				Ge(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	null,
																																	40,
																																	uf
																															  ))
																															: K(
																																	$
																															  ) &&
																															  pe(
																																	$
																															  )
																															? (_(),
																															  C(
																																	"textarea",
																																	{
																																		key: 4,
																																		class: "ppv2-fd-related-textarea",
																																		rows: "2",
																																		value: String(
																																			E(
																																				T,
																																				$
																																			) ??
																																				""
																																		),
																																		onInput:
																																			(
																																				Y
																																			) =>
																																				q(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	null,
																																	40,
																																	ff
																															  ))
																															: K(
																																	$
																															  )
																															? (_(),
																															  C(
																																	"input",
																																	{
																																		key: 5,
																																		type: "text",
																																		class: "ppv2-fd-related-inp",
																																		value: String(
																																			E(
																																				T,
																																				$
																																			) ??
																																				""
																																		),
																																		onInput:
																																			(
																																				Y
																																			) =>
																																				q(
																																					T,
																																					$,
																																					Y
																																				),
																																	},
																																	null,
																																	40,
																																	df
																															  ))
																															: (_(),
																															  C(
																																	"span",
																																	pf,
																																	G(
																																		H(
																																			T,
																																			$
																																		)
																																	),
																																	1
																															  )),
																													],
																													2
																												)
																											)
																										),
																										128
																									)),
																								]
																							)
																						)
																					),
																					128
																				)),
																			]),
																		]),
																		(i[e.ti].rows || []).length
																			? ue("", !0)
																			: (_(),
																			  C(
																					"p",
																					mf,
																					" No related records. "
																			  )),
																  ]))
																: ue("", !0),
														],
														64
												  ))
												: (_(),
												  C(
														"p",
														Qu,
														" Save the document to load related rows. "
												  ))
											: (_(),
											  C(
													"p",
													Zu,
													" Related tab is missing a server row id. Re-save the Form Dialog from Desk. "
											  )),
										e.tab.sections && e.tab.sections.length
											? (_(),
											  C("details", hf, [
													m[2] ||
														(m[2] = A(
															"summary",
															{
																class: "ppv2-fd-related-schema-sum",
															},
															"Field metadata",
															-1
														)),
													A(
														"div",
														{
															class: "ppv2-fd-related-preview",
															style: Re({
																"--ppv2-fd-rel-lbl":
																	me(e.ti) + "px",
															}),
														},
														[
															A("div", gf, [
																A(
																	"span",
																	{
																		class: "ppv2-fd-related-sizer-spacer",
																		style: Re({
																			width: me(e.ti) + "px",
																		}),
																	},
																	null,
																	4
																),
																A(
																	"button",
																	{
																		type: "button",
																		class: "ppv2-fd-related-sizer-grip",
																		"aria-label":
																			"Resize label column",
																		onMousedown:
																			m[0] ||
																			(m[0] = Ee(
																				(T) => g(e.ti, T),
																				["prevent"]
																			)),
																	},
																	null,
																	32
																),
															]),
															(_(!0),
															C(
																ce,
																null,
																be(
																	e.tab.sections,
																	(T, V) => (
																		_(),
																		C(
																			"div",
																			{
																				key: "rs" + V,
																				class: "ppv2-fd-section",
																			},
																			[
																				T.label
																					? (_(),
																					  C(
																							"h3",
																							vf,
																							G(
																								T.label
																							),
																							1
																					  ))
																					: ue("", !0),
																				A(
																					"div",
																					{
																						class: "ppv2-fd-columns",
																						style: Re({
																							gridTemplateColumns:
																								"repeat(" +
																								Math.max(
																									T
																										.columns
																										.length,
																									1
																								) +
																								", 1fr)",
																						}),
																					},
																					[
																						(_(!0),
																						C(
																							ce,
																							null,
																							be(
																								T.columns,
																								(
																									$,
																									Y
																								) => (
																									_(),
																									C(
																										"div",
																										{
																											key:
																												"rc" +
																												Y,
																										},
																										[
																											(_(
																												!0
																											),
																											C(
																												ce,
																												null,
																												be(
																													$.fields,
																													(
																														W
																													) => (
																														_(),
																														C(
																															"div",
																															{
																																key: W.fieldname,
																																class: "ppv2-fd-related-field-row",
																															},
																															[
																																A(
																																	"span",
																																	yf,
																																	[
																																		Qe(
																																			G(
																																				W.label ||
																																					W.fieldname
																																			),
																																			1
																																		),
																																		s(
																																			W
																																		)
																																			? (_(),
																																			  C(
																																					"span",
																																					_f,
																																					" * "
																																			  ))
																																			: ue(
																																					"",
																																					!0
																																			  ),
																																	]
																																),
																																A(
																																	"span",
																																	bf,
																																	G(
																																		W.fieldtype
																																	),
																																	1
																																),
																															]
																														)
																													)
																												),
																												128
																											)),
																										]
																									)
																								)
																							),
																							128
																						)),
																					],
																					4
																				),
																			]
																		)
																	)
																),
																128
															)),
														],
														4
													),
											  ]))
											: (_(),
											  C("div", wf, [
													A(
														"p",
														xf,
														G(
															e.tab._related.label ||
																e.tab._related.doctype
														),
														1
													),
													e.tab._related.captureError
														? ue("", !0)
														: (_(),
														  C(
																"p",
																Cf,
																" No field layout stored for this tab. "
														  )),
											  ])),
								  ]))
								: ue("", !0);
						}
					);
				},
			},
			[["__scopeId", "data-v-5525e0bc"]]
		),
		$f = { class: "ppv2-fd-body" },
		kf = { key: 0, class: "ppv2-fd-loading" },
		Ff = { key: 1, class: "ppv2-fd-error" },
		Df = { class: "ppv2-fd-tab-panels" },
		Tf = { key: 0, class: "ppv2-fd-section-label" },
		Nf = { key: 1, class: "ppv2-fd-section-desc" },
		Ef = { key: 0, class: "ppv2-fd-validation-error" },
		Rf = De(
			{
				__name: "PanelFormDialogBody",
				props: Gl(
					{
						definitionName: { type: String, default: "" },
						rootDoctype: { type: String, default: "" },
						rootDocName: { type: String, default: null },
						loading: { type: Boolean, default: !1 },
						error: { type: String, default: null },
						tabs: { type: Array, default: () => [] },
						validationError: { type: String, default: null },
						formData: { type: Object, required: !0 },
						originalFormData: { type: Object, default: null },
						isFieldVisible: { type: Function, required: !0 },
						isFieldMandatory: { type: Function, required: !0 },
						isFieldReadOnly: { type: Function, required: !0 },
					},
					{ activeTab: { type: Number, required: !0 }, activeTabModifiers: {} }
				),
				emits: Gl(["field-change", "link-change", "related-dirty"], ["update:activeTab"]),
				setup(e, { expose: t, emit: n }) {
					const o = e,
						l = Pr(e, "activeTab");
					function s(c) {
						const f = o.originalFormData,
							h = o.formData;
						return f == null || h == null || c == null || c === ""
							? !1
							: !i(h[c], f[c]);
					}
					function i(c, f) {
						return c === f || (c == null && f == null)
							? !0
							: c == null || f == null
							? !1
							: ((c === 0 || c === "0" || c === !1) &&
									(f === 0 || f === "0" || f === !1)) ||
							  ((c === 1 || c === "1" || c === !0) &&
									(f === 1 || f === "1" || f === !0))
							? !0
							: String(c) === String(f);
					}
					const r = X([]);
					async function a(...c) {
						for (const f of r.value)
							f != null &&
								f.saveAllRelatedRows &&
								(await f.saveAllRelatedRows(...c));
					}
					function u() {
						var c;
						for (const f of r.value)
							(c = f == null ? void 0 : f.resetRelatedToBaseline) == null ||
								c.call(f);
					}
					return (
						t({ saveAllRelatedRows: a, resetRelatedToBaseline: u }),
						(c, f) => (
							_(),
							C("div", $f, [
								e.loading
									? (_(), C("div", kf, "Loading…"))
									: e.error
									? (_(), C("div", Ff, G(e.error), 1))
									: e.tabs.length
									? (_(),
									  C(
											ce,
											{ key: 2 },
											[
												Oe(
													Ku,
													{
														tabs: e.tabs,
														"active-tab": l.value,
														"onUpdate:activeTab":
															f[0] || (f[0] = (h) => (l.value = h)),
													},
													null,
													8,
													["tabs", "active-tab"]
												),
												A("div", Df, [
													(_(!0),
													C(
														ce,
														null,
														be(
															e.tabs,
															(h, v) => (
																_(),
																C(
																	"div",
																	{
																		key: v,
																		class: Ve([
																			"ppv2-fd-tab-panel",
																			{
																				"ppv2-fd-tab-panel-active":
																					e.tabs
																						.length ===
																						1 ||
																					l.value === v,
																			},
																		]),
																	},
																	[
																		h._related
																			? (_(),
																			  Te(
																					Sf,
																					{
																						key: 0,
																						ref_for:
																							!0,
																						ref: (b) =>
																							(r.value[
																								v
																							] = b),
																						ti: v,
																						tab: h,
																						"definition-name":
																							e.definitionName,
																						"root-doctype":
																							e.rootDoctype,
																						"root-doc-name":
																							e.rootDocName,
																						"form-data":
																							e.formData,
																						"original-form-data":
																							e.originalFormData,
																						onRelatedDirty:
																							f[1] ||
																							(f[1] =
																								(
																									b
																								) =>
																									c.$emit(
																										"related-dirty",
																										b
																									)),
																					},
																					null,
																					8,
																					[
																						"ti",
																						"tab",
																						"definition-name",
																						"root-doctype",
																						"root-doc-name",
																						"form-data",
																						"original-form-data",
																					]
																			  ))
																			: (_(!0),
																			  C(
																					ce,
																					{ key: 1 },
																					be(
																						h.sections,
																						(b, w) => (
																							_(),
																							C(
																								"div",
																								{
																									key: w,
																									class: "ppv2-fd-section",
																								},
																								[
																									b.label
																										? (_(),
																										  C(
																												"h3",
																												Tf,
																												G(
																													b.label
																												),
																												1
																										  ))
																										: ue(
																												"",
																												!0
																										  ),
																									b.description
																										? (_(),
																										  C(
																												"p",
																												Nf,
																												G(
																													b.description
																												),
																												1
																										  ))
																										: ue(
																												"",
																												!0
																										  ),
																									A(
																										"div",
																										{
																											class: "ppv2-fd-columns",
																											style: Re(
																												{
																													gridTemplateColumns:
																														"repeat(" +
																														b
																															.columns
																															.length +
																														", 1fr)",
																												}
																											),
																										},
																										[
																											(_(
																												!0
																											),
																											C(
																												ce,
																												null,
																												be(
																													b.columns,
																													(
																														D,
																														S
																													) => (
																														_(),
																														C(
																															"div",
																															{
																																key: S,
																															},
																															[
																																(_(
																																	!0
																																),
																																C(
																																	ce,
																																	null,
																																	be(
																																		D.fields,
																																		(
																																			N
																																		) => (
																																			_(),
																																			Te(
																																				qu,
																																				{
																																					key: N.fieldname,
																																					field: N,
																																					"model-value":
																																						e
																																							.formData[
																																							N
																																								.fieldname
																																						],
																																					visible:
																																						e.isFieldVisible(
																																							N
																																						),
																																					mandatory:
																																						e.isFieldMandatory(
																																							N
																																						),
																																					"read-only":
																																						e.isFieldReadOnly(
																																							N
																																						),
																																					"field-dirty":
																																						!e.isFieldReadOnly(
																																							N
																																						) &&
																																						s(
																																							N.fieldname
																																						),
																																					onChange:
																																						f[2] ||
																																						(f[2] =
																																							(
																																								j
																																							) =>
																																								c.$emit(
																																									"field-change",
																																									j
																																								)),
																																					onLinkChange:
																																						f[3] ||
																																						(f[3] =
																																							(
																																								j
																																							) =>
																																								c.$emit(
																																									"link-change",
																																									j
																																								)),
																																				},
																																				null,
																																				8,
																																				[
																																					"field",
																																					"model-value",
																																					"visible",
																																					"mandatory",
																																					"read-only",
																																					"field-dirty",
																																				]
																																			)
																																		)
																																	),
																																	128
																																)),
																															]
																														)
																													)
																												),
																												128
																											)),
																										],
																										4
																									),
																								]
																							)
																						)
																					),
																					128
																			  )),
																	],
																	2
																)
															)
														),
														128
													)),
												]),
												e.validationError
													? (_(), C("div", Ef, G(e.validationError), 1))
													: ue("", !0),
											],
											64
									  ))
									: ue("", !0),
							])
						)
					);
				},
			},
			[["__scopeId", "data-v-312c3f35"]]
		),
		Of = { class: "ppv2-fd-footer" },
		Pf = { class: "ppv2-fd-custom-buttons" },
		Af = ["onClick"],
		Mf = { class: "ppv2-fd-action-buttons" },
		If = ["disabled"],
		Lf = ["disabled"],
		jf = De(
			{
				__name: "PanelFormDialogFooter",
				props: {
					buttons: { type: Array, default: () => [] },
					saving: { type: Boolean, default: !1 },
					isDirty: { type: Boolean, default: !1 },
				},
				emits: ["cancel", "revert", "submit", "custom-button"],
				setup(e) {
					return (t, n) => (
						_(),
						C("div", Of, [
							A("div", Pf, [
								(_(!0),
								C(
									ce,
									null,
									be(
										e.buttons,
										(o, l) => (
											_(),
											C(
												"button",
												{
													key: "fd-btn-" + l + "-" + (o.label || l),
													type: "button",
													class: "ppv2-fd-tab-btn",
													onClick: (s) => t.$emit("custom-button", o),
												},
												G(o.label),
												9,
												Af
											)
										)
									),
									128
								)),
							]),
							A("div", Mf, [
								A(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn",
										onClick: n[0] || (n[0] = (o) => t.$emit("cancel")),
									},
									"Cancel"
								),
								A(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn",
										disabled: e.saving || !e.isDirty,
										onClick: n[1] || (n[1] = (o) => t.$emit("revert")),
									},
									" Revert ",
									8,
									If
								),
								A(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn ppv2-fd-tab-active",
										disabled: e.saving,
										onClick: n[2] || (n[2] = (o) => t.$emit("submit")),
									},
									G(e.saving ? "Saving…" : "Submit"),
									9,
									Lf
								),
							]),
						])
					);
				},
			},
			[["__scopeId", "data-v-0713f20d"]]
		);
	function ni(e) {
		const t = ve(e) || {},
			n = {};
		for (const o of Object.keys(t).sort()) {
			let l = t[o];
			l === void 0 && (l = null), (n[o] = l);
		}
		return JSON.stringify(n);
	}
	function Vf(e, t) {
		async function n(o, l) {
			if (!l) return;
			const s = [];
			for (const u of e.value) {
				if (!u.fetch_from) continue;
				const c = u.fetch_from.split(".");
				c.length === 2 &&
					c[0] === o &&
					((u.fetch_if_empty && t[u.fieldname]) ||
						s.push({
							fieldname: u.fieldname,
							remoteField: c[1],
							fetchIfEmpty: !!u.fetch_if_empty,
						}));
			}
			if (!s.length) return;
			const i = e.value.find((u) => u.fieldname === o);
			if (!i || !i.options) return;
			const r = i.options,
				a = s.map((u) => u.remoteField);
			try {
				const u = await dt("frappe.client.get_value", {
					doctype: r,
					fieldname: a,
					filters: { name: l },
				});
				if (u) {
					for (const c of s)
						if (u[c.remoteField] !== void 0) {
							if (c.fetchIfEmpty && t[c.fieldname]) continue;
							t[c.fieldname] = u[c.remoteField];
						}
				}
			} catch {}
		}
		return n;
	}
	function Qt(e, t) {
		if (!e) return !0;
		if (e.startsWith("eval:"))
			try {
				const n = e.slice(5);
				return new Function("doc", `return (${n})`)(t);
			} catch {
				return !0;
			}
		return !!t[e];
	}
	const Bf = ["Tab Break", "Section Break", "Column Break", "Heading", "HTML", "Image", "Fold"];
	function Yo(e) {
		return Bf.includes(e);
	}
	function oi(e) {
		return e == null || e === "" || e === 0;
	}
	function Jo(e) {
		return e ? Number(e.is_virtual) === 1 || e.is_virtual === !0 : !1;
	}
	function Hf(e, t) {
		const n = [];
		for (const o of e) {
			if (Yo(o.fieldtype) || o.hidden || Jo(o) || (o.depends_on && !Qt(o.depends_on, t)))
				continue;
			if (o.reqd || (o.mandatory_depends_on && Qt(o.mandatory_depends_on, t))) {
				const s = t[o.fieldname];
				oi(s) &&
					n.push({
						fieldname: o.fieldname,
						label: o.label,
						message: `${o.label} is required`,
					});
			}
		}
		return n;
	}
	function qf(e, t, n) {
		const o = [];
		if (!Array.isArray(n) || !n.length) return o;
		const l = new Map((e || []).map((s) => [s.fieldname, s]));
		for (const s of n) {
			const i = String(s || "").trim();
			if (!i || i.includes(".")) continue;
			const r = l.get(i);
			if (
				!r ||
				Yo(r.fieldtype) ||
				r.hidden ||
				Jo(r) ||
				(r.depends_on && !Qt(r.depends_on, t))
			)
				continue;
			const a = t[r.fieldname];
			oi(a) &&
				o.push({
					fieldname: r.fieldname,
					label: r.label,
					message: `${r.label} is required`,
				});
		}
		return o;
	}
	function Uf(e, t) {
		return e.hidden ? !1 : e.depends_on ? Qt(e.depends_on, t) : !0;
	}
	function Wf(e, t) {
		return e.mandatory_depends_on ? Qt(e.mandatory_depends_on, t) : !!e.reqd;
	}
	function Kf(e, t) {
		return Jo(e) ? !0 : e.read_only_depends_on ? Qt(e.read_only_depends_on, t) : !!e.read_only;
	}
	function li(e) {
		try {
			const t = JSON.parse((e == null ? void 0 : e._server_messages) || "[]");
			if (t.length) return t.map((n) => (typeof n == "object" ? n.message : n)).join(" ");
		} catch {}
		return (e == null ? void 0 : e.message) || "Failed to save";
	}
	async function zf({
		formData: e,
		originalData: t,
		definition: n,
		doctype: o,
		saving: l,
		validationError: s,
		runValidate: i,
	}) {
		var a;
		s.value = null;
		const r = i();
		if (r.length) throw ((s.value = r.map((u) => u.message).join(", ")), new Error(s.value));
		l.value = !0;
		try {
			const u = Number((a = n.value) == null ? void 0 : a.writeback_on_submit) === 1,
				c = await dt("nce_events.api.form_dialog_api.save_form_dialog_document", {
					doc: { doctype: R(o), ...e },
					writeback_fetches: u ? 1 : 0,
				});
			return Object.assign(e, c), (t.value = JSON.parse(JSON.stringify(e))), c;
		} catch (u) {
			throw ((s.value = li(u)), u);
		} finally {
			l.value = !1;
		}
	}
	function si(e) {
		const t = [];
		let n = { label: "Details", sections: [] },
			o = { label: "", collapsible: !1, description: "", columns: [] },
			l = { fields: [] };
		for (const s of e) {
			if (s.hidden) continue;
			const i = s.fieldtype;
			i === "Tab Break"
				? (o.columns.push(l),
				  n.sections.push(o),
				  ii(n) && t.push(n),
				  (n = { label: s.label || "Details", sections: [] }),
				  (o = { label: "", collapsible: !1, description: "", columns: [] }),
				  (l = { fields: [] }))
				: i === "Section Break"
				? (o.columns.push(l),
				  n.sections.push(o),
				  (o = {
						label: s.label || "",
						collapsible: !!s.collapsible,
						description: s.description || "",
						columns: [],
				  }),
				  (l = { fields: [] }))
				: i === "Column Break"
				? (o.columns.push(l), (l = { fields: [] }))
				: l.fields.push(s);
		}
		return o.columns.push(l), n.sections.push(o), ii(n) && t.push(n), t;
	}
	function ii(e) {
		return e.sections.some((t) => t.columns.some((n) => n.fields.length > 0));
	}
	function Yf(e) {
		if (Array.isArray(e)) return e;
		if (e == null || e === "") return [];
		if (typeof e == "string" && String(e).trim())
			try {
				const t = JSON.parse(e);
				return Array.isArray(t) ? t : [];
			} catch {
				return [];
			}
		return [];
	}
	function Jf(e) {
		const {
			definitionName: t,
			doctype: n,
			docName: o,
			definition: l,
			tabs: s,
			allFields: i,
			formData: r,
			originalData: a,
			loading: u,
			error: c,
			validationError: f,
			buttons: h,
			handleFetchFrom: v,
			syncingFromLoad: b,
			loadDebugLog: w,
		} = e;
		let D = 0;
		function S(O, x, E = "", L = null) {
			!so() ||
				!w ||
				w.value.push({
					t: new Date().toISOString(),
					step: O,
					ok: x,
					detail: E || "",
					err: L ? String(L) : null,
				});
		}
		function N() {
			(D += 1),
				(b.value = !1),
				(u.value = !1),
				(c.value = null),
				(f.value = null),
				(s.value = []),
				(i.value = []),
				(l.value = null),
				(h.value = []);
			for (const O of Object.keys(r)) delete r[O];
			(a.value = {}), so() && w && (w.value = []);
		}
		async function j() {
			var H;
			const O = ++D;
			(u.value = !0), (c.value = null), (f.value = null), (b.value = !1);
			const x = R(t),
				E = R(n),
				L = R(o);
			so() && w && (w.value = []),
				S("start", !0, `seq=${O} doctype=${E} docName=${L ?? "(new)"} definition=${x}`);
			try {
				let B;
				try {
					B = await dt("nce_events.api.form_dialog_api.get_form_dialog_definition", {
						name: x,
					});
				} catch (Q) {
					throw (
						(S(
							"get_form_dialog_definition",
							!1,
							x,
							(Q == null ? void 0 : Q.message) || Q
						),
						Q)
					);
				}
				if (O !== D) {
					S("aborted", !1, "stale seq after get_form_dialog_definition");
					return;
				}
				S(
					"get_form_dialog_definition",
					!0,
					`ok dialog_size=${(B == null ? void 0 : B.dialog_size) ?? "?"}`
				),
					(l.value = B),
					(h.value = B.buttons || []);
				const K = ((H = B.frozen_meta) == null ? void 0 : H.fields) || [];
				(i.value = K), (s.value = si(K));
				let oe = 0;
				try {
					const Q = B.related_doctypes || [];
					for (const Z of Q)
						try {
							if (!Z || typeof Z != "object") continue;
							const he = Z.doctype || Z.child_doctype;
							if (!he) continue;
							let se = null;
							if (Z.info != null && String(Z.info).trim())
								try {
									se = typeof Z.info == "string" ? JSON.parse(Z.info) : Z.info;
								} catch {
									se = null;
								}
							const ie = (se && se.label) || Z.label || Z.tab_label || he,
								ne = Yf(Z.hop_chain);
							let Ce = [];
							if (se && Array.isArray(se.fields) && se.fields.length)
								try {
									const ke = si(se.fields);
									ke.length && ke[0].sections && (Ce = ke[0].sections);
								} catch {
									Ce = [];
								}
							s.value.push({
								label: ie,
								sections: Ce,
								_related: {
									doctype: (se && se.doctype) || he,
									link_field: (se && se.link_field) || Z.link_field || "",
									label: ie,
									hop_chain: ne,
									child_row_name: Z.child_row_name || Z.name || "",
									captureError: se && se.capture_error,
									hasLayout: Ce.length > 0,
								},
							}),
								(oe += 1);
						} catch {}
				} catch {}
				S(
					"parseLayout",
					!0,
					`fields=${K.length} tabs=${s.value.length} (incl ${oe} related)`
				),
					(b.value = !0),
					S("syncingFromLoad", !0, "true (formData write + fetch_from)");
				for (const Q of Object.keys(r)) delete r[Q];
				for (const Q of K)
					Q.fieldname && !Yo(Q.fieldtype) && (r[Q.fieldname] = Q.default || null);
				if ((S("formData seed", !0, "defaults from meta"), L)) {
					let Q;
					try {
						Q = await dt("frappe.client.get", { doctype: E, name: L });
					} catch (Z) {
						throw (
							(S(
								"frappe.client.get",
								!1,
								`${E}/${L}`,
								(Z == null ? void 0 : Z.message) || Z
							),
							Z)
						);
					}
					if (O !== D) {
						S("aborted", !1, "stale seq after client.get");
						return;
					}
					Object.assign(r, Q),
						S(
							"frappe.client.get",
							!0,
							`${E}/${L} keys=${Object.keys(Q || {}).length}`
						);
				} else S("frappe.client.get", !0, "(skipped — new doc)");
				const pe = K.filter((Q) => Q.fieldtype === "Link" && Q.options && r[Q.fieldname]);
				if ((await Promise.all(pe.map((Q) => v(Q.fieldname, r[Q.fieldname]))), O !== D)) {
					S("aborted", !1, "stale seq after fetch_from");
					return;
				}
				S("fetch_from batch", !0, `${pe.length} link field(s)`),
					(a.value = JSON.parse(JSON.stringify(r))),
					S("originalData snapshot", !0, `keys=${Object.keys(r).length}`);
			} catch (B) {
				if (O !== D) {
					S("catch (ignored)", !1, "stale seq", (B == null ? void 0 : B.message) || B);
					return;
				}
				const K =
					(B == null ? void 0 : B.message) ||
					(B == null ? void 0 : B.toString()) ||
					"Failed to load form";
				(c.value = K), S("load failed", !1, "", K);
			} finally {
				O === D && (u.value = !1),
					await _t(),
					await _t(),
					(b.value = !1),
					S(
						"done",
						O === D,
						O === D
							? "loading=false syncingFromLoad=false"
							: "stale — skipped UI reset"
					);
			}
		}
		return { load: j, resetWhenClosed: N };
	}
	function Xf({ definitionName: e, doctype: t, docName: n, requiredFields: o }) {
		const l = o,
			s = X(null),
			i = X([]),
			r = X([]),
			a = Ae({}),
			u = X({}),
			c = X(!1),
			f = X(!1),
			h = X(null),
			v = X(null),
			b = X([]),
			w = X(!1),
			D = X([]),
			S = Vf(r, a),
			{ load: N, resetWhenClosed: j } = Jf({
				definitionName: e,
				doctype: t,
				docName: n,
				definition: s,
				tabs: i,
				allFields: r,
				formData: a,
				originalData: u,
				loading: c,
				error: h,
				validationError: v,
				buttons: b,
				handleFetchFrom: S,
				syncingFromLoad: w,
				loadDebugLog: D,
			}),
			O = de(() => !R(n)),
			x = de(() => {
				const Z = R(t),
					he = R(n);
				return he ? `Edit ${Z}: ${he}` : `New ${Z}`;
			}),
			E = de(() => {
				var Z;
				return ((Z = s.value) == null ? void 0 : Z.dialog_size) || "xl";
			}),
			L = de(() => (c.value ? !1 : ni(a) !== ni(u.value)));
		function H() {
			const Z = Hf(r.value, a),
				he = qf(r.value, a, l ? R(l) : []),
				se = new Set(Z.map((ne) => ne.fieldname)),
				ie = Z.slice();
			for (const ne of he) se.has(ne.fieldname) || (se.add(ne.fieldname), ie.push(ne));
			return ie;
		}
		async function B() {
			return zf({
				formData: a,
				originalData: u,
				definition: s,
				doctype: t,
				saving: f,
				validationError: v,
				runValidate: H,
			});
		}
		function K() {
			const Z = u.value;
			for (const he of Object.keys(a)) a[he] = Z[he] !== void 0 ? Z[he] : null;
		}
		function oe(Z) {
			return Uf(Z, a);
		}
		function pe(Z) {
			if (Wf(Z, a)) return !0;
			const he = l ? R(l) : [];
			if (!Array.isArray(he) || !he.length) return !1;
			const se = Z.fieldname;
			return he.some((ie) => String(ie || "").trim() === se && !String(ie).includes("."));
		}
		function Q(Z) {
			return Kf(Z, a);
		}
		return {
			definition: s,
			tabs: i,
			allFields: r,
			formData: a,
			originalData: u,
			isDirty: L,
			syncingFromLoad: w,
			loading: c,
			saving: f,
			error: h,
			validationError: v,
			buttons: b,
			isNew: O,
			dialogTitle: x,
			dialogSize: E,
			resetWhenClosed: j,
			load: N,
			validate: H,
			save: B,
			revert: K,
			isFieldVisible: oe,
			isFieldMandatory: pe,
			isFieldReadOnly: Q,
			handleFetchFrom: S,
			loadDebugLog: D,
		};
	}
	function Gf(e) {
		return typeof window.__ == "function" ? window.__(e) : e;
	}
	function Xo(e, t) {
		if (!e()) {
			t();
			return;
		}
		const n = Gf("You have unsaved changes. Discard them and continue?");
		typeof frappe < "u" && frappe.confirm
			? frappe.confirm(
					n,
					() => t(),
					() => {}
			  )
			: window.confirm(n) && t();
	}
	function Zf({ getOpen: e, getCanPrev: t, getCanNext: n, onNavPrev: o, onNavNext: l }) {
		return function (i) {
			e() &&
				(!i.altKey ||
					(i.key !== "ArrowLeft" && i.key !== "ArrowRight") ||
					(i.key === "ArrowLeft" && t()
						? (i.preventDefault(), o())
						: i.key === "ArrowRight" && n() && (i.preventDefault(), l())));
		};
	}
	const Qf = { class: "ppv2-fd-load-debug-inner" },
		ed = { class: "ppv2-fd-load-debug-hd" },
		td = { class: "ppv2-fd-load-debug-hint" },
		nd = { class: "ppv2-fd-load-debug-body" },
		od = { class: "ppv2-fd-load-debug-t" },
		ld = { class: "ppv2-fd-load-debug-s" },
		sd = { class: "ppv2-fd-load-debug-d" },
		id = { key: 0, class: "ppv2-fd-load-debug-e" },
		io = De(
			{
				__name: "PanelFormDialog",
				props: {
					open: { type: Boolean, default: !1 },
					definitionName: { type: String, required: !0 },
					doctype: { type: String, required: !0 },
					docName: { type: String, default: null },
					rowNavEnabled: { type: Boolean, default: !1 },
					canNavigatePrev: { type: Boolean, default: !1 },
					canNavigateNext: { type: Boolean, default: !1 },
					rowNavLabel: { type: String, default: "" },
					dissolveOpacity: { type: Number, default: 1 },
					requiredFields: { type: Array, default: () => [] },
					reloadPanelAfterPublish: { type: Function, default: null },
				},
				emits: ["close", "saved", "nav-prev", "nav-next"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = X(0),
						s = X(null),
						i = X(!1),
						r = Xf({
							definitionName: In(n, "definitionName"),
							doctype: In(n, "doctype"),
							docName: In(n, "docName"),
							requiredFields: In(n, "requiredFields"),
						});
					Al("fdSyncingFromLoad", r.syncingFromLoad);
					const a = X(!1);
					ze(
						() => n.open,
						(x) => {
							x && (a.value = so());
						},
						{ immediate: !0 }
					);
					const u = de(() => r.loadDebugLog.value),
						c = de(() => r.isDirty.value || i.value);
					function f(x) {
						i.value = !!x;
					}
					function h() {
						Xo(
							() => c.value,
							() => {
								var x, E;
								r.revert(),
									(E =
										(x = s.value) == null
											? void 0
											: x.resetRelatedToBaseline) == null || E.call(x),
									(i.value = !1),
									o("close");
							}
						);
					}
					function v() {
						if (!c.value || r.saving.value) return;
						const x =
								typeof window.__ == "function"
									? window.__(
											"Discard all changes to this form and related rows and restore the last loaded values?"
									  )
									: "Discard all changes to this form and related rows and restore the last loaded values?",
							E = () => {
								var L, H;
								r.revert(),
									(r.validationError.value = null),
									(H =
										(L = s.value) == null
											? void 0
											: L.resetRelatedToBaseline) == null || H.call(L),
									(i.value = !1);
							};
						typeof frappe < "u" && frappe.confirm
							? frappe.confirm(x, E, () => {})
							: window.confirm(x) && E();
					}
					function b() {
						n.canNavigatePrev &&
							Xo(
								() => c.value,
								() => o("nav-prev")
							);
					}
					function w() {
						n.canNavigateNext &&
							Xo(
								() => c.value,
								() => o("nav-next")
							);
					}
					const D = Zf({
						getOpen: () => n.open,
						getCanPrev: () => n.canNavigatePrev,
						getCanNext: () => n.canNavigateNext,
						onNavPrev: b,
						onNavNext: w,
					});
					ze(
						() => ({
							open: n.open,
							docName: n.docName,
							definitionName: n.definitionName,
							doctype: n.doctype,
						}),
						(x, E) => {
							if (!x.open) {
								window.removeEventListener("keydown", D, !0), r.resetWhenClosed();
								return;
							}
							window.removeEventListener("keydown", D, !0),
								window.addEventListener("keydown", D, !0);
							const H = !(E == null ? void 0 : E.open);
							(H ||
								x.docName !== (E == null ? void 0 : E.docName) ||
								x.definitionName !== (E == null ? void 0 : E.definitionName) ||
								x.doctype !== (E == null ? void 0 : E.doctype)) &&
								((H || x.docName !== (E == null ? void 0 : E.docName)) &&
									(l.value = 0),
								r.load());
						},
						{ immediate: !0 }
					),
						Jt(() => {
							window.removeEventListener("keydown", D, !0), r.resetWhenClosed();
						});
					function S({ fieldname: x, value: E }) {
						r.formData[x] = E;
					}
					async function N({ fieldname: x, value: E }) {
						(r.formData[x] = E), await r.handleFetchFrom(x, E);
					}
					async function j() {
						var x, E;
						try {
							const L = await r.save();
							try {
								await ((E =
									(x = s.value) == null ? void 0 : x.saveAllRelatedRows) == null
									? void 0
									: E.call(x));
							} catch (H) {
								const B = li(H);
								throw (
									(typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Related rows",
											message: B,
											indicator: "red",
										}),
									H)
								);
							}
							o("saved", L), o("close");
						} catch {}
					}
					async function O(x) {
						const E = String((x == null ? void 0 : x.button_script) || "").trim();
						if (n.doctype === "Events" && E === "publish_events_to_website") {
							r.validationError.value = null;
							const L = r.validate();
							if (L.length) {
								(r.validationError.value = L.map((H) => H.message).join(", ")),
									typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Validation",
											message: r.validationError.value,
											indicator: "red",
										});
								return;
							}
							try {
								const H = { doctype: n.doctype, ...r.formData },
									B = await dt(
										"nce_events.api.events_publish.publish_events_to_website",
										{ doc: H }
									);
								typeof n.reloadPanelAfterPublish == "function" &&
									(await n.reloadPanelAfterPublish()),
									typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Published",
											message: `Event ${
												(B == null ? void 0 : B.name) || ""
											} created on the site.`,
											indicator: "green",
										});
							} catch (H) {
								const B =
									(H == null ? void 0 : H.message) ||
									String(H) ||
									"Publish failed";
								(r.validationError.value = B),
									typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Publish",
											message: B,
											indicator: "red",
										});
							}
							return;
						}
						typeof frappe < "u" &&
							frappe.show_alert &&
							frappe.show_alert({
								message: `Button "${x.label}" — scripts coming soon`,
								indicator: "blue",
							});
					}
					return (x, E) =>
						e.open
							? (_(),
							  C(
									"div",
									{
										key: 0,
										class: "ppv2-form-dialog-backdrop",
										style: Re({ opacity: e.dissolveOpacity }),
										onClick: Ee(h, ["self"]),
									},
									[
										a.value
											? (_(),
											  C(
													"div",
													{
														key: 0,
														class: "ppv2-fd-load-debug",
														onClick:
															E[0] ||
															(E[0] = Ee(() => {}, ["stop"])),
													},
													[
														A("div", Qf, [
															A("div", ed, [
																E[2] ||
																	(E[2] = Qe(
																		" Form load debug ",
																		-1
																	)),
																A(
																	"span",
																	td,
																	"localStorage " +
																		G(R(ti)) +
																		"=1",
																	1
																),
															]),
															A("div", nd, [
																(_(!0),
																C(
																	ce,
																	null,
																	be(
																		u.value,
																		(L, H) => (
																			_(),
																			C(
																				"div",
																				{
																					key: H,
																					class: Ve([
																						"ppv2-fd-load-debug-row",
																						{
																							"ppv2-fd-load-debug-ok":
																								L.ok,
																							"ppv2-fd-load-debug-bad":
																								!L.ok,
																						},
																					]),
																				},
																				[
																					A(
																						"span",
																						od,
																						G(
																							(
																								L.t ||
																								""
																							).slice(
																								11,
																								23
																							)
																						),
																						1
																					),
																					A(
																						"span",
																						ld,
																						G(L.step),
																						1
																					),
																					A(
																						"span",
																						sd,
																						G(
																							L.detail
																						),
																						1
																					),
																					L.err
																						? (_(),
																						  C(
																								"span",
																								id,
																								G(
																									L.err
																								),
																								1
																						  ))
																						: ue(
																								"",
																								!0
																						  ),
																				],
																				2
																			)
																		)
																	),
																	128
																)),
															]),
														]),
													]
											  ))
											: ue("", !0),
										A(
											"div",
											{
												class: Ve([
													"ppv2-form-dialog",
													"ppv2-fd-size-" + R(r).dialogSize.value,
												]),
											},
											[
												Oe(
													Su,
													{
														"row-nav-enabled": e.rowNavEnabled,
														"can-navigate-prev": e.canNavigatePrev,
														"can-navigate-next": e.canNavigateNext,
														"row-nav-label": e.rowNavLabel,
														title: R(r).dialogTitle.value,
														onClose: h,
														onNavPrev: b,
														onNavNext: w,
													},
													null,
													8,
													[
														"row-nav-enabled",
														"can-navigate-prev",
														"can-navigate-next",
														"row-nav-label",
														"title",
													]
												),
												Oe(
													Rf,
													{
														ref_key: "fdBodyRef",
														ref: s,
														"definition-name": e.definitionName,
														"root-doctype": e.doctype,
														"root-doc-name": e.docName,
														loading: R(r).loading.value,
														error: R(r).error.value,
														tabs: R(r).tabs.value,
														"validation-error":
															R(r).validationError.value,
														"form-data": R(r).formData,
														"original-form-data":
															R(r).originalData.value,
														"is-field-visible": R(r).isFieldVisible,
														"is-field-mandatory":
															R(r).isFieldMandatory,
														"is-field-read-only": R(r).isFieldReadOnly,
														"active-tab": l.value,
														"onUpdate:activeTab":
															E[1] || (E[1] = (L) => (l.value = L)),
														onFieldChange: S,
														onLinkChange: N,
														onRelatedDirty: f,
													},
													null,
													8,
													[
														"definition-name",
														"root-doctype",
														"root-doc-name",
														"loading",
														"error",
														"tabs",
														"validation-error",
														"form-data",
														"original-form-data",
														"is-field-visible",
														"is-field-mandatory",
														"is-field-read-only",
														"active-tab",
													]
												),
												Oe(
													jf,
													{
														buttons: R(r).buttons.value,
														saving: R(r).saving.value,
														"is-dirty": c.value,
														onCancel: h,
														onRevert: v,
														onSubmit: j,
														onCustomButton: O,
													},
													null,
													8,
													["buttons", "saving", "is-dirty"]
												),
											],
											2
										),
									],
									4
							  ))
							: ue("", !0);
				},
			},
			[["__scopeId", "data-v-ffb8960a"]]
		),
		rd = { class: "ppv2-root" },
		ad = { class: "ppv2-title" },
		cd = { key: 0, class: "ppv2-click-hint" },
		ud = { class: "ppv2-header-controls" },
		fd = { class: "ppv2-count" },
		dd = { class: "ppv2-title" },
		pd = { key: 0, class: "ppv2-click-hint" },
		md = { class: "ppv2-header-controls" },
		hd = ["onClick"],
		gd = ["onClick"],
		vd = ["onClick"],
		yd = ["onClick"],
		_d = ["onClick"],
		bd = { class: "ppv2-count" },
		wd = ["onClick"],
		xd = Va(
			De(
				{
					__name: "App",
					setup(e) {
						const t = Gs("WP Tables"),
							{
								config: n,
								columns: o,
								rows: l,
								fullTotal: s,
								loading: i,
								error: r,
								load: a,
							} = t,
							u = X(!1),
							c = de(() =>
								(o.value || [])
									.filter((k) => k.fieldname !== "nce_name")
									.map((k) =>
										k.fieldname === "frappe_doctype"
											? { ...k, is_link: !1 }
											: k
									)
							),
							f = Ae([]);
						let h = 0;
						const v = Ae([]),
							b = X(""),
							w = X(0),
							D = X(80),
							{
								formDialogDocName: S,
								formDialogDefinition: N,
								formDialogDoctype: j,
								formDialogRequiredFields: O,
								formDialogNavInfo: x,
								formDialogNavLabel: E,
								onFormDialogNavPrev: L,
								onFormDialogNavNext: H,
								openFormDialogFromPanelRow: B,
								onFormDialogClose: K,
								onFormDialogSaved: oe,
								reloadPanelForFormDialogDoctype: pe,
								formDialogSlot: Q,
								formDialogPendingDocName: Z,
								formDialogPendingDefinition: he,
								formDialogPendingDoctype: se,
								formDialogDissolving: ie,
								formDialogDissolveOpacity: ne,
							} = Ka(f),
							{
								cardStack: Ce,
								openCardModal: ke,
								closeTopCard: Ye,
								onOpenCard: Ie,
							} = qa();
						function $t(k, P) {
							const M = k ? k.rows : l.value,
								J = M.findIndex((re) => re.name === P.name);
							J >= 0 && (M.splice(J, 1), v.push({ panel: k, row: P, idx: J }));
						}
						function Dt() {
							if (!v.length) return;
							const { panel: k, row: P, idx: M } = v.pop(),
								J = k ? k.rows : l.value,
								re = Math.min(M, J.length);
							J.splice(re, 0, P);
						}
						function Tt(k) {
							if ((k.ctrlKey || k.metaKey) && k.key === "z") {
								if (!v.length) return;
								k.preventDefault(), Dt();
								return;
							}
						}
						At(() => {
							a(),
								window.addEventListener("keydown", Tt),
								(window._nce_open_tag_finder = (k, P, M) => {
									k &&
										(typeof P == "number" && (w.value = P),
										typeof M == "number" && (D.value = M),
										(b.value = k));
								}),
								(window._nce_close_tag_finder = () => {
									b.value = "";
								}),
								(window._nce_open_card = (k) => {
									const P = Ua(k);
									P && ke(P.cardDefName, P.doctype, P.recordName);
								}),
								(window._nce_close_top_card = () => {
									Ye();
								});
						}),
							Jt(() => {
								window.removeEventListener("keydown", Tt),
									delete window._nce_open_tag_finder,
									delete window._nce_close_tag_finder,
									delete window._nce_open_card,
									delete window._nce_close_top_card;
							});
						function Ge(k) {
							var J;
							const P =
									((J = k.config) == null ? void 0 : J.header_text) ||
									k.doctype ||
									"",
								M = (k.parentContextTitle || "").trim();
							return M ? `${P} for ${M}` : P;
						}
						function q(k) {
							if (k === "root") return { x: 120, y: 84 };
							const P = f.find((M) => M.id === k);
							return P ? { x: P.x + 80, y: P.y + 24 } : { x: 140, y: 120 };
						}
						function z(k) {
							(b.value = k.doctype), (w.value = k.x + 20), (D.value = k.y);
						}
						async function U(k, P = {}, M = null, J = "") {
							const re = f.findIndex((Se) => Se.doctype === k);
							re >= 0 && me(f[re].id);
							const we = q(M),
								ae = ++h,
								ge = Ae({
									id: ae,
									doctype: k,
									parentFilter: P,
									parentId: M,
									parentContextTitle: (J || "").trim(),
									config: null,
									columns: [],
									rows: [],
									total: 0,
									fullTotal: 0,
									loading: !0,
									error: null,
									x: we.x,
									y: we.y,
									_setFilters: null,
									_reload: null,
									_showFilter: !1,
									_floatRef: null,
								});
							f.push(ge);
							try {
								const Se = Gs(k, P);
								await Se.load(),
									(ge.config = Se.config.value),
									(ge.columns = Se.columns.value),
									(ge._panelRows = Se.rows),
									(ge.rows = Se.rows.value),
									(ge.total = Se.total.value),
									(ge.fullTotal = Se.fullTotal.value),
									(ge._setFilters = (en) => {
										Se.setFilters(en);
									}),
									(ge._reload = async () => {
										console.log(
											"[PanelReload] starting reload for",
											ge.doctype,
											"p.loading before:",
											ge.loading
										),
											(ge.loading = !0),
											console.log("[PanelReload] p.loading set to true");
										try {
											await Se.reload(),
												console.log(
													"[PanelReload] panel.reload() complete, panel.loading.value:",
													Se.loading.value
												),
												(ge.config = Se.config.value),
												(ge.columns = Se.columns.value),
												(ge.rows = Se.rows.value),
												(ge.total = Se.total.value),
												(ge.fullTotal = Se.fullTotal.value),
												console.log(
													"[PanelReload] p.rows updated, length:",
													ge.rows.length
												);
										} finally {
											(ge.loading = !1),
												console.log(
													"[PanelReload] p.loading set back to false"
												);
										}
									});
							} catch (Se) {
								ge.error = String(Se);
							} finally {
								ge.loading = !1;
							}
						}
						function me(k) {
							f.filter((J) => J.parentId === k).forEach((J) => me(J.id));
							const M = f.findIndex((J) => J.id === k);
							M >= 0 && f.splice(M, 1);
						}
						function ee(k) {
							const P = k.frappe_doctype || k.name;
							P && U(P, {}, "root");
						}
						async function p(k, P) {
							var we;
							const M = {};
							k.linkField && k.rowName && (M[k.linkField] = k.rowName);
							try {
								const ae = await new Promise((Se) => {
										frappe.db
											.get_value(
												"Card Definition",
												{ root_doctype: k.doctype, is_default: 1 },
												"name"
											)
											.then((en) => Se(en))
											.catch(() => Se(null));
									}),
									ge =
										typeof ae == "object" && ae != null && ae.name
											? ae.name
											: typeof ae == "string"
											? ae
											: null;
								if (ge && k.rowName) {
									ke(ge, k.doctype, k.rowName);
									return;
								}
							} catch {}
							let J = "";
							const re = (
								((we = P.config) == null ? void 0 : we.title_field) || ""
							).trim();
							re &&
								k.parentRow &&
								k.parentRow[re] != null &&
								String(k.parentRow[re]).trim() !== "" &&
								(J = String(k.parentRow[re]).trim()),
								U(k.doctype, M, P.id, J);
						}
						function g(k, P) {
							var re;
							if (
								!(P != null && P.name) ||
								B(k, P) ||
								!((re = k.config) != null && re.open_card_on_click)
							)
								return;
							const M = k.doctype.toLowerCase().replace(/ /g, "-"),
								J = `${window.location.origin}/app/${M}/${encodeURIComponent(
									P.name
								)}`;
							window.open(J, "_blank");
						}
						function d(k, P) {
							k ? k._setFilters && k._setFilters(P) : t.setFilters(P);
						}
						function m() {
							console.log(
								"[PanelReload] onRefreshRoot called, loading.value:",
								i.value
							),
								t.reload();
						}
						function y(k) {
							console.log(
								"[PanelReload] onRefreshPanel called for",
								k.doctype,
								"has _reload:",
								!!k._reload
							),
								k._reload && k._reload();
						}
						function F(k) {
							frappe.call({
								method: "nce_events.api.panel_api.export_panel_data",
								args: {
									root_doctype: k.doctype,
									filters: JSON.stringify(k.parentFilter || {}),
									user_filters: JSON.stringify([]),
								},
								callback(P) {
									if (!P.message) return;
									const J = `=IMPORTDATA("${
										window.location.origin + P.message.url
									}")`;
									navigator.clipboard && navigator.clipboard.writeText
										? navigator.clipboard.writeText(J).then(() => {
												frappe.show_alert({
													message: __(
														"Link copied — paste in Google Sheets"
													),
													indicator: "green",
												});
										  })
										: frappe.show_alert({
												message: __("Exported {0} rows", [
													P.message.rows_exported,
												]),
												indicator: "green",
										  });
								},
							});
						}
						let I = null;
						function T(k, P) {
							const M = k.config;
							if (!M) return;
							if (!(P === "sms" ? M.sms_field : M.email_field)) {
								frappe.msgprint(
									__("No {0} field configured for this panel.", [
										P === "sms" ? "SMS" : "Email",
									])
								);
								return;
							}
							const re = k._panelRows || k.rows;
							if (!re.length) {
								frappe.msgprint(__("No rows."));
								return;
							}
							I && (I.close(), (I = null)),
								frappe.require(
									[
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/ai_tools.js",
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/sms_dialog.js",
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/email_dialog.js",
										"/assets/nce_events/css/panel_page.css",
									],
									() => {
										const we =
											P === "sms"
												? nce_events.panel_page.SmsDialog
												: nce_events.panel_page.EmailDialog;
										I = new we({
											doctype: k.doctype,
											config: M,
											row_names: re.map((ae) => ae.name),
											row_count: re.length,
											z_index: 9999,
											init_left: (k.x || 40) + 60,
											init_top: (k.y || 60) + 20,
											on_close() {
												I = null;
											},
										});
									}
								);
						}
						function V(k) {
							T(k, "email");
						}
						function $(k) {
							T(k, "sms");
						}
						function Y(k, P, M) {
							const J = k.config;
							!J ||
								!(P === "sms" ? J.sms_field : J.email_field) ||
								(I && (I.close(), (I = null)),
								frappe.require(
									[
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/ai_tools.js",
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/sms_dialog.js",
										"/assets/nce_events/js/panel_page_v2/legacy_dialogs/email_dialog.js",
										"/assets/nce_events/css/panel_page.css",
									],
									() => {
										const we =
											P === "sms"
												? nce_events.panel_page.SmsDialog
												: nce_events.panel_page.EmailDialog;
										I = new we({
											doctype: k.doctype,
											config: J,
											row_names: [M.name],
											row_count: 1,
											z_index: 9999,
											init_left: (k.x || 40) + 60,
											init_top: (k.y || 60) + 20,
											on_close() {
												I = null;
											},
										});
									}
								));
						}
						function W(k, P) {
							Y(k, "email", P);
						}
						function te(k, P) {
							Y(k, "sms", P);
						}
						return (k, P) => (
							_(),
							C("div", rd, [
								Oe(
									Qs,
									{ "init-x": 40, "init-y": 60, "init-w": 900, "init-h": 550 },
									{
										header: Ot(() => {
											var M, J;
											return [
												A(
													"span",
													ad,
													G(
														((M = R(n)) == null
															? void 0
															: M.header_text) || "NCE Tables"
													),
													1
												),
												A(
													"div",
													{
														class: "ppv2-header-right",
														onMousedown:
															P[2] ||
															(P[2] = Ee(() => {}, ["stop"])),
													},
													[
														(J = R(n)) != null && J.open_card_on_click
															? (_(),
															  C(
																	"span",
																	cd,
																	"Click row for details · Ctrl-click to remove"
															  ))
															: ue("", !0),
														A("div", ud, [
															A(
																"button",
																{
																	class: Ve([
																		"ppv2-hdr-btn",
																		{
																			"ppv2-hdr-btn--refreshing":
																				R(i),
																		},
																	]),
																	title: "Refresh",
																	onClick: m,
																},
																[
																	...(P[9] ||
																		(P[9] = [
																			A(
																				"i",
																				{
																					class: "fa fa-refresh",
																				},
																				null,
																				-1
																			),
																		])),
																],
																2
															),
															A(
																"button",
																{
																	class: "ppv2-hdr-btn",
																	title: "Filter",
																	onClick:
																		P[0] ||
																		(P[0] = (re) =>
																			(u.value = !u.value)),
																},
																[
																	...(P[10] ||
																		(P[10] = [
																			A(
																				"i",
																				{
																					class: "fa fa-filter",
																				},
																				null,
																				-1
																			),
																		])),
																]
															),
															A(
																"button",
																{
																	class: "ppv2-hdr-btn",
																	title: "Export to Sheets",
																	onClick:
																		P[1] ||
																		(P[1] = (re) =>
																			F({
																				doctype:
																					"WP Tables",
																				parentFilter: {},
																				rows: R(l),
																			})),
																},
																[
																	...(P[11] ||
																		(P[11] = [
																			A(
																				"i",
																				{
																					class: "fa fa-table",
																				},
																				null,
																				-1
																			),
																		])),
																]
															),
															A(
																"span",
																fd,
																G(R(l).length) +
																	" / " +
																	G(R(s)) +
																	" records",
																1
															),
														]),
													],
													32
												),
											];
										}),
										footer: Ot(() => {
											var M;
											return [
												Qe(
													G(
														((M = R(n)) == null
															? void 0
															: M.header_text) || "NCE Tables"
													),
													1
												),
											];
										}),
										default: Ot(() => {
											var M, J;
											return [
												Oe(
													ei,
													{
														title:
															((M = R(n)) == null
																? void 0
																: M.header_text) || "NCE Tables",
														columns: c.value,
														rows: R(l),
														total: R(s),
														loading: R(i),
														error: R(r),
														config: R(n) || {},
														"default-filters":
															((J = R(n)) == null
																? void 0
																: J.default_filters) || [],
														"show-filter": u.value,
														onRowClick: ee,
														onRowDrop:
															P[3] || (P[3] = (re) => $t(null, re)),
														onSheets:
															P[4] ||
															(P[4] = (re) =>
																F({
																	doctype: "WP Tables",
																	parentFilter: {},
																	rows: R(l),
																})),
														onFilterChange:
															P[5] || (P[5] = (re) => d(null, re)),
														onRefresh: m,
														onShowFilter:
															P[6] ||
															(P[6] = (re) => (u.value = !0)),
													},
													null,
													8,
													[
														"title",
														"columns",
														"rows",
														"total",
														"loading",
														"error",
														"config",
														"default-filters",
														"show-filter",
													]
												),
											];
										}),
										_: 1,
									}
								),
								(_(!0),
								C(
									ce,
									null,
									be(
										f,
										(M) => (
											_(),
											Te(
												Qs,
												{
													key: M.id,
													"init-x": M.x,
													"init-y": M.y,
													"init-w": 1200,
													"init-h": 600,
												},
												{
													header: Ot(() => {
														var J, re, we;
														return [
															A("span", dd, G(Ge(M)), 1),
															A(
																"div",
																{
																	class: "ppv2-header-right",
																	onMousedown:
																		P[7] ||
																		(P[7] = Ee(() => {}, [
																			"stop",
																		])),
																},
																[
																	(J = M.config) != null &&
																	J.open_card_on_click
																		? (_(),
																		  C(
																				"span",
																				pd,
																				"Click row for details · Ctrl-click to remove"
																		  ))
																		: ue("", !0),
																	A("div", md, [
																		A(
																			"button",
																			{
																				class: Ve([
																					"ppv2-hdr-btn",
																					{
																						"ppv2-hdr-btn--refreshing":
																							M.loading,
																					},
																				]),
																				title: "Refresh",
																				onClick: (ae) =>
																					y(M),
																			},
																			[
																				...(P[12] ||
																					(P[12] = [
																						A(
																							"i",
																							{
																								class: "fa fa-refresh",
																							},
																							null,
																							-1
																						),
																					])),
																			],
																			10,
																			hd
																		),
																		A(
																			"button",
																			{
																				class: "ppv2-hdr-btn",
																				title: "Filter",
																				onClick: (ae) =>
																					(M._showFilter =
																						!M._showFilter),
																			},
																			[
																				...(P[13] ||
																					(P[13] = [
																						A(
																							"i",
																							{
																								class: "fa fa-filter",
																							},
																							null,
																							-1
																						),
																					])),
																			],
																			8,
																			gd
																		),
																		A(
																			"button",
																			{
																				class: "ppv2-hdr-btn",
																				title: "Export to Sheets",
																				onClick: (ae) =>
																					F(M),
																			},
																			[
																				...(P[14] ||
																					(P[14] = [
																						A(
																							"i",
																							{
																								class: "fa fa-table",
																							},
																							null,
																							-1
																						),
																					])),
																			],
																			8,
																			vd
																		),
																		(re = M.config) != null &&
																		re.email_field
																			? (_(),
																			  C(
																					"button",
																					{
																						key: 0,
																						class: "ppv2-hdr-btn",
																						title: "Email",
																						onClick: (
																							ae
																						) => V(M),
																					},
																					[
																						...(P[15] ||
																							(P[15] =
																								[
																									A(
																										"i",
																										{
																											class: "fa fa-envelope",
																										},
																										null,
																										-1
																									),
																								])),
																					],
																					8,
																					yd
																			  ))
																			: ue("", !0),
																		(we = M.config) != null &&
																		we.sms_field
																			? (_(),
																			  C(
																					"button",
																					{
																						key: 1,
																						class: "ppv2-hdr-btn",
																						title: "SMS",
																						onClick: (
																							ae
																						) => $(M),
																					},
																					[
																						...(P[16] ||
																							(P[16] =
																								[
																									A(
																										"i",
																										{
																											class: "fa fa-comment",
																										},
																										null,
																										-1
																									),
																								])),
																					],
																					8,
																					_d
																			  ))
																			: ue("", !0),
																		A(
																			"span",
																			bd,
																			G(
																				(
																					M._panelRows ||
																					M.rows
																				).length
																			) +
																				" / " +
																				G(M.fullTotal) +
																				" records",
																			1
																		),
																		A(
																			"button",
																			{
																				class: "ppv2-hdr-btn ppv2-close-btn",
																				title: "Close",
																				onClick: (ae) =>
																					me(M.id),
																			},
																			" × ",
																			8,
																			wd
																		),
																	]),
																],
																32
															),
														];
													}),
													footer: Ot(() => [Qe(G(Ge(M)), 1)]),
													default: Ot(() => {
														var J, re, we;
														return [
															Oe(
																ei,
																{
																	title: Ge(M),
																	columns: M.columns,
																	rows: M._panelRows || M.rows,
																	total: M.fullTotal,
																	loading: M.loading,
																	error: M.error,
																	config: M.config || {},
																	"default-filters":
																		((J = M.config) == null
																			? void 0
																			: J.default_filters) ||
																		[],
																	"show-email": !!(
																		(re = M.config) != null &&
																		re.email_field
																	),
																	"show-sms": !!(
																		(we = M.config) != null &&
																		we.sms_field
																	),
																	"show-filter": M._showFilter,
																	onClose: (ae) => me(M.id),
																	onRowClick: (ae) => g(M, ae),
																	onDrill: (ae) => p(ae, M),
																	onSheets: (ae) => F(M),
																	onEmail: (ae) => V(M),
																	onSms: (ae) => $(M),
																	onTags: (ae) => z(M),
																	onFilterChange: (ae) =>
																		d(M, ae),
																	onRefresh: (ae) => y(M),
																	onEmailOne: (ae) => W(M, ae),
																	onSmsOne: (ae) => te(M, ae),
																	onRowDrop: (ae) => $t(M, ae),
																	onShowFilter: (ae) =>
																		(M._showFilter = !0),
																},
																null,
																8,
																[
																	"title",
																	"columns",
																	"rows",
																	"total",
																	"loading",
																	"error",
																	"config",
																	"default-filters",
																	"show-email",
																	"show-sms",
																	"show-filter",
																	"onClose",
																	"onRowClick",
																	"onDrill",
																	"onSheets",
																	"onEmail",
																	"onSms",
																	"onTags",
																	"onFilterChange",
																	"onRefresh",
																	"onEmailOne",
																	"onSmsOne",
																	"onRowDrop",
																	"onShowFilter",
																]
															),
														];
													}),
													_: 2,
												},
												1032,
												["init-x", "init-y"]
											)
										)
									),
									128
								)),
								b.value
									? (_(),
									  Te(
											jc,
											{
												key: 0,
												"root-doctype": b.value,
												"init-x": w.value,
												"init-y": D.value,
												onClose: P[8] || (P[8] = (M) => (b.value = "")),
											},
											null,
											8,
											["root-doctype", "init-x", "init-y"]
									  ))
									: ue("", !0),
								(_(!0),
								C(
									ce,
									null,
									be(
										R(Ce),
										(M, J) => (
											_(),
											Te(
												vu,
												{
													key: "card-" + M.id,
													"card-def-name": M.cardDefName,
													doctype: M.doctype,
													"record-name": M.recordName,
													style: Re({ zIndex: 1e3 + J }),
													onOpenCard: R(Ie),
													onClose: R(Ye),
												},
												null,
												8,
												[
													"card-def-name",
													"doctype",
													"record-name",
													"style",
													"onOpenCard",
													"onClose",
												]
											)
										)
									),
									128
								)),
								R(Q) === 0 && R(N)
									? (_(),
									  Te(
											io,
											{
												key: 1,
												open: !0,
												"definition-name": R(N),
												doctype: R(j),
												"doc-name": R(S),
												"required-fields": R(O),
												"reload-panel-after-publish": R(pe),
												"row-nav-enabled": R(x).total > 1,
												"can-navigate-prev": R(x).canPrev,
												"can-navigate-next": R(x).canNext,
												"row-nav-label": R(E),
												"dissolve-opacity":
													R(Q) === 0 && R(ie) ? R(ne) : 1,
												style: Re({ zIndex: R(Q) === 0 ? 1050 : 1048 }),
												onClose: R(K),
												onSaved: R(oe),
												onNavPrev: R(L),
												onNavNext: R(H),
											},
											null,
											8,
											[
												"definition-name",
												"doctype",
												"doc-name",
												"required-fields",
												"reload-panel-after-publish",
												"row-nav-enabled",
												"can-navigate-prev",
												"can-navigate-next",
												"row-nav-label",
												"dissolve-opacity",
												"style",
												"onClose",
												"onSaved",
												"onNavPrev",
												"onNavNext",
											]
									  ))
									: ue("", !0),
								R(Q) === 0 && R(he)
									? (_(),
									  Te(
											io,
											{
												key: 2,
												open: !0,
												"definition-name": R(he),
												doctype: R(se),
												"doc-name": R(Z),
												"required-fields": R(O),
												"reload-panel-after-publish": R(pe),
												"row-nav-enabled": !1,
												"can-navigate-prev": !1,
												"can-navigate-next": !1,
												"row-nav-label": "",
												"dissolve-opacity": 1,
												style: { zIndex: 1048 },
												onClose: R(K),
												onSaved: R(oe),
												onNavPrev: R(L),
												onNavNext: R(H),
											},
											null,
											8,
											[
												"definition-name",
												"doctype",
												"doc-name",
												"required-fields",
												"reload-panel-after-publish",
												"onClose",
												"onSaved",
												"onNavPrev",
												"onNavNext",
											]
									  ))
									: ue("", !0),
								R(Q) === 1 && R(N)
									? (_(),
									  Te(
											io,
											{
												key: 3,
												open: !0,
												"definition-name": R(N),
												doctype: R(j),
												"doc-name": R(S),
												"required-fields": R(O),
												"reload-panel-after-publish": R(pe),
												"row-nav-enabled": R(x).total > 1,
												"can-navigate-prev": R(x).canPrev,
												"can-navigate-next": R(x).canNext,
												"row-nav-label": R(E),
												"dissolve-opacity":
													R(Q) === 1 && R(ie) ? R(ne) : 1,
												style: Re({ zIndex: R(Q) === 1 ? 1050 : 1048 }),
												onClose: R(K),
												onSaved: R(oe),
												onNavPrev: R(L),
												onNavNext: R(H),
											},
											null,
											8,
											[
												"definition-name",
												"doctype",
												"doc-name",
												"required-fields",
												"reload-panel-after-publish",
												"row-nav-enabled",
												"can-navigate-prev",
												"can-navigate-next",
												"row-nav-label",
												"dissolve-opacity",
												"style",
												"onClose",
												"onSaved",
												"onNavPrev",
												"onNavNext",
											]
									  ))
									: ue("", !0),
								R(Q) === 1 && R(he)
									? (_(),
									  Te(
											io,
											{
												key: 4,
												open: !0,
												"definition-name": R(he),
												doctype: R(se),
												"doc-name": R(Z),
												"required-fields": R(O),
												"reload-panel-after-publish": R(pe),
												"row-nav-enabled": !1,
												"can-navigate-prev": !1,
												"can-navigate-next": !1,
												"row-nav-label": "",
												"dissolve-opacity": 1,
												style: { zIndex: 1048 },
												onClose: R(K),
												onSaved: R(oe),
												onNavPrev: R(L),
												onNavNext: R(H),
											},
											null,
											8,
											[
												"definition-name",
												"doctype",
												"doc-name",
												"required-fields",
												"reload-panel-after-publish",
												"onClose",
												"onSaved",
												"onNavPrev",
												"onNavNext",
											]
									  ))
									: ue("", !0),
							])
						);
					},
				},
				[["__scopeId", "data-v-a68d274e"]]
			)
		);
	window.NCEPanelPageV2 = {
		mount(e) {
			return xd.mount(e);
		},
	};
})();
