# Class brand check

Stage: 0

Champion: HE Shi-Jun


There is long discussion history of brand check, and various efforts on this area. The recent related proposal is "brand check for private fields". In the discussion of that proposal, the author of https://github.com/tc39/proposal-private-fields-in-in/issues/13 propose an alternative design direction. Instead of duck-type style checking (`#field in obj`), we could provide a much general class brand check (`class.hasInstance(obj)`), a "real" `instanceof` check. In many cases it is much closer to programmer's intension and give a much similar concept model to other class-based OOP programming languages.


```js
class C {
  isC(o) {
    return o instanceof C
  }
}
```

`instanceof` is prototype-based by default, so `C.isC(Object.create(C.prototype))` would pass the test. Note, there are many programmers still use `instanceof`, especiallly those from other OOP languages. Even they know the limitation of `instanceof` and there is `Symbol.hasInstance` which could be used to "customize" `instanceof`, people just ignore them because there is no easy way to "fix" it.

```js
class C {
  #x
  isC(o) {
    return #x in o
  }
}
```

As private-in proposal, people can utilize private field and private in syntax to do brand check, but it's just abusing of private fields. People need to add a private field even they don't really want it. And unfortunately, private field have a significant semantic differences to normal data properaty, so introducing of private field would introduce a breaking change, and potentially decrease the interoperability of the code with many libraries/frameworks. 

Even you already use private fields for good reasons, this also cause the problem: 

```js
class C {
  #x
  #y // add a new field
  isC(o) {
    return #x in o // do we need to update it to
    // return #x in o && #y in o
  }
}
```

Should the programmer update the implementation of `isC`? If you consider `#x in o` as a similar thing as duck type check, you should add `&& #y in o`, but in almost all cases, this code is reduantant. But, in some edge cases (the initialzier of `#y` throw, as current private fields draft, u get an object with `#x` but no `#y`) u need to consider again. This cause confusion and unessarry burden to coders and code reviewers.

The essential problem is, in most cases, what people want is a general "instanceof" test, testing fields existence one by one can't really convery the intention of the programmers.

A better solution:

```js
class C {
  isC(o) {
    return class.hasInstance(o) // class.hasInstance is a meta method to check whether o have the class brand of C
  }
}
```

Actually it also allow programmers use `Symbol.hasInstance` to "fix" `instanceof` if they will:

```js
class C {
  [Symbol.hasInstance](o) {
    return class.hasInstance(o) // class.hasInstance is a meta method to check whether o have the class brand of C
  }
}
```

## Do we need both private-in and class brand check?

TBD

### Analysis of edge cases of using private-in VS using class brand check

TBD

## Syntax and naming issue

`class.hasInstance` meta syntax conflict with [class property access expression](https://github.com/tc39/proposal-class-access-expressions) proposal, there is already an [issue](https://github.com/tc39/proposal-class-access-expressions/issues/14) for it. If we decide to leave `class.foo` for class properties, we need to find some other syntax, for example `class::hasInstance`.

About naming, I choose `.hasInstance` which follow `Symbol.hasInstance`, though there could always be other choices: `.hasBrand` or `.checkBrand`.

