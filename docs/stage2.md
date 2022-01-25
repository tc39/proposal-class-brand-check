# Stage 1 进 stage 2 的讲稿

# Presentation scripts for stage 2 advancing

一年前 class brand check 提案进入了 stage 1，自那时以来，有两位新的 TC39 代表徐田洋（@XGHeaven）和涂强（@YuriTu）加入担任共同 champion，他们均来自最近加入 Ecma 的字节跳动。徐田洋完成了初步的 spec 文本，涂强完成了 Babel 实现，Jack Works 则提供了初步的 TypeScript 实现。在所有人的共同努力下，通过初步的 spec 文本，结合转译器实现所得到的反馈，我们检视了许多[核心问题](https://github.com/tc39/proposal-class-brand-check/issues?q=is%3Aissue+is%3Aclosed+semantic)，使本提案的语义细节得到了完善。本次会议我们希望委员会能够准许本提案进入 stage 2。

Since the class brand check proposal entered Stage 1 a year ago, two new TC39 delegates, XU Tian-Yang (@XGHeaven) and TU Qiang (@YuriTu), have joined as co-champions, both from ByteDance, which joined Ecma half year ago. Tianyang completes the initial spec text, Yuri completes the Babel implementation, and Jack Works provides the initial TypeScript implementation. With the joint efforts of all, the preliminary spec text, combined with the feedback from the transpiler implementations, we have examined many of the core issues and refined the semantic details of this proposal. At this meeting we hope that the committee will allow this proposal to advance to Stage 2.

首先，简单描述一下本提案：

First, a recap of the proposal:

本提案提议了一个新的语法 `class.hasInstance(o)`，用于检查值`o`是否是当前词法环境所在的class所生成的实例。在概念和使用场景上，它与其他编程语言中对对象作运行时的具体类型检查相当。典型用法如下：

This proposal proposes a new syntax `class.hasInstance(o)` , to checks whether the value `o` is an instance constructed by the class in the nearest (innermost) lexical context. The concept and the use cases of it, is very close to runtime type checking of objects in other programming languages. Typical usage as follow simple example:

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

When entering Stage 1 at January 2021, I had already elaborated on the existing ways of checking instances, including:

- 从 JavaScript 早期就具有的 `instanceof`。它是基于原型链检查的，即使结果为`true`也不能确保真的是由当前类所产生的。
- `instanceof` which exists since the early days of JavaScript. It is based on the prototype chain, even if the result is `true`, there is no guarantee that it is really constructed by the constructors.
- 手动使用`WeakSet`来为类的所有实例加上 brand。这是可行的，并且具有最高的灵活性，只是需要不少的 boilerplate 代码。然而，许多 JavaScript 开发者并不熟悉`WeakSet` API，更重要的是，大部分 JavaScript 不理解 brand 概念，因此这一模式在实践中只有少数高级开发者使用。此外，也有代表提到，当前各引擎对`WeakSet`的实现可能与对象上的属性或field具有不同的 GC 效果和性能差异，这也可能使得一些开发者放弃这一模式。
- Using `WeakSet` manually adding brands to every instances when construct. This is possible, and has maximum flexibility, but requires some boilerplate code. However, many JavaScript developers are not familiar with `WeakSet` API，and more importantly, most JavaScript doesn't understand the concept "brand", so this pattern is only used by a few advanced developers in the wild. In addition, it was mentioned by some delegates that `WeakSet` implementations in current engines may have GC effects and performance differ from properties or fields on objects, which may also cause some developers to abandon this pattern.
- 随着 private fields 特性的加入，开发者可以利用非本类的对象不具有本类特有的 private field，访问这些 private fields 会触发 TypeError 的语义效果来间接地进行实例检查。然而这一模式需要基于 `try` `catch` 的 boilerplate 代码，并且本质上是对 private fields 的滥用，代码的可理解性、可维护性都存在问题。
- With the addition of the private fields feature, developers can check instances in an indirect way by accessing private fields, leverage the semantic effect of the objects which do not have class-specific private fields would trigger TypeError. However, this model needs the boilerplate code based on `try` `catch`, and by its very nature an abuse of private fields, is problematic for both its intelligibility and its maintainability.
- 在去年1月同次会议上，private fields、methods 等的衍生提案 `#priv in o` 进入了stage 3，并同 fields 提案一起进入了 stage 4。该提案使得开发者可以方便地检查某个对象上是否存在`#priv`元素，因此也可以以此来进行实例检查。尽管此提案使得开发者不再需要 `try` `catch` boilerplate 代码，但使用 private field 进行实例检查的其他问题仍然存在。
- At the same meeting last January, `#priv in o` proposal which is the extension of private fields, methods, and others, entered stage 3 and, with these proposal, went to stage 4 last year. The proposal makes it easy for developers to check if `#priv` element exists on an object, so you can also use it for checking instance. Although the proposal would eliminate the `try catch` boilerplate code, but other problems with using private field to check whether an instance is constructed by the class still exist.

## `class.hasInstance(o)` 和 `#priv in o` 的比较

## Compare `class.hasInstance(o)` and `#priv in o`

### 心智模型上的差异

### Differences in mental models

首先 `class.hasInstance(o)` 从字面上来说是检查对象`o`是否是 class 的实例，而 `#priv in o` 从字面上来说是检查对象`o`是否具有某个 private name。尽管效果类似，但在心智模型上有较大的差异。前者贴合 OOP 的一般概念，是所有 OO 编程语言都通用的概念。对于惯常于此心智模型的应用开发者来说，对某些 private name 的进行存在性检测，并不能很好地匹配和表达开发者的高阶意图。

First of all, `class.hasinstance(o)` literally mean checking whether object `o` is an instance of the class, while `#priv in o` literally means checking whether object `o` has a private name. Although the effects were similar, there were significant differences in mental models. The former reflect the general concept of OOP, which is common to all OO programming languages. For application developers accustomed to this mental model, the existence checking of some private names does not match and express the high-order intentions of the developers well.

需要澄清的是，尽管本提案名为 class brand check，但这更多地是为了基于 TC39 已经建立的术语来相对精确地描述提案。实际上 brand check 并不是一个 JavaScript 开发者，甚至更大的程序员群体具有普遍认知和理解的概念。就我所知，其他主流编程语言社区很少使用 brand 这一概念，尤其使用名义类型的编程语言通常无需额外的 brand 概念。因此，尽管看上去可以用代码级的 private name 直接表达概念级的「brand」，但未必匹配编程者的心智模型。

It should be clarified that, although the proposal is called "class brand check", it is more for the purpose of naming the proposal based on the terms that TC39 has established well. The reality is that "brand check" is not a concept that JavaScript developer, and even the larger community of programmers has a common perception and understanding. To the best of my knowledge, the concept of "brand" is rarely used by other mainstream programming language communities, especially the programming languages which use nominal typing might not need such concept at all. Thus, although it seems possible to express the concept-level "brand" directly with code-level private name, it does not necessarily match the programmer's mental model.

当然，反过来说，在一些特定场景下，高级开发者可能希望精确地表达和控制某块代码的功能依赖于特定 private 元素的存在。整体性的`class.hasInstance(o)`检查在概念模型上也可能不匹配此类需求。

Of course, conversely, in certain scenarios, advanced developers may want to accurately express and control the functionality of a piece of code depending on the certain private elements. `class.hasinstance(O)` which do holistic checks may also mismatch the concept model behide such requirements.

这些需求通常涉及通过`return`来为任意对象安装 private 数据的技巧。

These cases usually involve the `return` trick to install private data for arbitrary objects.

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

In addition, some developers (including @ljharb who is the champion of `#priv in o` proposal) treat `#priv in o` as the private version of duck type check. However, we believe that duck type check is more of an alternative to interface checking, but not a good alternative to concrete class checking.

另一方面，之所以开发者被教育使用 duck type check，是因为 `instanceof` 不能跨 realm，这在 web 早期 frame 流行时代是一个重大痛点，而基于字符串的 duck type check 天然是跨 realm 的。虽然跨 realm 问题在今天可能已经并非 web 开发的主要矛盾，但长期的教程文档遗产令广大的 JavaScript 开发者建立「duck type check」等于「可以跨 realm」的认知。而 `#priv in o` 虽然看上去很像是 duck type check，但并不能跨 realm。所以鸭子类型检查之`#priv in o`虽然看上去和鸭子类型检查之 `key in o` 长得一副鸭子样，但走起来叫起来却并不同。这种错误期待的可能性从 [benlesh 的问题](https://github.com/tc39/proposal-class-brand-check/issues/2)略微可以看出来。当然这并不是致命的，但大概也不是什么好事。比较而言，`class.hasInstance(o)`从字面理解上更导向一个「适用用于现代 JavaScript的，基于 class 而不是基于原型的 `instanceof` 升级版」，而较不易让使用者产生可跨 realm 的错误期待。

On the other hand, developers are taught to use duck type check because `instanceof` has cross-realm issue, which was a big pain point in the early days of the web, when `<frame>` was popular , while string based duck type check is inherently cross-realm. Although cross-realm issues may not be a major issue in web development today, the long-standing tutorial and documentation legacy has led JavaScript developers to establish that "duck type check" equals to "cross-realm". While `#priv in o` looks a lot like duck type check, it doesn't cross-realm. So the duck of `#priv in o` looks very like the duck of `key in o`, but walks and quacks differently. The possibility of such false expectations is glimpsed in [Benlesh's question](https://github.com/tc39/proposal-class-brand-check/issues/2). It's not fatal, of course, but it's probably not a good thing. Comparatively speaking, `class.hasinstance(o)` literally leads to a "class-based rather than prototype-based version of `instanceof` upgraded for modern JavaScript", and less likely to create false expectations of cross-realm.

整体性的实例检查，和个别的 private 元素检查，到底何种心智模型是更广泛和普适的，恐怕是一个无法达到完全共识的问题，委员会可能应该在此问题上保持中立。我和本提案的其他 champion 从我们所在的公司和社区的反馈，认为整体性的实例检查对于普通开发者来说，是更为常见和有用的，至少应该得到与个别 private 元素存在性检查相等同的语法级别支持。

Holistic instance checking, and individual private element checking, which mental model is broader and more universal, is perhaps a question that can not be fully agreed upon, the committee should probably remain neutral on the matter. I and the other champions of this proposal, based on feedback from our companies and communities, believe that a holistic instance check is more common and useful for the average developers, at a minimum, it should have the same level of syntax support as individual private element existence checks.


### 实践上的差异

### Differences in practice

无论如何，使用 `#priv in o` 要求引入 private elements，即使类本身并没有 hard private 的需求。实例检查和 hard private 并不是必然相关的。而引入 hard private ，比如将 public fields 转换为基于 private fields 的访问器，存在语义上的微妙差异，从而是易于被忽略的 breaking change。

In any case, using `#priv in o` requires the introduction of private elements, even if the class itself does not have the requirement of "hard private". Instance checking and "hard private" are not necessarily related. Introducing hard private, such as converting public fields into private fields based accessors, is semantically nuanced and thus risky breaking change which easy to ignore.

其次，由于 fields 初始化可能失败，一个对象可能处于具有部分 private elements 而缺失其他 private elements 和 fields 的情形。虽然初始化失败时构造器直接失败，从而很难直接得到这样不完整的对象，但是通过前述`return`技巧，以及一些用例（比如父类对产生的对象进行缓存）当中，确实可以得到这样对象。

Second, because the fields initialization might fail, an object might be in a situation where it has some private elements installed and some other private elements and fields are not. Although the constructor fails directly when fields initialization fails, making it difficult to get such an incomplete object directly, through the aforementioned return trick, as well as some use cases (such as the parent class caching the instances) , you can actually get such broken objects.

由于上述原因，最终，一个相对可靠的，基于 private elements 存在性的模式是：

For these reasons, in the end, a relatively reliable pattern based on the existence check of private elements is:

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

这并不是一个令人愉快的模式，尤其在阅读`#brand in that`代码时，还没有看到其声明，可能与已有的代码规范和工具设定冲突。当然，只要保证`#brand`是最后一个 field，我们也可以把方法移后。但当 fields 比较多的时候，这使得`#brand`处于类的中部。我不能确定中部和最底部哪个更差一些，但显然，`#brand`最理想的位置应该是类的最顶部。

This is not a pleasant pattern, especially when reading the `#brand in that` code you haven't see its declaration, which may conflict with existing coding style and linter settings. Of course, if you can ensure that `#brand` is always the last field, we can move the methods after it. But when you have many fields, `#brand` will be in the middle of the class. I'm not sure which is worse, the middle or the bottom, but obviously, the ideal place for `#brand` would be at the head of the class.


抛开代码美学不说，从行为的精确上看，当构造器失败，我们仍然可能得到带有`#brand`但处于失败状态的对象。虽然很多时候，我们并不需要完美的解决方案，但就确保实例有效性的本意来说，这一漏洞可能最终迫使开发者返回到更冗长的手动`WeakSet`方案。

Code aesthetics aside, when the constructor fails, it is still possible to get a broken object with `#brand`. While in many cases, we don't always need a very perfect solution, in terms of ensuring instance validity, the flaw may eventually force developers back to a more lengthy manual `WeakSet` solution .

基于所有上述这些考量，我们相信不仅在心智模型上，在实践上，我们也需要一个完善的、开箱即用的对象有效性检查解决方案。

Based on all of these considerations, we believe that we need a sound, out-of-box solution for checking class instance, not only in mental models but also in practice.

## 设计细节

## Semantic details

首先要再次感谢徐田洋、涂强和Jack Works的工作，也感谢Jordan对提案的持续关注和参与。在所有人的共同努力下，champion 小组确定了许多语义细节，（以我认为的重要程度排序）包括：

First of all, I would like to thank Tianyang, Yuri and Jack Works for their work, also thank Jordan for the continued attention and participation in the discussion proposal. Working together, the champion group identified a number of semantic details, (in order of importance to me) including:

1. Class brand 的安装时机
1. `class.hasInstance()`是一个函数还是像`import()`那样只是像函数
1. `eval("class.hasInstance(o)")`的行为
1. `class.hasInstance`语法

1. When to install class brand
1. Whether `class.hasInstance()` is a function or just function-like (same as `import()`)
1. Behavior of `eval("class.hasInstance(o)")`
1. `class.hasInstance` syntax

### When to install class brand

See https://github.com/tc39/proposal-class-brand-check/issues/6

安装brand的时机：在构造器正常结束时（如果构造器扔异常则不安装）。

Time to install brand: at the normal end of the constructor (not installed if the constructor throws error) .

选择这个时机的原因：确保对象是完整初始化的。

The reason for this timing: make sure the object is fully initialized.

此外，既然已经有`#x in o`，总是可以通过`#x in o`来达成时机2（在`super()`调用返回之后）和时机3（在所有 fields 成功初始化之后），而时机4（构造器结束）是`#x in o`做不到而且程序员自己搞也麻烦（因为constructor也可以有多个return出口）。

In addition, consider we have `#x in O`, you can always use `#x in O` if you really want timing 2 (after `super()` returns) and timing 3(after all fields have successfully initialized). Timing 4(the end of the constructor) is impossible by using `#x in O` and it's also cumbersome to do that manually via `WeakSet` (as constructors can have multiple returns and even throws) .


### Whether `class.hasInstance()` is a function or just function-like (same as `import()`)

https://github.com/tc39/proposal-class-brand-check/issues/8

选择类似 `import()` ，即只有类函数调用的语法形式（meta method）而不是函数对象。原因是返回函数对象就要指定许多函数对象特有的属性和行为，这种复杂性没什么带来对应的好处。如果需要函数的话，开发者可以使用箭头函数对`class.hasInstance()`语法调用进行包装。

We choose like `import()` , so it's just have the call form (the meta method) not a real function object. The reason is that returning a function object requires specifying many function object-specific properties and behaviors, and this complexity does not provide corresponding benefits. If a function is needed, the developer can use the arrow function to wrap the `class.hasInstance()`.


### Behavior of `eval("class.hasInstance(o)")`

https://github.com/tc39/proposal-class-brand-check/issues/7

`eval("class.hasInstance(x)")` -> syntax error

### `class.hasInstance` syntax

`class.hasInstance`语法与 Ron Buckton 的 [class property access experssions 提案](https://github.com/tc39/proposal-class-access-expressions)有交叠。

`class.hasInstance` syntax overlaps with Ron Buckton's class property access proposal.

Ron Buckton 表示考虑修订该提案的语法，以允许本提案的推进，并将`class.<prop>`语法保留给可能的其他 meta properties/methods，参见 https://github.com/tc39/proposal-class-access-expressions/issues/14 。在此对 Ron Buckton 表示感谢。

Ron Buckton said he will consider revising that proposal's syntax to allow this proposal to move forward, and reserve the `class.<prop>` syntax for other possible meta properties/methods, see https://github.com/tc39/proposal-class-access-expressions/issues/14. I'd like to thank Ron Buckton.

## Spec 文本

## Spec text

看规范很难，写规范文本更难，尤其是本提案涉及对象和类这样重要的机制。徐田洋和我都是第一次写这样复杂的规范文本，尤其田洋作为 TC39 新人之前并未深入学习过 Ecma-262 规范文本，在很短时间内能完成规范文本初稿令人印象深刻。我们在写本提案的规范时，也大量参考、并在之前的版本复制了许多 class property access experssions 提案的规范文本，在此对 Ron Buckton 再次表示感谢。尽管我们尽了最大努力，但肯定还是会有疏漏，希望大家批评指正。

It is hard to read spec text, and even harder to write spec text, especially when the proposal deals with such important mechanisms as objects and classes. This is the first time that both TianYang and I have written such a complicated spec, especially since TianYang is a new TC39 delegate, did not learn Ecma-262 spec text in depth before, it is impressive that he was able to complete the first draft of the spec text in such a short time. Again, we thank Ron Buckton because we learned and copied many of the spec texts from the class property access expression proposal to our early versions of this proposal. In spite of our best efforts, we are sure that there will be some mistakes. I hope you help us to correct them.

https://tc39.es/proposal-class-brand-check/

## 未来工作

## Future work

如果本提案能进入 Stage 2，champion 会进一步完善规范文本，并调整 Babel 和 TypeScript 的实验性实现，摸清所有边缘情况。并希望通过 Babel 实现让广大开发者试用并接受用户反馈。

If the proposal makes it into Stage 2, champions will further refine the specification text and tweak the experimental implementations of Babel and TypeScript to explore all the corner cases. We hope that through the Babel implementation, the majority of developers could try and provide feedback.

## 讨论并请求 Stage 2

## Discuss and ask for Stage 2

---

最后要感谢一下来自葡萄牙的 Duarte Cunha Leão（@dcleao），是他在 https://github.com/tc39/proposal-private-fields-in-in/issues/13 开启的讨论促成了本提案的诞生。

Finally, thanks to Duarte Cunha Leão (@dcleao) of Portugal, whose discussion at https://github.com/tc39/proposal-private-fields-in-in/issues/13 led us to the proposal.
