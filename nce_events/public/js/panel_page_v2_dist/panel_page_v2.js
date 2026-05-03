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
	const pe = {},
		It = [],
		nt = () => {},
		Go = () => !1,
		xn = (e) =>
			e.charCodeAt(0) === 111 &&
			e.charCodeAt(1) === 110 &&
			(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97),
		ao = (e) => e.startsWith("onUpdate:"),
		De = Object.assign,
		co = (e, t) => {
			const n = e.indexOf(t);
			n > -1 && e.splice(n, 1);
		},
		pi = Object.prototype.hasOwnProperty,
		me = (e, t) => pi.call(e, t),
		ne = Array.isArray,
		Lt = (e) => en(e) === "[object Map]",
		jt = (e) => en(e) === "[object Set]",
		Zo = (e) => en(e) === "[object Date]",
		se = (e) => typeof e == "function",
		be = (e) => typeof e == "string",
		Ge = (e) => typeof e == "symbol",
		ge = (e) => e !== null && typeof e == "object",
		Qo = (e) => (ge(e) || se(e)) && se(e.then) && se(e.catch),
		el = Object.prototype.toString,
		en = (e) => el.call(e),
		mi = (e) => en(e).slice(8, -1),
		tl = (e) => en(e) === "[object Object]",
		Sn = (e) => be(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e,
		tn = ro(
			",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
		),
		$n = (e) => {
			const t = Object.create(null);
			return (n) => t[n] || (t[n] = e(n));
		},
		hi = /-\w/g,
		Ee = $n((e) => e.replace(hi, (t) => t.slice(1).toUpperCase())),
		gi = /\B([A-Z])/g,
		mt = $n((e) => e.replace(gi, "-$1").toLowerCase()),
		Cn = $n((e) => e.charAt(0).toUpperCase() + e.slice(1)),
		uo = $n((e) => (e ? `on${Cn(e)}` : "")),
		Re = (e, t) => !Object.is(e, t),
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
	function $e(e) {
		if (ne(e)) {
			const t = {};
			for (let n = 0; n < e.length; n++) {
				const o = e[n],
					l = be(o) ? _i(o) : $e(o);
				if (l) for (const s in l) t[s] = l[s];
			}
			return t;
		} else if (be(e) || ge(e)) return e;
	}
	const vi = /;(?![^(]*\))/g,
		yi = /:([^]+)/,
		bi = /\/\*[^]*?\*\//g;
	function _i(e) {
		const t = {};
		return (
			e
				.replace(bi, "")
				.split(vi)
				.forEach((n) => {
					if (n) {
						const o = n.split(yi);
						o.length > 1 && (t[o[0].trim()] = o[1].trim());
					}
				}),
			t
		);
	}
	function Ie(e) {
		let t = "";
		if (be(e)) t = e;
		else if (ne(e))
			for (let n = 0; n < e.length; n++) {
				const o = Ie(e[n]);
				o && (t += o + " ");
			}
		else if (ge(e)) for (const n in e) e[n] && (t += n + " ");
		return t.trim();
	}
	const wi = ro("itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly");
	function ll(e) {
		return !!e || e === "";
	}
	function xi(e, t) {
		if (e.length !== t.length) return !1;
		let n = !0;
		for (let o = 0; n && o < e.length; o++) n = Vt(e[o], t[o]);
		return n;
	}
	function Vt(e, t) {
		if (e === t) return !0;
		let n = Zo(e),
			o = Zo(t);
		if (n || o) return n && o ? e.getTime() === t.getTime() : !1;
		if (((n = Ge(e)), (o = Ge(t)), n || o)) return e === t;
		if (((n = ne(e)), (o = ne(t)), n || o)) return n && o ? xi(e, t) : !1;
		if (((n = ge(e)), (o = ge(t)), n || o)) {
			if (!n || !o) return !1;
			const l = Object.keys(e).length,
				s = Object.keys(t).length;
			if (l !== s) return !1;
			for (const i in e) {
				const r = e.hasOwnProperty(i),
					a = t.hasOwnProperty(i);
				if ((r && !a) || (!r && a) || !Vt(e[i], t[i])) return !1;
			}
		}
		return String(e) === String(t);
	}
	function fo(e, t) {
		return e.findIndex((n) => Vt(n, t));
	}
	const sl = (e) => !!(e && e.__v_isRef === !0),
		G = (e) =>
			be(e)
				? e
				: e == null
				? ""
				: ne(e) || (ge(e) && (e.toString === el || !se(e.toString)))
				? sl(e)
					? G(e.value)
					: JSON.stringify(e, il, 2)
				: String(e),
		il = (e, t) =>
			sl(t)
				? il(e, t.value)
				: Lt(t)
				? {
						[`Map(${t.size})`]: [...t.entries()].reduce(
							(n, [o, l], s) => ((n[po(o, s) + " =>"] = l), n),
							{}
						),
				  }
				: jt(t)
				? { [`Set(${t.size})`]: [...t.values()].map((n) => po(n)) }
				: Ge(t)
				? po(t)
				: ge(t) && !ne(t) && !tl(t)
				? String(t)
				: t,
		po = (e, t = "") => {
			var n;
			return Ge(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
		};
	/**
	 * @vue/reactivity v3.5.30
	 * (c) 2018-present Yuxi (Evan) You and Vue contributors
	 * @license MIT
	 **/ let Ve;
	class Si {
		constructor(t = !1) {
			(this.detached = t),
				(this._active = !0),
				(this._on = 0),
				(this.effects = []),
				(this.cleanups = []),
				(this._isPaused = !1),
				(this.__v_skip = !0),
				(this.parent = Ve),
				!t && Ve && (this.index = (Ve.scopes || (Ve.scopes = [])).push(this) - 1);
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
				const n = Ve;
				try {
					return (Ve = this), t();
				} finally {
					Ve = n;
				}
			}
		}
		on() {
			++this._on === 1 && ((this.prevScope = Ve), (Ve = this));
		}
		off() {
			this._on > 0 && --this._on === 0 && ((Ve = this.prevScope), (this.prevScope = void 0));
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
	function $i() {
		return Ve;
	}
	let ye;
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
				Ve && Ve.active && Ve.effects.push(this);
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
			const t = ye,
				n = Ze;
			(ye = this), (Ze = !0);
			try {
				return this.fn();
			} finally {
				fl(this), (ye = t), (Ze = n), (this.flags &= -3);
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
		nn,
		on;
	function cl(e, t = !1) {
		if (((e.flags |= 8), t)) {
			(e.next = on), (on = e);
			return;
		}
		(e.next = nn), (nn = e);
	}
	function ho() {
		al++;
	}
	function go() {
		if (--al > 0) return;
		if (on) {
			let t = on;
			for (on = void 0; t; ) {
				const n = t.next;
				(t.next = void 0), (t.flags &= -9), (t = n);
			}
		}
		let e;
		for (; nn; ) {
			let t = nn;
			for (nn = void 0; t; ) {
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
			o.version === -1 ? (o === n && (n = l), yo(o), Ci(o)) : (t = o),
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
			((e.flags &= -17), e.globalVersion === ln) ||
			((e.globalVersion = ln),
			!e.isSSR && e.flags & 128 && ((!e.deps && !e._dirty) || !vo(e)))
		)
			return;
		e.flags |= 2;
		const t = e.dep,
			n = ye,
			o = Ze;
		(ye = e), (Ze = !0);
		try {
			ul(e);
			const l = e.fn(e._value);
			(t.version === 0 || Re(l, e._value)) &&
				((e.flags |= 128), (e._value = l), t.version++);
		} catch (l) {
			throw (t.version++, l);
		} finally {
			(ye = n), (Ze = o), fl(e), (e.flags &= -3);
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
	function Ci(e) {
		const { prevDep: t, nextDep: n } = e;
		t && ((t.nextDep = n), (e.prevDep = void 0)), n && ((n.prevDep = t), (e.nextDep = void 0));
	}
	let Ze = !0;
	const pl = [];
	function ot() {
		pl.push(Ze), (Ze = !1);
	}
	function lt() {
		const e = pl.pop();
		Ze = e === void 0 ? !0 : e;
	}
	function ml(e) {
		const { cleanup: t } = e;
		if (((e.cleanup = void 0), t)) {
			const n = ye;
			ye = void 0;
			try {
				t();
			} finally {
				ye = n;
			}
		}
	}
	let ln = 0;
	class ki {
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
			if (!ye || !Ze || ye === this.computed) return;
			let n = this.activeLink;
			if (n === void 0 || n.sub !== ye)
				(n = this.activeLink = new ki(ye, this)),
					ye.deps
						? ((n.prevDep = ye.depsTail), (ye.depsTail.nextDep = n), (ye.depsTail = n))
						: (ye.deps = ye.depsTail = n),
					hl(n);
			else if (n.version === -1 && ((n.version = this.version), n.nextDep)) {
				const o = n.nextDep;
				(o.prevDep = n.prevDep),
					n.prevDep && (n.prevDep.nextDep = o),
					(n.prevDep = ye.depsTail),
					(n.nextDep = void 0),
					(ye.depsTail.nextDep = n),
					(ye.depsTail = n),
					ye.deps === n && (ye.deps = o);
			}
			return n;
		}
		trigger(t) {
			this.version++, ln++, this.notify(t);
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
		Tt = Symbol(""),
		bo = Symbol(""),
		sn = Symbol("");
	function Oe(e, t, n) {
		if (Ze && ye) {
			let o = Nn.get(e);
			o || Nn.set(e, (o = new Map()));
			let l = o.get(n);
			l || (o.set(n, (l = new Tn())), (l.map = o), (l.key = n)), l.track();
		}
	}
	function ht(e, t, n, o, l, s) {
		const i = Nn.get(e);
		if (!i) {
			ln++;
			return;
		}
		const r = (a) => {
			a && a.trigger();
		};
		if ((ho(), t === "clear")) i.forEach(r);
		else {
			const a = ne(e),
				u = a && Sn(n);
			if (a && n === "length") {
				const c = Number(o);
				i.forEach((f, h) => {
					(h === "length" || h === sn || (!Ge(h) && h >= c)) && r(f);
				});
			} else
				switch (((n !== void 0 || i.has(void 0)) && r(i.get(n)), u && r(i.get(sn)), t)) {
					case "add":
						a ? u && r(i.get("length")) : (r(i.get(Tt)), Lt(e) && r(i.get(bo)));
						break;
					case "delete":
						a || (r(i.get(Tt)), Lt(e) && r(i.get(bo)));
						break;
					case "set":
						Lt(e) && r(i.get(Tt));
						break;
				}
		}
		go();
	}
	function Fi(e, t) {
		const n = Nn.get(e);
		return n && n.get(t);
	}
	function Bt(e) {
		const t = fe(e);
		return t === e ? t : (Oe(t, "iterate", sn), Ue(e) ? t : t.map(Qe));
	}
	function En(e) {
		return Oe((e = fe(e)), "iterate", sn), e;
	}
	function st(e, t) {
		return vt(e) ? Ht(Nt(e) ? Qe(t) : t) : Qe(t);
	}
	const Di = {
		__proto__: null,
		[Symbol.iterator]() {
			return _o(this, Symbol.iterator, (e) => st(this, e));
		},
		concat(...e) {
			return Bt(this).concat(...e.map((t) => (ne(t) ? Bt(t) : t)));
		},
		entries() {
			return _o(this, "entries", (e) => ((e[1] = st(this, e[1])), e));
		},
		every(e, t) {
			return gt(this, "every", e, t, void 0, arguments);
		},
		filter(e, t) {
			return gt(this, "filter", e, t, (n) => n.map((o) => st(this, o)), arguments);
		},
		find(e, t) {
			return gt(this, "find", e, t, (n) => st(this, n), arguments);
		},
		findIndex(e, t) {
			return gt(this, "findIndex", e, t, void 0, arguments);
		},
		findLast(e, t) {
			return gt(this, "findLast", e, t, (n) => st(this, n), arguments);
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
			return Bt(this).join(e);
		},
		lastIndexOf(...e) {
			return wo(this, "lastIndexOf", e);
		},
		map(e, t) {
			return gt(this, "map", e, t, void 0, arguments);
		},
		pop() {
			return rn(this, "pop");
		},
		push(...e) {
			return rn(this, "push", e);
		},
		reduce(e, ...t) {
			return gl(this, "reduce", e, t);
		},
		reduceRight(e, ...t) {
			return gl(this, "reduceRight", e, t);
		},
		shift() {
			return rn(this, "shift");
		},
		some(e, t) {
			return gt(this, "some", e, t, void 0, arguments);
		},
		splice(...e) {
			return rn(this, "splice", e);
		},
		toReversed() {
			return Bt(this).toReversed();
		},
		toSorted(e) {
			return Bt(this).toSorted(e);
		},
		toSpliced(...e) {
			return Bt(this).toSpliced(...e);
		},
		unshift(...e) {
			return rn(this, "unshift", e);
		},
		values() {
			return _o(this, "values", (e) => st(this, e));
		},
	};
	function _o(e, t, n) {
		const o = En(e),
			l = o[t]();
		return (
			o !== e &&
				!Ue(e) &&
				((l._next = l.next),
				(l.next = () => {
					const s = l._next();
					return s.done || (s.value = n(s.value)), s;
				})),
			l
		);
	}
	const Ti = Array.prototype;
	function gt(e, t, n, o, l, s) {
		const i = En(e),
			r = i !== e && !Ue(e),
			a = i[t];
		if (a !== Ti[t]) {
			const f = a.apply(e, s);
			return r ? Qe(f) : f;
		}
		let u = n;
		i !== e &&
			(r
				? (u = function (f, h) {
						return n.call(this, st(e, f), h, e);
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
			s = l !== e && !Ue(e);
		let i = n,
			r = !1;
		l !== e &&
			(s
				? ((r = o.length === 0),
				  (i = function (u, c, f) {
						return r && ((r = !1), (u = st(e, u))), n.call(this, u, st(e, c), f, e);
				  }))
				: n.length > 3 &&
				  (i = function (u, c, f) {
						return n.call(this, u, c, f, e);
				  }));
		const a = l[t](i, ...o);
		return r ? st(e, a) : a;
	}
	function wo(e, t, n) {
		const o = fe(e);
		Oe(o, "iterate", sn);
		const l = o[t](...n);
		return (l === -1 || l === !1) && Mn(n[0]) ? ((n[0] = fe(n[0])), o[t](...n)) : l;
	}
	function rn(e, t, n = []) {
		ot(), ho();
		const o = fe(e)[t].apply(e, n);
		return go(), lt(), o;
	}
	const Ni = ro("__proto__,__v_isRef,__isVue"),
		vl = new Set(
			Object.getOwnPropertyNames(Symbol)
				.filter((e) => e !== "arguments" && e !== "caller")
				.map((e) => Symbol[e])
				.filter(Ge)
		);
	function Ei(e) {
		Ge(e) || (e = String(e));
		const t = fe(this);
		return Oe(t, "has", e), t.hasOwnProperty(e);
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
				return o === (l ? (s ? $l : Sl) : s ? xl : wl).get(t) ||
					Object.getPrototypeOf(t) === Object.getPrototypeOf(o)
					? t
					: void 0;
			const i = ne(t);
			if (!l) {
				let a;
				if (i && (a = Di[n])) return a;
				if (n === "hasOwnProperty") return Ei;
			}
			const r = Reflect.get(t, n, Se(t) ? t : o);
			if ((Ge(n) ? vl.has(n) : Ni(n)) || (l || Oe(t, "get", n), s)) return r;
			if (Se(r)) {
				const a = i && Sn(n) ? r : r.value;
				return l && ge(a) ? So(a) : a;
			}
			return ge(r) ? (l ? So(r) : Te(r)) : r;
		}
	}
	class bl extends yl {
		constructor(t = !1) {
			super(!1, t);
		}
		set(t, n, o, l) {
			let s = t[n];
			const i = ne(t) && Sn(n);
			if (!this._isShallow) {
				const u = vt(s);
				if ((!Ue(o) && !vt(o) && ((s = fe(s)), (o = fe(o))), !i && Se(s) && !Se(o)))
					return u || (s.value = o), !0;
			}
			const r = i ? Number(n) < t.length : me(t, n),
				a = Reflect.set(t, n, o, Se(t) ? t : l);
			return t === fe(l) && (r ? Re(o, s) && ht(t, "set", n, o) : ht(t, "add", n, o)), a;
		}
		deleteProperty(t, n) {
			const o = me(t, n);
			t[n];
			const l = Reflect.deleteProperty(t, n);
			return l && o && ht(t, "delete", n, void 0), l;
		}
		has(t, n) {
			const o = Reflect.has(t, n);
			return (!Ge(n) || !vl.has(n)) && Oe(t, "has", n), o;
		}
		ownKeys(t) {
			return Oe(t, "iterate", ne(t) ? "length" : Tt), Reflect.ownKeys(t);
		}
	}
	class _l extends yl {
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
	const Ri = new bl(),
		Oi = new _l(),
		Pi = new bl(!0),
		Ai = new _l(!0),
		xo = (e) => e,
		Rn = (e) => Reflect.getPrototypeOf(e);
	function Mi(e, t, n) {
		return function (...o) {
			const l = this.__v_raw,
				s = fe(l),
				i = Lt(s),
				r = e === "entries" || (e === Symbol.iterator && i),
				a = e === "keys" && i,
				u = l[e](...o),
				c = n ? xo : t ? Ht : Qe;
			return (
				!t && Oe(s, "iterate", a ? bo : Tt),
				De(Object.create(u), {
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
	function Ii(e, t) {
		const n = {
			get(l) {
				const s = this.__v_raw,
					i = fe(s),
					r = fe(l);
				e || (Re(l, r) && Oe(i, "get", l), Oe(i, "get", r));
				const { has: a } = Rn(i),
					u = t ? xo : e ? Ht : Qe;
				if (a.call(i, l)) return u(s.get(l));
				if (a.call(i, r)) return u(s.get(r));
				s !== i && s.get(l);
			},
			get size() {
				const l = this.__v_raw;
				return !e && Oe(fe(l), "iterate", Tt), l.size;
			},
			has(l) {
				const s = this.__v_raw,
					i = fe(s),
					r = fe(l);
				return (
					e || (Re(l, r) && Oe(i, "has", l), Oe(i, "has", r)),
					l === r ? s.has(l) : s.has(l) || s.has(r)
				);
			},
			forEach(l, s) {
				const i = this,
					r = i.__v_raw,
					a = fe(r),
					u = t ? xo : e ? Ht : Qe;
				return !e && Oe(a, "iterate", Tt), r.forEach((c, f) => l.call(s, u(c), u(f), i));
			},
		};
		return (
			De(
				n,
				e
					? { add: On("add"), set: On("set"), delete: On("delete"), clear: On("clear") }
					: {
							add(l) {
								const s = fe(this),
									i = Rn(s),
									r = fe(l),
									a = !t && !Ue(l) && !vt(l) ? r : l;
								return (
									i.has.call(s, a) ||
										(Re(l, a) && i.has.call(s, l)) ||
										(Re(r, a) && i.has.call(s, r)) ||
										(s.add(a), ht(s, "add", a, a)),
									this
								);
							},
							set(l, s) {
								!t && !Ue(s) && !vt(s) && (s = fe(s));
								const i = fe(this),
									{ has: r, get: a } = Rn(i);
								let u = r.call(i, l);
								u || ((l = fe(l)), (u = r.call(i, l)));
								const c = a.call(i, l);
								return (
									i.set(l, s),
									u ? Re(s, c) && ht(i, "set", l, s) : ht(i, "add", l, s),
									this
								);
							},
							delete(l) {
								const s = fe(this),
									{ has: i, get: r } = Rn(s);
								let a = i.call(s, l);
								a || ((l = fe(l)), (a = i.call(s, l))), r && r.call(s, l);
								const u = s.delete(l);
								return a && ht(s, "delete", l, void 0), u;
							},
							clear() {
								const l = fe(this),
									s = l.size !== 0,
									i = l.clear();
								return s && ht(l, "clear", void 0, void 0), i;
							},
					  }
			),
			["keys", "values", "entries", Symbol.iterator].forEach((l) => {
				n[l] = Mi(l, e, t);
			}),
			n
		);
	}
	function Pn(e, t) {
		const n = Ii(e, t);
		return (o, l, s) =>
			l === "__v_isReactive"
				? !e
				: l === "__v_isReadonly"
				? e
				: l === "__v_raw"
				? o
				: Reflect.get(me(n, l) && l in o ? n : o, l, s);
	}
	const Li = { get: Pn(!1, !1) },
		ji = { get: Pn(!1, !0) },
		Vi = { get: Pn(!0, !1) },
		Bi = { get: Pn(!0, !0) },
		wl = new WeakMap(),
		xl = new WeakMap(),
		Sl = new WeakMap(),
		$l = new WeakMap();
	function Hi(e) {
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
	function qi(e) {
		return e.__v_skip || !Object.isExtensible(e) ? 0 : Hi(mi(e));
	}
	function Te(e) {
		return vt(e) ? e : An(e, !1, Ri, Li, wl);
	}
	function Ui(e) {
		return An(e, !1, Pi, ji, xl);
	}
	function So(e) {
		return An(e, !0, Oi, Vi, Sl);
	}
	function wd(e) {
		return An(e, !0, Ai, Bi, $l);
	}
	function An(e, t, n, o, l) {
		if (!ge(e) || (e.__v_raw && !(t && e.__v_isReactive))) return e;
		const s = qi(e);
		if (s === 0) return e;
		const i = l.get(e);
		if (i) return i;
		const r = new Proxy(e, s === 2 ? o : n);
		return l.set(e, r), r;
	}
	function Nt(e) {
		return vt(e) ? Nt(e.__v_raw) : !!(e && e.__v_isReactive);
	}
	function vt(e) {
		return !!(e && e.__v_isReadonly);
	}
	function Ue(e) {
		return !!(e && e.__v_isShallow);
	}
	function Mn(e) {
		return e ? !!e.__v_raw : !1;
	}
	function fe(e) {
		const t = e && e.__v_raw;
		return t ? fe(t) : e;
	}
	function Wi(e) {
		return !me(e, "__v_skip") && Object.isExtensible(e) && nl(e, "__v_skip", !0), e;
	}
	const Qe = (e) => (ge(e) ? Te(e) : e),
		Ht = (e) => (ge(e) ? So(e) : e);
	function Se(e) {
		return e ? e.__v_isRef === !0 : !1;
	}
	function X(e) {
		return kl(e, !1);
	}
	function Cl(e) {
		return kl(e, !0);
	}
	function kl(e, t) {
		return Se(e) ? e : new Ki(e, t);
	}
	class Ki {
		constructor(t, n) {
			(this.dep = new Tn()),
				(this.__v_isRef = !0),
				(this.__v_isShallow = !1),
				(this._rawValue = n ? t : fe(t)),
				(this._value = n ? t : Qe(t)),
				(this.__v_isShallow = n);
		}
		get value() {
			return this.dep.track(), this._value;
		}
		set value(t) {
			const n = this._rawValue,
				o = this.__v_isShallow || Ue(t) || vt(t);
			(t = o ? t : fe(t)),
				Re(t, n) &&
					((this._rawValue = t), (this._value = o ? t : Qe(t)), this.dep.trigger());
		}
	}
	function R(e) {
		return Se(e) ? e.value : e;
	}
	const zi = {
		get: (e, t, n) => (t === "__v_raw" ? e : R(Reflect.get(e, t, n))),
		set: (e, t, n, o) => {
			const l = e[t];
			return Se(l) && !Se(n) ? ((l.value = n), !0) : Reflect.set(e, t, n, o);
		},
	};
	function Fl(e) {
		return Nt(e) ? e : new Proxy(e, zi);
	}
	class Yi {
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
	function Ji(e) {
		return new Yi(e);
	}
	class Xi {
		constructor(t, n, o) {
			(this._object = t),
				(this._key = n),
				(this._defaultValue = o),
				(this.__v_isRef = !0),
				(this._value = void 0),
				(this._raw = fe(t));
			let l = !0,
				s = t;
			if (!ne(t) || !Sn(String(n)))
				do l = !Mn(s) || Ue(s);
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
			if (this._shallow && Se(this._raw[this._key])) {
				const n = this._object[this._key];
				if (Se(n)) {
					n.value = t;
					return;
				}
			}
			this._object[this._key] = t;
		}
		get dep() {
			return Fi(this._raw, this._key);
		}
	}
	class Gi {
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
		return Se(e) ? e : se(e) ? new Gi(e) : ge(e) && arguments.length > 1 ? Zi(e, t, n) : X(e);
	}
	function Zi(e, t, n) {
		return new Xi(e, t, n);
	}
	class Qi {
		constructor(t, n, o) {
			(this.fn = t),
				(this.setter = n),
				(this._value = void 0),
				(this.dep = new Tn(this)),
				(this.__v_isRef = !0),
				(this.deps = void 0),
				(this.depsTail = void 0),
				(this.flags = 16),
				(this.globalVersion = ln - 1),
				(this.next = void 0),
				(this.effect = this),
				(this.__v_isReadonly = !n),
				(this.isSSR = o);
		}
		notify() {
			if (((this.flags |= 16), !(this.flags & 8) && ye !== this)) return cl(this, !0), !0;
		}
		get value() {
			const t = this.dep.track();
			return dl(this), t && (t.version = this.dep.version), this._value;
		}
		set value(t) {
			this.setter && this.setter(t);
		}
	}
	function er(e, t, n = !1) {
		let o, l;
		return se(e) ? (o = e) : ((o = e.get), (l = e.set)), new Qi(o, l, n);
	}
	const Ln = {},
		jn = new WeakMap();
	let Et;
	function tr(e, t = !1, n = Et) {
		if (n) {
			let o = jn.get(n);
			o || jn.set(n, (o = [])), o.push(e);
		}
	}
	function nr(e, t, n = pe) {
		const { immediate: o, deep: l, once: s, scheduler: i, augmentJob: r, call: a } = n,
			u = ($) => (l ? $ : Ue($) || l === !1 || l === 0 ? yt($, 1) : yt($));
		let c,
			f,
			h,
			g,
			w = !1,
			S = !1;
		if (
			(Se(e)
				? ((f = () => e.value), (w = Ue(e)))
				: Nt(e)
				? ((f = () => u(e)), (w = !0))
				: ne(e)
				? ((S = !0),
				  (w = e.some(($) => Nt($) || Ue($))),
				  (f = () =>
						e.map(($) => {
							if (Se($)) return $.value;
							if (Nt($)) return u($);
							if (se($)) return a ? a($, 2) : $();
						})))
				: se(e)
				? t
					? (f = a ? () => a(e, 2) : e)
					: (f = () => {
							if (h) {
								ot();
								try {
									h();
								} finally {
									lt();
								}
							}
							const $ = Et;
							Et = c;
							try {
								return a ? a(e, 3, [g]) : e(g);
							} finally {
								Et = $;
							}
					  })
				: (f = nt),
			t && l)
		) {
			const $ = f,
				x = l === !0 ? 1 / 0 : l;
			f = () => yt($(), x);
		}
		const N = $i(),
			C = () => {
				c.stop(), N && N.active && co(N.effects, c);
			};
		if (s && t) {
			const $ = t;
			t = (...x) => {
				$(...x), C();
			};
		}
		let y = S ? new Array(e.length).fill(Ln) : Ln;
		const M = ($) => {
			if (!(!(c.flags & 1) || (!c.dirty && !$)))
				if (t) {
					const x = c.run();
					if (l || w || (S ? x.some((k, L) => Re(k, y[L])) : Re(x, y))) {
						h && h();
						const k = Et;
						Et = c;
						try {
							const L = [x, y === Ln ? void 0 : S && y[0] === Ln ? [] : y, g];
							(y = x), a ? a(t, 3, L) : t(...L);
						} finally {
							Et = k;
						}
					}
				} else c.run();
		};
		return (
			r && r(M),
			(c = new rl(f)),
			(c.scheduler = i ? () => i(M, !1) : M),
			(g = ($) => tr($, !1, c)),
			(h = c.onStop =
				() => {
					const $ = jn.get(c);
					if ($) {
						if (a) a($, 4);
						else for (const x of $) x();
						jn.delete(c);
					}
				}),
			t ? (o ? M(!0) : (y = c.run())) : i ? i(M.bind(null, !0), !0) : c.run(),
			(C.pause = c.pause.bind(c)),
			(C.resume = c.resume.bind(c)),
			(C.stop = C),
			C
		);
	}
	function yt(e, t = 1 / 0, n) {
		if (t <= 0 || !ge(e) || e.__v_skip || ((n = n || new Map()), (n.get(e) || 0) >= t))
			return e;
		if ((n.set(e, t), t--, Se(e))) yt(e.value, t, n);
		else if (ne(e)) for (let o = 0; o < e.length; o++) yt(e[o], t, n);
		else if (jt(e) || Lt(e))
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
	 **/ const an = [];
	let $o = !1;
	function xd(e, ...t) {
		if ($o) return;
		($o = !0), ot();
		const n = an.length ? an[an.length - 1].component : null,
			o = n && n.appContext.config.warnHandler,
			l = or();
		if (o)
			qt(o, n, 11, [
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
					...lr(l)
				),
				console.warn(...s);
		}
		lt(), ($o = !1);
	}
	function or() {
		let e = an[an.length - 1];
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
	function lr(e) {
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
					...sr(n)
				);
			}),
			t
		);
	}
	function sr({ vnode: e, recurseCount: t }) {
		const n = t > 0 ? `... (${t} recursive calls)` : "",
			o = e.component ? e.component.parent == null : !1,
			l = ` at <${Es(e.component, e.type, o)}`,
			s = ">" + n;
		return e.props ? [l, ...ir(e.props), s] : [l + s];
	}
	function ir(e) {
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
		return be(t)
			? ((t = JSON.stringify(t)), n ? t : [`${e}=${t}`])
			: typeof t == "number" || typeof t == "boolean" || t == null
			? n
				? t
				: [`${e}=${t}`]
			: Se(t)
			? ((t = Dl(e, fe(t.value), !0)), n ? t : [`${e}=Ref<`, t, ">"])
			: se(t)
			? [`${e}=fn${t.name ? `<${t.name}>` : ""}`]
			: ((t = fe(t)), n ? t : [`${e}=`, t]);
	}
	function qt(e, t, n, o) {
		try {
			return o ? e(...o) : e();
		} catch (l) {
			Vn(l, t, n);
		}
	}
	function it(e, t, n, o) {
		if (se(e)) {
			const l = qt(e, t, n, o);
			return (
				l &&
					Qo(l) &&
					l.catch((s) => {
						Vn(s, t, n);
					}),
				l
			);
		}
		if (ne(e)) {
			const l = [];
			for (let s = 0; s < e.length; s++) l.push(it(e[s], t, n, o));
			return l;
		}
	}
	function Vn(e, t, n, o = !0) {
		const l = t ? t.vnode : null,
			{ errorHandler: s, throwUnhandledErrorInProduction: i } =
				(t && t.appContext.config) || pe;
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
				ot(), qt(s, null, 10, [e, a, u]), lt();
				return;
			}
		}
		rr(e, n, l, o, i);
	}
	function rr(e, t, n, o = !0, l = !1) {
		if (l) throw e;
		console.error(e);
	}
	const Le = [];
	let rt = -1;
	const Ut = [];
	let Ft = null,
		Wt = 0;
	const Tl = Promise.resolve();
	let Bn = null;
	function bt(e) {
		const t = Bn || Tl;
		return e ? t.then(this ? e.bind(this) : e) : t;
	}
	function ar(e) {
		let t = rt + 1,
			n = Le.length;
		for (; t < n; ) {
			const o = (t + n) >>> 1,
				l = Le[o],
				s = cn(l);
			s < e || (s === e && l.flags & 2) ? (t = o + 1) : (n = o);
		}
		return t;
	}
	function Co(e) {
		if (!(e.flags & 1)) {
			const t = cn(e),
				n = Le[Le.length - 1];
			!n || (!(e.flags & 2) && t >= cn(n)) ? Le.push(e) : Le.splice(ar(t), 0, e),
				(e.flags |= 1),
				Nl();
		}
	}
	function Nl() {
		Bn || (Bn = Tl.then(Ol));
	}
	function cr(e) {
		ne(e)
			? Ut.push(...e)
			: Ft && e.id === -1
			? Ft.splice(Wt + 1, 0, e)
			: e.flags & 1 || (Ut.push(e), (e.flags |= 1)),
			Nl();
	}
	function El(e, t, n = rt + 1) {
		for (; n < Le.length; n++) {
			const o = Le[n];
			if (o && o.flags & 2) {
				if (e && o.id !== e.uid) continue;
				Le.splice(n, 1),
					n--,
					o.flags & 4 && (o.flags &= -2),
					o(),
					o.flags & 4 || (o.flags &= -2);
			}
		}
	}
	function Rl(e) {
		if (Ut.length) {
			const t = [...new Set(Ut)].sort((n, o) => cn(n) - cn(o));
			if (((Ut.length = 0), Ft)) {
				Ft.push(...t);
				return;
			}
			for (Ft = t, Wt = 0; Wt < Ft.length; Wt++) {
				const n = Ft[Wt];
				n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), (n.flags &= -2);
			}
			(Ft = null), (Wt = 0);
		}
	}
	const cn = (e) => (e.id == null ? (e.flags & 2 ? -1 : 1 / 0) : e.id);
	function Ol(e) {
		try {
			for (rt = 0; rt < Le.length; rt++) {
				const t = Le[rt];
				t &&
					!(t.flags & 8) &&
					(t.flags & 4 && (t.flags &= -2),
					qt(t, t.i, t.i ? 15 : 14),
					t.flags & 4 || (t.flags &= -2));
			}
		} finally {
			for (; rt < Le.length; rt++) {
				const t = Le[rt];
				t && (t.flags &= -2);
			}
			(rt = -1), (Le.length = 0), Rl(), (Bn = null), (Le.length || Ut.length) && Ol();
		}
	}
	let Ne = null,
		Pl = null;
	function Hn(e) {
		const t = Ne;
		return (Ne = e), (Pl = (e && e.type.__scopeId) || null), t;
	}
	function Rt(e, t = Ne, n) {
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
	function et(e, t) {
		if (Ne === null) return e;
		const n = Qn(Ne),
			o = e.dirs || (e.dirs = []);
		for (let l = 0; l < t.length; l++) {
			let [s, i, r, a = pe] = t[l];
			s &&
				(se(s) && (s = { mounted: s, updated: s }),
				s.deep && yt(i),
				o.push({ dir: s, instance: n, value: i, oldValue: void 0, arg: r, modifiers: a }));
		}
		return e;
	}
	function Ot(e, t, n, o) {
		const l = e.dirs,
			s = t && t.dirs;
		for (let i = 0; i < l.length; i++) {
			const r = l[i];
			s && (r.oldValue = s[i].value);
			let a = r.dir[o];
			a && (ot(), it(a, n, 8, [e.el, r, e, t]), lt());
		}
	}
	function Al(e, t) {
		if (Ae) {
			let n = Ae.provides;
			const o = Ae.parent && Ae.parent.provides;
			o === n && (n = Ae.provides = Object.create(o)), (n[e] = t);
		}
	}
	function Kt(e, t, n = !1) {
		const o = Cs();
		if (o || Jt) {
			let l = Jt
				? Jt._context.provides
				: o
				? o.parent == null || o.ce
					? o.vnode.appContext && o.vnode.appContext.provides
					: o.parent.provides
				: void 0;
			if (l && e in l) return l[e];
			if (arguments.length > 1) return n && se(t) ? t.call(o && o.proxy) : t;
		}
	}
	const ur = Symbol.for("v-scx"),
		fr = () => Kt(ur);
	function dr(e, t) {
		return ko(e, null, { flush: "sync" });
	}
	function Be(e, t, n) {
		return ko(e, t, n);
	}
	function ko(e, t, n = pe) {
		const { immediate: o, deep: l, flush: s, once: i } = n,
			r = De({}, n),
			a = (t && o) || (!t && s !== "post");
		let u;
		if (yn) {
			if (s === "sync") {
				const g = fr();
				u = g.__watcherHandles || (g.__watcherHandles = []);
			} else if (!a) {
				const g = () => {};
				return (g.stop = nt), (g.resume = nt), (g.pause = nt), g;
			}
		}
		const c = Ae;
		r.call = (g, w, S) => it(g, c, w, S);
		let f = !1;
		s === "post"
			? (r.scheduler = (g) => {
					Pe(g, c && c.suspense);
			  })
			: s !== "sync" &&
			  ((f = !0),
			  (r.scheduler = (g, w) => {
					w ? g() : Co(g);
			  })),
			(r.augmentJob = (g) => {
				t && (g.flags |= 4), f && ((g.flags |= 2), c && ((g.id = c.uid), (g.i = c)));
			});
		const h = nr(e, t, r);
		return yn && (u ? u.push(h) : a && h()), h;
	}
	function pr(e, t, n) {
		const o = this.proxy,
			l = be(e) ? (e.includes(".") ? Ml(o, e) : () => o[e]) : e.bind(o, o);
		let s;
		se(t) ? (s = t) : ((s = t.handler), (n = t));
		const i = vn(this),
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
		mr = (e) => e.__isTeleport,
		un = (e) => e && (e.disabled || e.disabled === ""),
		Ll = (e) => e && (e.defer || e.defer === ""),
		jl = (e) => typeof SVGElement < "u" && e instanceof SVGElement,
		Vl = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement,
		Fo = (e, t) => {
			const n = e && e.to;
			return be(n) ? (t ? t(n) : null) : n;
		},
		Bl = {
			name: "Teleport",
			__isTeleport: !0,
			process(e, t, n, o, l, s, i, r, a, u) {
				const {
						mc: c,
						pc: f,
						pbc: h,
						o: { insert: g, querySelector: w, createText: S, createComment: N },
					} = u,
					C = un(t.props);
				let { shapeFlag: y, children: M, dynamicChildren: $ } = t;
				if (e == null) {
					const x = (t.el = S("")),
						k = (t.anchor = S(""));
					g(x, n, o), g(k, n, o);
					const L = (V, z) => {
							y & 16 && c(M, V, z, l, s, i, r, a);
						},
						U = () => {
							const V = (t.target = Fo(t.props, w)),
								z = Do(V, t, S, g);
							V &&
								(i !== "svg" && jl(V)
									? (i = "svg")
									: i !== "mathml" && Vl(V) && (i = "mathml"),
								l &&
									l.isCE &&
									(
										l.ce._teleportTargets ||
										(l.ce._teleportTargets = new Set())
									).add(V),
								C || (L(V, z), Un(t, !1)));
						};
					C && (L(n, k), Un(t, !0)),
						Ll(t.props)
							? ((t.el.__isMounted = !1),
							  Pe(() => {
									U(), delete t.el.__isMounted;
							  }, s))
							: U();
				} else {
					if (Ll(t.props) && e.el.__isMounted === !1) {
						Pe(() => {
							Bl.process(e, t, n, o, l, s, i, r, a, u);
						}, s);
						return;
					}
					(t.el = e.el), (t.targetStart = e.targetStart);
					const x = (t.anchor = e.anchor),
						k = (t.target = e.target),
						L = (t.targetAnchor = e.targetAnchor),
						U = un(e.props),
						V = U ? n : k,
						z = U ? x : L;
					if (
						(i === "svg" || jl(k)
							? (i = "svg")
							: (i === "mathml" || Vl(k)) && (i = "mathml"),
						$
							? (h(e.dynamicChildren, $, V, l, s, i, r), Vo(e, t, !0))
							: a || f(e, t, V, z, l, s, i, r, !1),
						C)
					)
						U
							? t.props &&
							  e.props &&
							  t.props.to !== e.props.to &&
							  (t.props.to = e.props.to)
							: qn(t, n, x, u, 1);
					else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
						const te = (t.target = Fo(t.props, w));
						te && qn(t, te, null, u, 0);
					} else U && qn(t, k, L, u, 1);
					Un(t, C);
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
					const g = s || !un(h);
					for (let w = 0; w < r.length; w++) {
						const S = r[w];
						o(S, t, n, g, !!S.dynamicChildren);
					}
				}
			},
			move: qn,
			hydrate: hr,
		};
	function qn(e, t, n, { o: { insert: o }, m: l }, s = 2) {
		s === 0 && o(e.targetAnchor, t, n);
		const { el: i, anchor: r, shapeFlag: a, children: u, props: c } = e,
			f = s === 2;
		if ((f && o(i, t, n), (!f || un(c)) && a & 16))
			for (let h = 0; h < u.length; h++) l(u[h], t, n, 2);
		f && o(r, t, n);
	}
	function hr(
		e,
		t,
		n,
		o,
		l,
		s,
		{ o: { nextSibling: i, parentNode: r, querySelector: a, insert: u, createText: c } },
		f
	) {
		function h(N, C) {
			let y = C;
			for (; y; ) {
				if (y && y.nodeType === 8) {
					if (y.data === "teleport start anchor") t.targetStart = y;
					else if (y.data === "teleport anchor") {
						(t.targetAnchor = y), (N._lpa = t.targetAnchor && i(t.targetAnchor));
						break;
					}
				}
				y = i(y);
			}
		}
		function g(N, C) {
			C.anchor = f(i(N), C, r(N), n, o, l, s);
		}
		const w = (t.target = Fo(t.props, a)),
			S = un(t.props);
		if (w) {
			const N = w._lpa || w.firstChild;
			t.shapeFlag & 16 &&
				(S
					? (g(e, t), h(w, N), t.targetAnchor || Do(w, t, c, u, r(e) === w ? e : null))
					: ((t.anchor = i(e)),
					  h(w, N),
					  t.targetAnchor || Do(w, t, c, u),
					  f(N && i(N), t, w, n, o, l, s))),
				Un(t, S);
		} else S && t.shapeFlag & 16 && (g(e, t), (t.targetStart = e), (t.targetAnchor = i(e)));
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
	const gr = Symbol("_leaveCb");
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
	function fn(e, t, n, o, l = !1) {
		if (ne(e)) {
			e.forEach((S, N) => fn(S, t && (ne(t) ? t[N] : t), n, o, l));
			return;
		}
		if (zt(o) && !l) {
			o.shapeFlag & 512 &&
				o.type.__asyncResolved &&
				o.component.subTree.component &&
				fn(e, t, n, o.component.subTree);
			return;
		}
		const s = o.shapeFlag & 4 ? Qn(o.component) : o.el,
			i = l ? null : s,
			{ i: r, r: a } = e,
			u = t && t.r,
			c = r.refs === pe ? (r.refs = {}) : r.refs,
			f = r.setupState,
			h = fe(f),
			g = f === pe ? Go : (S) => (Ul(c, S) ? !1 : me(h, S)),
			w = (S, N) => !(N && Ul(c, N));
		if (u != null && u !== a) {
			if ((Wl(t), be(u))) (c[u] = null), g(u) && (f[u] = null);
			else if (Se(u)) {
				const S = t;
				w(u, S.k) && (u.value = null), S.k && (c[S.k] = null);
			}
		}
		if (se(a)) qt(a, r, 12, [i, c]);
		else {
			const S = be(a),
				N = Se(a);
			if (S || N) {
				const C = () => {
					if (e.f) {
						const y = S ? (g(a) ? f[a] : c[a]) : w() || !e.k ? a.value : c[e.k];
						if (l) ne(y) && co(y, s);
						else if (ne(y)) y.includes(s) || y.push(s);
						else if (S) (c[a] = [s]), g(a) && (f[a] = c[a]);
						else {
							const M = [s];
							w(a, e.k) && (a.value = M), e.k && (c[e.k] = M);
						}
					} else
						S
							? ((c[a] = i), g(a) && (f[a] = i))
							: N && (w(a, e.k) && (a.value = i), e.k && (c[e.k] = i));
				};
				if (i) {
					const y = () => {
						C(), Wn.delete(e);
					};
					(y.id = -1), Wn.set(e, y), Pe(y, n);
				} else Wl(e), C();
			}
		}
	}
	function Wl(e) {
		const t = Wn.get(e);
		t && ((t.flags |= 8), Wn.delete(e));
	}
	Dn().requestIdleCallback, Dn().cancelIdleCallback;
	const zt = (e) => !!e.type.__asyncLoader,
		Kl = (e) => e.type.__isKeepAlive;
	function vr(e, t) {
		zl(e, "a", t);
	}
	function yr(e, t) {
		zl(e, "da", t);
	}
	function zl(e, t, n = Ae) {
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
			for (; l && l.parent; ) Kl(l.parent.vnode) && br(o, t, n, l), (l = l.parent);
		}
	}
	function br(e, t, n, o) {
		const l = Kn(t, e, o, !0);
		Yt(() => {
			co(o[t], l);
		}, n);
	}
	function Kn(e, t, n = Ae, o = !1) {
		if (n) {
			const l = n[e] || (n[e] = []),
				s =
					t.__weh ||
					(t.__weh = (...i) => {
						ot();
						const r = vn(n),
							a = it(t, n, e, i);
						return r(), lt(), a;
					});
			return o ? l.unshift(s) : l.push(s), s;
		}
	}
	const _t =
			(e) =>
			(t, n = Ae) => {
				(!yn || e === "sp") && Kn(e, (...o) => t(...o), n);
			},
		_r = _t("bm"),
		Pt = _t("m"),
		wr = _t("bu"),
		xr = _t("u"),
		No = _t("bum"),
		Yt = _t("um"),
		Sr = _t("sp"),
		$r = _t("rtg"),
		Cr = _t("rtc");
	function kr(e, t = Ae) {
		Kn("ec", e, t);
	}
	const Fr = "components",
		Yl = Symbol.for("v-ndc");
	function Dr(e) {
		return be(e) ? Tr(Fr, e, !1) || e : e || Yl;
	}
	function Tr(e, t, n = !0, o = !1) {
		const l = Ne || Ae;
		if (l) {
			const s = l.type;
			{
				const r = Ns(s, !1);
				if (r && (r === t || r === Ee(t) || r === Cn(Ee(t)))) return s;
			}
			const i = Jl(l[e] || s[e], t) || Jl(l.appContext[e], t);
			return !i && o ? s : i;
		}
	}
	function Jl(e, t) {
		return e && (e[t] || e[Ee(t)] || e[Cn(Ee(t))]);
	}
	function he(e, t, n, o) {
		let l;
		const s = n,
			i = ne(e);
		if (i || be(e)) {
			const r = i && Nt(e);
			let a = !1,
				u = !1;
			r && ((a = !Ue(e)), (u = vt(e)), (e = En(e))), (l = new Array(e.length));
			for (let c = 0, f = e.length; c < f; c++)
				l[c] = t(a ? (u ? Ht(Qe(e[c])) : Qe(e[c])) : e[c], c, void 0, s);
		} else if (typeof e == "number") {
			l = new Array(e);
			for (let r = 0; r < e; r++) l[r] = t(r + 1, r, void 0, s);
		} else if (ge(e))
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
		if (Ne.ce || (Ne.parent && zt(Ne.parent) && Ne.parent.ce)) {
			const u = Object.keys(n).length > 0;
			return (
				t !== "default" && (n.name = t), _(), xe(oe, null, [we("slot", n, o)], u ? -2 : 64)
			);
		}
		let s = e[t];
		s && s._c && (s._d = !1), _();
		const i = s && Xl(s(n)),
			r = n.key || (i && i.key),
			a = xe(
				oe,
				{ key: (r && !Ge(r) ? r : `_${t}`) + (!i && o ? "_fb" : "") },
				i || [],
				i && e._ === 1 ? 64 : -2
			);
		return s && s._c && (s._d = !0), a;
	}
	function Xl(e) {
		return e.some((t) => (Ho(t) ? !(t.type === wt || (t.type === oe && !Xl(t.children))) : !0))
			? e
			: null;
	}
	const Ro = (e) => (e ? (Fs(e) ? Qn(e) : Ro(e.parent)) : null),
		dn = De(Object.create(null), {
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
					Co(e.update);
				}),
			$nextTick: (e) => e.n || (e.n = bt.bind(e.proxy)),
			$watch: (e) => pr.bind(e),
		}),
		Oo = (e, t) => e !== pe && !e.__isScriptSetup && me(e, t),
		Nr = {
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
						if (l !== pe && me(l, t)) return (i[t] = 2), l[t];
						if (me(s, t)) return (i[t] = 3), s[t];
						if (n !== pe && me(n, t)) return (i[t] = 4), n[t];
						Po && (i[t] = 0);
					}
				}
				const u = dn[t];
				let c, f;
				if (u) return t === "$attrs" && Oe(e.attrs, "get", ""), u(e);
				if ((c = r.__cssModules) && (c = c[t])) return c;
				if (n !== pe && me(n, t)) return (i[t] = 4), n[t];
				if (((f = a.config.globalProperties), me(f, t))) return f[t];
			},
			set({ _: e }, t, n) {
				const { data: o, setupState: l, ctx: s } = e;
				return Oo(l, t)
					? ((l[t] = n), !0)
					: o !== pe && me(o, t)
					? ((o[t] = n), !0)
					: me(e.props, t) || (t[0] === "$" && t.slice(1) in e)
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
					(e !== pe && r[0] !== "$" && me(e, r)) ||
					Oo(t, r) ||
					me(s, r) ||
					me(o, r) ||
					me(dn, r) ||
					me(l.config.globalProperties, r) ||
					((a = i.__cssModules) && a[r])
				);
			},
			defineProperty(e, t, n) {
				return (
					n.get != null
						? (e._.accessCache[t] = 0)
						: me(n, "value") && this.set(e, t, n.value, null),
					Reflect.defineProperty(e, t, n)
				);
			},
		};
	function zn(e) {
		return ne(e) ? e.reduce((t, n) => ((t[n] = null), t), {}) : e;
	}
	function Gl(e, t) {
		return !e || !t ? e || t : ne(e) && ne(t) ? e.concat(t) : De({}, zn(e), zn(t));
	}
	let Po = !0;
	function Er(e) {
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
			beforeUpdate: g,
			updated: w,
			activated: S,
			deactivated: N,
			beforeDestroy: C,
			beforeUnmount: y,
			destroyed: M,
			unmounted: $,
			render: x,
			renderTracked: k,
			renderTriggered: L,
			errorCaptured: U,
			serverPrefetch: V,
			expose: z,
			inheritAttrs: te,
			components: re,
			directives: B,
			filters: I,
		} = t;
		if ((u && Rr(u, o, null), i))
			for (const Y in i) {
				const ee = i[Y];
				se(ee) && (o[Y] = ee.bind(n));
			}
		if (l) {
			const Y = l.call(n, n);
			ge(Y) && (e.data = Te(Y));
		}
		if (((Po = !0), s))
			for (const Y in s) {
				const ee = s[Y],
					de = se(ee) ? ee.bind(n, n) : se(ee.get) ? ee.get.bind(n, n) : nt,
					ve = !se(ee) && se(ee.set) ? ee.set.bind(n) : nt,
					Me = ie({ get: de, set: ve });
				Object.defineProperty(o, Y, {
					enumerable: !0,
					configurable: !0,
					get: () => Me.value,
					set: (ke) => (Me.value = ke),
				});
			}
		if (r) for (const Y in r) Ql(r[Y], o, n, Y);
		if (a) {
			const Y = se(a) ? a.call(n) : a;
			Reflect.ownKeys(Y).forEach((ee) => {
				Al(ee, Y[ee]);
			});
		}
		c && Zl(c, e, "c");
		function J(Y, ee) {
			ne(ee) ? ee.forEach((de) => Y(de.bind(n))) : ee && Y(ee.bind(n));
		}
		if (
			(J(_r, f),
			J(Pt, h),
			J(wr, g),
			J(xr, w),
			J(vr, S),
			J(yr, N),
			J(kr, U),
			J(Cr, k),
			J($r, L),
			J(No, y),
			J(Yt, $),
			J(Sr, V),
			ne(z))
		)
			if (z.length) {
				const Y = e.exposed || (e.exposed = {});
				z.forEach((ee) => {
					Object.defineProperty(Y, ee, {
						get: () => n[ee],
						set: (de) => (n[ee] = de),
						enumerable: !0,
					});
				});
			} else e.exposed || (e.exposed = {});
		x && e.render === nt && (e.render = x),
			te != null && (e.inheritAttrs = te),
			re && (e.components = re),
			B && (e.directives = B),
			V && ql(e);
	}
	function Rr(e, t, n = nt) {
		ne(e) && (e = Ao(e));
		for (const o in e) {
			const l = e[o];
			let s;
			ge(l)
				? "default" in l
					? (s = Kt(l.from || o, l.default, !0))
					: (s = Kt(l.from || o))
				: (s = Kt(l)),
				Se(s)
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
		it(ne(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy), t, n);
	}
	function Ql(e, t, n, o) {
		let l = o.includes(".") ? Ml(n, o) : () => n[o];
		if (be(e)) {
			const s = t[e];
			se(s) && Be(l, s);
		} else if (se(e)) Be(l, e.bind(n));
		else if (ge(e))
			if (ne(e)) e.forEach((s) => Ql(s, t, n, o));
			else {
				const s = se(e.handler) ? e.handler.bind(n) : t[e.handler];
				se(s) && Be(l, s, e);
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
			ge(t) && s.set(t, a),
			a
		);
	}
	function Yn(e, t, n, o = !1) {
		const { mixins: l, extends: s } = t;
		s && Yn(e, s, n, !0), l && l.forEach((i) => Yn(e, i, n, !0));
		for (const i in t)
			if (!(o && i === "expose")) {
				const r = Or[i] || (n && n[i]);
				e[i] = r ? r(e[i], t[i]) : t[i];
			}
		return e;
	}
	const Or = {
		data: ts,
		props: ns,
		emits: ns,
		methods: pn,
		computed: pn,
		beforeCreate: je,
		created: je,
		beforeMount: je,
		mounted: je,
		beforeUpdate: je,
		updated: je,
		beforeDestroy: je,
		beforeUnmount: je,
		destroyed: je,
		unmounted: je,
		activated: je,
		deactivated: je,
		errorCaptured: je,
		serverPrefetch: je,
		components: pn,
		directives: pn,
		watch: Ar,
		provide: ts,
		inject: Pr,
	};
	function ts(e, t) {
		return t
			? e
				? function () {
						return De(se(e) ? e.call(this, this) : e, se(t) ? t.call(this, this) : t);
				  }
				: t
			: e;
	}
	function Pr(e, t) {
		return pn(Ao(e), Ao(t));
	}
	function Ao(e) {
		if (ne(e)) {
			const t = {};
			for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
			return t;
		}
		return e;
	}
	function je(e, t) {
		return e ? [...new Set([].concat(e, t))] : t;
	}
	function pn(e, t) {
		return e ? De(Object.create(null), e, t) : t;
	}
	function ns(e, t) {
		return e
			? ne(e) && ne(t)
				? [...new Set([...e, ...t])]
				: De(Object.create(null), zn(e), zn(t ?? {}))
			: t;
	}
	function Ar(e, t) {
		if (!e) return t;
		if (!t) return e;
		const n = De(Object.create(null), e);
		for (const o in t) n[o] = je(e[o], t[o]);
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
	let Mr = 0;
	function Ir(e, t) {
		return function (o, l = null) {
			se(o) || (o = De({}, o)), l != null && !ge(l) && (l = null);
			const s = os(),
				i = new WeakSet(),
				r = [];
			let a = !1;
			const u = (s.app = {
				_uid: Mr++,
				_component: o,
				_props: l,
				_container: null,
				_context: s,
				_instance: null,
				version: ga,
				get config() {
					return s.config;
				},
				set config(c) {},
				use(c, ...f) {
					return (
						i.has(c) ||
							(c && se(c.install)
								? (i.add(c), c.install(u, ...f))
								: se(c) && (i.add(c), c(u, ...f))),
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
						const g = u._ceVNode || we(o, l);
						return (
							(g.appContext = s),
							h === !0 ? (h = "svg") : h === !1 && (h = void 0),
							e(g, c, h),
							(a = !0),
							(u._container = c),
							(c.__vue_app__ = u),
							Qn(g.component)
						);
					}
				},
				onUnmount(c) {
					r.push(c);
				},
				unmount() {
					a &&
						(it(r, u._instance, 16),
						e(null, u._container),
						delete u._container.__vue_app__);
				},
				provide(c, f) {
					return (s.provides[c] = f), u;
				},
				runWithContext(c) {
					const f = Jt;
					Jt = u;
					try {
						return c();
					} finally {
						Jt = f;
					}
				},
			});
			return u;
		};
	}
	let Jt = null;
	function Lr(e, t, n = pe) {
		const o = Cs(),
			l = Ee(t),
			s = mt(t),
			i = ls(e, l),
			r = Ji((a, u) => {
				let c,
					f = pe,
					h;
				return (
					dr(() => {
						const g = e[l];
						Re(c, g) && ((c = g), u());
					}),
					{
						get() {
							return a(), n.get ? n.get(c) : c;
						},
						set(g) {
							const w = n.set ? n.set(g) : g;
							if (!Re(w, c) && !(f !== pe && Re(g, f))) return;
							const S = o.vnode.props;
							(S &&
								(t in S || l in S || s in S) &&
								(`onUpdate:${t}` in S ||
									`onUpdate:${l}` in S ||
									`onUpdate:${s}` in S)) ||
								((c = g), u()),
								o.emit(`update:${t}`, w),
								Re(g, w) && Re(g, f) && !Re(w, h) && u(),
								(f = g),
								(h = w);
						},
					}
				);
			});
		return (
			(r[Symbol.iterator] = () => {
				let a = 0;
				return {
					next() {
						return a < 2 ? { value: a++ ? i || pe : r, done: !1 } : { done: !0 };
					},
				};
			}),
			r
		);
	}
	const ls = (e, t) =>
		t === "modelValue" || t === "model-value"
			? e.modelModifiers
			: e[`${t}Modifiers`] || e[`${Ee(t)}Modifiers`] || e[`${mt(t)}Modifiers`];
	function jr(e, t, ...n) {
		if (e.isUnmounted) return;
		const o = e.vnode.props || pe;
		let l = n;
		const s = t.startsWith("update:"),
			i = s && ls(o, t.slice(7));
		i && (i.trim && (l = n.map((c) => (be(c) ? c.trim() : c))), i.number && (l = n.map(Fn)));
		let r,
			a = o[(r = uo(t))] || o[(r = uo(Ee(t)))];
		!a && s && (a = o[(r = uo(mt(t)))]), a && it(a, e, 6, l);
		const u = o[r + "Once"];
		if (u) {
			if (!e.emitted) e.emitted = {};
			else if (e.emitted[r]) return;
			(e.emitted[r] = !0), it(u, e, 6, l);
		}
	}
	const Vr = new WeakMap();
	function ss(e, t, n = !1) {
		const o = n ? Vr : t.emitsCache,
			l = o.get(e);
		if (l !== void 0) return l;
		const s = e.emits;
		let i = {},
			r = !1;
		if (!se(e)) {
			const a = (u) => {
				const c = ss(u, t, !0);
				c && ((r = !0), De(i, c));
			};
			!n && t.mixins.length && t.mixins.forEach(a),
				e.extends && a(e.extends),
				e.mixins && e.mixins.forEach(a);
		}
		return !s && !r
			? (ge(e) && o.set(e, null), null)
			: (ne(s) ? s.forEach((a) => (i[a] = null)) : De(i, s), ge(e) && o.set(e, i), i);
	}
	function Jn(e, t) {
		return !e || !xn(t)
			? !1
			: ((t = t.slice(2).replace(/Once$/, "")),
			  me(e, t[0].toLowerCase() + t.slice(1)) || me(e, mt(t)) || me(e, t));
	}
	function Sd() {}
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
				setupState: g,
				ctx: w,
				inheritAttrs: S,
			} = e,
			N = Hn(e);
		let C, y;
		try {
			if (n.shapeFlag & 4) {
				const $ = l || o,
					x = $;
				(C = at(u.call(x, $, c, f, g, h, w))), (y = r);
			} else {
				const $ = t;
				(C = at($.length > 1 ? $(f, { attrs: r, slots: i, emit: a }) : $(f, null))),
					(y = t.props ? r : Br(r));
			}
		} catch ($) {
			(mn.length = 0), Vn($, e, 1), (C = we(wt));
		}
		let M = C;
		if (y && S !== !1) {
			const $ = Object.keys(y),
				{ shapeFlag: x } = M;
			$.length && x & 7 && (s && $.some(ao) && (y = Hr(y, s)), (M = Xt(M, y, !1, !0)));
		}
		return (
			n.dirs &&
				((M = Xt(M, null, !1, !0)), (M.dirs = M.dirs ? M.dirs.concat(n.dirs) : n.dirs)),
			n.transition && To(M, n.transition),
			(C = M),
			Hn(N),
			C
		);
	}
	const Br = (e) => {
			let t;
			for (const n in e)
				(n === "class" || n === "style" || xn(n)) && ((t || (t = {}))[n] = e[n]);
			return t;
		},
		Hr = (e, t) => {
			const n = {};
			for (const o in e) (!ao(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
			return n;
		};
	function qr(e, t, n) {
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
		return n === "style" && ge(o) && ge(l) ? !Vt(o, l) : o !== l;
	}
	function Ur({ vnode: e, parent: t }, n) {
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
	function Wr(e, t, n, o = !1) {
		const l = {},
			s = us();
		(e.propsDefaults = Object.create(null)), ds(e, t, l, s);
		for (const i in e.propsOptions[0]) i in l || (l[i] = void 0);
		n ? (e.props = o ? l : Ui(l)) : e.type.props ? (e.props = l) : (e.props = s),
			(e.attrs = s);
	}
	function Kr(e, t, n, o) {
		const {
				props: l,
				attrs: s,
				vnode: { patchFlag: i },
			} = e,
			r = fe(l),
			[a] = e.propsOptions;
		let u = !1;
		if ((o || i > 0) && !(i & 16)) {
			if (i & 8) {
				const c = e.vnode.dynamicProps;
				for (let f = 0; f < c.length; f++) {
					let h = c[f];
					if (Jn(e.emitsOptions, h)) continue;
					const g = t[h];
					if (a)
						if (me(s, h)) g !== s[h] && ((s[h] = g), (u = !0));
						else {
							const w = Ee(h);
							l[w] = Mo(a, r, w, g, e, !1);
						}
					else g !== s[h] && ((s[h] = g), (u = !0));
				}
			}
		} else {
			ds(e, t, l, s) && (u = !0);
			let c;
			for (const f in r)
				(!t || (!me(t, f) && ((c = mt(f)) === f || !me(t, c)))) &&
					(a
						? n &&
						  (n[f] !== void 0 || n[c] !== void 0) &&
						  (l[f] = Mo(a, r, f, void 0, e, !0))
						: delete l[f]);
			if (s !== r) for (const f in s) (!t || !me(t, f)) && (delete s[f], (u = !0));
		}
		u && ht(e.attrs, "set", "");
	}
	function ds(e, t, n, o) {
		const [l, s] = e.propsOptions;
		let i = !1,
			r;
		if (t)
			for (let a in t) {
				if (tn(a)) continue;
				const u = t[a];
				let c;
				l && me(l, (c = Ee(a)))
					? !s || !s.includes(c)
						? (n[c] = u)
						: ((r || (r = {}))[c] = u)
					: Jn(e.emitsOptions, a) ||
					  ((!(a in o) || u !== o[a]) && ((o[a] = u), (i = !0)));
			}
		if (s) {
			const a = fe(n),
				u = r || pe;
			for (let c = 0; c < s.length; c++) {
				const f = s[c];
				n[f] = Mo(l, a, f, u[f], e, !me(u, f));
			}
		}
		return i;
	}
	function Mo(e, t, n, o, l, s) {
		const i = e[n];
		if (i != null) {
			const r = me(i, "default");
			if (r && o === void 0) {
				const a = i.default;
				if (i.type !== Function && !i.skipFactory && se(a)) {
					const { propsDefaults: u } = l;
					if (n in u) o = u[n];
					else {
						const c = vn(l);
						(o = u[n] = a.call(null, t)), c();
					}
				} else o = a;
				l.ce && l.ce._setProp(n, o);
			}
			i[0] && (s && !r ? (o = !1) : i[1] && (o === "" || o === mt(n)) && (o = !0));
		}
		return o;
	}
	const zr = new WeakMap();
	function ps(e, t, n = !1) {
		const o = n ? zr : t.propsCache,
			l = o.get(e);
		if (l) return l;
		const s = e.props,
			i = {},
			r = [];
		let a = !1;
		if (!se(e)) {
			const c = (f) => {
				a = !0;
				const [h, g] = ps(f, t, !0);
				De(i, h), g && r.push(...g);
			};
			!n && t.mixins.length && t.mixins.forEach(c),
				e.extends && c(e.extends),
				e.mixins && e.mixins.forEach(c);
		}
		if (!s && !a) return ge(e) && o.set(e, It), It;
		if (ne(s))
			for (let c = 0; c < s.length; c++) {
				const f = Ee(s[c]);
				ms(f) && (i[f] = pe);
			}
		else if (s)
			for (const c in s) {
				const f = Ee(c);
				if (ms(f)) {
					const h = s[c],
						g = (i[f] = ne(h) || se(h) ? { type: h } : De({}, h)),
						w = g.type;
					let S = !1,
						N = !0;
					if (ne(w))
						for (let C = 0; C < w.length; ++C) {
							const y = w[C],
								M = se(y) && y.name;
							if (M === "Boolean") {
								S = !0;
								break;
							} else M === "String" && (N = !1);
						}
					else S = se(w) && w.name === "Boolean";
					(g[0] = S), (g[1] = N), (S || me(g, "default")) && r.push(f);
				}
			}
		const u = [i, r];
		return ge(e) && o.set(e, u), u;
	}
	function ms(e) {
		return e[0] !== "$" && !tn(e);
	}
	const Io = (e) => e === "_" || e === "_ctx" || e === "$stable",
		Lo = (e) => (ne(e) ? e.map(at) : [at(e)]),
		Yr = (e, t, n) => {
			if (t._n) return t;
			const o = Rt((...l) => Lo(t(...l)), n);
			return (o._c = !1), o;
		},
		hs = (e, t, n) => {
			const o = e._ctx;
			for (const l in e) {
				if (Io(l)) continue;
				const s = e[l];
				if (se(s)) t[l] = Yr(l, s, o);
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
		Jr = (e, t, n) => {
			const o = (e.slots = us());
			if (e.vnode.shapeFlag & 32) {
				const l = t._;
				l ? (vs(o, t, n), n && nl(o, "_", l, !0)) : hs(t, o);
			} else t && gs(e, t);
		},
		Xr = (e, t, n) => {
			const { vnode: o, slots: l } = e;
			let s = !0,
				i = pe;
			if (o.shapeFlag & 32) {
				const r = t._;
				r ? (n && r === 1 ? (s = !1) : vs(l, t, n)) : ((s = !t.$stable), hs(t, l)),
					(i = t);
			} else t && (gs(e, t), (i = { default: 1 }));
			if (s) for (const r in l) !Io(r) && i[r] == null && delete l[r];
		},
		Pe = ta;
	function Gr(e) {
		return Zr(e);
	}
	function Zr(e, t) {
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
				setScopeId: g = nt,
				insertStaticContent: w,
			} = e,
			S = (
				p,
				v,
				d,
				m = null,
				b = null,
				P = null,
				q = void 0,
				A = null,
				H = !!v.dynamicChildren
			) => {
				if (p === v) return;
				p && !gn(p, v) && ((m = Xe(p)), ke(p, b, P, !0), (p = null)),
					v.patchFlag === -2 && ((H = !1), (v.dynamicChildren = null));
				const { type: T, ref: D, shapeFlag: O } = v;
				switch (T) {
					case Xn:
						N(p, v, d, m);
						break;
					case wt:
						C(p, v, d, m);
						break;
					case Bo:
						p == null && y(v, d, m, q);
						break;
					case oe:
						re(p, v, d, m, b, P, q, A, H);
						break;
					default:
						O & 1
							? x(p, v, d, m, b, P, q, A, H)
							: O & 6
							? B(p, v, d, m, b, P, q, A, H)
							: (O & 64 || O & 128) && T.process(p, v, d, m, b, P, q, A, H, Ke);
				}
				D != null && b
					? fn(D, p && p.ref, P, v || p, !v)
					: D == null && p && p.ref != null && fn(p.ref, null, P, p, !0);
			},
			N = (p, v, d, m) => {
				if (p == null) o((v.el = r(v.children)), d, m);
				else {
					const b = (v.el = p.el);
					v.children !== p.children && u(b, v.children);
				}
			},
			C = (p, v, d, m) => {
				p == null ? o((v.el = a(v.children || "")), d, m) : (v.el = p.el);
			},
			y = (p, v, d, m) => {
				[p.el, p.anchor] = w(p.children, v, d, m, p.el, p.anchor);
			},
			M = ({ el: p, anchor: v }, d, m) => {
				let b;
				for (; p && p !== v; ) (b = h(p)), o(p, d, m), (p = b);
				o(v, d, m);
			},
			$ = ({ el: p, anchor: v }) => {
				let d;
				for (; p && p !== v; ) (d = h(p)), l(p), (p = d);
				l(v);
			},
			x = (p, v, d, m, b, P, q, A, H) => {
				if (
					(v.type === "svg" ? (q = "svg") : v.type === "math" && (q = "mathml"),
					p == null)
				)
					k(v, d, m, b, P, q, A, H);
				else {
					const T = p.el && p.el._isVueCE ? p.el : null;
					try {
						T && T._beginPatch(), V(p, v, b, P, q, A, H);
					} finally {
						T && T._endPatch();
					}
				}
			},
			k = (p, v, d, m, b, P, q, A) => {
				let H, T;
				const { props: D, shapeFlag: O, transition: E, dirs: K } = p;
				if (
					((H = p.el = i(p.type, P, D && D.is, D)),
					O & 8
						? c(H, p.children)
						: O & 16 && U(p.children, H, null, m, b, jo(p, P), q, A),
					K && Ot(p, null, m, "created"),
					L(H, p, p.scopeId, q, m),
					D)
				) {
					for (const ce in D) ce !== "value" && !tn(ce) && s(H, ce, null, D[ce], P, m);
					"value" in D && s(H, "value", null, D.value, P),
						(T = D.onVnodeBeforeMount) && ct(T, m, p);
				}
				K && Ot(p, null, m, "beforeMount");
				const Q = Qr(b, E);
				Q && E.beforeEnter(H),
					o(H, v, d),
					((T = D && D.onVnodeMounted) || Q || K) &&
						Pe(() => {
							T && ct(T, m, p), Q && E.enter(H), K && Ot(p, null, m, "mounted");
						}, b);
			},
			L = (p, v, d, m, b) => {
				if ((d && g(p, d), m)) for (let P = 0; P < m.length; P++) g(p, m[P]);
				if (b) {
					let P = b.subTree;
					if (v === P || (ws(P.type) && (P.ssContent === v || P.ssFallback === v))) {
						const q = b.vnode;
						L(p, q, q.scopeId, q.slotScopeIds, b.parent);
					}
				}
			},
			U = (p, v, d, m, b, P, q, A, H = 0) => {
				for (let T = H; T < p.length; T++) {
					const D = (p[T] = A ? xt(p[T]) : at(p[T]));
					S(null, D, v, d, m, b, P, q, A);
				}
			},
			V = (p, v, d, m, b, P, q) => {
				const A = (v.el = p.el);
				let { patchFlag: H, dynamicChildren: T, dirs: D } = v;
				H |= p.patchFlag & 16;
				const O = p.props || pe,
					E = v.props || pe;
				let K;
				if (
					(d && At(d, !1),
					(K = E.onVnodeBeforeUpdate) && ct(K, d, v, p),
					D && Ot(v, p, d, "beforeUpdate"),
					d && At(d, !0),
					((O.innerHTML && E.innerHTML == null) ||
						(O.textContent && E.textContent == null)) &&
						c(A, ""),
					T
						? z(p.dynamicChildren, T, A, d, m, jo(v, b), P)
						: q || ee(p, v, A, null, d, m, jo(v, b), P, !1),
					H > 0)
				) {
					if (H & 16) te(A, O, E, d, b);
					else if (
						(H & 2 && O.class !== E.class && s(A, "class", null, E.class, b),
						H & 4 && s(A, "style", O.style, E.style, b),
						H & 8)
					) {
						const Q = v.dynamicProps;
						for (let ce = 0; ce < Q.length; ce++) {
							const Z = Q[ce],
								ae = O[Z],
								ue = E[Z];
							(ue !== ae || Z === "value") && s(A, Z, ae, ue, b, d);
						}
					}
					H & 1 && p.children !== v.children && c(A, v.children);
				} else !q && T == null && te(A, O, E, d, b);
				((K = E.onVnodeUpdated) || D) &&
					Pe(() => {
						K && ct(K, d, v, p), D && Ot(v, p, d, "updated");
					}, m);
			},
			z = (p, v, d, m, b, P, q) => {
				for (let A = 0; A < v.length; A++) {
					const H = p[A],
						T = v[A],
						D =
							H.el && (H.type === oe || !gn(H, T) || H.shapeFlag & 198)
								? f(H.el)
								: d;
					S(H, T, D, null, m, b, P, q, !0);
				}
			},
			te = (p, v, d, m, b) => {
				if (v !== d) {
					if (v !== pe)
						for (const P in v) !tn(P) && !(P in d) && s(p, P, v[P], null, b, m);
					for (const P in d) {
						if (tn(P)) continue;
						const q = d[P],
							A = v[P];
						q !== A && P !== "value" && s(p, P, A, q, b, m);
					}
					"value" in d && s(p, "value", v.value, d.value, b);
				}
			},
			re = (p, v, d, m, b, P, q, A, H) => {
				const T = (v.el = p ? p.el : r("")),
					D = (v.anchor = p ? p.anchor : r(""));
				let { patchFlag: O, dynamicChildren: E, slotScopeIds: K } = v;
				K && (A = A ? A.concat(K) : K),
					p == null
						? (o(T, d, m), o(D, d, m), U(v.children || [], d, D, b, P, q, A, H))
						: O > 0 &&
						  O & 64 &&
						  E &&
						  p.dynamicChildren &&
						  p.dynamicChildren.length === E.length
						? (z(p.dynamicChildren, E, d, b, P, q, A),
						  (v.key != null || (b && v === b.subTree)) && Vo(p, v, !0))
						: ee(p, v, d, D, b, P, q, A, H);
			},
			B = (p, v, d, m, b, P, q, A, H) => {
				(v.slotScopeIds = A),
					p == null
						? v.shapeFlag & 512
							? b.ctx.activate(v, d, m, q, H)
							: I(v, d, m, b, P, q, H)
						: W(p, v, H);
			},
			I = (p, v, d, m, b, P, q) => {
				const A = (p.component = aa(p, m, b));
				if ((Kl(p) && (A.ctx.renderer = Ke), ca(A, !1, q), A.asyncDep)) {
					if ((b && b.registerDep(A, J, q), !p.el)) {
						const H = (A.subTree = we(wt));
						C(null, H, v, d), (p.placeholder = H.el);
					}
				} else J(A, p, v, d, b, P, q);
			},
			W = (p, v, d) => {
				const m = (v.component = p.component);
				if (qr(p, v, d))
					if (m.asyncDep && !m.asyncResolved) {
						Y(m, v, d);
						return;
					} else (m.next = v), m.update();
				else (v.el = p.el), (m.vnode = v);
			},
			J = (p, v, d, m, b, P, q) => {
				const A = () => {
					if (p.isMounted) {
						let { next: O, bu: E, u: K, parent: Q, vnode: ce } = p;
						{
							const dt = ys(p);
							if (dt) {
								O && ((O.el = ce.el), Y(p, O, q)),
									dt.asyncDep.then(() => {
										Pe(() => {
											p.isUnmounted || T();
										}, b);
									});
								return;
							}
						}
						let Z = O,
							ae;
						At(p, !1),
							O ? ((O.el = ce.el), Y(p, O, q)) : (O = ce),
							E && kn(E),
							(ae = O.props && O.props.onVnodeBeforeUpdate) && ct(ae, Q, O, ce),
							At(p, !0);
						const ue = is(p),
							qe = p.subTree;
						(p.subTree = ue),
							S(qe, ue, f(qe.el), Xe(qe), p, b, P),
							(O.el = ue.el),
							Z === null && Ur(p, ue.el),
							K && Pe(K, b),
							(ae = O.props && O.props.onVnodeUpdated) &&
								Pe(() => ct(ae, Q, O, ce), b);
					} else {
						let O;
						const { el: E, props: K } = v,
							{ bm: Q, m: ce, parent: Z, root: ae, type: ue } = p,
							qe = zt(v);
						At(p, !1),
							Q && kn(Q),
							!qe && (O = K && K.onVnodeBeforeMount) && ct(O, Z, v),
							At(p, !0);
						{
							ae.ce &&
								ae.ce._hasShadowRoot() &&
								ae.ce._injectChildStyle(ue, p.parent ? p.parent.type : void 0);
							const dt = (p.subTree = is(p));
							S(null, dt, d, m, p, b, P), (v.el = dt.el);
						}
						if ((ce && Pe(ce, b), !qe && (O = K && K.onVnodeMounted))) {
							const dt = v;
							Pe(() => ct(O, Z, dt), b);
						}
						(v.shapeFlag & 256 || (Z && zt(Z.vnode) && Z.vnode.shapeFlag & 256)) &&
							p.a &&
							Pe(p.a, b),
							(p.isMounted = !0),
							(v = d = m = null);
					}
				};
				p.scope.on();
				const H = (p.effect = new rl(A));
				p.scope.off();
				const T = (p.update = H.run.bind(H)),
					D = (p.job = H.runIfDirty.bind(H));
				(D.i = p), (D.id = p.uid), (H.scheduler = () => Co(D)), At(p, !0), T();
			},
			Y = (p, v, d) => {
				v.component = p;
				const m = p.vnode.props;
				(p.vnode = v),
					(p.next = null),
					Kr(p, v.props, m, d),
					Xr(p, v.children, d),
					ot(),
					El(p),
					lt();
			},
			ee = (p, v, d, m, b, P, q, A, H = !1) => {
				const T = p && p.children,
					D = p ? p.shapeFlag : 0,
					O = v.children,
					{ patchFlag: E, shapeFlag: K } = v;
				if (E > 0) {
					if (E & 128) {
						ve(T, O, d, m, b, P, q, A, H);
						return;
					} else if (E & 256) {
						de(T, O, d, m, b, P, q, A, H);
						return;
					}
				}
				K & 8
					? (D & 16 && Je(T, b, P), O !== T && c(d, O))
					: D & 16
					? K & 16
						? ve(T, O, d, m, b, P, q, A, H)
						: Je(T, b, P, !0)
					: (D & 8 && c(d, ""), K & 16 && U(O, d, m, b, P, q, A, H));
			},
			de = (p, v, d, m, b, P, q, A, H) => {
				(p = p || It), (v = v || It);
				const T = p.length,
					D = v.length,
					O = Math.min(T, D);
				let E;
				for (E = 0; E < O; E++) {
					const K = (v[E] = H ? xt(v[E]) : at(v[E]));
					S(p[E], K, d, null, b, P, q, A, H);
				}
				T > D ? Je(p, b, P, !0, !1, O) : U(v, d, m, b, P, q, A, H, O);
			},
			ve = (p, v, d, m, b, P, q, A, H) => {
				let T = 0;
				const D = v.length;
				let O = p.length - 1,
					E = D - 1;
				for (; T <= O && T <= E; ) {
					const K = p[T],
						Q = (v[T] = H ? xt(v[T]) : at(v[T]));
					if (gn(K, Q)) S(K, Q, d, null, b, P, q, A, H);
					else break;
					T++;
				}
				for (; T <= O && T <= E; ) {
					const K = p[O],
						Q = (v[E] = H ? xt(v[E]) : at(v[E]));
					if (gn(K, Q)) S(K, Q, d, null, b, P, q, A, H);
					else break;
					O--, E--;
				}
				if (T > O) {
					if (T <= E) {
						const K = E + 1,
							Q = K < D ? v[K].el : m;
						for (; T <= E; )
							S(null, (v[T] = H ? xt(v[T]) : at(v[T])), d, Q, b, P, q, A, H), T++;
					}
				} else if (T > E) for (; T <= O; ) ke(p[T], b, P, !0), T++;
				else {
					const K = T,
						Q = T,
						ce = new Map();
					for (T = Q; T <= E; T++) {
						const ze = (v[T] = H ? xt(v[T]) : at(v[T]));
						ze.key != null && ce.set(ze.key, T);
					}
					let Z,
						ae = 0;
					const ue = E - Q + 1;
					let qe = !1,
						dt = 0;
					const wn = new Array(ue);
					for (T = 0; T < ue; T++) wn[T] = 0;
					for (T = K; T <= O; T++) {
						const ze = p[T];
						if (ae >= ue) {
							ke(ze, b, P, !0);
							continue;
						}
						let pt;
						if (ze.key != null) pt = ce.get(ze.key);
						else
							for (Z = Q; Z <= E; Z++)
								if (wn[Z - Q] === 0 && gn(ze, v[Z])) {
									pt = Z;
									break;
								}
						pt === void 0
							? ke(ze, b, P, !0)
							: ((wn[pt - Q] = T + 1),
							  pt >= dt ? (dt = pt) : (qe = !0),
							  S(ze, v[pt], d, null, b, P, q, A, H),
							  ae++);
					}
					const ui = qe ? ea(wn) : It;
					for (Z = ui.length - 1, T = ue - 1; T >= 0; T--) {
						const ze = Q + T,
							pt = v[ze],
							fi = v[ze + 1],
							di = ze + 1 < D ? fi.el || _s(fi) : m;
						wn[T] === 0
							? S(null, pt, d, di, b, P, q, A, H)
							: qe && (Z < 0 || T !== ui[Z] ? Me(pt, d, di, 2) : Z--);
					}
				}
			},
			Me = (p, v, d, m, b = null) => {
				const { el: P, type: q, transition: A, children: H, shapeFlag: T } = p;
				if (T & 6) {
					Me(p.component.subTree, v, d, m);
					return;
				}
				if (T & 128) {
					p.suspense.move(v, d, m);
					return;
				}
				if (T & 64) {
					q.move(p, v, d, Ke);
					return;
				}
				if (q === oe) {
					o(P, v, d);
					for (let O = 0; O < H.length; O++) Me(H[O], v, d, m);
					o(p.anchor, v, d);
					return;
				}
				if (q === Bo) {
					M(p, v, d);
					return;
				}
				if (m !== 2 && T & 1 && A)
					if (m === 0) A.beforeEnter(P), o(P, v, d), Pe(() => A.enter(P), b);
					else {
						const { leave: O, delayLeave: E, afterLeave: K } = A,
							Q = () => {
								p.ctx.isUnmounted ? l(P) : o(P, v, d);
							},
							ce = () => {
								P._isLeaving && P[gr](!0),
									O(P, () => {
										Q(), K && K();
									});
							};
						E ? E(P, Q, ce) : ce();
					}
				else o(P, v, d);
			},
			ke = (p, v, d, m = !1, b = !1) => {
				const {
					type: P,
					props: q,
					ref: A,
					children: H,
					dynamicChildren: T,
					shapeFlag: D,
					patchFlag: O,
					dirs: E,
					cacheIndex: K,
				} = p;
				if (
					(O === -2 && (b = !1),
					A != null && (ot(), fn(A, null, d, p, !0), lt()),
					K != null && (v.renderCache[K] = void 0),
					D & 256)
				) {
					v.ctx.deactivate(p);
					return;
				}
				const Q = D & 1 && E,
					ce = !zt(p);
				let Z;
				if ((ce && (Z = q && q.onVnodeBeforeUnmount) && ct(Z, v, p), D & 6))
					He(p.component, d, m);
				else {
					if (D & 128) {
						p.suspense.unmount(d, m);
						return;
					}
					Q && Ot(p, null, v, "beforeUnmount"),
						D & 64
							? p.type.remove(p, v, d, Ke, m)
							: T && !T.hasOnce && (P !== oe || (O > 0 && O & 64))
							? Je(T, v, d, !1, !0)
							: ((P === oe && O & 384) || (!b && D & 16)) && Je(H, v, d),
						m && tt(p);
				}
				((ce && (Z = q && q.onVnodeUnmounted)) || Q) &&
					Pe(() => {
						Z && ct(Z, v, p), Q && Ot(p, null, v, "unmounted");
					}, d);
			},
			tt = (p) => {
				const { type: v, el: d, anchor: m, transition: b } = p;
				if (v === oe) {
					Fe(d, m);
					return;
				}
				if (v === Bo) {
					$(p);
					return;
				}
				const P = () => {
					l(d), b && !b.persisted && b.afterLeave && b.afterLeave();
				};
				if (p.shapeFlag & 1 && b && !b.persisted) {
					const { leave: q, delayLeave: A } = b,
						H = () => q(d, P);
					A ? A(p.el, P, H) : H();
				} else P();
			},
			Fe = (p, v) => {
				let d;
				for (; p !== v; ) (d = h(p)), l(p), (p = d);
				l(v);
			},
			He = (p, v, d) => {
				const { bum: m, scope: b, job: P, subTree: q, um: A, m: H, a: T } = p;
				bs(H),
					bs(T),
					m && kn(m),
					b.stop(),
					P && ((P.flags |= 8), ke(q, p, v, d)),
					A && Pe(A, v),
					Pe(() => {
						p.isUnmounted = !0;
					}, v);
			},
			Je = (p, v, d, m = !1, b = !1, P = 0) => {
				for (let q = P; q < p.length; q++) ke(p[q], v, d, m, b);
			},
			Xe = (p) => {
				if (p.shapeFlag & 6) return Xe(p.component.subTree);
				if (p.shapeFlag & 128) return p.suspense.next();
				const v = h(p.anchor || p.el),
					d = v && v[Il];
				return d ? h(d) : v;
			};
		let Ct = !1;
		const kt = (p, v, d) => {
				let m;
				p == null
					? v._vnode && (ke(v._vnode, null, null, !0), (m = v._vnode.component))
					: S(v._vnode || null, p, v, null, null, null, d),
					(v._vnode = p),
					Ct || ((Ct = !0), El(m), Rl(), (Ct = !1));
			},
			Ke = { p: S, um: ke, m: Me, r: tt, mt: I, mc: U, pc: ee, pbc: z, n: Xe, o: e };
		return { render: kt, hydrate: void 0, createApp: Ir(kt) };
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
	function At({ effect: e, job: t }, n) {
		n ? ((e.flags |= 32), (t.flags |= 4)) : ((e.flags &= -33), (t.flags &= -5));
	}
	function Qr(e, t) {
		return (!e || (e && !e.pendingBranch)) && t && !t.persisted;
	}
	function Vo(e, t, n = !1) {
		const o = e.children,
			l = t.children;
		if (ne(o) && ne(l))
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
	function ea(e) {
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
	function bs(e) {
		if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
	}
	function _s(e) {
		if (e.placeholder) return e.placeholder;
		const t = e.component;
		return t ? _s(t.subTree) : null;
	}
	const ws = (e) => e.__isSuspense;
	function ta(e, t) {
		t && t.pendingBranch ? (ne(e) ? t.effects.push(...e) : t.effects.push(e)) : cr(e);
	}
	const oe = Symbol.for("v-fgt"),
		Xn = Symbol.for("v-txt"),
		wt = Symbol.for("v-cmt"),
		Bo = Symbol.for("v-stc"),
		mn = [];
	let We = null;
	function _(e = !1) {
		mn.push((We = e ? null : []));
	}
	function na() {
		mn.pop(), (We = mn[mn.length - 1] || null);
	}
	let hn = 1;
	function xs(e, t = !1) {
		(hn += e), e < 0 && We && t && (We.hasOnce = !0);
	}
	function Ss(e) {
		return (e.dynamicChildren = hn > 0 ? We || It : null), na(), hn > 0 && We && We.push(e), e;
	}
	function F(e, t, n, o, l, s) {
		return Ss(j(e, t, n, o, l, s, !0));
	}
	function xe(e, t, n, o, l) {
		return Ss(we(e, t, n, o, l, !0));
	}
	function Ho(e) {
		return e ? e.__v_isVNode === !0 : !1;
	}
	function gn(e, t) {
		return e.type === t.type && e.key === t.key;
	}
	const $s = ({ key: e }) => e ?? null,
		Gn = ({ ref: e, ref_key: t, ref_for: n }) => (
			typeof e == "number" && (e = "" + e),
			e != null ? (be(e) || Se(e) || se(e) ? { i: Ne, r: e, k: t, f: !!n } : e) : null
		);
	function j(e, t = null, n = null, o = 0, l = null, s = e === oe ? 0 : 1, i = !1, r = !1) {
		const a = {
			__v_isVNode: !0,
			__v_skip: !0,
			type: e,
			props: t,
			key: t && $s(t),
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
			ctx: Ne,
		};
		return (
			r ? (qo(a, n), s & 128 && e.normalize(a)) : n && (a.shapeFlag |= be(n) ? 8 : 16),
			hn > 0 && !i && We && (a.patchFlag > 0 || s & 6) && a.patchFlag !== 32 && We.push(a),
			a
		);
	}
	const we = oa;
	function oa(e, t = null, n = null, o = 0, l = null, s = !1) {
		if (((!e || e === Yl) && (e = wt), Ho(e))) {
			const r = Xt(e, t, !0);
			return (
				n && qo(r, n),
				hn > 0 && !s && We && (r.shapeFlag & 6 ? (We[We.indexOf(e)] = r) : We.push(r)),
				(r.patchFlag = -2),
				r
			);
		}
		if ((ha(e) && (e = e.__vccOpts), t)) {
			t = la(t);
			let { class: r, style: a } = t;
			r && !be(r) && (t.class = Ie(r)),
				ge(a) && (Mn(a) && !ne(a) && (a = De({}, a)), (t.style = $e(a)));
		}
		const i = be(e) ? 1 : ws(e) ? 128 : mr(e) ? 64 : ge(e) ? 4 : se(e) ? 2 : 0;
		return j(e, t, n, o, l, i, s, !0);
	}
	function la(e) {
		return e ? (Mn(e) || fs(e) ? De({}, e) : e) : null;
	}
	function Xt(e, t, n = !1, o = !1) {
		const { props: l, ref: s, patchFlag: i, children: r, transition: a } = e,
			u = t ? sa(l || {}, t) : l,
			c = {
				__v_isVNode: !0,
				__v_skip: !0,
				type: e.type,
				props: u,
				key: u && $s(u),
				ref: t && t.ref ? (n && s ? (ne(s) ? s.concat(Gn(t)) : [s, Gn(t)]) : Gn(t)) : s,
				scopeId: e.scopeId,
				slotScopeIds: e.slotScopeIds,
				children: r,
				target: e.target,
				targetStart: e.targetStart,
				targetAnchor: e.targetAnchor,
				staticCount: e.staticCount,
				shapeFlag: e.shapeFlag,
				patchFlag: t && e.type !== oe ? (i === -1 ? 16 : i | 16) : i,
				dynamicProps: e.dynamicProps,
				dynamicChildren: e.dynamicChildren,
				appContext: e.appContext,
				dirs: e.dirs,
				transition: a,
				component: e.component,
				suspense: e.suspense,
				ssContent: e.ssContent && Xt(e.ssContent),
				ssFallback: e.ssFallback && Xt(e.ssFallback),
				placeholder: e.placeholder,
				el: e.el,
				anchor: e.anchor,
				ctx: e.ctx,
				ce: e.ce,
			};
		return a && o && To(c, a.clone(c)), c;
	}
	function Ye(e = " ", t = 0) {
		return we(Xn, null, e, t);
	}
	function le(e = "", t = !1) {
		return t ? (_(), xe(wt, null, e)) : we(wt, null, e);
	}
	function at(e) {
		return e == null || typeof e == "boolean"
			? we(wt)
			: ne(e)
			? we(oe, null, e.slice())
			: Ho(e)
			? xt(e)
			: we(Xn, null, String(e));
	}
	function xt(e) {
		return (e.el === null && e.patchFlag !== -1) || e.memo ? e : Xt(e);
	}
	function qo(e, t) {
		let n = 0;
		const { shapeFlag: o } = e;
		if (t == null) t = null;
		else if (ne(t)) n = 16;
		else if (typeof t == "object")
			if (o & 65) {
				const l = t.default;
				l && (l._c && (l._d = !1), qo(e, l()), l._c && (l._d = !0));
				return;
			} else {
				n = 32;
				const l = t._;
				!l && !fs(t)
					? (t._ctx = Ne)
					: l === 3 &&
					  Ne &&
					  (Ne.slots._ === 1 ? (t._ = 1) : ((t._ = 2), (e.patchFlag |= 1024)));
			}
		else
			se(t)
				? ((t = { default: t, _ctx: Ne }), (n = 32))
				: ((t = String(t)), o & 64 ? ((n = 16), (t = [Ye(t)])) : (n = 8));
		(e.children = t), (e.shapeFlag |= n);
	}
	function sa(...e) {
		const t = {};
		for (let n = 0; n < e.length; n++) {
			const o = e[n];
			for (const l in o)
				if (l === "class") t.class !== o.class && (t.class = Ie([t.class, o.class]));
				else if (l === "style") t.style = $e([t.style, o.style]);
				else if (xn(l)) {
					const s = t[l],
						i = o[l];
					i && s !== i && !(ne(s) && s.includes(i)) && (t[l] = s ? [].concat(s, i) : i);
				} else l !== "" && (t[l] = o[l]);
		}
		return t;
	}
	function ct(e, t, n, o = null) {
		it(e, t, 7, [n, o]);
	}
	const ia = os();
	let ra = 0;
	function aa(e, t, n) {
		const o = e.type,
			l = (t ? t.appContext : e.appContext) || ia,
			s = {
				uid: ra++,
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
				scope: new Si(!0),
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
				propsDefaults: pe,
				inheritAttrs: o.inheritAttrs,
				ctx: pe,
				data: pe,
				props: pe,
				attrs: pe,
				slots: pe,
				refs: pe,
				setupState: pe,
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
			(s.emit = jr.bind(null, s)),
			e.ce && e.ce(s),
			s
		);
	}
	let Ae = null;
	const Cs = () => Ae || Ne;
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
		(Zn = t("__VUE_INSTANCE_SETTERS__", (n) => (Ae = n))),
			(Uo = t("__VUE_SSR_SETTERS__", (n) => (yn = n)));
	}
	const vn = (e) => {
			const t = Ae;
			return (
				Zn(e),
				e.scope.on(),
				() => {
					e.scope.off(), Zn(t);
				}
			);
		},
		ks = () => {
			Ae && Ae.scope.off(), Zn(null);
		};
	function Fs(e) {
		return e.vnode.shapeFlag & 4;
	}
	let yn = !1;
	function ca(e, t = !1, n = !1) {
		t && Uo(t);
		const { props: o, children: l } = e.vnode,
			s = Fs(e);
		Wr(e, o, s, t), Jr(e, l, n || t);
		const i = s ? ua(e, t) : void 0;
		return t && Uo(!1), i;
	}
	function ua(e, t) {
		const n = e.type;
		(e.accessCache = Object.create(null)), (e.proxy = new Proxy(e.ctx, Nr));
		const { setup: o } = n;
		if (o) {
			ot();
			const l = (e.setupContext = o.length > 1 ? da(e) : null),
				s = vn(e),
				i = qt(o, e, 0, [e.props, l]),
				r = Qo(i);
			if ((lt(), s(), (r || e.sp) && !zt(e) && ql(e), r)) {
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
		se(t)
			? e.type.__ssrInlineRender
				? (e.ssrRender = t)
				: (e.render = t)
			: ge(t) && (e.setupState = Fl(t)),
			Ts(e);
	}
	function Ts(e, t, n) {
		const o = e.type;
		e.render || (e.render = o.render || nt);
		{
			const l = vn(e);
			ot();
			try {
				Er(e);
			} finally {
				lt(), l();
			}
		}
	}
	const fa = {
		get(e, t) {
			return Oe(e, "get", ""), e[t];
		},
	};
	function da(e) {
		const t = (n) => {
			e.exposed = n || {};
		};
		return { attrs: new Proxy(e.attrs, fa), slots: e.slots, emit: e.emit, expose: t };
	}
	function Qn(e) {
		return e.exposed
			? e.exposeProxy ||
					(e.exposeProxy = new Proxy(Fl(Wi(e.exposed)), {
						get(t, n) {
							if (n in t) return t[n];
							if (n in dn) return dn[n](e);
						},
						has(t, n) {
							return n in t || n in dn;
						},
					}))
			: e.proxy;
	}
	const pa = /(?:^|[-_])\w/g,
		ma = (e) => e.replace(pa, (t) => t.toUpperCase()).replace(/[-_]/g, "");
	function Ns(e, t = !0) {
		return se(e) ? e.displayName || e.name : e.name || (t && e.__name);
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
		return o ? ma(o) : n ? "App" : "Anonymous";
	}
	function ha(e) {
		return se(e) && "__vccOpts" in e;
	}
	const ie = (e, t) => er(e, t, yn),
		ga = "3.5.30";
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
		va = "http://www.w3.org/2000/svg",
		ya = "http://www.w3.org/1998/Math/MathML",
		St = typeof document < "u" ? document : null,
		Ps = St && St.createElement("template"),
		ba = {
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
						? St.createElementNS(va, e)
						: t === "mathml"
						? St.createElementNS(ya, e)
						: n
						? St.createElement(e, { is: n })
						: St.createElement(e);
				return (
					e === "select" &&
						o &&
						o.multiple != null &&
						l.setAttribute("multiple", o.multiple),
					l
				);
			},
			createText: (e) => St.createTextNode(e),
			createComment: (e) => St.createComment(e),
			setText: (e, t) => {
				e.nodeValue = t;
			},
			setElementText: (e, t) => {
				e.textContent = t;
			},
			parentNode: (e) => e.parentNode,
			nextSibling: (e) => e.nextSibling,
			querySelector: (e) => St.querySelector(e),
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
		_a = Symbol("_vtc");
	function wa(e, t, n) {
		const o = e[_a];
		o && (t = (t ? [t, ...o] : [...o]).join(" ")),
			t == null
				? e.removeAttribute("class")
				: n
				? e.setAttribute("class", t)
				: (e.className = t);
	}
	const eo = Symbol("_vod"),
		As = Symbol("_vsh"),
		xa = {
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
	const Sa = Symbol(""),
		$a = /(?:^|;)\s*display\s*:/;
	function Ca(e, t, n) {
		const o = e.style,
			l = be(n);
		let s = !1;
		if (n && !l) {
			if (t)
				if (be(t))
					for (const i of t.split(";")) {
						const r = i.slice(0, i.indexOf(":")).trim();
						n[r] == null && to(o, r, "");
					}
				else for (const i in t) n[i] == null && to(o, i, "");
			for (const i in n) i === "display" && (s = !0), to(o, i, n[i]);
		} else if (l) {
			if (t !== n) {
				const i = o[Sa];
				i && (n += ";" + i), (o.cssText = n), (s = $a.test(n));
			}
		} else t && e.removeAttribute("style");
		eo in e && ((e[eo] = s ? o.display : ""), e[As] && (o.display = "none"));
	}
	const Ms = /\s*!important$/;
	function to(e, t, n) {
		if (ne(n)) n.forEach((o) => to(e, t, o));
		else if ((n == null && (n = ""), t.startsWith("--"))) e.setProperty(t, n);
		else {
			const o = ka(e, t);
			Ms.test(n) ? e.setProperty(mt(o), n.replace(Ms, ""), "important") : (e[o] = n);
		}
	}
	const Is = ["Webkit", "Moz", "ms"],
		Ko = {};
	function ka(e, t) {
		const n = Ko[t];
		if (n) return n;
		let o = Ee(t);
		if (o !== "filter" && o in e) return (Ko[t] = o);
		o = Cn(o);
		for (let l = 0; l < Is.length; l++) {
			const s = Is[l] + o;
			if (s in e) return (Ko[t] = s);
		}
		return t;
	}
	const Ls = "http://www.w3.org/1999/xlink";
	function js(e, t, n, o, l, s = wi(t)) {
		o && t.startsWith("xlink:")
			? n == null
				? e.removeAttributeNS(Ls, t.slice(6, t.length))
				: e.setAttributeNS(Ls, t, n)
			: n == null || (s && !ll(n))
			? e.removeAttribute(t)
			: e.setAttribute(t, s ? "" : Ge(n) ? String(n) : n);
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
	function Dt(e, t, n, o) {
		e.addEventListener(t, n, o);
	}
	function Fa(e, t, n, o) {
		e.removeEventListener(t, n, o);
	}
	const Bs = Symbol("_vei");
	function Da(e, t, n, o, l = null) {
		const s = e[Bs] || (e[Bs] = {}),
			i = s[t];
		if (o && i) i.value = o;
		else {
			const [r, a] = Ta(t);
			if (o) {
				const u = (s[t] = Ra(o, l));
				Dt(e, r, u, a);
			} else i && (Fa(e, r, i, a), (s[t] = void 0));
		}
	}
	const Hs = /(?:Once|Passive|Capture)$/;
	function Ta(e) {
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
	const Na = Promise.resolve(),
		Ea = () => zo || (Na.then(() => (zo = 0)), (zo = Date.now()));
	function Ra(e, t) {
		const n = (o) => {
			if (!o._vts) o._vts = Date.now();
			else if (o._vts <= n.attached) return;
			it(Oa(o, n.value), t, 5, [o]);
		};
		return (n.value = e), (n.attached = Ea()), n;
	}
	function Oa(e, t) {
		if (ne(t)) {
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
		Pa = (e, t, n, o, l, s) => {
			const i = l === "svg";
			t === "class"
				? wa(e, o, i)
				: t === "style"
				? Ca(e, n, o)
				: xn(t)
				? ao(t) || Da(e, t, n, o, s)
				: (
						t[0] === "."
							? ((t = t.slice(1)), !0)
							: t[0] === "^"
							? ((t = t.slice(1)), !1)
							: Aa(e, t, o, i)
				  )
				? (Vs(e, t, o),
				  !e.tagName.includes("-") &&
						(t === "value" || t === "checked" || t === "selected") &&
						js(e, t, o, i, s, t !== "value"))
				: e._isVueCE && (Ma(e, t) || (e._def.__asyncLoader && (/[A-Z]/.test(t) || !be(o))))
				? Vs(e, Ee(t), o, s, t)
				: (t === "true-value"
						? (e._trueValue = o)
						: t === "false-value" && (e._falseValue = o),
				  js(e, t, o, i));
		};
	function Aa(e, t, n, o) {
		if (o) return !!(t === "innerHTML" || t === "textContent" || (t in e && qs(t) && se(n)));
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
		return qs(t) && be(n) ? !1 : t in e;
	}
	function Ma(e, t) {
		const n = e._def.props;
		if (!n) return !1;
		const o = Ee(t);
		return Array.isArray(n)
			? n.some((l) => Ee(l) === o)
			: Object.keys(n).some((l) => Ee(l) === o);
	}
	const Gt = (e) => {
		const t = e.props["onUpdate:modelValue"] || !1;
		return ne(t) ? (n) => kn(t, n) : t;
	};
	function Ia(e) {
		e.target.composing = !0;
	}
	function Us(e) {
		const t = e.target;
		t.composing && ((t.composing = !1), t.dispatchEvent(new Event("input")));
	}
	const $t = Symbol("_assign");
	function Ws(e, t, n) {
		return t && (e = e.trim()), n && (e = Fn(e)), e;
	}
	const Mt = {
			created(e, { modifiers: { lazy: t, trim: n, number: o } }, l) {
				e[$t] = Gt(l);
				const s = o || (l.props && l.props.type === "number");
				Dt(e, t ? "change" : "input", (i) => {
					i.target.composing || e[$t](Ws(e.value, n, s));
				}),
					(n || s) &&
						Dt(e, "change", () => {
							e.value = Ws(e.value, n, s);
						}),
					t ||
						(Dt(e, "compositionstart", Ia),
						Dt(e, "compositionend", Us),
						Dt(e, "change", Us));
			},
			mounted(e, { value: t }) {
				e.value = t ?? "";
			},
			beforeUpdate(
				e,
				{ value: t, oldValue: n, modifiers: { lazy: o, trim: l, number: s } },
				i
			) {
				if (((e[$t] = Gt(i)), e.composing)) return;
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
		La = {
			deep: !0,
			created(e, t, n) {
				(e[$t] = Gt(n)),
					Dt(e, "change", () => {
						const o = e._modelValue,
							l = _n(e),
							s = e.checked,
							i = e[$t];
						if (ne(o)) {
							const r = fo(o, l),
								a = r !== -1;
							if (s && !a) i(o.concat(l));
							else if (!s && a) {
								const u = [...o];
								u.splice(r, 1), i(u);
							}
						} else if (jt(o)) {
							const r = new Set(o);
							s ? r.add(l) : r.delete(l), i(r);
						} else i(Js(e, s));
					});
			},
			mounted: Ks,
			beforeUpdate(e, t, n) {
				(e[$t] = Gt(n)), Ks(e, t, n);
			},
		};
	function Ks(e, { value: t, oldValue: n }, o) {
		e._modelValue = t;
		let l;
		if (ne(t)) l = fo(t, o.props.value) > -1;
		else if (jt(t)) l = t.has(o.props.value);
		else {
			if (t === n) return;
			l = Vt(t, Js(e, !0));
		}
		e.checked !== l && (e.checked = l);
	}
	const zs = {
		deep: !0,
		created(e, { value: t, modifiers: { number: n } }, o) {
			const l = jt(t);
			Dt(e, "change", () => {
				const s = Array.prototype.filter
					.call(e.options, (i) => i.selected)
					.map((i) => (n ? Fn(_n(i)) : _n(i)));
				e[$t](e.multiple ? (l ? new Set(s) : s) : s[0]),
					(e._assigning = !0),
					bt(() => {
						e._assigning = !1;
					});
			}),
				(e[$t] = Gt(o));
		},
		mounted(e, { value: t }) {
			Ys(e, t);
		},
		beforeUpdate(e, t, n) {
			e[$t] = Gt(n);
		},
		updated(e, { value: t }) {
			e._assigning || Ys(e, t);
		},
	};
	function Ys(e, t) {
		const n = e.multiple,
			o = ne(t);
		if (!(n && !o && !jt(t))) {
			for (let l = 0, s = e.options.length; l < s; l++) {
				const i = e.options[l],
					r = _n(i);
				if (n)
					if (o) {
						const a = typeof r;
						a === "string" || a === "number"
							? (i.selected = t.some((u) => String(u) === String(r)))
							: (i.selected = fo(t, r) > -1);
					} else i.selected = t.has(r);
				else if (Vt(_n(i), t)) {
					e.selectedIndex !== l && (e.selectedIndex = l);
					return;
				}
			}
			!n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
		}
	}
	function _n(e) {
		return "_value" in e ? e._value : e.value;
	}
	function Js(e, t) {
		const n = t ? "_trueValue" : "_falseValue";
		return n in e ? e[n] : t;
	}
	const ja = ["ctrl", "shift", "alt", "meta"],
		Va = {
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
			exact: (e, t) => ja.some((n) => e[`${n}Key`] && !t.includes(n)),
		},
		Ce = (e, t) => {
			if (!e) return e;
			const n = e._withMods || (e._withMods = {}),
				o = t.join(".");
			return (
				n[o] ||
				(n[o] = (l, ...s) => {
					for (let i = 0; i < t.length; i++) {
						const r = Va[t[i]];
						if (r && r(l, t)) return;
					}
					return e(l, ...s);
				})
			);
		},
		Ba = {
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
					if (t.some((i) => i === s || Ba[i] === s)) return e(l);
				})
			);
		},
		Ha = De({ patchProp: Pa }, ba);
	let Xs;
	function qa() {
		return Xs || (Xs = Gr(Ha));
	}
	const Ua = (...e) => {
		const t = qa().createApp(...e),
			{ mount: n } = t;
		return (
			(t.mount = (o) => {
				const l = Ka(o);
				if (!l) return;
				const s = t._component;
				!se(s) && !s.render && !s.template && (s.template = l.innerHTML),
					l.nodeType === 1 && (l.textContent = "");
				const i = n(l, !1, Wa(l));
				return (
					l instanceof Element &&
						(l.removeAttribute("v-cloak"), l.setAttribute("data-v-app", "")),
					i
				);
			}),
			t
		);
	};
	function Wa(e) {
		if (e instanceof SVGElement) return "svg";
		if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
	}
	function Ka(e) {
		return be(e) ? document.querySelector(e) : e;
	}
	function za() {
		const e = Te([]);
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
	function Ya(e) {
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
	function Ja({ openPanels: e, showFormDialog: t, sourcePanelId: n, docName: o }) {
		const l = ie(() => {
				if (!R(t) || R(n) == null || !R(o))
					return { canPrev: !1, canNext: !1, index: -1, total: 0 };
				const a = e.find((h) => h.id === R(n));
				if (!a) return { canPrev: !1, canNext: !1, index: -1, total: 0 };
				const u = oo(a),
					c = u.findIndex((h) => h && h.name === R(o)),
					f = u.length;
				return { canPrev: c > 0, canNext: c >= 0 && c < f - 1, index: c, total: f };
			}),
			s = ie(() => {
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
	function Xa(e) {
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
			{ formDialogNavInfo: g, formDialogNavLabel: w } = Ja({
				openPanels: e,
				showFormDialog: t,
				sourcePanelId: s,
				docName: n,
			});
		function S(V, z) {
			var re, B;
			if (
				!((re = V == null ? void 0 : V.config) != null && re.form_dialog) ||
				!(z != null && z.name)
			)
				return !1;
			(o.value = V.config.form_dialog),
				(l.value = V.doctype),
				(n.value = z.name),
				(s.value = V.id);
			const te = (B = V.config) == null ? void 0 : B.required_fields;
			return (i.value = Array.isArray(te) ? te.slice() : []), (t.value = !0), !0;
		}
		function N() {
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
		function C() {
			const V = l.value;
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
			const z = e.find((te) => te.doctype === V);
			z && z._reload && z._reload();
		}
		function y() {
			return e.find((V) => V.id === s.value);
		}
		function M(V) {
			const z = oo(y()),
				te = z.findIndex((B) => B && B.name === n.value);
			if (te < 0) return null;
			const re = te + (V === "prev" ? -1 : 1);
			return re < 0 || re >= z.length ? null : z[re].name;
		}
		function $(V) {
			const z = M(V);
			z && ((a.value = z), (u.value = o.value), (c.value = l.value));
		}
		function x() {
			(f.value = !0), (h.value = 1);
			const V = performance.now(),
				z = 300;
			function te(re) {
				const B = re - V,
					I = Math.min(B / z, 1);
				(h.value = 1 - I * I),
					I < 1
						? requestAnimationFrame(te)
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
			requestAnimationFrame(te);
		}
		function k() {
			g.value.canPrev && ($("prev"), setTimeout(x, 300));
		}
		function L() {
			g.value.canNext && ($("next"), setTimeout(x, 300));
		}
		function U() {
			const V = l.value;
			if (!V) return;
			const z = e.find((te) => te.doctype === V);
			z && z._reload && z._reload();
		}
		return {
			showFormDialog: t,
			formDialogDocName: n,
			formDialogDefinition: o,
			formDialogDoctype: l,
			formDialogRequiredFields: i,
			formDialogSourcePanelId: s,
			formDialogNavInfo: g,
			formDialogNavLabel: w,
			onFormDialogNavPrev: k,
			onFormDialogNavNext: L,
			openFormDialogFromPanelRow: S,
			onFormDialogClose: N,
			onFormDialogSaved: C,
			reloadPanelForFormDialogDoctype: U,
			formDialogSlot: r,
			formDialogPendingDocName: a,
			formDialogPendingDefinition: u,
			formDialogPendingDoctype: c,
			formDialogDissolving: f,
			formDialogDissolveOpacity: h,
		};
	}
	function ut(e, t) {
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
		const n = Cl(null),
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
		function g() {
			return ut("nce_events.api.panel_api.get_panel_config", { root_doctype: e });
		}
		function w(x = {}) {
			return ut("nce_events.api.panel_api.get_panel_data", {
				root_doctype: e,
				filters: JSON.stringify({ ...t, ...x }),
			});
		}
		function S(x) {
			if (!x) return x;
			const k = String(x).trim().toLowerCase();
			if (k === "today") {
				const V = new Date();
				return V.setHours(0, 0, 0, 0), V.toISOString().slice(0, 10);
			}
			const L = k.match(/^(\d+)\s+(day|month|year)s?\s+ago$/);
			if (L) {
				const V = parseInt(L[1], 10),
					z = L[2],
					te = new Date();
				return (
					te.setHours(0, 0, 0, 0),
					z === "day" && te.setDate(te.getDate() - V),
					z === "month" && te.setMonth(te.getMonth() - V),
					z === "year" && te.setFullYear(te.getFullYear() - V),
					te.toISOString().slice(0, 10)
				);
			}
			const U = k.match(
				/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/
			);
			if (U) {
				const V = U[1] === "-" ? -1 : 1,
					z = parseInt(U[2], 10) * V,
					te = U[3],
					re = new Date();
				return (
					re.setHours(0, 0, 0, 0),
					te === "day" && re.setDate(re.getDate() + z),
					te === "month" && re.setMonth(re.getMonth() + z),
					te === "year" && re.setFullYear(re.getFullYear() + z),
					re.toISOString().slice(0, 10)
				);
			}
			if (/^(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))$/.test(k)) {
				const V = new Date();
				return V.setHours(0, 0, 0, 0), V.toISOString().slice(0, 10);
			}
			return x;
		}
		function N(x, k) {
			return k.length
				? x.filter((L) => {
						for (const U of k) {
							if (!U.field) continue;
							const V = L[U.field],
								z = U.value;
							if (V == null) {
								if (U.op !== "!=") return !1;
								continue;
							}
							const te = String(V).trim(),
								re = String(S(z) ?? "").trim(),
								B = /^\d{4}-\d{2}-\d{2}/;
							if (B.test(te) && B.test(re)) {
								const de = te.slice(0, 10),
									ve = re.slice(0, 10);
								switch (U.op) {
									case "=":
										if (de !== ve) return !1;
										break;
									case "!=":
										if (de === ve) return !1;
										break;
									case ">":
										if (!(de > ve)) return !1;
										break;
									case "<":
										if (!(de < ve)) return !1;
										break;
									case ">=":
										if (!(de >= ve)) return !1;
										break;
									case "<=":
										if (!(de <= ve)) return !1;
										break;
									default:
										if (de !== ve) return !1;
								}
								continue;
							}
							const I = te.toLowerCase(),
								W = re.toLowerCase(),
								J = parseFloat(te),
								Y = parseFloat(re),
								ee = !isNaN(J) && !isNaN(Y);
							switch (U.op) {
								case "=":
									if (I !== W) return !1;
									break;
								case "!=":
									if (I === W) return !1;
									break;
								case ">":
									if (ee ? J <= Y : I <= W) return !1;
									break;
								case "<":
									if (ee ? J >= Y : I >= W) return !1;
									break;
								case ">=":
									if (ee ? J < Y : I < W) return !1;
									break;
								case "<=":
									if (ee ? J > Y : I > W) return !1;
									break;
								case "like":
									if (!I.includes(W)) return !1;
									break;
								case "in": {
									if (
										!W.split(",")
											.map((ve) => ve.trim())
											.includes(I)
									)
										return !1;
									break;
								}
								default:
									if (I !== W) return !1;
							}
						}
						return !0;
				  })
				: x;
		}
		function C() {
			const x = f.value.filter((L) => L.field && String(L.value ?? "") !== ""),
				k = x.length > 0 ? x : c;
			(l.value = N(u.value, k)), (s.value = l.value.length);
		}
		async function y() {
			const x = ++h;
			(r.value = !0), (a.value = null);
			try {
				const [k, L] = await Promise.all([g(), w()]);
				if (x !== h) return;
				(n.value = k),
					(o.value = L.columns || []),
					(u.value = L.rows || []),
					(c = L.default_filters || []),
					C(),
					(i.value = L.full_count ?? 0),
					(r.value = !1);
			} catch (k) {
				if (x !== h) return;
				(a.value = String(k)),
					console.error(`Panel load error [${e}]:`, k),
					(r.value = !1);
			}
		}
		async function M() {
			const x = ++h;
			(r.value = !0), (a.value = null);
			try {
				const [k, L] = await Promise.all([g(), w()]);
				if (x !== h) return;
				(n.value = k),
					(o.value = L.columns || []),
					(u.value = L.rows || []),
					(c = L.default_filters || []),
					C(),
					(i.value = L.full_count ?? 0),
					(r.value = !1);
			} catch (k) {
				if (x !== h) return;
				(a.value = String(k)),
					console.error(`Panel reload error [${e}]:`, k),
					(r.value = !1);
			}
		}
		function $(x = []) {
			(f.value = x), C();
		}
		return {
			config: n,
			columns: o,
			rows: l,
			total: s,
			fullTotal: i,
			loading: r,
			error: a,
			load: y,
			reload: M,
			setFilters: $,
		};
	}
	let ft = null;
	function Zs(e, t) {
		const n = e.config;
		if (!n) return;
		if (!(t === "sms" ? n.sms_field : n.email_field)) {
			frappe.msgprint(
				__("No {0} field configured for this panel.", [t === "sms" ? "SMS" : "Email"])
			);
			return;
		}
		const l = e._panelRows || e.rows;
		if (!l.length) {
			frappe.msgprint(__("No rows."));
			return;
		}
		ft && (ft.close(), (ft = null)),
			frappe.require(
				[
					"/assets/nce_events/js/js_dialogs/ai_tools.js",
					"/assets/nce_events/js/js_dialogs/sms_dialog.js",
					"/assets/nce_events/js/js_dialogs/email_dialog.js",
					"/assets/nce_events/css/panel_page.css",
				],
				() => {
					const s =
						t === "sms"
							? nce_events.panel_page.SmsDialog
							: nce_events.panel_page.EmailDialog;
					ft = new s({
						doctype: e.doctype,
						config: n,
						row_names: l.map((i) => i.name),
						row_count: l.length,
						z_index: 9999,
						init_left: (e.x || 40) + 60,
						init_top: (e.y || 60) + 20,
						on_close() {
							ft = null;
						},
					});
				}
			);
	}
	function Qs(e, t, n) {
		const o = e.config;
		!o ||
			!(t === "sms" ? o.sms_field : o.email_field) ||
			(ft && (ft.close(), (ft = null)),
			frappe.require(
				[
					"/assets/nce_events/js/js_dialogs/ai_tools.js",
					"/assets/nce_events/js/js_dialogs/sms_dialog.js",
					"/assets/nce_events/js/js_dialogs/email_dialog.js",
					"/assets/nce_events/css/panel_page.css",
				],
				() => {
					const s =
						t === "sms"
							? nce_events.panel_page.SmsDialog
							: nce_events.panel_page.EmailDialog;
					ft = new s({
						doctype: e.doctype,
						config: o,
						row_names: [n.name],
						row_count: 1,
						z_index: 9999,
						init_left: (e.x || 40) + 60,
						init_top: (e.y || 60) + 20,
						on_close() {
							ft = null;
						},
					});
				}
			));
	}
	function Ga() {
		return {
			onEmail(e) {
				Zs(e, "email");
			},
			onSms(e) {
				Zs(e, "sms");
			},
			onEmailOne(e, t) {
				Qs(e, "email", t);
			},
			onSmsOne(e, t) {
				Qs(e, "sms", t);
			},
		};
	}
	const _e = (e, t) => {
			const n = e.__vccOpts || e;
			for (const [o, l] of t) n[o] = l;
			return n;
		},
		Za = { class: "ppv2-float-body" };
	let Qa = 100;
	function ei() {
		return ++Qa;
	}
	const ti = _e(
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
						r = X(ei()),
						a = X(null),
						u = ie(() => ({
							transform: `translate3d(${o.value}px, ${l.value}px, 0)`,
							width: s.value + "px",
							height: i.value + "px",
							zIndex: r.value,
						}));
					function c() {
						r.value = ei();
					}
					function f(w) {
						const S = document.createElement("div");
						return (
							(S.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;cursor:${w};`),
							document.body.appendChild(S),
							S
						);
					}
					function h(w) {
						const S = w.clientX,
							N = w.clientY,
							C = o.value,
							y = l.value,
							M = a.value,
							$ = f("move");
						function x(L) {
							const U = C + L.clientX - S,
								V = Math.max(0, y + L.clientY - N);
							M.style.transform = `translate3d(${U}px, ${V}px, 0)`;
						}
						function k(L) {
							document.body.removeChild($);
							const U = Math.abs(L.clientX - S),
								V = Math.abs(L.clientY - N);
							U < 10 && V < 10 && c(),
								(o.value = C + L.clientX - S),
								(l.value = Math.max(0, y + L.clientY - N)),
								document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", k);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", k);
					}
					function g(w) {
						c();
						const S = w.clientX,
							N = w.clientY,
							C = s.value,
							y = i.value,
							M = a.value,
							$ = f("nwse-resize"),
							x = M.getBoundingClientRect(),
							k = document.createElement("div");
						(k.style.cssText = `position:fixed;left:${x.left}px;top:${x.top}px;width:${C}px;height:${y}px;border:1px solid var(--bg-header, #4a5568);z-index:999998;pointer-events:none;box-sizing:border-box;`),
							document.body.appendChild(k);
						function L(V) {
							(k.style.width = Math.max(300, C + V.clientX - S) + "px"),
								(k.style.height = Math.max(200, y + V.clientY - N) + "px");
						}
						function U(V) {
							document.body.removeChild($),
								document.body.removeChild(k),
								(s.value = Math.max(300, C + V.clientX - S)),
								(i.value = Math.max(200, y + V.clientY - N)),
								document.removeEventListener("mousemove", L),
								document.removeEventListener("mouseup", U);
						}
						document.addEventListener("mousemove", L),
							document.addEventListener("mouseup", U);
					}
					return (w, S) => (
						_(),
						F(
							"div",
							{
								ref_key: "floatEl",
								ref: a,
								class: "ppv2-float",
								style: $e(u.value),
							},
							[
								j(
									"div",
									{
										class: "ppv2-float-header",
										onMousedown: Ce(h, ["prevent"]),
									},
									[Eo(w.$slots, "header", {}, void 0)],
									32
								),
								j("div", Za, [Eo(w.$slots, "default", {}, void 0)]),
								j(
									"div",
									{
										class: "ppv2-float-footer",
										onMousedown: Ce(h, ["prevent"]),
									},
									[Eo(w.$slots, "footer", {}, void 0)],
									32
								),
								j(
									"div",
									{
										class: "ppv2-resize-handle",
										onMousedown: Ce(g, ["prevent"]),
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
		ec = { key: 0, class: "ppv2-filter-widget" },
		tc = ["onUpdate:modelValue", "onChange"],
		nc = ["value"],
		oc = { key: 0, class: "ppv2-filter-ops" },
		lc = ["onClick"],
		sc = ["value", "onInput"],
		ic = ["value", "onInput"],
		rc = ["onUpdate:modelValue"],
		ac = ["onClick"],
		cc = _e(
			{
				__name: "PanelTableFilterBar",
				props: {
					columns: { type: Array, default: () => [] },
					defaultFilters: { type: Array, default: () => [] },
					showFilter: { type: Boolean, default: !1 },
				},
				emits: ["filter-change", "show-filter"],
				setup(e, { emit: t }) {
					const n = e,
						o = t,
						l = ["=", "!=", ">", "<", ">=", "<=", "like", "in"],
						s = ["=", ">", "<"],
						i = Te([]);
					let r = null;
					const a = new Set(["Date", "Datetime"]);
					function u(y) {
						return n.columns.find((M) => M.fieldname === y) || null;
					}
					function c(y) {
						if (!y) return !1;
						const M = u(y);
						return M && M.fieldtype
							? a.has(M.fieldtype)
							: /date|_at$/.test(y.toLowerCase());
					}
					function f(y) {
						return c(y.field) ? s : l;
					}
					function h(y) {
						(y.value = ""),
							(y._sqlDate = ""),
							(y._daysAgo = ""),
							c(y.field) && !s.includes(y.op) && (y.op = ">"),
							!c(y.field) && !l.includes(y.op) && (y.op = "=");
					}
					function g(y, M) {
						(y._sqlDate = M), (y._daysAgo = ""), (y.value = M);
					}
					function w(y, M) {
						(y._daysAgo = M), (y._sqlDate = ""), (y.value = M ? M + " days ago" : "");
					}
					Be(
						() => n.defaultFilters,
						(y) => {
							!y ||
								!y.length ||
								i.some(($) => $.field && String($.value ?? "") !== "") ||
								(i.splice(
									0,
									i.length,
									...y.map(($) => {
										let x = "",
											k = "";
										return (
											$.value &&
												(/days ago|month|today/i.test($.value)
													? (k = $.value
															.replace(/\s*days ago$/i, "")
															.trim())
													: (x = $.value)),
											{
												field: $.field,
												op: $.op,
												value: $.value,
												_sqlDate: x,
												_daysAgo: k,
											}
										);
									})
								),
								o("show-filter", !0),
								N());
						},
						{ immediate: !0 }
					);
					function S() {
						return i
							.filter((y) => y.field && String(y.value || "") !== "")
							.map((y) => ({ field: y.field, op: y.op, value: y.value }));
					}
					function N() {
						r && clearTimeout(r), o("filter-change", S());
					}
					function C() {
						r && clearTimeout(r),
							(r = setTimeout(() => o("filter-change", S()), 1200));
					}
					return (y, M) =>
						n.showFilter
							? (_(),
							  F("div", ec, [
									(_(!0),
									F(
										oe,
										null,
										he(
											i,
											($, x) => (
												_(),
												F("div", { key: x, class: "ppv2-filter-row" }, [
													et(
														j(
															"select",
															{
																"onUpdate:modelValue": (k) =>
																	($.field = k),
																class: "ppv2-filter-col",
																onChange: (k) => {
																	h($), N();
																},
															},
															[
																M[1] ||
																	(M[1] = j(
																		"option",
																		{ value: "" },
																		"— column —",
																		-1
																	)),
																(_(!0),
																F(
																	oe,
																	null,
																	he(
																		e.columns,
																		(k) => (
																			_(),
																			F(
																				"option",
																				{
																					key: k.fieldname,
																					value: k.fieldname,
																				},
																				G(k.label),
																				9,
																				nc
																			)
																		)
																	),
																	128
																)),
															],
															40,
															tc
														),
														[[zs, $.field]]
													),
													$.field
														? (_(),
														  F("span", oc, [
																(_(!0),
																F(
																	oe,
																	null,
																	he(
																		f($),
																		(k) => (
																			_(),
																			F(
																				"button",
																				{
																					key: k,
																					class: Ie([
																						"ppv2-op-btn",
																						{
																							active:
																								$.op ===
																								k,
																						},
																					]),
																					onClick: (
																						L
																					) => {
																						($.op = k),
																							N();
																					},
																				},
																				G(k),
																				11,
																				lc
																			)
																		)
																	),
																	128
																)),
														  ]))
														: le("", !0),
													$.field && c($.field)
														? (_(),
														  F(
																oe,
																{ key: 1 },
																[
																	j(
																		"input",
																		{
																			value:
																				$._sqlDate || "",
																			class: "ppv2-filter-val",
																			placeholder:
																				"Enter a SQL date e.g. 1950-06-08",
																			onInput: (k) => {
																				g(
																					$,
																					k.target.value
																				),
																					C();
																			},
																		},
																		null,
																		40,
																		sc
																	),
																	j(
																		"input",
																		{
																			value:
																				$._daysAgo || "",
																			class: "ppv2-filter-val",
																			placeholder:
																				"OR enter days ago e.g. 30",
																			onInput: (k) => {
																				w(
																					$,
																					k.target.value
																				),
																					C();
																			},
																		},
																		null,
																		40,
																		ic
																	),
																],
																64
														  ))
														: $.field
														? et(
																(_(),
																F(
																	"input",
																	{
																		key: 2,
																		"onUpdate:modelValue": (
																			k
																		) => ($.value = k),
																		class: "ppv2-filter-val",
																		placeholder: "value",
																		onInput: C,
																	},
																	null,
																	40,
																	rc
																)),
																[[Mt, $.value]]
														  )
														: le("", !0),
													$.field
														? (_(),
														  F(
																"button",
																{
																	key: 3,
																	class: "ppv2-filter-rm",
																	onClick: (k) => {
																		i.splice(x, 1), N();
																	},
																},
																" × ",
																8,
																ac
														  ))
														: le("", !0),
												])
											)
										),
										128
									)),
									j(
										"button",
										{
											class: "ppv2-filter-add",
											onClick:
												M[0] ||
												(M[0] = ($) =>
													i.push({ field: "", op: ">", value: "" })),
										},
										" Add Filter ▼ "
									),
							  ]))
							: le("", !0);
				},
			},
			[["__scopeId", "data-v-5bb16726"]]
		),
		uc = { key: 0, class: "ppv2-loading" },
		fc = { key: 1, class: "ppv2-error" },
		dc = { key: 2, class: "ppv2-body" },
		pc = { class: "ppv2-table" },
		mc = ["onMousedown"],
		hc = { key: 0, class: "ppv2-action-th" },
		gc = ["onClick", "onContextmenu"],
		vc = ["href"],
		yc = ["onClick"],
		bc = { key: 0, class: "ppv2-action-td" },
		_c = ["onClick"],
		wc = ["onClick"],
		xc = ["onClick"],
		ni = _e(
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
						l = Te({}),
						s = X(null);
					function i(B, I) {
						B.ctrlKey ? (B.preventDefault(), o("row-drop", I)) : o("row-click", I);
					}
					function r(B, I) {
						B.ctrlKey && (B.preventDefault(), o("row-drop", I));
					}
					function a(B, I, W) {
						const J = I.slice(0, 20),
							Y = 50,
							ee = 500,
							de = Math.max(200, (W || 800) - 160),
							ve = B.map((Fe) => {
								let He = 0;
								J.forEach((Ct) => {
									const kt = $(Ct, Fe.fieldname);
									He += String(kt ?? "").length;
								});
								const Je = (Fe.label || Fe.fieldname).length,
									Xe = J.length > 0 ? He / J.length : Je;
								return Math.max(Xe, Je, 2);
							});
						let Me = ve.reduce((Fe, He) => Fe + He, 0);
						Me <= 0 && (Me = 1);
						let ke = ve.map((Fe) =>
							Math.min(ee, Math.max(Y, Math.round((Fe / Me) * de)))
						);
						const tt = ke.reduce((Fe, He) => Fe + He, 0);
						if (tt > de && tt > 0) {
							const Fe = de / tt;
							ke = ke.map((He) => Math.floor(He * Fe));
						}
						return ke;
					}
					Be(
						() => [n.rows, n.columns],
						() => {
							var B;
							(B = n.columns) != null &&
								B.length &&
								bt(() => {
									const I = s.value,
										W =
											(I == null ? void 0 : I.offsetWidth) ??
											(I == null ? void 0 : I.clientWidth) ??
											0;
									a(n.columns, n.rows || [], W).forEach((Y, ee) => {
										l[ee] = Y;
									});
								});
						},
						{ immediate: !0 }
					);
					const u = ie(() => (n.config.email_field || "").trim().toLowerCase()),
						c = ie(() => (n.config.sms_field || "").trim().toLowerCase()),
						f = ie(() => !!u.value),
						h = ie(() => !!c.value),
						g = ie(() => n.columns),
						w = ie(() => {
							const B = {};
							return (
								(n.config.bold_fields || []).forEach((I) => {
									B[I.toLowerCase()] = !0;
								}),
								B
							);
						}),
						S = ie(() => {
							const B = {};
							return (
								(n.config.gender_color_fields || []).forEach((I) => {
									B[I.toLowerCase()] = !0;
								}),
								B
							);
						}),
						N = ie(() => (n.config.gender_column || "").trim().toLowerCase()),
						C = ie(() => (n.config.male_hex || "").trim()),
						y = ie(() => (n.config.female_hex || "").trim()),
						M = ie(() => n.config.tint_by_gender || {});
					function $(B, I) {
						return I ? B[I] ?? B[I.toLowerCase()] ?? B[I.toUpperCase()] ?? null : null;
					}
					function x(B, I) {
						const W = $(B, I.fieldname);
						return W == null
							? ""
							: typeof W == "object"
							? JSON.stringify(W)
							: String(W);
					}
					function k(B, I) {
						return `/app/${B.toLowerCase().replace(/ /g, "-")}/${encodeURIComponent(
							I
						)}`;
					}
					function L(B) {
						const I = $(B, u.value);
						return I && String(I).includes("@");
					}
					function U(B) {
						const I = $(B, c.value);
						return I && /[\d+]/.test(String(I));
					}
					function V(B) {
						const I = $(B, c.value);
						if (!I) return;
						const W = String(I).replace(/\s+/g, "");
						window.open("tel:" + W, "_self");
					}
					function z(B, I) {
						if (!B) return !1;
						const W = String(B).toLowerCase().trim();
						return I === "male"
							? W === "male" || W === "m" || W === "boy"
							: I === "female"
							? W === "female" || W === "f" || W === "girl"
							: !1;
					}
					function te(B, I) {
						const W = I.fieldname.toLowerCase(),
							J = {};
						if (S.value[W]) {
							const Y = M.value[W];
							if (Y === "Male" && C.value)
								(J.fontWeight = "700"), (J.color = C.value);
							else if (Y === "Female" && y.value)
								(J.fontWeight = "700"), (J.color = y.value);
							else {
								const ee = $(B, N.value);
								z(ee, "male") && C.value
									? ((J.fontWeight = "700"), (J.color = C.value))
									: z(ee, "female") &&
									  y.value &&
									  ((J.fontWeight = "700"), (J.color = y.value));
							}
						} else w.value[W] && (J.fontWeight = "700");
						return J;
					}
					function re(B, I) {
						const W = B.clientX,
							Y = B.target.parentElement.offsetWidth;
						function ee(ve) {
							l[I] = Math.max(40, Y + ve.clientX - W);
						}
						function de() {
							document.removeEventListener("mousemove", ee),
								document.removeEventListener("mouseup", de);
						}
						document.addEventListener("mousemove", ee),
							document.addEventListener("mouseup", de);
					}
					return (B, I) => (
						_(),
						F(
							"div",
							{ ref_key: "panelRef", ref: s, class: "ppv2-panel" },
							[
								we(
									cc,
									{
										columns: e.columns,
										"default-filters": e.defaultFilters,
										"show-filter": e.showFilter,
										onFilterChange:
											I[0] || (I[0] = (W) => B.$emit("filter-change", W)),
										onShowFilter:
											I[1] || (I[1] = (W) => B.$emit("show-filter", W)),
									},
									null,
									8,
									["columns", "default-filters", "show-filter"]
								),
								e.loading
									? (_(), F("div", uc, "Loading…"))
									: e.error
									? (_(), F("div", fc, G(e.error), 1))
									: e.config
									? (_(),
									  F("div", dc, [
											j("table", pc, [
												j("thead", null, [
													j("tr", null, [
														(_(!0),
														F(
															oe,
															null,
															he(
																g.value,
																(W, J) => (
																	_(),
																	F(
																		"th",
																		{
																			key: W.fieldname,
																			style: $e({
																				width: l[J]
																					? l[J] + "px"
																					: "auto",
																				minWidth: "40px",
																			}),
																		},
																		[
																			Ye(
																				G(W.label) + " ",
																				1
																			),
																			j(
																				"div",
																				{
																					class: "ppv2-col-resize",
																					onMousedown:
																						Ce(
																							(Y) =>
																								re(
																									Y,
																									J
																								),
																							[
																								"prevent",
																							]
																						),
																				},
																				null,
																				40,
																				mc
																			),
																		],
																		4
																	)
																)
															),
															128
														)),
														f.value || h.value
															? (_(), F("th", hc))
															: le("", !0),
													]),
												]),
												j("tbody", null, [
													(_(!0),
													F(
														oe,
														null,
														he(
															e.rows,
															(W, J) => (
																_(),
																F(
																	"tr",
																	{
																		key: W.name || J,
																		class: Ie({
																			"ppv2-alt":
																				J % 2 === 1,
																			"ppv2-selected":
																				e.selectedName ===
																				W.name,
																		}),
																		onClick: (Y) => i(Y, W),
																		onContextmenu: (Y) =>
																			r(Y, W),
																	},
																	[
																		(_(!0),
																		F(
																			oe,
																			null,
																			he(
																				g.value,
																				(Y) => (
																					_(),
																					F(
																						"td",
																						{
																							key: Y.fieldname,
																							style: $e(
																								te(
																									W,
																									Y
																								)
																							),
																						},
																						[
																							Y.is_link &&
																							Y.link_doctype &&
																							$(
																								W,
																								Y.fieldname
																							)
																								? (_(),
																								  F(
																										"a",
																										{
																											key: 0,
																											class: "ppv2-link-val",
																											href: k(
																												Y.link_doctype,
																												$(
																													W,
																													Y.fieldname
																												)
																											),
																											target: "_blank",
																											onClick:
																												I[2] ||
																												(I[2] =
																													Ce(() => {}, [
																														"stop",
																													])),
																										},
																										G(
																											x(
																												W,
																												Y
																											)
																										),
																										9,
																										vc
																								  ))
																								: Y.is_related_link &&
																								  Y.related_doctype
																								? (_(),
																								  F(
																										"span",
																										{
																											key: 1,
																											class: "ppv2-related-link",
																											onClick:
																												Ce(
																													(
																														ee
																													) =>
																														B.$emit(
																															"drill",
																															{
																																doctype:
																																	Y.related_doctype,
																																linkField:
																																	Y.related_link_field,
																																rowName:
																																	W.name,
																																parentRow:
																																	W,
																															}
																														),
																													[
																														"stop",
																													]
																												),
																										},
																										G(
																											x(
																												W,
																												Y
																											)
																										),
																										9,
																										yc
																								  ))
																								: (_(),
																								  F(
																										oe,
																										{
																											key: 2,
																										},
																										[
																											Ye(
																												G(
																													x(
																														W,
																														Y
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
																		f.value || h.value
																			? (_(),
																			  F("td", bc, [
																					f.value && L(W)
																						? (_(),
																						  F(
																								"button",
																								{
																									key: 0,
																									class: "ppv2-row-btn",
																									title: "Send email",
																									onClick:
																										Ce(
																											(
																												Y
																											) =>
																												B.$emit(
																													"email-one",
																													W
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(I[3] ||
																										(I[3] =
																											[
																												j(
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
																								_c
																						  ))
																						: le(
																								"",
																								!0
																						  ),
																					h.value && U(W)
																						? (_(),
																						  F(
																								"button",
																								{
																									key: 1,
																									class: "ppv2-row-btn",
																									title: "Call",
																									onClick:
																										Ce(
																											(
																												Y
																											) =>
																												V(
																													W
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(I[4] ||
																										(I[4] =
																											[
																												j(
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
																								wc
																						  ))
																						: le(
																								"",
																								!0
																						  ),
																					h.value && U(W)
																						? (_(),
																						  F(
																								"button",
																								{
																									key: 2,
																									class: "ppv2-row-btn",
																									title: "Send SMS",
																									onClick:
																										Ce(
																											(
																												Y
																											) =>
																												B.$emit(
																													"sms-one",
																													W
																												),
																											[
																												"stop",
																											]
																										),
																								},
																								[
																									...(I[5] ||
																										(I[5] =
																											[
																												j(
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
																								xc
																						  ))
																						: le(
																								"",
																								!0
																						  ),
																			  ]))
																			: le("", !0),
																	],
																	42,
																	gc
																)
															)
														),
														128
													)),
												]),
											]),
									  ]))
									: le("", !0),
							],
							512
						)
					);
				},
			},
			[["__scopeId", "data-v-e32e03b8"]]
		),
		Sc = { key: 0, class: "ppv2-click-hint" },
		$c = { class: "ppv2-header-controls" },
		Cc = { class: "ppv2-count" },
		oi = {
			__name: "PanelHeaderToolbar",
			props: {
				title: { type: String, default: "" },
				loading: { type: Boolean, default: !1 },
				showClickHint: { type: Boolean, default: !1 },
				rowCount: { type: Number, default: 0 },
				total: { type: Number, default: 0 },
				showEmail: { type: Boolean, default: !1 },
				showSms: { type: Boolean, default: !1 },
				showClose: { type: Boolean, default: !1 },
			},
			emits: ["refresh", "toggle-filter", "sheets", "email", "sms", "close"],
			setup(e) {
				const t = e;
				return (n, o) => (
					_(),
					F(
						"div",
						{
							class: "ppv2-header-right",
							onMousedown: o[6] || (o[6] = Ce(() => {}, ["stop"])),
						},
						[
							t.showClickHint
								? (_(),
								  F("span", Sc, "Click row for details · Ctrl-click to remove"))
								: le("", !0),
							j("div", $c, [
								j(
									"button",
									{
										class: Ie([
											"ppv2-hdr-btn",
											{ "ppv2-hdr-btn--refreshing": t.loading },
										]),
										title: "Refresh",
										onClick: o[0] || (o[0] = (l) => n.$emit("refresh")),
									},
									[
										...(o[7] ||
											(o[7] = [
												j("i", { class: "fa fa-refresh" }, null, -1),
											])),
									],
									2
								),
								j(
									"button",
									{
										class: "ppv2-hdr-btn",
										title: "Filter",
										onClick: o[1] || (o[1] = (l) => n.$emit("toggle-filter")),
									},
									[
										...(o[8] ||
											(o[8] = [
												j("i", { class: "fa fa-filter" }, null, -1),
											])),
									]
								),
								j(
									"button",
									{
										class: "ppv2-hdr-btn",
										title: "Export to Sheets",
										onClick: o[2] || (o[2] = (l) => n.$emit("sheets")),
									},
									[
										...(o[9] ||
											(o[9] = [j("i", { class: "fa fa-table" }, null, -1)])),
									]
								),
								t.showEmail
									? (_(),
									  F(
											"button",
											{
												key: 0,
												class: "ppv2-hdr-btn",
												title: "Email",
												onClick: o[3] || (o[3] = (l) => n.$emit("email")),
											},
											[
												...(o[10] ||
													(o[10] = [
														j(
															"i",
															{ class: "fa fa-envelope" },
															null,
															-1
														),
													])),
											]
									  ))
									: le("", !0),
								t.showSms
									? (_(),
									  F(
											"button",
											{
												key: 1,
												class: "ppv2-hdr-btn",
												title: "SMS",
												onClick: o[4] || (o[4] = (l) => n.$emit("sms")),
											},
											[
												...(o[11] ||
													(o[11] = [
														j(
															"i",
															{ class: "fa fa-comment" },
															null,
															-1
														),
													])),
											]
									  ))
									: le("", !0),
								j("span", Cc, G(t.rowCount) + " / " + G(t.total) + " records", 1),
								t.showClose
									? (_(),
									  F(
											"button",
											{
												key: 2,
												class: "ppv2-hdr-btn ppv2-close-btn",
												title: "Close",
												onClick: o[5] || (o[5] = (l) => n.$emit("close")),
											},
											" × "
									  ))
									: le("", !0),
							]),
						],
						32
					)
				);
			},
		},
		kc = {
			"Section Break": 1,
			"Column Break": 1,
			"Tab Break": 1,
			HTML: 1,
			Fold: 1,
			Heading: 1,
			Button: 1,
			"Table MultiSelect": 1,
		},
		Fc = {
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
	function Dc() {
		const e = Te([]),
			t = Te({});
		function n() {
			e.splice(0), Object.keys(t).forEach((r) => delete t[r]);
		}
		function o(r, a, u, c) {
			for (; e.length > c; ) {
				const h = e.pop();
				delete t[h.doctype];
			}
			t[r] = !0;
			const f = Te({ doctype: r, via_field: a, via_type: u, fields: [], activeField: null });
			return (
				e.push(f),
				new Promise((h) => {
					frappe.model.with_doctype(r, () => {
						const g = frappe.get_meta(r),
							w = [];
						(g.fields || []).forEach((S) => {
							if (!kc[S.fieldtype]) {
								if (S.fieldtype === "Table") {
									w.push({
										fieldname: S.fieldname,
										label: S.label || S.fieldname,
										fieldtype: S.fieldtype,
										options: S.options || "",
										is_link: !1,
										is_table: !0,
									});
									return;
								}
								Fc[S.fieldname] ||
									w.push({
										fieldname: S.fieldname,
										label: S.label || S.fieldname,
										fieldtype: S.fieldtype,
										options: S.options || "",
										is_link: S.fieldtype === "Link",
										is_table: !1,
									});
							}
						}),
							c === 0
								? frappe.call({
										method: "nce_events.api.tags.get_pronoun_tags_for_doctype",
										args: { doctype: r },
										freeze: !1,
										callback(S) {
											const N = (S.message || []).map((C) => ({
												fieldname: C.field_name,
												label: C.label || C.field_name,
												jinja_tag: C.jinja_tag || "",
												is_pronoun: !0,
											}));
											(f.fields = N.concat(w)), h();
										},
										error() {
											(f.fields = w), h();
										},
								  })
								: ((f.fields = w), h());
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
			return c === -1 ? Tc(u, a) : Nc(u, a, c);
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
				c = c.replace(/\{\{([^}]+)\}\}/g, (h, g) => `{{ ${g.trim()} | default('${f}') }}`);
			}
			return (
				u &&
					(c = c.replace(/\{\{([^}]+)\}\}/g, (f, h) => {
						const g = h.trim();
						return g.includes("| safe") ? f : `{{ ${g} | safe }}`;
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
	function Tc(e, t) {
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
	function Nc(e, t, n) {
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
	const Ec = { class: "tf-column" },
		Rc = { class: "tf-col-header" },
		Oc = { class: "tf-col-count" },
		Pc = { class: "tf-tiles" },
		Ac = ["title", "onClick"],
		Mc = { class: "tf-tile-top" },
		Ic = { class: "tf-tile-label" },
		Lc = { key: 0, class: "tf-tile-arrow" },
		jc = { class: "tf-tile-meta" },
		Vc = { class: "tf-tile-fieldname" },
		Bc = { class: "tf-tile-badge" },
		Hc = _e(
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
						F("div", Ec, [
							j("div", Rc, [
								Ye(G(e.col.doctype) + " ", 1),
								j("span", Oc, G(e.col.fields.length) + " fields", 1),
							]),
							j("div", Pc, [
								(_(!0),
								F(
									oe,
									null,
									he(
										e.col.fields,
										(c) => (
											_(),
											F(
												"div",
												{
													key: c.fieldname,
													class: Ie(s(c)),
													title: l(c)
														? `Circular: ${c.options} already visited`
														: "",
													onClick: (f) => r(c),
												},
												[
													j("div", Mc, [
														j("span", Ic, G(c.label), 1),
														(c.is_link || c.is_table) && !l(c)
															? (_(), F("span", Lc, "▶"))
															: le("", !0),
													]),
													j("div", jc, [
														j("span", Vc, G(c.fieldname), 1),
														j("span", Bc, G(i(c)), 1),
													]),
												],
												10,
												Ac
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
		qc = { class: "tf-tag-body" },
		Uc = { class: "tf-actions" },
		Wc = { class: "tf-check-label" },
		Kc = { class: "tf-btn-group" },
		zc = _e(
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
						u = ie(() => n.applyFilters(n.baseTag, l.value, s.value)),
						c = ie(() => ({
							top: i.value + "px",
							left: r.value + "px",
							zIndex: a.value,
						}));
					function f() {
						a.value = a.value + 1;
					}
					function h(N, C) {
						const y = document.createElement("div");
						(y.textContent = "Tag is on the clipboard"),
							Object.assign(y.style, {
								position: "fixed",
								top: N + "px",
								left: C + "px",
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
							document.body.appendChild(y),
							setTimeout(() => {
								y.style.opacity = "0";
							}, 1400),
							setTimeout(() => {
								y.remove();
							}, 2e3);
					}
					function g(N) {
						const C = document.createElement("textarea");
						(C.value = N),
							(C.style.cssText = "position:fixed;opacity:0"),
							document.body.appendChild(C),
							C.select(),
							document.execCommand("copy"),
							C.remove();
					}
					function w() {
						const N = u.value,
							C = i.value,
							y = r.value;
						o("close"),
							navigator.clipboard
								? navigator.clipboard.writeText(N).catch(() => g(N))
								: g(N),
							h(C, y);
					}
					function S(N) {
						const C = N.clientX,
							y = N.clientY,
							M = i.value,
							$ = r.value;
						function x(L) {
							(i.value = Math.max(0, M + L.clientY - y)),
								(r.value = $ + L.clientX - C);
						}
						function k() {
							document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", k);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", k);
					}
					return (N, C) => (
						_(),
						F(
							"div",
							{ class: "tf-tag-panel", style: $e(c.value), onMousedown: f },
							[
								j(
									"div",
									{ class: "tf-tag-header", onMousedown: Ce(S, ["prevent"]) },
									[
										j("span", null, G(e.field.label), 1),
										j(
											"button",
											{
												class: "tf-close",
												onClick: C[0] || (C[0] = (y) => N.$emit("close")),
											},
											"×"
										),
									],
									32
								),
								j("div", qc, [
									C[5] ||
										(C[5] = j(
											"div",
											{ class: "tf-lbl" },
											"Fallback Value",
											-1
										)),
									et(
										j(
											"input",
											{
												"onUpdate:modelValue":
													C[1] || (C[1] = (y) => (l.value = y)),
												type: "text",
												class: "tf-input",
												placeholder: "e.g. Student (leave empty for none)",
											},
											null,
											512
										),
										[[Mt, l.value]]
									),
									j("div", Uc, [
										j("label", Wc, [
											et(
												j(
													"input",
													{
														"onUpdate:modelValue":
															C[2] || (C[2] = (y) => (s.value = y)),
														type: "checkbox",
													},
													null,
													512
												),
												[[La, s.value]]
											),
											C[4] || (C[4] = Ye(" Is this HTML? ", -1)),
										]),
										j("div", Kc, [
											j(
												"button",
												{
													class: "btn btn-default btn-sm",
													onClick:
														C[3] || (C[3] = (y) => N.$emit("close")),
												},
												"Cancel"
											),
											j(
												"button",
												{ class: "btn btn-primary btn-sm", onClick: w },
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
		Yc = _e(
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
						n = Dc(),
						o = Te([]),
						l = X(null),
						s = X(t.initX >= 0 ? t.initX : window.innerWidth - 560),
						i = X(t.initY),
						r = X(10060),
						a = X(null),
						u = X(null),
						c = ie(() => {
							const N = {
								left: s.value + "px",
								top: i.value + "px",
								zIndex: r.value,
							};
							return (
								a.value && (N.width = a.value + "px"),
								u.value && (N.maxHeight = u.value + "px"),
								N
							);
						});
					function f() {
						r.value = r.value + 1;
					}
					function h(N) {
						f();
						const C = N.clientX,
							y = N.clientY,
							M = s.value,
							$ = i.value;
						function x(L) {
							(s.value = M + L.clientX - C),
								(i.value = Math.max(0, $ + L.clientY - y));
						}
						function k() {
							document.removeEventListener("mousemove", x),
								document.removeEventListener("mouseup", k);
						}
						document.addEventListener("mousemove", x),
							document.addEventListener("mouseup", k);
					}
					function g(N) {
						f();
						const C = N.clientX,
							y = N.clientY,
							M = N.target.parentElement,
							$ = M.offsetWidth,
							x = M.offsetHeight;
						function k(U) {
							(a.value = Math.max(260, $ + U.clientX - C)),
								(u.value = Math.max(200, x + U.clientY - y));
						}
						function L() {
							document.removeEventListener("mousemove", k),
								document.removeEventListener("mouseup", L);
						}
						document.addEventListener("mousemove", k),
							document.addEventListener("mouseup", L);
					}
					Pt(() => {
						n.loadColumn(t.rootDoctype, null, null, 0);
					});
					async function w(N, C) {
						(n.columns[C].activeField = N.fieldname),
							await n.loadColumn(
								N.options,
								N.fieldname,
								N.is_table ? "Table" : "Link",
								C + 1
							),
							await bt(),
							l.value && (l.value.scrollLeft = l.value.scrollWidth),
							a.value;
					}
					function S(N, C) {
						var $;
						const y = n.buildTag(C, N),
							M = N.is_pronoun
								? `${(($ = n.columns[0]) == null ? void 0 : $.doctype) || ""} → ${
										N.fieldname
								  } (pronoun)`
								: n.buildPath(C, N);
						o.push({ field: N, baseTag: y, path: M });
					}
					return (N, C) => (
						_(),
						F(
							"div",
							{ class: "tf-float", style: $e(c.value), onMousedown: f },
							[
								j(
									"div",
									{ class: "tf-header", onMousedown: Ce(h, ["prevent"]) },
									[
										j("span", null, "Tag Finder: " + G(e.rootDoctype), 1),
										j(
											"button",
											{
												class: "tf-close",
												onClick: C[0] || (C[0] = (y) => N.$emit("close")),
											},
											"×"
										),
									],
									32
								),
								j(
									"div",
									{ ref_key: "bodyEl", ref: l, class: "tf-body" },
									[
										(_(!0),
										F(
											oe,
											null,
											he(
												R(n).columns,
												(y, M) => (
													_(),
													xe(
														Hc,
														{
															key: M,
															col: y,
															"col-index": M,
															columns: R(n).columns,
															onNavigate: ($) => w($, M),
															onSelectField: ($) => S($, M),
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
								j(
									"div",
									{ class: "tf-footer", onMousedown: Ce(h, ["prevent"]) },
									" Tag Finder: " + G(e.rootDoctype),
									33
								),
								j(
									"div",
									{ class: "tf-resize-handle", onMousedown: Ce(g, ["prevent"]) },
									null,
									32
								),
								(_(),
								xe(Hl, { to: "body" }, [
									(_(!0),
									F(
										oe,
										null,
										he(
											o,
											(y, M) => (
												_(),
												xe(
													zc,
													{
														key: M,
														field: y.field,
														"base-tag": y.baseTag,
														path: y.path,
														"apply-filters": R(n).applyFilters,
														"init-top": 100 + M * 24,
														"init-left": 160 + M * 24,
														onClose: ($) => o.splice(M, 1),
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
	function Jc(e) {
		const t = Cl(null),
			n = X(null),
			o = X({}),
			l = X({}),
			s = X(!1),
			i = X(null);
		async function r(f, h, g, w) {
			var y, M;
			const S = f.split(".");
			if (S.length === 1) return (h == null ? void 0 : h[S[0]]) ?? null;
			let N = h,
				C = g;
			for (let $ = 0; $ < S.length - 1; $++) {
				const x = S[$],
					k = N == null ? void 0 : N[x];
				if (!k) return null;
				const L =
					(M = (y = w == null ? void 0 : w[C]) == null ? void 0 : y.fields) == null
						? void 0
						: M.find((V) => V.fieldname === x && V.fieldtype === "Link");
				if (!(L != null && L.options)) return null;
				(N = await lo(L.options, k)), (C = L.options);
			}
			return (N == null ? void 0 : N[S[S.length - 1]]) ?? null;
		}
		async function a(f, h) {
			var g, w;
			(s.value = !0), (i.value = null);
			try {
				const S = await lo("Card Definition", f);
				t.value = S;
				const N = S.root_doctype,
					C = await ut("frappe.client.get_doctype", { doctype: N });
				o.value = { ...o.value, [N]: C };
				const y = await lo(N, h);
				n.value = y;
				const M = {},
					$ = new Set();
				for (const x of S.fields_list || [])
					(g = x.path) != null && g.includes(".") && $.add(x.path);
				for (const x of S.displays || [])
					(w = x.path) != null && w.includes(".") && $.add(x.path);
				for (const x of $) M[x] = await r(x, y, N, o.value);
				l.value = M;
			} catch (S) {
				i.value = String(S);
			} finally {
				s.value = !1;
			}
		}
		async function u(f, h) {
			var S;
			const g = (S = t.value) == null ? void 0 : S.root_doctype,
				w = n.value;
			!g ||
				!(w != null && w.name) ||
				(await frappe.db.set_value(g, w.name, f, h), (n.value = { ...n.value, [f]: h }));
		}
		async function c() {
			var N, C, y;
			const f = n.value,
				h = (N = t.value) == null ? void 0 : N.root_doctype;
			if (!(f != null && f.name) || !h) return;
			const g = await lo(h, f.name);
			n.value = g;
			const w = {},
				S = new Set();
			for (const M of t.value.fields_list || [])
				(C = M.path) != null && C.includes(".") && S.add(M.path);
			for (const M of t.value.displays || [])
				(y = M.path) != null && y.includes(".") && S.add(M.path);
			for (const M of S) w[M] = await r(M, g, h, o.value);
			l.value = w;
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
	const Xc = { class: "actions-panel" },
		Gc = ["onClick"],
		Zc = _e(
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
						l = ie(() =>
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
						F("div", Xc, [
							(_(!0),
							F(
								oe,
								null,
								he(
									l.value,
									(c) => (
										_(),
										F(
											"button",
											{
												key: c.name || c.label,
												class: "action-btn",
												onClick: (f) => r(c),
											},
											G(c.label),
											9,
											Gc
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
		Qc = { key: 0, class: "tab-bar" },
		eu = ["onClick"],
		tu = _e(
			{
				__name: "TabBar",
				props: {
					tabs: { type: Array, default: () => [] },
					activeTab: { type: String, default: "" },
				},
				emits: ["update:activeTab"],
				setup(e) {
					const t = e,
						n = ie(() =>
							[...(t.tabs || [])].sort(
								(l, s) => (l.sort_order || 0) - (s.sort_order || 0)
							)
						),
						o = ie(() => {
							var s;
							const l = n.value;
							return l.length <= 1 && (s = l[0]) != null && s.hide_bar
								? !1
								: l.length > 1;
						});
					return (l, s) =>
						o.value
							? (_(),
							  F("div", Qc, [
									(_(!0),
									F(
										oe,
										null,
										he(
											n.value,
											(i) => (
												_(),
												F(
													"button",
													{
														key: i.label,
														class: Ie([
															"tab-btn",
															{ active: e.activeTab === i.label },
														]),
														onClick: (r) =>
															l.$emit("update:activeTab", i.label),
													},
													G(i.label),
													11,
													eu
												)
											)
										),
										128
									)),
							  ]))
							: le("", !0);
				},
			},
			[["__scopeId", "data-v-abb6b668"]]
		),
		nu = { class: "field-widget" },
		ou = ["readonly"],
		lu = ["step", "readonly"],
		su = ["readonly"],
		iu = ["checked", "disabled"],
		ru = ["disabled"],
		au = ["value"],
		cu = ["readonly"],
		uu = ["readonly"],
		fu = _e(
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
						l = ie(() => {
							var g;
							return (g = n.record) == null ? void 0 : g.doctype;
						}),
						s = ie(() => {
							var g, w, S;
							return (
								l.value &&
								((S =
									(w = (g = n.meta) == null ? void 0 : g[l.value]) == null
										? void 0
										: w.fields) == null
									? void 0
									: S.find((N) => N.fieldname === n.config.path))
							);
						}),
						i = ie(() => {
							var w;
							const g = ((w = s.value) == null ? void 0 : w.fieldtype) || "Data";
							return g === "Int" || g === "Float" || g === "Currency"
								? "number"
								: g === "Select"
								? "select"
								: g === "Date"
								? "date"
								: g === "Check"
								? "checkbox"
								: ["Small Text", "Text", "Text Editor"].includes(g)
								? "textarea"
								: "text";
						}),
						r = ie(() => {
							var w;
							return ((w = s.value) == null ? void 0 : w.fieldtype) === "Int"
								? "1"
								: "0.01";
						}),
						a = ie(() => {
							var w;
							const g = (w = s.value) == null ? void 0 : w.options;
							return !g || typeof g != "string"
								? []
								: g
										.split(
											`
`
										)
										.filter(Boolean);
						}),
						u = ie(() => {
							var w;
							const g = n.config.path;
							return g != null && g.includes(".")
								? null
								: ((w = n.record) == null ? void 0 : w[g]) ?? "";
						}),
						c = X("");
					Be(
						u,
						(g) => {
							var S;
							const w = g == null ? "" : String(g);
							((S = s.value) == null ? void 0 : S.fieldtype) === "Check"
								? (c.value = !!g && g !== "0" && g !== 0)
								: (c.value = w);
						},
						{ immediate: !0 }
					);
					function f() {
						var N;
						if (!n.config.editable) return;
						const g = n.config.path;
						if (g != null && g.includes(".")) return;
						const w = u.value;
						let S = c.value;
						((N = s.value) == null ? void 0 : N.fieldtype) === "Check" &&
							(S = S ? 1 : 0),
							String(w) !== String(S) && o("save-field", { fieldname: g, value: S });
					}
					function h(g) {
						(c.value = g.target.checked), f();
					}
					return (g, w) => {
						var S, N;
						return (
							_(),
							F("div", nu, [
								j(
									"label",
									{
										class: Ie([
											"field-label",
											{ required: (S = s.value) == null ? void 0 : S.reqd },
										]),
									},
									G(((N = s.value) == null ? void 0 : N.label) || e.config.path),
									3
								),
								i.value === "text"
									? et(
											(_(),
											F(
												"input",
												{
													key: 0,
													type: "text",
													"onUpdate:modelValue":
														w[0] || (w[0] = (C) => (c.value = C)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												ou
											)),
											[[Mt, c.value]]
									  )
									: i.value === "number"
									? et(
											(_(),
											F(
												"input",
												{
													key: 1,
													type: "number",
													step: r.value,
													"onUpdate:modelValue":
														w[1] || (w[1] = (C) => (c.value = C)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												lu
											)),
											[[Mt, c.value]]
									  )
									: i.value === "date"
									? et(
											(_(),
											F(
												"input",
												{
													key: 2,
													type: "date",
													"onUpdate:modelValue":
														w[2] || (w[2] = (C) => (c.value = C)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												su
											)),
											[[Mt, c.value]]
									  )
									: i.value === "checkbox"
									? (_(),
									  F(
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
											iu
									  ))
									: i.value === "select"
									? et(
											(_(),
											F(
												"select",
												{
													key: 4,
													"onUpdate:modelValue":
														w[3] || (w[3] = (C) => (c.value = C)),
													disabled: !e.config.editable,
													class: "field-input",
													onChange: f,
												},
												[
													w[6] ||
														(w[6] = j(
															"option",
															{ value: "" },
															null,
															-1
														)),
													(_(!0),
													F(
														oe,
														null,
														he(
															a.value,
															(C) => (
																_(),
																F(
																	"option",
																	{ key: C, value: C },
																	G(C),
																	9,
																	au
																)
															)
														),
														128
													)),
												],
												40,
												ru
											)),
											[[zs, c.value]]
									  )
									: i.value === "textarea"
									? et(
											(_(),
											F(
												"textarea",
												{
													key: 5,
													"onUpdate:modelValue":
														w[4] || (w[4] = (C) => (c.value = C)),
													readonly: !e.config.editable,
													class: "field-input",
													rows: "3",
													onBlur: f,
												},
												null,
												40,
												cu
											)),
											[[Mt, c.value]]
									  )
									: et(
											(_(),
											F(
												"input",
												{
													key: 6,
													type: "text",
													"onUpdate:modelValue":
														w[5] || (w[5] = (C) => (c.value = C)),
													readonly: !e.config.editable,
													class: "field-input",
													onBlur: f,
													onKeydown: no(f, ["enter"]),
												},
												null,
												40,
												uu
											)),
											[[Mt, c.value]]
									  ),
							])
						);
					};
				},
			},
			[["__scopeId", "data-v-c878e916"]]
		),
		du = { class: "display-widget" },
		pu = { class: "display-label" },
		mu = { class: "display-value" },
		hu = _e(
			{
				__name: "DisplayWidget",
				props: {
					config: { type: Object, required: !0 },
					record: { type: Object, default: null },
					resolvedHops: { type: Object, default: () => ({}) },
				},
				setup(e) {
					const t = e,
						n = ie(() => {
							var l, s, i;
							return (l = t.config.path) != null && l.includes(".")
								? ((s = t.resolvedHops) == null ? void 0 : s[t.config.path]) ?? ""
								: ((i = t.record) == null ? void 0 : i[t.config.path]) ?? "";
						}),
						o = ie(() => {
							if (t.config.label) return t.config.label;
							const l = (t.config.path || "").split(".");
							return (l[l.length - 1] || t.config.path)
								.replace(/_/g, " ")
								.replace(/\b\w/g, (i) => i.toUpperCase());
						});
					return (l, s) => (
						_(),
						F("div", du, [j("label", pu, G(o.value), 1), j("span", mu, G(n.value), 1)])
					);
				},
			},
			[["__scopeId", "data-v-bb9316e1"]]
		),
		gu = _e(
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
						n = { field: fu, display: hu },
						o = ie(() => ({
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
						F(
							"div",
							{ class: "widget-grid", style: $e(o.value) },
							[
								(_(!0),
								F(
									oe,
									null,
									he(
										e.widgets,
										(r) => (
											_(),
											F(
												"div",
												{
													key: r.id || r.type + "-" + r.x + "-" + r.y,
													class: "widget-item",
													style: $e(l(r)),
												},
												[
													(_(),
													xe(
														Dr(n[r.type]),
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
		vu = { class: "card-form-header" },
		yu = { class: "card-title" },
		bu = { class: "card-record-name" },
		_u = { key: 0, class: "card-loading" },
		wu = { key: 1, class: "card-error" },
		xu = { key: 2, class: "card-form-body" },
		Su = { class: "card-form-content" },
		$u = _e(
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
						n = Jc(t.doctype),
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
					function g() {
						const y = o.value;
						if (!y) return [];
						const M = h.value,
							$ = [];
						for (const x of y.fields_list || [])
							x.tab === M &&
								$.push({
									type: "field",
									id: `field-${x.path}-${x.idx || $.length}`,
									x: x.x ?? 0,
									y: x.y ?? 0,
									w: x.w ?? 3,
									h: x.h ?? 1,
									config: { path: x.path, editable: x.editable !== 0 },
								});
						for (const x of y.displays || [])
							x.tab === M &&
								$.push({
									type: "display",
									id: `display-${x.path}-${x.idx || $.length}`,
									x: x.x ?? 0,
									y: x.y ?? 0,
									w: x.w ?? 3,
									h: x.h ?? 1,
									config: { path: x.path, label: x.label },
								});
						return $;
					}
					const w = ie(g),
						S = ie(() => {
							var M;
							const y = (M = o.value) == null ? void 0 : M.styles_json;
							if (!y || !y.trim()) return {};
							try {
								const $ = JSON.parse(y),
									x = {};
								for (const [k, L] of Object.entries($))
									k.startsWith("--") && L != null && (x[k] = String(L));
								return x;
							} catch {
								return {};
							}
						});
					Be(
						() => {
							var y;
							return (y = o.value) == null ? void 0 : y.tabs;
						},
						(y) => {
							const M = [...(y || [])].sort(
								($, x) => ($.sort_order || 0) - (x.sort_order || 0)
							);
							M.length && !h.value && (h.value = M[0].label || "Home");
						},
						{ immediate: !0 }
					);
					function N({ fieldname: y, value: M }) {
						c(y, M);
					}
					async function C() {
						await f();
					}
					return (
						Pt(async () => {
							var $;
							await u(t.cardDefName, t.recordName);
							const M = [...((($ = o.value) == null ? void 0 : $.tabs) || [])].sort(
								(x, k) => (x.sort_order || 0) - (k.sort_order || 0)
							);
							M.length && !h.value && (h.value = M[0].label || "Home");
						}),
						(y, M) => {
							var $, x, k, L, U, V, z, te, re;
							return (
								_(),
								F(
									"div",
									{ class: "card-form", style: $e(S.value) },
									[
										j("div", vu, [
											j(
												"span",
												yu,
												G(
													(($ = R(o)) == null ? void 0 : $.title) ||
														e.doctype
												),
												1
											),
											j("span", bu, G(e.recordName), 1),
											j(
												"button",
												{
													class: "card-close-btn",
													onClick:
														M[0] || (M[0] = (B) => y.$emit("close")),
												},
												"×"
											),
										]),
										R(r)
											? (_(), F("div", _u, "Loading…"))
											: R(a)
											? (_(), F("div", wu, G(R(a)), 1))
											: (_(),
											  F("div", xu, [
													(k =
														(x = R(o)) == null ? void 0 : x.actions) !=
														null && k.length
														? (_(),
														  xe(
																Zc,
																{
																	key: 0,
																	actions: R(o).actions,
																	scripts: R(o).scripts || [],
																	record: R(l),
																	onOpenCard:
																		M[1] ||
																		(M[1] = (...B) =>
																			y.$emit(
																				"open-card",
																				...B
																			)),
																	onRefresh: C,
																},
																null,
																8,
																["actions", "scripts", "record"]
														  ))
														: le("", !0),
													j("div", Su, [
														(U =
															(L = R(o)) == null
																? void 0
																: L.tabs) != null && U.length
															? (_(),
															  xe(
																	tu,
																	{
																		key: 0,
																		tabs: R(o).tabs,
																		"active-tab": h.value,
																		"onUpdate:activeTab":
																			M[2] ||
																			(M[2] = (B) =>
																				(h.value = B)),
																	},
																	null,
																	8,
																	["tabs", "active-tab"]
															  ))
															: le("", !0),
														we(
															gu,
															{
																widgets: w.value,
																"grid-columns":
																	((V = R(o)) == null
																		? void 0
																		: V.grid_columns) || 12,
																"grid-rows":
																	((z = R(o)) == null
																		? void 0
																		: z.grid_rows) || 10,
																"cell-size":
																	((te = R(o)) == null
																		? void 0
																		: te.grid_cell_size) || 50,
																record: R(l),
																meta: R(s),
																"resolved-hops": R(i),
																scripts:
																	((re = R(o)) == null
																		? void 0
																		: re.scripts) || [],
																onSaveField: N,
																onOpenCard:
																	M[3] ||
																	(M[3] = (...B) =>
																		y.$emit(
																			"open-card",
																			...B
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
		Cu = { class: "card-modal" },
		ku = _e(
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
						Pt(() => document.addEventListener("keydown", o)),
						Yt(() => document.removeEventListener("keydown", o)),
						(l, s) => (
							_(),
							xe(Hl, { to: "body" }, [
								j(
									"div",
									{
										class: "card-modal-backdrop",
										onClick:
											s[2] || (s[2] = Ce((i) => l.$emit("close"), ["self"])),
									},
									[
										j("div", Cu, [
											we(
												$u,
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
		li = "nce_fd_load_debug";
	function so() {
		try {
			return localStorage.getItem(li) === "1";
		} catch {
			return !1;
		}
	}
	const Fu = { class: "ppv2-fd-header" },
		Du = { class: "ppv2-fd-header-main" },
		Tu = ["disabled"],
		Nu = { key: 0, class: "ppv2-fd-nav-pos" },
		Eu = ["disabled"],
		Ru = { class: "ppv2-fd-title" },
		Ou = _e(
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
						F("div", Fu, [
							j("div", Du, [
								e.rowNavEnabled
									? (_(),
									  F(
											"div",
											{
												key: 0,
												class: "ppv2-fd-nav",
												onMousedown:
													n[2] || (n[2] = Ce(() => {}, ["stop"])),
											},
											[
												j(
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
																j(
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
													Tu
												),
												e.rowNavLabel
													? (_(), F("span", Nu, G(e.rowNavLabel), 1))
													: le("", !0),
												j(
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
																j(
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
													Eu
												),
											],
											32
									  ))
									: le("", !0),
								j("span", Ru, G(e.title), 1),
							]),
							j(
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
	function Pu(e) {
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
	const Au = _e(
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
						l = Kt("fdSyncingFromLoad", null),
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
						Pt(() => {
							bt(() => u());
						}),
						Be(
							() => n.modelValue,
							(c) => {
								if (!(i != null && i.set_value)) return;
								const f = i.get_value();
								String(f ?? "") !== String(c ?? "") && i.set_value(c ?? "", !0);
							}
						),
						Be(
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
							F(
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
		Mu = _e(
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
						l = Kt("fdSyncingFromLoad", null),
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
						var h, g;
						if (
							typeof frappe > "u" ||
							!(
								(g = (h = frappe.ui) == null ? void 0 : h.form) != null &&
								g.make_control
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
						Pt(() => {
							bt(() => u());
						}),
						Be(
							() => n.modelValue,
							(c) => {
								if (!(i != null && i.set_value)) return;
								const f = i.get_value();
								String(f ?? "") !== String(c ?? "") && i.set_value(c ?? "", !0);
							}
						),
						Be(
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
							F(
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
		Iu = { key: 0, class: "ppv2-fd-table-placeholder" },
		Lu = { key: 1, class: "ppv2-fd-heading" },
		ju = ["innerHTML"],
		Vu = { key: 3 },
		Bu = { class: "ppv2-fd-label" },
		Hu = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		qu = ["value", "required", "disabled"],
		Uu = ["value"],
		Wu = { key: 1, class: "ppv2-fd-check-row" },
		Ku = ["checked", "disabled"],
		zu = { key: 4, class: "ppv2-fd-input ppv2-fd-textarea ppv2-fd-readonly-plain" },
		Yu = ["value", "required", "disabled", "rows", "placeholder"],
		Ju = { key: 6, class: "ppv2-fd-input ppv2-fd-readonly-plain" },
		Xu = ["type", "value", "required", "disabled", "placeholder", "step", "min", "max"],
		Gu = { key: 8, class: "ppv2-fd-desc" },
		Zu = _e(
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
						l = ie(() => Pu(n.field));
					function s(h) {
						return String((h == null ? void 0 : h.fieldtype) ?? "").trim();
					}
					const i = ie(() => {
							const h = s(n.field).toLowerCase();
							return !!(
								h === "select" ||
								(h === "autocomplete" &&
									(n.field.options || "").includes(`
`))
							);
						}),
						r = ie(() => {
							if (s(n.field).toLowerCase() !== "autocomplete") return !1;
							const g = (n.field.options || "").trim();
							return !(
								!g ||
								g.includes(`
`)
							);
						}),
						a = ie(() => {
							var g, w;
							return (
								((w = (g = l.value) == null ? void 0 : g.props) == null
									? void 0
									: w.type) === "textarea"
							);
						}),
						u = ie(() =>
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
					return (h, g) => {
						var w, S, N, C, y, M, $, x, k, L;
						return ((w = l.value) == null ? void 0 : w.layout) === "table"
							? (_(),
							  F("div", Iu, [
									j(
										"span",
										null,
										"Child table: " +
											G(e.field.label) +
											" (" +
											G(e.field.options) +
											")",
										1
									),
									g[4] ||
										(g[4] = j(
											"span",
											{ class: "ppv2-fd-muted" },
											"— not yet supported in dialog view",
											-1
										)),
							  ]))
							: ((S = l.value) == null ? void 0 : S.layout) === "heading"
							? (_(), F("h4", Lu, G(e.field.label), 1))
							: ((N = l.value) == null ? void 0 : N.layout) === "html"
							? (_(), F("div", { key: 2, innerHTML: e.field.options }, null, 8, ju))
							: ((C = l.value) == null ? void 0 : C.layout) === "button"
							? (_(), F("span", Vu))
							: (y = l.value) != null && y.component
							? et(
									(_(),
									F(
										"div",
										{
											key: 4,
											class: Ie([
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
											j("label", Bu, [
												Ye(G(e.field.label), 1),
												e.mandatory
													? (_(), F("span", Hu, " *"))
													: le("", !0),
											]),
											i.value
												? (_(),
												  F(
														"select",
														{
															key: 0,
															value: e.modelValue ?? "",
															required: e.mandatory,
															disabled: e.readOnly,
															class: "ppv2-fd-input ppv2-fd-select",
															onChange:
																g[0] ||
																(g[0] = (U) => c(U.target.value)),
														},
														[
															g[5] ||
																(g[5] = j(
																	"option",
																	{ value: "" },
																	"— Select —",
																	-1
																)),
															(_(!0),
															F(
																oe,
																null,
																he(
																	u.value,
																	(U) => (
																		_(),
																		F(
																			"option",
																			{ key: U, value: U },
																			G(U),
																			9,
																			Uu
																		)
																	)
																),
																128
															)),
														],
														40,
														qu
												  ))
												: e.field.fieldtype === "Check"
												? (_(),
												  F("div", Wu, [
														j(
															"input",
															{
																type: "checkbox",
																checked: !!e.modelValue,
																disabled: e.readOnly,
																onChange:
																	g[1] ||
																	(g[1] = (U) =>
																		c(
																			U.target.checked
																				? 1
																				: 0
																		)),
															},
															null,
															40,
															Ku
														),
												  ]))
												: e.field.fieldtype === "Link" || r.value
												? (_(),
												  xe(
														Au,
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
												  xe(
														Mu,
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
												? (_(), F("div", zu, G(e.modelValue || ""), 1))
												: a.value
												? (_(),
												  F(
														"textarea",
														{
															key: 5,
															value: e.modelValue || "",
															required: e.mandatory,
															disabled: e.readOnly,
															rows:
																((M = l.value.props) == null
																	? void 0
																	: M.rows) || 3,
															placeholder: e.field.placeholder || "",
															class: "ppv2-fd-input ppv2-fd-textarea",
															onInput:
																g[2] ||
																(g[2] = (U) => c(U.target.value)),
														},
														null,
														40,
														Yu
												  ))
												: e.readOnly
												? (_(), F("div", Ju, G(e.modelValue ?? ""), 1))
												: (_(),
												  F(
														"input",
														{
															key: 7,
															type:
																(($ = l.value.props) == null
																	? void 0
																	: $.type) || "text",
															value: e.modelValue ?? "",
															required: e.mandatory,
															disabled: e.readOnly,
															placeholder: e.field.placeholder || "",
															step:
																(x = l.value.props) == null
																	? void 0
																	: x.step,
															min:
																(k = l.value.props) == null
																	? void 0
																	: k.min,
															max:
																(L = l.value.props) == null
																	? void 0
																	: L.max,
															class: "ppv2-fd-input",
															onChange:
																g[3] ||
																(g[3] = (U) => c(U.target.value)),
														},
														null,
														40,
														Xu
												  )),
											e.field.description
												? (_(), F("p", Gu, G(e.field.description), 1))
												: le("", !0),
										],
										2
									)),
									[[xa, e.visible]]
							  )
							: le("", !0);
					};
				},
			},
			[["__scopeId", "data-v-d9765eb9"]]
		),
		Qu = { key: 0, class: "ppv2-fd-tab-bar" },
		ef = ["onClick"],
		tf = _e(
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
							  F("div", Qu, [
									(_(!0),
									F(
										oe,
										null,
										he(
											e.tabs,
											(o, l) => (
												_(),
												F(
													"button",
													{
														key: l,
														type: "button",
														class: Ie([
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
													ef
												)
											)
										),
										128
									)),
							  ]))
							: le("", !0);
				},
			},
			[["__scopeId", "data-v-41553ba8"]]
		),
		nf = { key: 0, class: "ppv2-fd-related-root" },
		of = { class: "ppv2-fd-related-meta" },
		lf = { key: 0, class: "ppv2-fd-related-meta-link" },
		sf = { key: 1, class: "ppv2-fd-related-meta-link" },
		rf = { key: 0, class: "ppv2-fd-related-warn" },
		af = { key: 1, class: "ppv2-fd-related-hint" },
		cf = { key: 2, class: "ppv2-fd-related-hint" },
		uf = { key: 0, class: "ppv2-fd-related-rows-loading" },
		ff = { key: 1, class: "ppv2-fd-related-rows-err" },
		df = { key: 2, class: "ppv2-fd-related-table-wrap" },
		pf = { class: "ppv2-fd-related-table" },
		mf = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		hf = ["value", "disabled", "aria-label", "onChange"],
		gf = ["value"],
		vf = ["disabled", "checked", "onChange"],
		yf = ["value", "onInput"],
		bf = ["value", "onInput"],
		_f = ["value", "onInput"],
		wf = ["value", "onInput"],
		xf = { key: 6, class: "ppv2-fd-related-cell-text" },
		Sf = { key: 0, class: "ppv2-fd-related-empty" },
		$f = { key: 4, class: "ppv2-fd-related-schema" },
		Cf = { class: "ppv2-fd-related-sizer-row", title: "Drag to resize the label column" },
		kf = { key: 0, class: "ppv2-fd-section-label" },
		Ff = { class: "ppv2-fd-related-fn" },
		Df = { key: 0, class: "ppv2-fd-reqd", "aria-hidden": "true" },
		Tf = { class: "ppv2-fd-related-ft" },
		Nf = { key: 5, class: "ppv2-fd-related-placeholder ppv2-fd-related-placeholder-compact" },
		Ef = { class: "ppv2-fd-related-placeholder-text" },
		Rf = { key: 0, class: "ppv2-fd-related-placeholder-sub" },
		Of = _e(
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
					const i = Te({}),
						r = Te({}),
						a = Te({});
					let u = null,
						c = 0,
						f = 0;
					function h(d) {
						return `nce_fd_rel_lblw:${(o.definitionName || "_").trim() || "_"}:${d}`;
					}
					function g(d) {
						try {
							const m = localStorage.getItem(h(d)),
								b = parseInt(String(m), 10);
							if (Number.isFinite(b) && b >= 72 && b <= 640) return b;
						} catch {}
						return null;
					}
					function w(d) {
						let m = 8;
						for (const b of d.sections || [])
							for (const P of b.columns || [])
								for (const q of P.fields || []) {
									const A = String(q.label || q.fieldname || "").length;
									A > m && (m = A);
								}
						return Math.min(480, Math.max(120, Math.round(m * 7.2 + 28)));
					}
					function S() {
						const d = g(o.ti);
						d != null
							? (a[o.ti] = d)
							: o.tab.sections && o.tab.sections.length
							? (a[o.ti] = w(o.tab))
							: (a[o.ti] = 200);
					}
					Be(
						() => o.tab,
						() => {
							S(), N(), y(o.ti);
						},
						{ deep: !0, immediate: !0 }
					);
					function N() {
						for (const d of Object.keys(i)) delete i[d];
						for (const d of Object.keys(r)) delete r[d];
					}
					function C() {
						const d = (o.definitionName || "").trim(),
							m = (o.rootDoctype || "").trim(),
							b = String(o.rootDocName || "").trim();
						return `${d}\0${m}\0${b}`;
					}
					async function y(d) {
						var q;
						const m = o.tab;
						if (
							!((q = m == null ? void 0 : m._related) != null && q.child_row_name) ||
							!o.rootDocName ||
							!String(o.definitionName || "").trim() ||
							!String(o.rootDoctype || "").trim()
						)
							return;
						const b = C(),
							P = (r[d] || 0) + 1;
						(r[d] = P), i[d] || (i[d] = {}), (i[d].loading = !0), (i[d].error = null);
						try {
							const A = await ut(
								"nce_events.api.form_dialog_api.get_form_dialog_related_rows",
								{
									definition: String(o.definitionName).trim(),
									related_row_name: m._related.child_row_name,
									root_doctype: String(o.rootDoctype).trim(),
									root_name: String(o.rootDocName).trim(),
									limit: 500,
								}
							);
							if (r[d] !== P) return;
							i[d].fetchKey = b;
							const H = Array.isArray(A.rows) ? A.rows : [];
							(i[d].baseline = JSON.parse(JSON.stringify(H))),
								(i[d].rows = H.map((T) => ({ ...T }))),
								(i[d].columns = Array.isArray(A.columns) ? A.columns : []),
								l("related-dirty", !1);
						} catch (A) {
							if (r[d] !== P) return;
							(i[d].rows = []),
								(i[d].baseline = []),
								(i[d].columns = []),
								(i[d].error =
									(A == null ? void 0 : A.message) ||
									String(A) ||
									"Failed to load related rows");
						} finally {
							r[d] === P && (i[d].loading = !1);
						}
					}
					function M(d) {
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
					function $(d) {
						return !!(d && d.fieldtype === "Select");
					}
					function x(d, m) {
						const b = M(d.options),
							P = String(k(m, d) ?? "").trim();
						return P && !b.includes(P) ? [...b, P] : b.length ? b : P ? [P] : [];
					}
					function k(d, m) {
						return !d || !m ? null : d[m.fieldname];
					}
					function L(d, m) {
						const b = k(d, m);
						return b === 1 || b === !0 || b === "1" || b === "Yes";
					}
					function U(d, m) {
						const b = k(d, m);
						if (b == null || b === "") return "";
						if (typeof b == "object")
							try {
								return JSON.stringify(b);
							} catch {
								return String(b);
							}
						return String(b);
					}
					const V = new Set([
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
					function z(d) {
						if (!d || !(Number(d.editable) === 1 || d.editable === !0)) return !1;
						const m = d.fieldtype;
						return !V.has(m);
					}
					function te(d) {
						const m = d == null ? void 0 : d.fieldtype;
						return m === "Int" || m === "Float" || m === "Currency";
					}
					function re(d) {
						return (
							(d == null ? void 0 : d.fieldtype) === "Text" ||
							(d == null ? void 0 : d.fieldtype) === "Long Text"
						);
					}
					function B(d, m) {
						const b = i[d];
						return !(b != null && b.baseline) || m == null || m === ""
							? null
							: b.baseline.find((P) => P.name === m) ?? null;
					}
					function I(d, m, b) {
						if (!z(b) || (m == null ? void 0 : m.name) == null || m.name === "")
							return !1;
						const P = B(d, m.name);
						return P ? !W(m[b.fieldname], P[b.fieldname]) : !1;
					}
					function W(d, m) {
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
					function J() {
						for (const d of Object.keys(i)) {
							const m = Number(d);
							if (Number.isInteger(m) && de(m)) return !0;
						}
						return !1;
					}
					let Y = !1;
					function ee() {
						Y ||
							((Y = !0),
							bt(() => {
								(Y = !1), l("related-dirty", J());
							}));
					}
					function de(d) {
						const m = i[d];
						if (!(m != null && m.rows) || !m.baseline) return !1;
						const b = (m.columns || []).filter(z);
						if (!b.length) return !1;
						for (const P of m.rows) {
							const q = P.name;
							if (!q) continue;
							const A = m.baseline.find((H) => H.name === q);
							if (A) {
								for (const H of b)
									if (!W(P[H.fieldname], A[H.fieldname])) return !0;
							}
						}
						return !1;
					}
					function ve(d) {
						var q, A;
						const m = i[d];
						if (
							!((q = m == null ? void 0 : m.rows) != null && q.length) ||
							!((A = m.baseline) != null && A.length)
						)
							return [];
						const b = (m.columns || []).filter(z);
						if (!b.length) return [];
						const P = [];
						for (const H of m.rows) {
							const T = H.name;
							if (!T) continue;
							const D = m.baseline.find((E) => E.name === T);
							if (!D) continue;
							const O = {};
							for (const E of b) {
								const K = E.fieldname;
								W(H[K], D[K]) || (O[K] = H[K]);
							}
							Object.keys(O).length && P.push({ name: T, values: O });
						}
						return P;
					}
					function Me(d, m, b) {
						(d[m.fieldname] = b.target.value), ee();
					}
					function ke(d, m, b) {
						(d[m.fieldname] = b.target.checked ? 1 : 0), ee();
					}
					function tt(d, m) {
						const b = k(d, m);
						return b == null || b === "" ? "" : Number(b);
					}
					function Fe(d, m, b) {
						const P = b.target.value;
						(d[m.fieldname] = P === "" ? null : Number(P)), ee();
					}
					function He(d, m) {
						const b = k(d, m);
						return b == null || b === "" ? "" : String(b).slice(0, 10);
					}
					function Je(d, m, b) {
						(d[m.fieldname] = b.target.value || null), ee();
					}
					function Xe(d, m, b) {
						(d[m.fieldname] = b.target.value), ee();
					}
					function Ct() {
						for (const d of Object.keys(i)) {
							const m = Number(d),
								b = i[m];
							if (!(b != null && b.baseline) || !Array.isArray(b.rows)) continue;
							const P = JSON.parse(JSON.stringify(b.baseline));
							b.rows.splice(0, b.rows.length);
							for (const q of P) b.rows.push({ ...q });
						}
						l("related-dirty", !1);
					}
					async function kt() {
						var T;
						const d = String(o.rootDocName || "").trim(),
							m = String(o.definitionName || "").trim(),
							b = String(o.rootDoctype || "").trim();
						if (!d || !m || !b) return;
						const P = o.tab,
							q =
								(T = P == null ? void 0 : P._related) == null
									? void 0
									: T.child_row_name;
						if (!q) return;
						const A = ve(o.ti);
						if (!A.length) return;
						await ut("nce_events.api.form_dialog_api.save_form_dialog_related_rows", {
							definition: m,
							related_row_name: q,
							root_doctype: b,
							root_name: d,
							updates: A,
						});
						const H = i[o.ti];
						H != null && H.rows && (H.baseline = JSON.parse(JSON.stringify(H.rows))),
							l("related-dirty", !1);
					}
					t({ saveAllRelatedRows: kt, resetRelatedToBaseline: Ct });
					function Ke(d) {
						const m = a[d];
						return typeof m == "number" && Number.isFinite(m) ? m : 200;
					}
					function Qt(d) {
						if (u == null) return;
						const m = d.clientX - c,
							b = Math.min(640, Math.max(72, f + m));
						a[u] = b;
					}
					function p() {
						if (u != null)
							try {
								localStorage.setItem(h(u), String(a[u]));
							} catch {}
						(u = null),
							window.removeEventListener("mousemove", Qt),
							window.removeEventListener("mouseup", p);
					}
					function v(d, m) {
						(u = d),
							(c = m.clientX),
							(f = Ke(d)),
							window.addEventListener("mousemove", Qt),
							window.addEventListener("mouseup", p);
					}
					return (
						Yt(() => {
							window.removeEventListener("mousemove", Qt),
								window.removeEventListener("mouseup", p);
						}),
						(d, m) => {
							var b, P, q;
							return e.tab._related
								? (_(),
								  F("div", nf, [
										j("p", of, [
											Ye(G(e.tab._related.doctype) + " ", 1),
											e.tab._related.link_field
												? (_(),
												  F(
														"span",
														lf,
														" · " + G(e.tab._related.link_field),
														1
												  ))
												: le("", !0),
											e.tab._related.hop_chain &&
											e.tab._related.hop_chain.length
												? (_(),
												  F(
														"span",
														sf,
														" · " +
															G(e.tab._related.hop_chain.length) +
															"-hop ",
														1
												  ))
												: le("", !0),
										]),
										e.tab._related.captureError
											? (_(),
											  F(
													"p",
													rf,
													" Schema note: " +
														G(e.tab._related.captureError),
													1
											  ))
											: le("", !0),
										e.tab._related.child_row_name
											? e.rootDocName
												? (_(),
												  F(
														oe,
														{ key: 3 },
														[
															(b = i[e.ti]) != null && b.loading
																? (_(),
																  F(
																		"div",
																		uf,
																		" Loading related rows… "
																  ))
																: (P = i[e.ti]) != null && P.error
																? (_(),
																  F(
																		"div",
																		ff,
																		G(i[e.ti].error),
																		1
																  ))
																: (
																		((q = i[e.ti]) == null
																			? void 0
																			: q.columns) || []
																  ).length
																? (_(),
																  F("div", df, [
																		j("table", pf, [
																			j("thead", null, [
																				j("tr", null, [
																					(_(!0),
																					F(
																						oe,
																						null,
																						he(
																							i[e.ti]
																								.columns,
																							(
																								A
																							) => (
																								_(),
																								F(
																									"th",
																									{
																										key: A.fieldname,
																										class: "ppv2-fd-related-th",
																									},
																									[
																										Ye(
																											G(
																												A.label ||
																													A.fieldname
																											),
																											1
																										),
																										s(
																											A
																										)
																											? (_(),
																											  F(
																													"span",
																													mf,
																													" * "
																											  ))
																											: le(
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
																			j("tbody", null, [
																				(_(!0),
																				F(
																					oe,
																					null,
																					he(
																						i[e.ti]
																							.rows ||
																							[],
																						(A, H) => (
																							_(),
																							F(
																								"tr",
																								{
																									key: String(
																										A.name !=
																											null
																											? A.name
																											: H
																									),
																								},
																								[
																									(_(
																										!0
																									),
																									F(
																										oe,
																										null,
																										he(
																											i[
																												e
																													.ti
																											]
																												.columns,
																											(
																												T
																											) => (
																												_(),
																												F(
																													"td",
																													{
																														key: T.fieldname,
																														class: Ie(
																															[
																																"ppv2-fd-related-td",
																																{
																																	"ppv2-fd-related-td--editable":
																																		z(
																																			T
																																		),
																																	"ppv2-fd-related-td--dirty":
																																		I(
																																			e.ti,
																																			A,
																																			T
																																		),
																																},
																															]
																														),
																													},
																													[
																														$(
																															T
																														)
																															? (_(),
																															  F(
																																	"select",
																																	{
																																		key: 0,
																																		class: "ppv2-fd-related-select",
																																		value: String(
																																			k(
																																				A,
																																				T
																																			) ??
																																				""
																																		),
																																		disabled:
																																			!z(
																																				T
																																			),
																																		"aria-label":
																																			T.label ||
																																			T.fieldname,
																																		onChange:
																																			(
																																				D
																																			) =>
																																				Me(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	[
																																		m[1] ||
																																			(m[1] =
																																				j(
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
																																		F(
																																			oe,
																																			null,
																																			he(
																																				x(
																																					T,
																																					A
																																				),
																																				(
																																					D
																																				) => (
																																					_(),
																																					F(
																																						"option",
																																						{
																																							key: D,
																																							value: D,
																																						},
																																						G(
																																							D
																																						),
																																						9,
																																						gf
																																					)
																																				)
																																			),
																																			128
																																		)),
																																	],
																																	40,
																																	hf
																															  ))
																															: T.fieldtype ===
																															  "Check"
																															? (_(),
																															  F(
																																	"input",
																																	{
																																		key: 1,
																																		type: "checkbox",
																																		class: "ppv2-fd-related-check",
																																		disabled:
																																			!z(
																																				T
																																			),
																																		checked:
																																			L(
																																				A,
																																				T
																																			),
																																		onChange:
																																			(
																																				D
																																			) =>
																																				ke(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	null,
																																	40,
																																	vf
																															  ))
																															: z(
																																	T
																															  ) &&
																															  te(
																																	T
																															  )
																															? (_(),
																															  F(
																																	"input",
																																	{
																																		key: 2,
																																		type: "number",
																																		class: "ppv2-fd-related-inp",
																																		value: tt(
																																			A,
																																			T
																																		),
																																		onInput:
																																			(
																																				D
																																			) =>
																																				Fe(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	null,
																																	40,
																																	yf
																															  ))
																															: z(
																																	T
																															  ) &&
																															  T.fieldtype ===
																																	"Date"
																															? (_(),
																															  F(
																																	"input",
																																	{
																																		key: 3,
																																		type: "date",
																																		class: "ppv2-fd-related-inp",
																																		value: He(
																																			A,
																																			T
																																		),
																																		onInput:
																																			(
																																				D
																																			) =>
																																				Je(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	null,
																																	40,
																																	bf
																															  ))
																															: z(
																																	T
																															  ) &&
																															  re(
																																	T
																															  )
																															? (_(),
																															  F(
																																	"textarea",
																																	{
																																		key: 4,
																																		class: "ppv2-fd-related-textarea",
																																		rows: "2",
																																		value: String(
																																			k(
																																				A,
																																				T
																																			) ??
																																				""
																																		),
																																		onInput:
																																			(
																																				D
																																			) =>
																																				Xe(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	null,
																																	40,
																																	_f
																															  ))
																															: z(
																																	T
																															  )
																															? (_(),
																															  F(
																																	"input",
																																	{
																																		key: 5,
																																		type: "text",
																																		class: "ppv2-fd-related-inp",
																																		value: String(
																																			k(
																																				A,
																																				T
																																			) ??
																																				""
																																		),
																																		onInput:
																																			(
																																				D
																																			) =>
																																				Xe(
																																					A,
																																					T,
																																					D
																																				),
																																	},
																																	null,
																																	40,
																																	wf
																															  ))
																															: (_(),
																															  F(
																																	"span",
																																	xf,
																																	G(
																																		U(
																																			A,
																																			T
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
																			? le("", !0)
																			: (_(),
																			  F(
																					"p",
																					Sf,
																					" No related records. "
																			  )),
																  ]))
																: le("", !0),
														],
														64
												  ))
												: (_(),
												  F(
														"p",
														cf,
														" Save the document to load related rows. "
												  ))
											: (_(),
											  F(
													"p",
													af,
													" Related tab is missing a server row id. Re-save the Form Dialog from Desk. "
											  )),
										e.tab.sections && e.tab.sections.length
											? (_(),
											  F("details", $f, [
													m[2] ||
														(m[2] = j(
															"summary",
															{
																class: "ppv2-fd-related-schema-sum",
															},
															"Field metadata",
															-1
														)),
													j(
														"div",
														{
															class: "ppv2-fd-related-preview",
															style: $e({
																"--ppv2-fd-rel-lbl":
																	Ke(e.ti) + "px",
															}),
														},
														[
															j("div", Cf, [
																j(
																	"span",
																	{
																		class: "ppv2-fd-related-sizer-spacer",
																		style: $e({
																			width: Ke(e.ti) + "px",
																		}),
																	},
																	null,
																	4
																),
																j(
																	"button",
																	{
																		type: "button",
																		class: "ppv2-fd-related-sizer-grip",
																		"aria-label":
																			"Resize label column",
																		onMousedown:
																			m[0] ||
																			(m[0] = Ce(
																				(A) => v(e.ti, A),
																				["prevent"]
																			)),
																	},
																	null,
																	32
																),
															]),
															(_(!0),
															F(
																oe,
																null,
																he(
																	e.tab.sections,
																	(A, H) => (
																		_(),
																		F(
																			"div",
																			{
																				key: "rs" + H,
																				class: "ppv2-fd-section",
																			},
																			[
																				A.label
																					? (_(),
																					  F(
																							"h3",
																							kf,
																							G(
																								A.label
																							),
																							1
																					  ))
																					: le("", !0),
																				j(
																					"div",
																					{
																						class: "ppv2-fd-columns",
																						style: $e({
																							gridTemplateColumns:
																								"repeat(" +
																								Math.max(
																									A
																										.columns
																										.length,
																									1
																								) +
																								", 1fr)",
																						}),
																					},
																					[
																						(_(!0),
																						F(
																							oe,
																							null,
																							he(
																								A.columns,
																								(
																									T,
																									D
																								) => (
																									_(),
																									F(
																										"div",
																										{
																											key:
																												"rc" +
																												D,
																										},
																										[
																											(_(
																												!0
																											),
																											F(
																												oe,
																												null,
																												he(
																													T.fields,
																													(
																														O
																													) => (
																														_(),
																														F(
																															"div",
																															{
																																key: O.fieldname,
																																class: "ppv2-fd-related-field-row",
																															},
																															[
																																j(
																																	"span",
																																	Ff,
																																	[
																																		Ye(
																																			G(
																																				O.label ||
																																					O.fieldname
																																			),
																																			1
																																		),
																																		s(
																																			O
																																		)
																																			? (_(),
																																			  F(
																																					"span",
																																					Df,
																																					" * "
																																			  ))
																																			: le(
																																					"",
																																					!0
																																			  ),
																																	]
																																),
																																j(
																																	"span",
																																	Tf,
																																	G(
																																		O.fieldtype
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
											  F("div", Nf, [
													j(
														"p",
														Ef,
														G(
															e.tab._related.label ||
																e.tab._related.doctype
														),
														1
													),
													e.tab._related.captureError
														? le("", !0)
														: (_(),
														  F(
																"p",
																Rf,
																" No field layout stored for this tab. "
														  )),
											  ])),
								  ]))
								: le("", !0);
						}
					);
				},
			},
			[["__scopeId", "data-v-fd4326df"]]
		),
		Pf = { class: "ppv2-fd-body" },
		Af = { key: 0, class: "ppv2-fd-loading" },
		Mf = { key: 1, class: "ppv2-fd-error" },
		If = { class: "ppv2-fd-tab-panels" },
		Lf = { key: 0, class: "ppv2-fd-section-label" },
		jf = { key: 1, class: "ppv2-fd-section-desc" },
		Vf = { key: 0, class: "ppv2-fd-validation-error" },
		Bf = _e(
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
						l = Lr(e, "activeTab");
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
							F("div", Pf, [
								e.loading
									? (_(), F("div", Af, "Loading…"))
									: e.error
									? (_(), F("div", Mf, G(e.error), 1))
									: e.tabs.length
									? (_(),
									  F(
											oe,
											{ key: 2 },
											[
												we(
													tf,
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
												j("div", If, [
													(_(!0),
													F(
														oe,
														null,
														he(
															e.tabs,
															(h, g) => (
																_(),
																F(
																	"div",
																	{
																		key: g,
																		class: Ie([
																			"ppv2-fd-tab-panel",
																			{
																				"ppv2-fd-tab-panel-active":
																					e.tabs
																						.length ===
																						1 ||
																					l.value === g,
																			},
																		]),
																	},
																	[
																		h._related
																			? (_(),
																			  xe(
																					Of,
																					{
																						key: 0,
																						ref_for:
																							!0,
																						ref: (w) =>
																							(r.value[
																								g
																							] = w),
																						ti: g,
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
																									w
																								) =>
																									c.$emit(
																										"related-dirty",
																										w
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
																			  F(
																					oe,
																					{ key: 1 },
																					he(
																						h.sections,
																						(w, S) => (
																							_(),
																							F(
																								"div",
																								{
																									key: S,
																									class: "ppv2-fd-section",
																								},
																								[
																									w.label
																										? (_(),
																										  F(
																												"h3",
																												Lf,
																												G(
																													w.label
																												),
																												1
																										  ))
																										: le(
																												"",
																												!0
																										  ),
																									w.description
																										? (_(),
																										  F(
																												"p",
																												jf,
																												G(
																													w.description
																												),
																												1
																										  ))
																										: le(
																												"",
																												!0
																										  ),
																									j(
																										"div",
																										{
																											class: "ppv2-fd-columns",
																											style: $e(
																												{
																													gridTemplateColumns:
																														"repeat(" +
																														w
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
																											F(
																												oe,
																												null,
																												he(
																													w.columns,
																													(
																														N,
																														C
																													) => (
																														_(),
																														F(
																															"div",
																															{
																																key: C,
																															},
																															[
																																(_(
																																	!0
																																),
																																F(
																																	oe,
																																	null,
																																	he(
																																		N.fields,
																																		(
																																			y
																																		) => (
																																			_(),
																																			xe(
																																				Zu,
																																				{
																																					key: y.fieldname,
																																					field: y,
																																					"model-value":
																																						e
																																							.formData[
																																							y
																																								.fieldname
																																						],
																																					visible:
																																						e.isFieldVisible(
																																							y
																																						),
																																					mandatory:
																																						e.isFieldMandatory(
																																							y
																																						),
																																					"read-only":
																																						e.isFieldReadOnly(
																																							y
																																						),
																																					"field-dirty":
																																						!e.isFieldReadOnly(
																																							y
																																						) &&
																																						s(
																																							y.fieldname
																																						),
																																					onChange:
																																						f[2] ||
																																						(f[2] =
																																							(
																																								M
																																							) =>
																																								c.$emit(
																																									"field-change",
																																									M
																																								)),
																																					onLinkChange:
																																						f[3] ||
																																						(f[3] =
																																							(
																																								M
																																							) =>
																																								c.$emit(
																																									"link-change",
																																									M
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
													? (_(), F("div", Vf, G(e.validationError), 1))
													: le("", !0),
											],
											64
									  ))
									: le("", !0),
							])
						)
					);
				},
			},
			[["__scopeId", "data-v-323b64e2"]]
		),
		Hf = { class: "ppv2-fd-footer" },
		qf = { class: "ppv2-fd-custom-buttons" },
		Uf = ["onClick"],
		Wf = { class: "ppv2-fd-action-buttons" },
		Kf = ["disabled"],
		zf = ["disabled"],
		Yf = _e(
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
						F("div", Hf, [
							j("div", qf, [
								(_(!0),
								F(
									oe,
									null,
									he(
										e.buttons,
										(o, l) => (
											_(),
											F(
												"button",
												{
													key: "fd-btn-" + l + "-" + (o.label || l),
													type: "button",
													class: "ppv2-fd-tab-btn",
													onClick: (s) => t.$emit("custom-button", o),
												},
												G(o.label),
												9,
												Uf
											)
										)
									),
									128
								)),
							]),
							j("div", Wf, [
								j(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn",
										onClick: n[0] || (n[0] = (o) => t.$emit("cancel")),
									},
									"Cancel"
								),
								j(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn",
										disabled: e.saving || !e.isDirty,
										onClick: n[1] || (n[1] = (o) => t.$emit("revert")),
									},
									" Revert ",
									8,
									Kf
								),
								j(
									"button",
									{
										type: "button",
										class: "ppv2-fd-tab-btn ppv2-fd-tab-active",
										disabled: e.saving,
										onClick: n[2] || (n[2] = (o) => t.$emit("submit")),
									},
									G(e.saving ? "Saving…" : "Submit"),
									9,
									zf
								),
							]),
						])
					);
				},
			},
			[["__scopeId", "data-v-0713f20d"]]
		);
	function si(e) {
		const t = fe(e) || {},
			n = {};
		for (const o of Object.keys(t).sort()) {
			let l = t[o];
			l === void 0 && (l = null), (n[o] = l);
		}
		return JSON.stringify(n);
	}
	function Jf(e, t) {
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
				const u = await ut("frappe.client.get_value", {
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
	function Zt(e, t) {
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
	const Xf = ["Tab Break", "Section Break", "Column Break", "Heading", "HTML", "Image", "Fold"];
	function Yo(e) {
		return Xf.includes(e);
	}
	function ii(e) {
		return e == null || e === "" || e === 0;
	}
	function Jo(e) {
		return e ? Number(e.is_virtual) === 1 || e.is_virtual === !0 : !1;
	}
	function Gf(e, t) {
		const n = [];
		for (const o of e) {
			if (Yo(o.fieldtype) || o.hidden || Jo(o) || (o.depends_on && !Zt(o.depends_on, t)))
				continue;
			if (o.reqd || (o.mandatory_depends_on && Zt(o.mandatory_depends_on, t))) {
				const s = t[o.fieldname];
				ii(s) &&
					n.push({
						fieldname: o.fieldname,
						label: o.label,
						message: `${o.label} is required`,
					});
			}
		}
		return n;
	}
	function Zf(e, t, n) {
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
				(r.depends_on && !Zt(r.depends_on, t))
			)
				continue;
			const a = t[r.fieldname];
			ii(a) &&
				o.push({
					fieldname: r.fieldname,
					label: r.label,
					message: `${r.label} is required`,
				});
		}
		return o;
	}
	function Qf(e, t) {
		return e.hidden ? !1 : e.depends_on ? Zt(e.depends_on, t) : !0;
	}
	function ed(e, t) {
		return e.mandatory_depends_on ? Zt(e.mandatory_depends_on, t) : !!e.reqd;
	}
	function td(e, t) {
		return Jo(e) ? !0 : e.read_only_depends_on ? Zt(e.read_only_depends_on, t) : !!e.read_only;
	}
	function ri(e) {
		try {
			const t = JSON.parse((e == null ? void 0 : e._server_messages) || "[]");
			if (t.length) return t.map((n) => (typeof n == "object" ? n.message : n)).join(" ");
		} catch {}
		return (e == null ? void 0 : e.message) || "Failed to save";
	}
	async function nd({
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
				c = await ut("nce_events.api.form_dialog_api.save_form_dialog_document", {
					doc: { doctype: R(o), ...e },
					writeback_fetches: u ? 1 : 0,
				});
			return Object.assign(e, c), (t.value = JSON.parse(JSON.stringify(e))), c;
		} catch (u) {
			throw ((s.value = ri(u)), u);
		} finally {
			l.value = !1;
		}
	}
	function ai(e) {
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
				  ci(n) && t.push(n),
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
		return o.columns.push(l), n.sections.push(o), ci(n) && t.push(n), t;
	}
	function ci(e) {
		return e.sections.some((t) => t.columns.some((n) => n.fields.length > 0));
	}
	function od(e) {
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
	function ld(e) {
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
			handleFetchFrom: g,
			syncingFromLoad: w,
			loadDebugLog: S,
		} = e;
		let N = 0;
		function C($, x, k = "", L = null) {
			!so() ||
				!S ||
				S.value.push({
					t: new Date().toISOString(),
					step: $,
					ok: x,
					detail: k || "",
					err: L ? String(L) : null,
				});
		}
		function y() {
			(N += 1),
				(w.value = !1),
				(u.value = !1),
				(c.value = null),
				(f.value = null),
				(s.value = []),
				(i.value = []),
				(l.value = null),
				(h.value = []);
			for (const $ of Object.keys(r)) delete r[$];
			(a.value = {}), so() && S && (S.value = []);
		}
		async function M() {
			var U;
			const $ = ++N;
			(u.value = !0), (c.value = null), (f.value = null), (w.value = !1);
			const x = R(t),
				k = R(n),
				L = R(o);
			so() && S && (S.value = []),
				C("start", !0, `seq=${$} doctype=${k} docName=${L ?? "(new)"} definition=${x}`);
			try {
				let V;
				try {
					V = await ut("nce_events.api.form_dialog_api.get_form_dialog_definition", {
						name: x,
					});
				} catch (B) {
					throw (
						(C(
							"get_form_dialog_definition",
							!1,
							x,
							(B == null ? void 0 : B.message) || B
						),
						B)
					);
				}
				if ($ !== N) {
					C("aborted", !1, "stale seq after get_form_dialog_definition");
					return;
				}
				C(
					"get_form_dialog_definition",
					!0,
					`ok dialog_size=${(V == null ? void 0 : V.dialog_size) ?? "?"}`
				),
					(l.value = V),
					(h.value = V.buttons || []);
				const z = ((U = V.frozen_meta) == null ? void 0 : U.fields) || [];
				(i.value = z), (s.value = ai(z));
				let te = 0;
				try {
					const B = V.related_doctypes || [];
					for (const I of B)
						try {
							if (!I || typeof I != "object") continue;
							const W = I.doctype || I.child_doctype;
							if (!W) continue;
							let J = null;
							if (I.info != null && String(I.info).trim())
								try {
									J = typeof I.info == "string" ? JSON.parse(I.info) : I.info;
								} catch {
									J = null;
								}
							const Y = (J && J.label) || I.label || I.tab_label || W,
								ee = od(I.hop_chain);
							let de = [];
							if (J && Array.isArray(J.fields) && J.fields.length)
								try {
									const ve = ai(J.fields);
									ve.length && ve[0].sections && (de = ve[0].sections);
								} catch {
									de = [];
								}
							s.value.push({
								label: Y,
								sections: de,
								_related: {
									doctype: (J && J.doctype) || W,
									link_field: (J && J.link_field) || I.link_field || "",
									label: Y,
									hop_chain: ee,
									child_row_name: I.child_row_name || I.name || "",
									captureError: J && J.capture_error,
									hasLayout: de.length > 0,
								},
							}),
								(te += 1);
						} catch {}
				} catch {}
				C(
					"parseLayout",
					!0,
					`fields=${z.length} tabs=${s.value.length} (incl ${te} related)`
				),
					(w.value = !0),
					C("syncingFromLoad", !0, "true (formData write + fetch_from)");
				for (const B of Object.keys(r)) delete r[B];
				for (const B of z)
					B.fieldname && !Yo(B.fieldtype) && (r[B.fieldname] = B.default || null);
				if ((C("formData seed", !0, "defaults from meta"), L)) {
					let B;
					try {
						B = await ut("frappe.client.get", { doctype: k, name: L });
					} catch (I) {
						throw (
							(C(
								"frappe.client.get",
								!1,
								`${k}/${L}`,
								(I == null ? void 0 : I.message) || I
							),
							I)
						);
					}
					if ($ !== N) {
						C("aborted", !1, "stale seq after client.get");
						return;
					}
					Object.assign(r, B),
						C(
							"frappe.client.get",
							!0,
							`${k}/${L} keys=${Object.keys(B || {}).length}`
						);
				} else C("frappe.client.get", !0, "(skipped — new doc)");
				const re = z.filter((B) => B.fieldtype === "Link" && B.options && r[B.fieldname]);
				if ((await Promise.all(re.map((B) => g(B.fieldname, r[B.fieldname]))), $ !== N)) {
					C("aborted", !1, "stale seq after fetch_from");
					return;
				}
				C("fetch_from batch", !0, `${re.length} link field(s)`),
					(a.value = JSON.parse(JSON.stringify(r))),
					C("originalData snapshot", !0, `keys=${Object.keys(r).length}`);
			} catch (V) {
				if ($ !== N) {
					C("catch (ignored)", !1, "stale seq", (V == null ? void 0 : V.message) || V);
					return;
				}
				const z =
					(V == null ? void 0 : V.message) ||
					(V == null ? void 0 : V.toString()) ||
					"Failed to load form";
				(c.value = z), C("load failed", !1, "", z);
			} finally {
				$ === N && (u.value = !1),
					await bt(),
					await bt(),
					(w.value = !1),
					C(
						"done",
						$ === N,
						$ === N
							? "loading=false syncingFromLoad=false"
							: "stale — skipped UI reset"
					);
			}
		}
		return { load: M, resetWhenClosed: y };
	}
	function sd({ definitionName: e, doctype: t, docName: n, requiredFields: o }) {
		const l = o,
			s = X(null),
			i = X([]),
			r = X([]),
			a = Te({}),
			u = X({}),
			c = X(!1),
			f = X(!1),
			h = X(null),
			g = X(null),
			w = X([]),
			S = X(!1),
			N = X([]),
			C = Jf(r, a),
			{ load: y, resetWhenClosed: M } = ld({
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
				validationError: g,
				buttons: w,
				handleFetchFrom: C,
				syncingFromLoad: S,
				loadDebugLog: N,
			}),
			$ = ie(() => !R(n)),
			x = ie(() => {
				const I = R(t),
					W = R(n);
				return W ? `Edit ${I}: ${W}` : `New ${I}`;
			}),
			k = ie(() => {
				var I;
				return ((I = s.value) == null ? void 0 : I.dialog_size) || "xl";
			}),
			L = ie(() => (c.value ? !1 : si(a) !== si(u.value)));
		function U() {
			const I = Gf(r.value, a),
				W = Zf(r.value, a, l ? R(l) : []),
				J = new Set(I.map((ee) => ee.fieldname)),
				Y = I.slice();
			for (const ee of W) J.has(ee.fieldname) || (J.add(ee.fieldname), Y.push(ee));
			return Y;
		}
		async function V() {
			return nd({
				formData: a,
				originalData: u,
				definition: s,
				doctype: t,
				saving: f,
				validationError: g,
				runValidate: U,
			});
		}
		function z() {
			const I = u.value;
			for (const W of Object.keys(a)) a[W] = I[W] !== void 0 ? I[W] : null;
		}
		function te(I) {
			return Qf(I, a);
		}
		function re(I) {
			if (ed(I, a)) return !0;
			const W = l ? R(l) : [];
			if (!Array.isArray(W) || !W.length) return !1;
			const J = I.fieldname;
			return W.some((Y) => String(Y || "").trim() === J && !String(Y).includes("."));
		}
		function B(I) {
			return td(I, a);
		}
		return {
			definition: s,
			tabs: i,
			allFields: r,
			formData: a,
			originalData: u,
			isDirty: L,
			syncingFromLoad: S,
			loading: c,
			saving: f,
			error: h,
			validationError: g,
			buttons: w,
			isNew: $,
			dialogTitle: x,
			dialogSize: k,
			resetWhenClosed: M,
			load: y,
			validate: U,
			save: V,
			revert: z,
			isFieldVisible: te,
			isFieldMandatory: re,
			isFieldReadOnly: B,
			handleFetchFrom: C,
			loadDebugLog: N,
		};
	}
	function id(e) {
		return typeof window.__ == "function" ? window.__(e) : e;
	}
	function Xo(e, t) {
		if (!e()) {
			t();
			return;
		}
		const n = id("You have unsaved changes. Discard them and continue?");
		typeof frappe < "u" && frappe.confirm
			? frappe.confirm(
					n,
					() => t(),
					() => {}
			  )
			: window.confirm(n) && t();
	}
	function rd({ getOpen: e, getCanPrev: t, getCanNext: n, onNavPrev: o, onNavNext: l }) {
		return function (i) {
			e() &&
				(!i.altKey ||
					(i.key !== "ArrowLeft" && i.key !== "ArrowRight") ||
					(i.key === "ArrowLeft" && t()
						? (i.preventDefault(), o())
						: i.key === "ArrowRight" && n() && (i.preventDefault(), l())));
		};
	}
	const ad = { class: "ppv2-fd-load-debug-inner" },
		cd = { class: "ppv2-fd-load-debug-hd" },
		ud = { class: "ppv2-fd-load-debug-hint" },
		fd = { class: "ppv2-fd-load-debug-body" },
		dd = { class: "ppv2-fd-load-debug-t" },
		pd = { class: "ppv2-fd-load-debug-s" },
		md = { class: "ppv2-fd-load-debug-d" },
		hd = { key: 0, class: "ppv2-fd-load-debug-e" },
		io = _e(
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
						r = sd({
							definitionName: In(n, "definitionName"),
							doctype: In(n, "doctype"),
							docName: In(n, "docName"),
							requiredFields: In(n, "requiredFields"),
						});
					Al("fdSyncingFromLoad", r.syncingFromLoad);
					const a = X(!1);
					Be(
						() => n.open,
						(x) => {
							x && (a.value = so());
						},
						{ immediate: !0 }
					);
					const u = ie(() => r.loadDebugLog.value),
						c = ie(() => r.isDirty.value || i.value);
					function f(x) {
						i.value = !!x;
					}
					function h() {
						Xo(
							() => c.value,
							() => {
								var x, k;
								r.revert(),
									(k =
										(x = s.value) == null
											? void 0
											: x.resetRelatedToBaseline) == null || k.call(x),
									(i.value = !1),
									o("close");
							}
						);
					}
					function g() {
						if (!c.value || r.saving.value) return;
						const x =
								typeof window.__ == "function"
									? window.__(
											"Discard all changes to this form and related rows and restore the last loaded values?"
									  )
									: "Discard all changes to this form and related rows and restore the last loaded values?",
							k = () => {
								var L, U;
								r.revert(),
									(r.validationError.value = null),
									(U =
										(L = s.value) == null
											? void 0
											: L.resetRelatedToBaseline) == null || U.call(L),
									(i.value = !1);
							};
						typeof frappe < "u" && frappe.confirm
							? frappe.confirm(x, k, () => {})
							: window.confirm(x) && k();
					}
					function w() {
						n.canNavigatePrev &&
							Xo(
								() => c.value,
								() => o("nav-prev")
							);
					}
					function S() {
						n.canNavigateNext &&
							Xo(
								() => c.value,
								() => o("nav-next")
							);
					}
					const N = rd({
						getOpen: () => n.open,
						getCanPrev: () => n.canNavigatePrev,
						getCanNext: () => n.canNavigateNext,
						onNavPrev: w,
						onNavNext: S,
					});
					Be(
						() => ({
							open: n.open,
							docName: n.docName,
							definitionName: n.definitionName,
							doctype: n.doctype,
						}),
						(x, k) => {
							if (!x.open) {
								window.removeEventListener("keydown", N, !0), r.resetWhenClosed();
								return;
							}
							window.removeEventListener("keydown", N, !0),
								window.addEventListener("keydown", N, !0);
							const U = !(k == null ? void 0 : k.open);
							(U ||
								x.docName !== (k == null ? void 0 : k.docName) ||
								x.definitionName !== (k == null ? void 0 : k.definitionName) ||
								x.doctype !== (k == null ? void 0 : k.doctype)) &&
								((U || x.docName !== (k == null ? void 0 : k.docName)) &&
									(l.value = 0),
								r.load());
						},
						{ immediate: !0 }
					),
						Yt(() => {
							window.removeEventListener("keydown", N, !0), r.resetWhenClosed();
						});
					function C({ fieldname: x, value: k }) {
						r.formData[x] = k;
					}
					async function y({ fieldname: x, value: k }) {
						(r.formData[x] = k), await r.handleFetchFrom(x, k);
					}
					async function M() {
						var x, k;
						try {
							const L = await r.save();
							try {
								await ((k =
									(x = s.value) == null ? void 0 : x.saveAllRelatedRows) == null
									? void 0
									: k.call(x));
							} catch (U) {
								const V = ri(U);
								throw (
									(typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Related rows",
											message: V,
											indicator: "red",
										}),
									U)
								);
							}
							o("saved", L), o("close");
						} catch {}
					}
					async function $(x) {
						const k = String((x == null ? void 0 : x.button_script) || "").trim();
						if (n.doctype === "Events" && k === "publish_events_to_website") {
							r.validationError.value = null;
							const L = r.validate();
							if (L.length) {
								(r.validationError.value = L.map((U) => U.message).join(", ")),
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
								const U = { doctype: n.doctype, ...r.formData },
									V = await ut(
										"nce_events.api.events_publish.publish_events_to_website",
										{ doc: U }
									);
								typeof n.reloadPanelAfterPublish == "function" &&
									(await n.reloadPanelAfterPublish()),
									typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Published",
											message: `Event ${
												(V == null ? void 0 : V.name) || ""
											} created on the site.`,
											indicator: "green",
										});
							} catch (U) {
								const V =
									(U == null ? void 0 : U.message) ||
									String(U) ||
									"Publish failed";
								(r.validationError.value = V),
									typeof frappe < "u" &&
										frappe.msgprint &&
										frappe.msgprint({
											title: "Publish",
											message: V,
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
					return (x, k) =>
						e.open
							? (_(),
							  F(
									"div",
									{
										key: 0,
										class: "ppv2-form-dialog-backdrop",
										style: $e({ opacity: e.dissolveOpacity }),
										onClick: Ce(h, ["self"]),
									},
									[
										a.value
											? (_(),
											  F(
													"div",
													{
														key: 0,
														class: "ppv2-fd-load-debug",
														onClick:
															k[0] ||
															(k[0] = Ce(() => {}, ["stop"])),
													},
													[
														j("div", ad, [
															j("div", cd, [
																k[2] ||
																	(k[2] = Ye(
																		" Form load debug ",
																		-1
																	)),
																j(
																	"span",
																	ud,
																	"localStorage " +
																		G(R(li)) +
																		"=1",
																	1
																),
															]),
															j("div", fd, [
																(_(!0),
																F(
																	oe,
																	null,
																	he(
																		u.value,
																		(L, U) => (
																			_(),
																			F(
																				"div",
																				{
																					key: U,
																					class: Ie([
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
																					j(
																						"span",
																						dd,
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
																					j(
																						"span",
																						pd,
																						G(L.step),
																						1
																					),
																					j(
																						"span",
																						md,
																						G(
																							L.detail
																						),
																						1
																					),
																					L.err
																						? (_(),
																						  F(
																								"span",
																								hd,
																								G(
																									L.err
																								),
																								1
																						  ))
																						: le(
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
											: le("", !0),
										j(
											"div",
											{
												class: Ie([
													"ppv2-form-dialog",
													"ppv2-fd-size-" + R(r).dialogSize.value,
												]),
											},
											[
												we(
													Ou,
													{
														"row-nav-enabled": e.rowNavEnabled,
														"can-navigate-prev": e.canNavigatePrev,
														"can-navigate-next": e.canNavigateNext,
														"row-nav-label": e.rowNavLabel,
														title: R(r).dialogTitle.value,
														onClose: h,
														onNavPrev: w,
														onNavNext: S,
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
												we(
													Bf,
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
															k[1] || (k[1] = (L) => (l.value = L)),
														onFieldChange: C,
														onLinkChange: y,
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
												we(
													Yf,
													{
														buttons: R(r).buttons.value,
														saving: R(r).saving.value,
														"is-dirty": c.value,
														onCancel: h,
														onRevert: g,
														onSubmit: M,
														onCustomButton: $,
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
							: le("", !0);
				},
			},
			[["__scopeId", "data-v-ffb8960a"]]
		),
		gd = { class: "ppv2-root" },
		vd = { class: "ppv2-title" },
		yd = { class: "ppv2-title" },
		bd = Ua(
			_e(
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
							c = ie(() =>
								(o.value || [])
									.filter((D) => D.fieldname !== "nce_name")
									.map((D) =>
										D.fieldname === "frappe_doctype"
											? { ...D, is_link: !1 }
											: D
									)
							),
							f = Te([]);
						let h = 0;
						const g = Te([]),
							w = X(""),
							S = X(0),
							N = X(80),
							{
								formDialogDocName: C,
								formDialogDefinition: y,
								formDialogDoctype: M,
								formDialogRequiredFields: $,
								formDialogNavInfo: x,
								formDialogNavLabel: k,
								onFormDialogNavPrev: L,
								onFormDialogNavNext: U,
								openFormDialogFromPanelRow: V,
								onFormDialogClose: z,
								onFormDialogSaved: te,
								reloadPanelForFormDialogDoctype: re,
								formDialogSlot: B,
								formDialogPendingDocName: I,
								formDialogPendingDefinition: W,
								formDialogPendingDoctype: J,
								formDialogDissolving: Y,
								formDialogDissolveOpacity: ee,
							} = Xa(f),
							{
								cardStack: de,
								openCardModal: ve,
								closeTopCard: Me,
								onOpenCard: ke,
							} = za(),
							{ onEmail: tt, onSms: Fe, onEmailOne: He, onSmsOne: Je } = Ga();
						function Xe(D, O) {
							const E = D ? D.rows : l.value,
								K = E.findIndex((Q) => Q.name === O.name);
							K >= 0 && (E.splice(K, 1), g.push({ panel: D, row: O, idx: K }));
						}
						function Ct() {
							if (!g.length) return;
							const { panel: D, row: O, idx: E } = g.pop(),
								K = D ? D.rows : l.value,
								Q = Math.min(E, K.length);
							K.splice(Q, 0, O);
						}
						function kt(D) {
							if ((D.ctrlKey || D.metaKey) && D.key === "z") {
								if (!g.length) return;
								D.preventDefault(), Ct();
								return;
							}
						}
						Pt(() => {
							a(),
								window.addEventListener("keydown", kt),
								(window._nce_open_tag_finder = (D, O, E) => {
									D &&
										(typeof O == "number" && (S.value = O),
										typeof E == "number" && (N.value = E),
										(w.value = D));
								}),
								(window._nce_close_tag_finder = () => {
									w.value = "";
								}),
								(window._nce_open_card = (D) => {
									const O = Ya(D);
									O && ve(O.cardDefName, O.doctype, O.recordName);
								}),
								(window._nce_close_top_card = () => {
									Me();
								});
						}),
							Yt(() => {
								window.removeEventListener("keydown", kt),
									delete window._nce_open_tag_finder,
									delete window._nce_close_tag_finder,
									delete window._nce_open_card,
									delete window._nce_close_top_card;
							});
						function Ke(D) {
							var K;
							const O =
									((K = D.config) == null ? void 0 : K.header_text) ||
									D.doctype ||
									"",
								E = (D.parentContextTitle || "").trim();
							return E ? `${O} for ${E}` : O;
						}
						function Qt(D) {
							if (D === "root") return { x: 120, y: 84 };
							const O = f.find((E) => E.id === D);
							return O ? { x: O.x + 80, y: O.y + 24 } : { x: 140, y: 120 };
						}
						function p(D) {
							(w.value = D.doctype), (S.value = D.x + 20), (N.value = D.y);
						}
						async function v(D, O = {}, E = null, K = "") {
							const Q = f.findIndex((ue) => ue.doctype === D);
							Q >= 0 && d(f[Q].id);
							const ce = Qt(E),
								Z = ++h,
								ae = Te({
									id: Z,
									doctype: D,
									parentFilter: O,
									parentId: E,
									parentContextTitle: (K || "").trim(),
									config: null,
									columns: [],
									rows: [],
									total: 0,
									fullTotal: 0,
									loading: !0,
									error: null,
									x: ce.x,
									y: ce.y,
									_setFilters: null,
									_reload: null,
									_showFilter: !1,
									_floatRef: null,
								});
							f.push(ae);
							try {
								const ue = Gs(D, O);
								await ue.load(),
									(ae.config = ue.config.value),
									(ae.columns = ue.columns.value),
									(ae._panelRows = ue.rows),
									(ae.rows = ue.rows.value),
									(ae.total = ue.total.value),
									(ae.fullTotal = ue.fullTotal.value),
									(ae._setFilters = (qe) => {
										ue.setFilters(qe);
									}),
									(ae._reload = async () => {
										console.log(
											"[PanelReload] starting reload for",
											ae.doctype,
											"p.loading before:",
											ae.loading
										),
											(ae.loading = !0),
											console.log("[PanelReload] p.loading set to true");
										try {
											await ue.reload(),
												console.log(
													"[PanelReload] panel.reload() complete, panel.loading.value:",
													ue.loading.value
												),
												(ae.config = ue.config.value),
												(ae.columns = ue.columns.value),
												(ae.rows = ue.rows.value),
												(ae.total = ue.total.value),
												(ae.fullTotal = ue.fullTotal.value),
												console.log(
													"[PanelReload] p.rows updated, length:",
													ae.rows.length
												);
										} finally {
											(ae.loading = !1),
												console.log(
													"[PanelReload] p.loading set back to false"
												);
										}
									});
							} catch (ue) {
								ae.error = String(ue);
							} finally {
								ae.loading = !1;
							}
						}
						function d(D) {
							f.filter((K) => K.parentId === D).forEach((K) => d(K.id));
							const E = f.findIndex((K) => K.id === D);
							E >= 0 && f.splice(E, 1);
						}
						function m(D) {
							const O = D.frappe_doctype || D.name;
							O && v(O, {}, "root");
						}
						async function b(D, O) {
							var ce;
							const E = {};
							D.linkField && D.rowName && (E[D.linkField] = D.rowName);
							try {
								const Z = await new Promise((ue) => {
										frappe.db
											.get_value(
												"Card Definition",
												{ root_doctype: D.doctype, is_default: 1 },
												"name"
											)
											.then((qe) => ue(qe))
											.catch(() => ue(null));
									}),
									ae =
										typeof Z == "object" && Z != null && Z.name
											? Z.name
											: typeof Z == "string"
											? Z
											: null;
								if (ae && D.rowName) {
									ve(ae, D.doctype, D.rowName);
									return;
								}
							} catch {}
							let K = "";
							const Q = (
								((ce = O.config) == null ? void 0 : ce.title_field) || ""
							).trim();
							Q &&
								D.parentRow &&
								D.parentRow[Q] != null &&
								String(D.parentRow[Q]).trim() !== "" &&
								(K = String(D.parentRow[Q]).trim()),
								v(D.doctype, E, O.id, K);
						}
						function P(D, O) {
							var Q;
							if (
								!(O != null && O.name) ||
								V(D, O) ||
								!((Q = D.config) != null && Q.open_card_on_click)
							)
								return;
							const E = D.doctype.toLowerCase().replace(/ /g, "-"),
								K = `${window.location.origin}/app/${E}/${encodeURIComponent(
									O.name
								)}`;
							window.open(K, "_blank");
						}
						function q(D, O) {
							D ? D._setFilters && D._setFilters(O) : t.setFilters(O);
						}
						function A() {
							console.log(
								"[PanelReload] onRefreshRoot called, loading.value:",
								i.value
							),
								t.reload();
						}
						function H(D) {
							console.log(
								"[PanelReload] onRefreshPanel called for",
								D.doctype,
								"has _reload:",
								!!D._reload
							),
								D._reload && D._reload();
						}
						function T(D) {
							frappe.call({
								method: "nce_events.api.panel_api.export_panel_data",
								args: {
									root_doctype: D.doctype,
									filters: JSON.stringify(D.parentFilter || {}),
									user_filters: JSON.stringify([]),
								},
								callback(O) {
									if (!O.message) return;
									const K = `=IMPORTDATA("${
										window.location.origin + O.message.url
									}")`;
									navigator.clipboard && navigator.clipboard.writeText
										? navigator.clipboard.writeText(K).then(() => {
												frappe.show_alert({
													message: __(
														"Link copied — paste in Google Sheets"
													),
													indicator: "green",
												});
										  })
										: frappe.show_alert({
												message: __("Exported {0} rows", [
													O.message.rows_exported,
												]),
												indicator: "green",
										  });
								},
							});
						}
						return (D, O) => (
							_(),
							F("div", gd, [
								we(
									ti,
									{ "init-x": 40, "init-y": 60, "init-w": 900, "init-h": 550 },
									{
										header: Rt(() => {
											var E, K;
											return [
												j(
													"span",
													vd,
													G(
														((E = R(n)) == null
															? void 0
															: E.header_text) || "NCE Tables"
													),
													1
												),
												we(
													oi,
													{
														loading: R(i),
														"show-click-hint": !!(
															(K = R(n)) != null &&
															K.open_card_on_click
														),
														"row-count": R(l).length,
														total: R(s),
														onRefresh: A,
														onToggleFilter:
															O[0] ||
															(O[0] = (Q) => (u.value = !u.value)),
														onSheets:
															O[1] ||
															(O[1] = (Q) =>
																T({
																	doctype: "WP Tables",
																	parentFilter: {},
																	rows: R(l),
																})),
													},
													null,
													8,
													[
														"loading",
														"show-click-hint",
														"row-count",
														"total",
													]
												),
											];
										}),
										footer: Rt(() => {
											var E;
											return [
												Ye(
													G(
														((E = R(n)) == null
															? void 0
															: E.header_text) || "NCE Tables"
													),
													1
												),
											];
										}),
										default: Rt(() => {
											var E, K;
											return [
												we(
													ni,
													{
														title:
															((E = R(n)) == null
																? void 0
																: E.header_text) || "NCE Tables",
														columns: c.value,
														rows: R(l),
														total: R(s),
														loading: R(i),
														error: R(r),
														config: R(n) || {},
														"default-filters":
															((K = R(n)) == null
																? void 0
																: K.default_filters) || [],
														"show-filter": u.value,
														onRowClick: m,
														onRowDrop:
															O[2] || (O[2] = (Q) => Xe(null, Q)),
														onSheets:
															O[3] ||
															(O[3] = (Q) =>
																T({
																	doctype: "WP Tables",
																	parentFilter: {},
																	rows: R(l),
																})),
														onFilterChange:
															O[4] || (O[4] = (Q) => q(null, Q)),
														onRefresh: A,
														onShowFilter:
															O[5] || (O[5] = (Q) => (u.value = !0)),
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
								F(
									oe,
									null,
									he(
										f,
										(E) => (
											_(),
											xe(
												ti,
												{
													key: E.id,
													"init-x": E.x,
													"init-y": E.y,
													"init-w": 1200,
													"init-h": 600,
												},
												{
													header: Rt(() => {
														var K, Q, ce;
														return [
															j("span", yd, G(Ke(E)), 1),
															we(
																oi,
																{
																	loading: !!E.loading,
																	"show-click-hint": !!(
																		(K = E.config) != null &&
																		K.open_card_on_click
																	),
																	"row-count": (
																		E._panelRows || E.rows
																	).length,
																	total: E.fullTotal,
																	"show-email": !!(
																		(Q = E.config) != null &&
																		Q.email_field
																	),
																	"show-sms": !!(
																		(ce = E.config) != null &&
																		ce.sms_field
																	),
																	"show-close": "",
																	onRefresh: (Z) => H(E),
																	onToggleFilter: (Z) =>
																		(E._showFilter =
																			!E._showFilter),
																	onSheets: (Z) => T(E),
																	onEmail: (Z) => R(tt)(E),
																	onSms: (Z) => R(Fe)(E),
																	onClose: (Z) => d(E.id),
																},
																null,
																8,
																[
																	"loading",
																	"show-click-hint",
																	"row-count",
																	"total",
																	"show-email",
																	"show-sms",
																	"onRefresh",
																	"onToggleFilter",
																	"onSheets",
																	"onEmail",
																	"onSms",
																	"onClose",
																]
															),
														];
													}),
													footer: Rt(() => [Ye(G(Ke(E)), 1)]),
													default: Rt(() => {
														var K, Q, ce;
														return [
															we(
																ni,
																{
																	title: Ke(E),
																	columns: E.columns,
																	rows: E._panelRows || E.rows,
																	total: E.fullTotal,
																	loading: E.loading,
																	error: E.error,
																	config: E.config || {},
																	"default-filters":
																		((K = E.config) == null
																			? void 0
																			: K.default_filters) ||
																		[],
																	"show-email": !!(
																		(Q = E.config) != null &&
																		Q.email_field
																	),
																	"show-sms": !!(
																		(ce = E.config) != null &&
																		ce.sms_field
																	),
																	"show-filter": E._showFilter,
																	onClose: (Z) => d(E.id),
																	onRowClick: (Z) => P(E, Z),
																	onDrill: (Z) => b(Z, E),
																	onSheets: (Z) => T(E),
																	onEmail: (Z) => R(tt)(E),
																	onSms: (Z) => R(Fe)(E),
																	onTags: (Z) => p(E),
																	onFilterChange: (Z) => q(E, Z),
																	onRefresh: (Z) => H(E),
																	onEmailOne: (Z) => R(He)(E, Z),
																	onSmsOne: (Z) => R(Je)(E, Z),
																	onRowDrop: (Z) => Xe(E, Z),
																	onShowFilter: (Z) =>
																		(E._showFilter = !0),
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
								w.value
									? (_(),
									  xe(
											Yc,
											{
												key: 0,
												"root-doctype": w.value,
												"init-x": S.value,
												"init-y": N.value,
												onClose: O[6] || (O[6] = (E) => (w.value = "")),
											},
											null,
											8,
											["root-doctype", "init-x", "init-y"]
									  ))
									: le("", !0),
								(_(!0),
								F(
									oe,
									null,
									he(
										R(de),
										(E, K) => (
											_(),
											xe(
												ku,
												{
													key: "card-" + E.id,
													"card-def-name": E.cardDefName,
													doctype: E.doctype,
													"record-name": E.recordName,
													style: $e({ zIndex: 1e3 + K }),
													onOpenCard: R(ke),
													onClose: R(Me),
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
								R(B) === 0 && R(y)
									? (_(),
									  xe(
											io,
											{
												key: 1,
												open: !0,
												"definition-name": R(y),
												doctype: R(M),
												"doc-name": R(C),
												"required-fields": R($),
												"reload-panel-after-publish": R(re),
												"row-nav-enabled": R(x).total > 1,
												"can-navigate-prev": R(x).canPrev,
												"can-navigate-next": R(x).canNext,
												"row-nav-label": R(k),
												"dissolve-opacity": R(B) === 0 && R(Y) ? R(ee) : 1,
												style: $e({ zIndex: R(B) === 0 ? 1050 : 1048 }),
												onClose: R(z),
												onSaved: R(te),
												onNavPrev: R(L),
												onNavNext: R(U),
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
									: le("", !0),
								R(B) === 0 && R(W)
									? (_(),
									  xe(
											io,
											{
												key: 2,
												open: !0,
												"definition-name": R(W),
												doctype: R(J),
												"doc-name": R(I),
												"required-fields": R($),
												"reload-panel-after-publish": R(re),
												"row-nav-enabled": !1,
												"can-navigate-prev": !1,
												"can-navigate-next": !1,
												"row-nav-label": "",
												"dissolve-opacity": 1,
												style: { zIndex: 1048 },
												onClose: R(z),
												onSaved: R(te),
												onNavPrev: R(L),
												onNavNext: R(U),
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
									: le("", !0),
								R(B) === 1 && R(y)
									? (_(),
									  xe(
											io,
											{
												key: 3,
												open: !0,
												"definition-name": R(y),
												doctype: R(M),
												"doc-name": R(C),
												"required-fields": R($),
												"reload-panel-after-publish": R(re),
												"row-nav-enabled": R(x).total > 1,
												"can-navigate-prev": R(x).canPrev,
												"can-navigate-next": R(x).canNext,
												"row-nav-label": R(k),
												"dissolve-opacity": R(B) === 1 && R(Y) ? R(ee) : 1,
												style: $e({ zIndex: R(B) === 1 ? 1050 : 1048 }),
												onClose: R(z),
												onSaved: R(te),
												onNavPrev: R(L),
												onNavNext: R(U),
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
									: le("", !0),
								R(B) === 1 && R(W)
									? (_(),
									  xe(
											io,
											{
												key: 4,
												open: !0,
												"definition-name": R(W),
												doctype: R(J),
												"doc-name": R(I),
												"required-fields": R($),
												"reload-panel-after-publish": R(re),
												"row-nav-enabled": !1,
												"can-navigate-prev": !1,
												"can-navigate-next": !1,
												"row-nav-label": "",
												"dissolve-opacity": 1,
												style: { zIndex: 1048 },
												onClose: R(z),
												onSaved: R(te),
												onNavPrev: R(L),
												onNavNext: R(U),
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
									: le("", !0),
							])
						);
					},
				},
				[["__scopeId", "data-v-05585cde"]]
			)
		);
	window.NCEPanelPageV2 = {
		mount(e) {
			return bd.mount(e);
		},
	};
})();
