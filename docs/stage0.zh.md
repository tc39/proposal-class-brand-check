# Stage 0 进 stage 1 的 讲稿

Class brand checks 这个提案实际上来自于另一个提案的讨论，即 Ergonomic brand checks for Private Fields，尤其是其 issue #13。

> ...there is no case where you'd want to check for the existance of a particular private field which could not be satisfied by testing for a given value being an instance of the current class.

> While instanceof can be spoofed, and might not be a 100% safe option because of that, a new, unspoofable class brand check could be devised, whose uselfuness would go beyond testing the existance of a private field.

我认为这位来自葡萄牙的资深js开发者 @dcleao 讲出了很多人的心声。这也启发了我，重新从头审视开发者的实际需求。

我们来看一下现有的 Ergonomic brand checks for Private Fields 提案。

```js
// Ergonomic brand checks for Private Fields
class C {
	#brand
	static isC(obj) {
		return #brand in obj // private in
	}
}
```

该提案引入了`#priv in obj`的语法，来检查一个对象上是否存有某个private field。

注意，这是一个简化的版本，在提案的README中的原始例子是这样的：

```js
class C {
  #brand;

  #method() {}

  get #getter() {}

  static isC(obj) {
    return #brand in obj && #method in obj && #getter in obj;
  }
}
```

这个原始例子中的`isC`对类C中的所有private成员做了穷举性的检查。这一点很值得探讨。

不过在进一步讨论之前，也许我们应该先问，为什么我们需要`isC`？

下面我给一个更贴近需求的例子，就是常见的`equals`方法。

