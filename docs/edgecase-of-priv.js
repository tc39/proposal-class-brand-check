class Cache {
	static #cache = []
	constructor(...args) {
		Cache.#cache.push(args.concat(this))
	}
	static make(...args) {
		for (const x of Cache.#cache) {
			if (x.length === args.length + 1 && args.every((v, i) => v === x[i])) {
				return x[x.length - 1]
			}
		}
		return new this(...args)
	}
}

class Range extends Cache {
  start
  end
  constructor(start, end) {
    super(start, end)
    this.start = validate(start)
    this.end = validate(end)
    Object.freeze(this)
  }
  *[Symbol.iterator]() {
    for (let i = this.start; i < this.end; ++i) yield i
  }
  equals(that) {
    if (!(#brand in that)) return false
    return this.start === that.start && this.end === that.end
  }
  // ...
  // DO NOT add class fields after this line!!!
  #brand // Only for branding purpose, don't touch it!
}

function validate(n) {
	if (!Number.isSafeInteger(n)) throw new TypeError()
	return n
}

const a = Range.make(1, 2)
const b = Range.make(1, 3)
const c = Range.make(1, 2)
console.log(a, b, c)
console.assert(a !== b)
console.assert(a === c)
console.assert(!a.equals(b))
console.assert(a.equals(c))

let d
try {
	d = Range.make(1, 0.5)
} catch {}
d = Range.make(1, 0.5)
d.end = 2
console.log(d)
console.assert(a.equals(d))
