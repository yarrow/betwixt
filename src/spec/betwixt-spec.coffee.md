# Betwixt Jasmine Specs

Here are the specs, using Jasmine and Jasmine-Given, very lightly commented

    path = require "path"
    Betwixt = require path.join "..", "betwixt"
    require "jasmine-given"

One quirk of Jasmine-Given is that when a test expression fails, it tries
execute its subexpressions in order to produce an informative error message.
That's great, but it means that the subexpressions need to be defined in
Jasmine-Given's context, which is different from the original context. For
instance, since Jasmine-Given hasn't required Betwixt, the result of
Betwixt.foo(...) is `[Error: ReferenceError: Betwixt is not defined]`.
Jasmine-Given *can* find instance variables, however, so the `Given -> @Betwixt
= Betwixt` below fixes the problem.

tl;dr — Everything not defined globally independent of the test code needs to
be an instance variable.

    describe "Betwixt", ->
      Given -> @Betwixt = Betwixt
      Given -> @zero = "\u0000"     # for use by Then ->
      zero = "\u0000"               # for use by expect()

Creation and description methods
--------------------------------

      describe "trim", ->
        it "should trim trailing zeros", ->
          expect(Betwixt.trim "\uaaaa\u0000").toEqual("\uaaaa")
          expect(Betwixt.trim "\u0000").toEqual("")

      describe "validated", ->
        nonempty = "\uaaaa\u0000"
        it "should return the same value as trim for nonempty strings", ->
          expect(Betwixt.validated nonempty).toEqual Betwixt.trim nonempty
        it "should throw an error if its parameter is zero/empty", ->
          expect(-> Betwixt.validated zero).toThrowError(Error)
          expect(-> Betwixt.validated "").toThrowError(Error)

      describe "midpoint", ->
        Given -> @m = @Betwixt.midpoint()
        Then -> @m == "\u8000"

      describe "toHex", ->
        Then -> @Betwixt.toHex("\uBEAD\ucafe") == "beadcafe"

The before and after methods
----------------------------

      describe "before and after", ->
        Given -> @start = "\u1234"
        Given -> @extra = "\ufade\ucafe"
        Given -> @ffff = "\uffff"

        describe "They trim their arguments", ->
          Then -> @Betwixt.before(@start+@zero) == @Betwixt.before(@start)
          Then -> @Betwixt.before(@ffff+@zero) == @Betwixt.before(@ffff)
          Then -> @Betwixt.after(@ffff+@zero) == @Betwixt.after(@ffff)
          Then -> @Betwixt.after(@zero) == @Betwixt.after("")

        describe "before", ->
          Given -> @decrement = "\u1233"
          it "should throw an error if its parameter is zero/empty", ->
            expect(-> Betwixt.before zero).toThrowError(Error)
            expect(-> Betwixt.before "").toThrowError(Error)
          describe "before treats the first non-zero character code as an
              integer and decrements it", ->
            Then -> @Betwixt.before(@start) == @decrement
            Then -> @Betwixt.before(@zero+@start) == @zero+@decrement
          describe "before throws away anything after the decremented
              character", ->
            Then -> @Betwixt.before(@start+@extra) == @decrement
            Then -> @Betwixt.before(@zero+@start+@extra) == @zero+@decrement
          describe "if the decrement of the character is @zero, then before
              appends @Betwixt.midpoint() to the string", ->
            Then -> @Betwixt.before("\u0001") == @zero+@Betwixt.midpoint()
            Then -> @Betwixt.before(@zero+"\u0001") ==
                      @zero+@zero+@Betwixt.midpoint()

        describe "after", ->
          Given -> @increment = "\u1235"
          describe "before treats the first non-0xffff character code as an
              integer and decrements it", ->
            Then -> @Betwixt.after(@start) == @increment
            Then -> @Betwixt.after(@ffff+@start) == @ffff+@increment
          describe "after throws away anything after the incremented
              character", ->
            Then -> @Betwixt.after(@start+@extra) == @increment
            Then -> @Betwixt.after(@ffff+@start+@extra) == @ffff+@increment
          describe "When the entire string consists of 0xffff characters, after
              appends a 0x8000 character to the string", ->
            Then  -> @Betwixt.after(@ffff+@ffff) == @ffff+@ffff+"\u8000"