```js
class Range {
  #start
  #end
  constructor(start, end) {
    this.#start = start
    this.#end = end
  }
  includes(value) {
    return value >= this.#start && value < this.#end
  }
  equals(range) {
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

这里的问题是，这个`equals`方法其实并不完善，当传入一个非range的对象时，我们期望返回`false`但实际上会扔出TypeError。

```js
let r1 = new Range(1, 5)
let r2 = new Range(2, 5)
r1.equals(r1) // true
r1.equals(r2) // false
r1.equals({}) // expect false, actually throw TypeError
```

所以我们需要在`equals`中先进行某种类型检查。比如使用`instanceof`：

```js
class Range {
  equals(range) {
    if (!(range instanceof Range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

实际上，使用`instanceof`或类似的`is`算符来预先检查类型，也是几乎所有主流OOP语言中`equals`方法的标准写法。

但在JS中，`instanceof`默认只是基于原型的检查，存在假Range的风险。

```js
new Range(1, 5) instanceof Range // true
Object.create(Range.prototype) instanceof Range // also true
```

此外`instanceof`也有跨realm的问题。

在实践中，对此问题的应对主要有两种方式。一种是忽略这些问题，仍然使用`instanceof`。另一种是放弃`instanceof`，使用duck type check。

注意，如果不涉及 private fields，且我们通过其他方式（比如type checker）确保了range上的start和end不会是`undefined`，那么甚至不用特意做检查，因为不存在属性会返回`undefined`，所以该代码正好已经暗含了duck type check。虽然不甚严谨，但对于很多人来说，够用就好。

```js
class Range {
  equals(range) {
    return this.start === range.start && this.end === range.end
  }
}
```

在使用 private fields 的情况下，就不行了，因为没有private field会抛TypeError。

```js
class Range {
  equals(range) {
    if (!(range instanceof Range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```
而 instanceof 的默认语义并不能 100% 确保不报错，因此我们可能需要某种`isC`的测试。
```js
class Range {
  equals(range) {
    if (!isRange(range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

本质上说，`isC`的需求，可以理解为我们需要一种「真·instanceof」。

```js
class Range {
  equals(range) {
    if (!(range IsRealInstanceOf Range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

这里明晰一下概念，什么叫「isC(o)」或者「o是C的真实例」？

o是类C的「真实例」，意指o具有类C所声明的所有外部接口和内部实现细节。

注意：这是一个基于「高层意图」的定义，而不是一个基于「底层机制」的定义。此定义适用于所有基于类的OOP语言。各OOP语言使用`instanceof`运算符直接对应此概念，或者采用更广义的关键字（如`is`）涵盖了它。

当然，我们可以使用底层机制来实现高层意图，但这种映射很可能有隐患。JS中的`instanceof`就是如此，现有的`instanceof`算符的默认行为是基于原型的底层机制的，因而不能100%映射到真正的「实例」概念，存在gap。

private-in提案的README也给出了另一个底层机制和高层意图的失配例子：

```js
class C {
  #x
  static isC(obj) {
	  try { obj.#x; return true }
    catch { return false }
  }
}
```
即使用try catch来捕捉private fields所产生的TypeError，来实现`isC`。

它看似可行，但当`#x`不是private fields，而是private getter时，我们无法简单地区分到底是因为不存在private成员而扔出错误，还是private getter本身执行时扔出错误。

```js
class C {
  get #x() { ... }
  static isC(obj) {
	  try { obj.#x; return true }
    catch { return false }
  }
}
```

而private-in特性是直接测试是否存在该private成员。

```js
class C {
  get #x() { ... }
  static isC(obj) {
	  return #x in obj
  }
}
```

不过，private-in看似解决问题，实则仍然是存在底层机制和高层意图的失配。

```js
class Range {
  #start
  #end
  ...
  equals(range) {
    if (!(#start in range && #end in range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

一个最简单的问题是，假如我没有使用private fields，该如何实现`isC`？

```js
class Range {
  start
  end
  ...
  equals(range) {
    if (!(???)) return false
    return this.start === range.start && this.end === range.end
  }
}
```

一个方法是我们把public fields改造为基于private fields的accessor

```js
class Range {
  #start
  #end
  get start() { return this.#start }
  get end() { return this.#end }
  set start(value) { this.#start = value }
  set end(value) { this.#end = value }
  ...
  equals(range) {
    if (!(#start in range && #end in range)) return false
    return this.#start === range.#start && this.#end === range.#end
  }
}
```

程序员被引诱使用private fields，即使原本并不需要。

更重要的是，这种变更具有语义上的变化，是重大的breaking change。

比如 `Object.keys()` `Object.assign()`；比如代理透明性（影响与许多框架的交互）。

即使类本身就使用了private fields，也存在一个问题，到底我是否要检查所有private fields？

```js
class C {
  #brand;

  #method() {}

  get #getter() {}

  static isC(obj) {
    return #brand in obj && #method in obj && #getter in obj;
  }
}
```

README的例子里是穷举检查。

但到具体的例子里，似乎这个问题也不是那么好回答。

```js
class Range {
  #start
  #end
  #inclusive // add a new private field
  ...
  equals(range) {
    if (!(#start in range && #end in range)) return false // should I update this line?
    // if (!(#start in range && #end in range && #inclusive in range)) return false
    return this.#start === range.#start && this.#end === range.#end && this.#inclusive === range.#inclusive
  }
  static Inclusive(range) {
    if (#start in range && #end in range) { // should I also check #inclusive?
      return new Range(range.#start, range.#end, true)
    } else {
      const [start, end] = arguments
      return new Range(start, end, true)
    }
  }
}
```

总是穷举所有，维护成本比较高，有10个fields你就要写10个`#foo in o`，有100个你就要写100个。

视情况而定，具有更高的心智成本，而且维护时很容易不小心失去同步，所以维护成本可能更高。

很难说开发者最后会形成怎样的使用模式，我个人感觉所以最终的的「Best practice」很可能是以下两种：

一、总是使用一个专门的检查函数

```js
class Range {
  #start
  #end
  #inclusive
  static #isRange(range) {
    return #start in range && #end in range && #inclusive in range
  }
  ...
  equals(range) {
    if (!Range.#isRange(range)) return false
    return this.#start === range.#start && this.#end === range.#end && this.#inclusive === range.#inclusive
  }
  static Inclusive(range) {
    if (Range.#isRange(range)) {
      return new Range(range.#start, range.#end, true)
    } else {
      const [start, end] = arguments
      return new Range(start, end, true)
    }
  }
}
```

虽然仍然有穷举的维护成本，但至少比散在各处要好。

二、总是使用一个专门的private field用于brand check

```js
class Range {
  #start
  #end
  #inclusive
  ...
  equals(range) {
    if (#brand in range) return false
    return this.#start === range.#start && this.#end === range.#end && this.#inclusive === range.#inclusive
  }
  static Inclusive(range) {
    if (#brand in range) {
      return new Range(range.#start, range.#end, true)
    } else {
      const [start, end] = arguments
      return new Range(start, end, true)
    }
  }
  #brand // for brand check, don't touch it and always keep it in the last!
}
```

无论采用哪一种，其实都说明一个问题，基于单个private fields的存在检测是一种底层机制，用于表达`isC`这样的高层意图并不合适。

特别的，如果一定要基于private fields机制，我们最终可能得到前述两种结合的方式。

```js
class Range {
  #start
  #end
  #inclusive
  ...
  equals(range) {
    if (!Range.#isRange(range)) return false
    return this.#start === range.#start && this.#end === range.#end && this.#inclusive === range.#inclusive
  }
  static Inclusive(range) {
    if (Range.#isRange(range)) {
      return new Range(range.#start, range.#end, true)
    } else {
      const [start, end] = arguments
      return new Range(start, end, true)
    }
  }
  
  static #isRange(range) {
    return #brand in range
  }
  #brand // for brand check, don't touch it and always keep it in the last!
}
```

实际上，在这种pattern里，我们就不再需要 private-in 了，我们可以回归到try catch机制。

```js
class C {
  static #isC(o) {
    try { o.#brand; return true }
    catch { return false }
  }
  #brand // only for brand check, don't touch it and always keep it in the last!
}
```

所以，回归到程序员的高层意图，与其提供private fields存在检测这样的底层机制，不如直接提供一个匹配其高层意图的机制。

我们引入`class.hasInstance(o)`这一 meta method 语法来判定`o`是否是当前class的「真实例」。

```js
class Range {
  #start
  #end
  #inclusive
  ...
  equals(range) {
    if (!class.hasInstance(range)) return false
    return this.#start === range.#start && this.#end === range.#end && this.#inclusive === range.#inclusive
  }
  static Inclusive(range) {
    if (class.hasInstance(range)) {
      return new Range(range.#start, range.#end, true)
    } else {
      const [start, end] = arguments
      return new Range(start, end, true)
    }
  }
}
```

把具体实现细节抹去之后，可以看到，这个机制其实可以完全与private fields是正交关系，尽管其背后的语义可以与我们最后一个基于专用的`#brand` private fields的模式完全一致。

```js
class Range {
  ...
  equals(range) {
    if (!class.hasInstance(range)) return false
    return ...
  }
  static Inclusive(range) {
    if (class.hasInstance(range)) {
      ...
    } else {
      ...
    }
  }
}
```

同时这也允许开发者很容易「修复」`instanceof`：

```js
class C {
	static [Symbol.hasInstance](o) {
		return class.hasInstance(o)
	}
}
```

以上。
