# Stage 1 进 stage 2 的讲稿

一年前 class brand check 提案进入了 stage 1，自那时以来，有两位新的 TC39 代表徐田洋（@XGHeaven）和涂强（@YuriTu）加入担任共同 champion，他们均来自最近加入 Ecma 的字节跳动。徐田洋完成了初步的 spec 文本，涂强完成了 Babel 实现，Jack Works 则提供了初步的 TypeScript 实现。在所有人的共同努力下，通过初步的 spec 文本，结合转译器实现所得到的反馈，我们检视了许多[核心问题](https://github.com/tc39/proposal-class-brand-check/issues?q=is%3Aissue+is%3Aclosed+semantic)，使本提案的语义细节得到了完善。本次会议我们希望委员会能够准许本提案进入 stage 2。

首先，简单描述一下本提案：

本提案提议了一个新的语法 `class.hasInstance(o)`，用于检查值`o`是否是当前词法环境所在的class所生成的实例。在概念和使用场景上，它与其他编程语言中对对象作运行时的具体类型检查相当。典型用法如下：

```js
class Range {
  start
  end
  equals(that) {
    if (!class.hasInstance(that)) return false
    return this.start === that.start && this.end === that.end
  }
  // ...
}
```

## Motivation

在去年1月进入stage 1时，我已经详细地阐述了现有的检查实例的方式，包括：

- 从 JavaScript 早期就具有的 `instanceof`。它是基于原型链检查的，即使结果为`true`也不能确保真的是由当前类所产生的。
- 手动使用`WeakSet`来为类的所有实例加上 brand。这是可行的，并且具有最高的灵活性，只是需要不少的 boilerplate 代码。然而，许多 JavaScript 开发者并不熟悉`WeakSet` API，更重要的是，大部分 JavaScript 不理解 brand 概念，因此这一模式在实践中只有少数高级开发者使用。此外，也有代表提到，当前各引擎对`WeakSet`的实现可能与对象上的属性或field具有不同的 GC 效果和性能差异，这也可能使得一些开发者放弃这一模式。
- 随着 private fields 特性的加入，开发者可以利用非本类的对象不具有本类特有的 private field，访问这些 private fields 会触发 TypeError 的语义效果来间接地进行实例检查。然而这一模式需要基于 `try` `catch` 的 boilerplate 代码，并且本质上是对 private fields 的滥用，代码的可理解性、可维护性都存在问题。
- 在去年1月同次会议上，private fields、methods 等的衍生提案 `#priv in o` 进入了stage 3，并同 fields 提案一起进入了 stage 4。该提案使得开发者可以方便地检查某个对象上是否存在`#priv`元素，因此也可以以此来进行实例检查。尽管此提案使得开发者不再需要 `try` `catch` boilerplate 代码，但使用 private field 进行实例检查的其他问题仍然存在。

## `class.hasInstance(o)` 和 `#priv in o` 的比较

### 心智模型上的差异

首先 `class.hasInstance(o)` 从字面上来说是检查对象`o`是否是 class 的实例，而 `#priv in o` 从字面上来说是检查对象`o`是否具有某个 private name。尽管效果类似，但在心智模型上有较大的差异。前者贴合 OOP 的一般概念，是所有 OO 编程语言都通用的概念。对于惯常于此心智模型的应用开发者来说，对某些 private name 的进行存在性检测，并不能很好地匹配和表达开发者的高阶意图。

需要澄清的是，尽管本提案名为 class brand check，但这更多地是为了基于 TC39 已经建立的术语来相对精确地描述提案。实际上 brand check 并不是一个 JavaScript 开发者，甚至更大的程序员群体具有普遍认知和理解的概念。就我所知，其他主流编程语言社区很少使用 brand 这一概念，尤其使用名义类型的编程语言通常无需额外的 brand 概念。因此，尽管看上去可以用代码级的 private name 直接表达概念级的「brand」，但未必匹配编程者的心智模型。

当然，反过来说，在一些特定场景下，高级开发者可能希望精确地表达和控制某块代码的功能依赖于特定 private 元素的存在。整体性的`class.hasInstance(o)`检查在概念模型上也可能不匹配此类需求。

这些需求通常涉及通过`return`来为任意对象安装 private 数据的技巧。
```js
function Return(it) { return it }
class Feature extends Return {
	#data
	static
	static process(o) {
		if (#data in o) {
			// do something using o.#data
		} else {
			// ...
		}
	}
}
```

此外，也有一些开发者（包括 `#priv in o` 提案的 champion @ljharb）将 `#priv in o` 视为 duck type check 的 private 版本。不过，我们认为，duck type check 更多地是作为一种接口检查的替代品，而不是对象有效性检查的良好替代品。

另一方面，之所以开发者被教育使用 duck type check，是因为 `instanceof` 不能跨 realm，这在 web 早期 frame 流行时代是一个重大痛点，而基于字符串的 duck type check 天然是跨 realm 的。虽然跨 realm 问题在今天可能已经并非 web 开发的主要矛盾，但长期的教程文档遗产令广大的 JavaScript 开发者建立「duck type check」等于「可以跨 realm」的认知。而 `#priv in o` 虽然看上去很像是 duck type check，但并不能跨 realm。所以鸭子类型检查之`#priv in o`虽然看上去和鸭子类型检查之 `key in o` 长得一副鸭子样，但走起来叫起来却并不同。这种错误期待的可能性从 [benlesh 的问题](https://github.com/tc39/proposal-class-brand-check/issues/2)略微可以看出来。当然这并不是致命的，但大概也不是什么好事。比较而言，`class.hasInstance(o)`从字面理解上更导向一个「适用用于现代 JavaScript的，基于 class 而不是基于原型的 `instanceof` 升级版，而较不易让使用者产生可跨 realm 的错误期待。

整体性的实例检查，和个别的 private 元素检查，到底何种心智模型是更广泛和普适的，恐怕是一个无法达到完全共识的问题，委员会可能应该在此问题上保持中立。我和本提案的其他 champion 从我们所在的公司和社区的反馈，认为整体性的实例检查对于普通开发者来说，是更为常见和有用的，至少应该得到与个别 private 元素存在性检查相等同的语法级别支持。

### 实践上的差异

无论如何，使用 `#priv in o` 要求引入 private elements，即使类本身并没有 hard private 的需求。实例检查和 hard private 并不是必然相关的。而引入 hard private ，比如将 public fields 转换为基于 private fields 的访问器，存在语义上的微妙差异，从而是 breaking change。

其次，由于 fields 初始化可能失败，一个对象可能处于具有部分 private elements 而缺失其他 private elements 和 fields 的情形。虽然初始化失败时构造器直接失败，从而很难直接得到这样不完整的对象，但是通过前述`return`技巧，以及一些用例（比如父类对产生的对象进行缓存）当中，确实可以得到这样对象。

由于上述原因，最终，一个相对可靠的，基于 private elements 存在性的模式是：

```js
class Range {
  start
  end
  equals(that) {
    if (#brand in that) return false
    return this.start === that.start && this.end === that.end
  }
  // ...
  // DO NOT add class fields after this line!!!
  #brand // Only for branding purpose, don't touch it!
}
```

这并不是一个令人愉快的模式，尤其在阅读`#$brand in that`代码时，还没有看到其声明，可能与已有的代码规范和工具设定冲突。当然，只要保证`#brand`是最后一个 field，我们也可以把方法移后。但当 fields 比较多的时候，这使得`#brand`处于类的中部。我不能确定中部和最底部哪个更差一些，但显然，`#brand`最理想的位置应该是类的最顶部。

抛开代码美学不说，从行为的精确上看，当构造器失败，我们仍然可能得到带有`#$brand`但处于失败状态的对象。虽然很多时候，我们并不需要完美的解决方案，但就确保实例有效性的本意来说，这一漏洞可能最终迫使开发者返回到更冗长的手动`WeakSet`方案。

基于所有上述这些考量，我们相信不仅在心智模型上，在实践上，我们也需要一个完善的、开箱即用的对象有效性检查解决方案。

## 设计细节

首先要再次感谢徐田洋、涂强和Jack Works的工作，也感谢Jordan对提案的持续关注和参与。在所有人的共同努力下，champion 小组确定了许多语义细节，（以我认为的重要程度排序）包括：

1. Class brand 的安装时机
1. `class.hasInstance()`是一个函数还是像`import()`那样只是像函数
1. `eval("class.hasInstance(o)")`的行为
1. `class.hasInstance`语法

### Class brand 的安装时机

https://github.com/tc39/proposal-class-brand-check/issues/6

安装brand的时机：在构造器正常结束时（如果构造器扔异常则不安装）。

选择这个时机的原因：确保对象是完整初始化的。

此外，既然已经有`#x in o`，总是可以通过`#x in o`来达成时机2（在`super()`调用返回之后）和时机3（在所有 fields 成功初始化之后），而时机4（构造器结束）是`#x in o`做不到而且程序员自己搞也麻烦（因为constructor也可以有多个return出口）。

### `class.hasInstance()`是一个函数还是像`import()`那样只是像函数

https://github.com/tc39/proposal-class-brand-check/issues/8

选择类似 `import()` ，即只有类函数调用的语法形式（meta method）而不是函数对象。原因是返回函数对象就要指定许多函数对象特有的属性和行为，这种复杂性没什么带来对应的好处。如果需要函数的话，开发者可以使用箭头函数对`class.hasInstance()`语法调用进行包装。

### `eval("class.hasInstance(o)")`的行为

https://github.com/tc39/proposal-class-brand-check/issues/7

`eval("class.hasInstance(x)")` 扔 syntax error。

### `class.hasInstance`语法

`class.hasInstance`语法与 Ron Buckton 的 [class property access experssions 提案](https://github.com/tc39/proposal-class-access-expressions)有交叠。

Ron Buckton 表示考虑修订该提案的语法，以允许本提案的推进，并将`class.<prop>`语法保留给可能的其他 meta properties/methods，参见 https://github.com/tc39/proposal-class-access-expressions/issues/14 。在此对 Ron Buckton 表示感谢。

## Spec 文本

看规范很难，写规范文本更难，尤其是本提案涉及对象和类这样重要的机制。徐田洋和我都是第一次写这样复杂的规范文本，尤其田洋作为 TC39 新人之前并未深入学习过 Ecma-626 规范文本，在很短时间内能完成规范文本初稿令人印象深刻。我们在写本提案的规范时，也大量参考、并在之前的版本复制了许多 class property access experssions 提案的规范文本，在此对 Ron Buckton 再次表示感谢。尽管我们尽了最大努力，但肯定还是会有疏漏，希望大家批评指正。

https://tc39.es/proposal-class-brand-check/

## 未来工作

如果本提案能进入 Stage 2，champion group 会进一步完善规范文本，并调整 Babel 和 TypeScript 的实验性实现，摸清所有边缘情况。并希望通过 Babel 实现让广大开发者试用并接受用户反馈。

## 讨论并请求 Stage 2

---

最后要感谢一下来自葡萄牙的 Duarte Cunha Leão（@dcleao），是他在 https://github.com/tc39/proposal-private-fields-in-in/issues/13 开启的讨论促成了本提案的诞生。