The between method
------------------

      describe "between()", ->
        Given -> @a = "\u2001"
        Given -> @b = "\u2002"
        Given -> @c = "\u2003"

**The easy parts**

        describe "between trims its arguments", ->
          Then -> @Betwixt.between(@zero, @zero+@zero) == ""
        describe "Betwixt.between(x,x) returns x", ->
          Then -> @Betwixt.between(@a,@a) == @a
        describe "when possible, the fractions are averaged", ->
          Then -> @Betwixt.between(@a,@c) == @b
          Then -> @a < @Betwixt.between(@a, @c) < @c
        describe "the order of operands doesn't matter", ->
          Then -> @Betwixt.between(@b, @a) == @Betwixt.between(@a, @b)
          Then -> @Betwixt.between(@c, @a) == @Betwixt.between(@a, @c)
        describe "slightly less easy parts", ->
          Given -> @aa = @a+"\u3333"
          Given -> @cc = @c+"\uffff"
          describe "If the two characters that first differ can be averaged,
              anything after them is ignored", ->
            Then -> @Betwixt.between(@aa, @cc) == @b
          describe "Strings with leading identical characters do the work
              after the leading characters", ->
            Given -> @prefix = "\uaaaa\ubbbb\ucccc"
            Then -> @Betwixt.between(@prefix+@aa, @prefix+@cc) ==
                      @prefix+@Betwixt.between(@aa, @cc)

**The hard parts**

        describe "When the strings are the same length and their last characters
            differ only by one, the result is the prefix of the lesser string,
            extended by Betwixt.midpoint()", ->
          Then -> @Betwixt.between(@a, @b) == "\u2001\u8000"
          Then -> @a < @Betwixt.between(@a, @b) < @b
        describe "When the first differing characters differ only by one, and
            the greater string t has more characters, the result is the prefix
            of t up to and including the first differing character", ->
          Given -> @lo = "\uaaaa\u1234"
          Given -> @hi = "\uaaaa\u1235\ubbb0"
          Then  -> @Betwixt.between(@hi, @lo) == "\uaaaa\u1235"
        describe "When the lesser string s has more characters than the greater,
            consider the first differing character c, and the next character d.
            The between method returns the prefix of s up to and including c,
            concatenated with a character midway between d and 2**16.", ->
          Given -> @lo = "\uaaaa\u1234\ubbbb\u9999"
          Given -> @hi = "\uaaaa\u1235"
          Then  -> @Betwixt.between(@lo, @hi) == "\uaaaa\u1234\udddd"
        describe "But if character d is 0xffff (2**16-1), then we can't find a
            character between it and 2**16. So we need to extend our prefix to
            include c and the longest sequence of 0xffff characters immediately
            following c. Then d is the character after all of those.", ->
          Given -> @lo = "\uaaaa\u1234\uffff\uffff\ubbbb\u9999"
          Given -> @hi = "\uaaaa\u1235"
          Then  -> @Betwixt.between(@lo, @hi) ==
                      "\uaaaa\u1234\uffff\uffff\udddd"
        describe "Furthermore, if *every* character after c is 0xffff, then
            we append 0x8000 to s itself.", ->
          Given -> @lo = "\uaaaa\u1234\uffff\uffff"
          Given -> @hi = "\uaaaa\u1235"
          Then  -> @Betwixt.between(@hi, @lo) ==
                      "\uaaaa\u1234\uffff\uffff\u8000"
        describe "If s is a prefix of t, then between acts as if s were
            extended by a ZERO character.", ->
          Given -> @lo = "\uaaaa"
          Given -> @hi = "\uaaaa\u8000" 
          Given -> @just_higher = "\uaaaa\u0001"
          Then  -> @Betwixt.between(@lo, @hi) == "\uaaaa\u4000"
          Then  -> @Betwixt.between(@lo, @just_higher) == "\uaaaa\u0000\u8000"
