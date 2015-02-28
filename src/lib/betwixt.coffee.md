## Betwixt

Betwixt implements what mathematicians call a *dense linear order* — a datatype
where `a < c` has the usual properties, and furthermore, given `a` and `c`
where `a < c`, there is always a `b` such that `a < b < c`.

Why would we want such a thing? Well, suppose we have a list of items, each
corresponding to a record in a database, where the items (or a subset of them),
form a list that can be re-ordered in an arbitrary fashion by the user (via a
web page, for instance).  The straightforward way to do this is to provide each
record with an index or weight field, and order the list by sorting on that
field.  But if we use integers, we run into trouble.

When I searched (on 2015-01-19) for database list order, [the](http://stackoverflow.com/questions/330482/best-way-to-save-a-ordered-list-to-the-database-while-keeping-the-ordering) [first](http://stackoverflow.com/questions/498778/how-to-save-a-particular-mutable-order-into-a-database) [five](http://stackoverflow.com/questions/9536262/best-representation-of-an-ordered-list-in-a-database) [Google](http://dba.stackexchange.com/questions/5683/how-to-design-a-database-for-storing-a-sorted-list) [links](http://programmers.stackexchange.com/questions/195308/storing-a-re-orderable-list-in-a-database) were to questions on Stack Exchange
and related sites about how to store a user-specified order in a database,
where the items ordered were elements of, say, an online shopping cart,
purchase order, to-do list, or similar.

The usual answer is to store an integer with each record which records its slot
in the list. A 204-record vegetable list might look like this:

* `[0, "rice"]`
* `[1, "cabbage"]`
* `[2, "mushrooms"]`
* `...`
* `[202, "leeks"]`
* `[203, "rutabagas"]`

Moving an item up or down one slot — moving the rice item, say, so that it
comes between cabbage and mushrooms — is straightforward. We simply swap the
indices for rice and cabbage, so our database now has

* `[0, "cabbage"]`
* `[1, "rice"]`
* `...`

The cost is just two database writes, one for rice and one for cabbage.

On the other hand, if we wanted to move the *leeks* item between cabbage and
mushrooms, we'd have to rewrite the 201 records from mushrooms to leeks. Not so
attractive.  The secondary advice is then to leave space between the integers —
if cabbage had an index of 8, say, and mushrooms an index of 16, then we could
have set the new index of leeks to 12.  To add onions (say) between cabbage
and leeks we'd set its index to 10, and to add garlic between cabbage and
onions we'd set its index to 9:

* `...`
* `[ 8, "cabbage"]`
* `[ 9, "garlic"]`
* `[10, "onions"]`
* `[12, "leeks"]`
* `[16, "mushrooms]`
* `...`

Then to add something between cabbage and garlic requires us to renumber either
cabbage (if it has not acquired an immediate predecessor in the meanwhile), or
garlic and onions.

But a dense linear order never requires renumbering: to insert a new item in
the list we just create an index greater than the first item's index and less
than the second item's index.

But can we implement a dense linear order? Floating point numbers are an
approximation of the real numbers, perhaps the most famous example of a
dense linear order; but because floating point numbers have limited precision,
it's perfectly possible to have a floating point `a < c` with no intermediate
`b`. For the JavaScript Number type (64-bit IEEE floating point), you can run
into this rather quickly: start with a two-item list, and keep inserting an
item immediately after the first item. In about 51 steps, you'll get two
list items with the same rank.

The rationals are almost as famous, and unlimited precision implementations of
rationals exist Javascript (and many other languages).  We could use such a
package for our dense linear order. But that requires us to depend on a package
that's full of complicated features we won't use. Much simpler to use strings
as keys -- but strings aren't dense:  Say we're using strings over the
character set "0" and "1".  Then there is no string that's greater than "0"
and less than "00". What we want is a situation where every string is padded
to infinity with "0" characters (in which case "0" and "00" and "000" and so
on are all equal) — or equivalently, where we remove trailing "0" characters.
Then, between "0" and "1" is "01"; between "0" and "01" is "001" and between
"01" and "1" is "011".

## Binary Fractions

We've just re-invented binary fractions! As fractions, .0 = .00 = .000,
and .0 < .001 < .01 < .011 < .1.

### Not a panacea

Using a dense linear order is not a panacea: as we go (say) from .1 (one half
written as a binary fraction) to .01 (one quarter) .001 (one eighth) to .0001
(one sixteenth), we're using an additional bit of space for each item. And such
a sequence is quite possible. For instance, we might start with two items, the
first with a rank some very small epsilon and the second with a rank of .1, and
continually insert an item immediately after the first item.  The rank of the
second item will initially be .1, then become .01, then .001, then .0001, and
so forth. So the minimum number of bits needed to represent the rank of the
second item will be N-1, where N is the number of items inserted. After a
million items have been inserted, the second-item rank will require 125,000
bytes to represent it.  (And there need not be a million items in the database!
If we start with two items, insert a new item between the first two, and delete
what is now the third item, and do that a million times, we'll have a two-item
database one of whose items has an enormous index field.)

Things will probably not be that bad in practice. In particular, the `before`
and `after` methods optimize the common cases where an item is inserted at the
beginning or end of a list.  Still, as a practical matter, this binary-fraction
implementation of a dense linear order should be restricted to lists with an
expected maximum item count in the tens of thousands or less, and a similar
expected maximum number of insertions or re-orderings.

### Making Betwixt strings

Given that Javascript's native character set is UCS-2, we're actually going to
be doing base-65536 fractions, with digits from `0` to `0xffff`. But the
concepts are the same.

    BASE = 2**16
    MAX_CODE = BASE-1 # 0xffff
    ZERO = "\u0000"
    NONZERO = /[^\u0000]/
    TRAILING_ZEROS = /\u0000+$/ 

Betwixt implements three main operations on strings — `Betwixt.before(s)`
returns a string less than `s`, `Betwixt.after(s)` returns a string greater
than `s`, and `Betwixt.between(s,t)` returns a string greater than `s` and less
than `t`.

### trim

Those operations work with zero-trimmed strings — those without trailing
`ZERO` characters. This is required so that our linear order is actually
dense.

    trim = (s) -> s.replace(TRAILING_ZEROS, "")

### validated

Since we want always to be able to add items at the beginning or end of a list,
we actually want not just a dense linear order, but a dense linear order
*without endpoints* — that is, with no greatest or least element. Now there is
no greatest binary (or 65536ary) fraction — we have no way to represent 1 (or
any greater number) as a string.  But the empty string represents 0, which is
less than any other string-representable fraction: if it ever showed up as the
rank of a list item, there would be no way to add any items before it.

Our `before`, `after`, and `between` won't return empty strings (except for the
call `between('','')`). But if a Betwixt user accepts a rank string from the
wild, it will be useful first to `trim` it and secondly to throw an error if
the trimmed string is empty.

    DIE_ZERO_DIE = new Error "Rank strings must be non-zero (non-empty)"
    validated = (s) -> trim(s) or throw DIE_ZERO_DIE

We use `trim` internally, since the only `before` will actually choke on
the empty string as input.

### MIDPOINT

`MIDPOINT` is the midpoint of Betwixt's value range. (A string with only the
high bit set, so one-half when considered as a binary fraction.)

    MIDPOINT = "\u8000"

### appendAt

In the following we'll often want to return a prefix of a string, plus the
increment or decrement of the string's next character. The `appendAt` function
helps with that: an expression like `appendAt(s, j, N)` returns a Betwixt
string calculated from the `j`-length prefix of `s`, with a single character
appended, whose character code is `N`. Used internally; not exported.

    appendAt = (s, j, N) -> s.substr(0, j) + String.fromCharCode(N)

### between

The workhorse method is `between`: `Betwixt.between(a,c)` returns a Betwixt
string between `a` and `c`.

    between = (a, c) ->
      a = trim(a); c = trim(c)   # Ensure canonical form
      return a if a == c
      [a, c] = [c, a] if c < a

At this point we know that `a < c`, and neither has trailing `ZERO` characters.
We find the first `j` such that `lo` (`a.charAt(j)`) differs from (and indeed
is less than) `hi` (`c.charAt(j)`).

      L = a.length
      j = 0
      j++ while j < L and a.charAt(j) == c.charAt(j)
      lo = a.charCodeAt(j)
      hi = c.charCodeAt(j)

Usually there will be some air between `hi` and `lo` -- `hi` will not be `lo`'s
immediate successor. In that case we'll have `lo < mid` and can return at once.

      mid = (hi+lo)//2
      if lo < mid
        return appendAt(a, j, mid)

Let's take stock of what we know when things are more difficult. Even if `mid
== lo`, we know that `a < c`, and since `j` is the first point at
which they differ, we know that `a.substr(0, j+1)` is less than the
equivalent substring of `c`.

After adjusting `j` to point to the first character after the difference:

      j++

we can say that `a < c.substr(0, j)`.  If `c`'s length is greater than `j`,
then we also know that `c.substr(0, j) < c`.  So in fact `c.substr(0, j)` is
between `a` and `c`, and we can return it as our new Betwixt string.

      if j < c.length
        return c.substr(0, j)

On the other hand, if `j == c.length`, we find the first character of
`a` that's less than `MAX_CODE`, and take the midpoint between it and `BASE`.
(The character might be a virtual `ZERO`, if all remaining actual characters
of `a` are `MAX_CODE`.)

      j++ while j < L and a.charCodeAt(j) == MAX_CODE
      lo = if j == L then 0 else a.charCodeAt(j)
      return appendAt(a, j, (BASE+lo)//2)
      return

### before

Our implementation of binary fractions has a representation of zero (the empty
string), but no way to represent a number less than zero. So
`Betwixt.before("")` throws an error.

    before = (s) ->
      s = validated(s) # Reduce s to canonical form, throw error if empty

If `s` represents a positive fraction, we could return `Betwixt.between("",s)`.
But in the case where most additions to a list occur at the beginning or end
rather than in the middle, we'd be wasting space: the binary representation of
`Betwixt.between(s,t)` takes on average one more bit than the binary
representation of `s` or `t`. So adding 1000 items to the beginning of a list
would result in the last item's rank taking 125 bytes.

Instead, `before` finds the first non-zero character `c` of `s` (which must
exist because `s` is trimmed and non-empty). It returns the substring of `s` up
to but not including `c`, followed by `c` decremented by 1. That way, if we
start with a one-item list whose rank is `MIDPOINT` (`\u8000`) and add an
additional 999 items, each at the beginning, all items will have a rank that
can be represented by a single JavaScript character (in the range `\u7c19` to
`MIDPOINT`).

      j = s.search(NONZERO)
      decrement = s.charCodeAt(j)-1
      result = appendAt(s, j, decrement)
      
But we can't return `result` quite yet — what if the first non-zero character
of `s` is `\u0001`? Then the last character of `result` would be `ZERO` —
`result` wouldn't be a Betwixt string. In that case we need to append an
additional non-zero character to `result` — `MIDPOINT` being a reasonable
choice.

      result += MIDPOINT if decrement == 0
      return result

### after

Adding an item at the end of the list is similar, but we look for characters we
can increment -- i.e., any but `MAX_CODE`.  But while our invariant guarantees
that a Betwixt string ends with at least one nonzero character, it is perfectly
possible to have a string which ends with a sequence of `MAX_CODE` characters.
In that case we append `MIDPOINT`.

    after = (s) ->
      s = trim(s)
      j = s.search(/[^\uffff]/)
      if j == -1
        return s + MIDPOINT
      else
        return appendAt(s, j, s.charCodeAt(j)+1)

### toHex

The `toHex` method returns the hexadecimal representation of our string. To
avoid dependencies, we roll our own converter rather than requiring any of the
many Node modules that would make this a one-liner.

    chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
             "a", "b", "c", "d", "e", "f"]
    hex4 = (n) ->
      h4 = []
      for j in [1..4]
        mod = n % 16
        h4.unshift chars[mod]
        n = (n - mod) / 16
      h4.join ""

    toHex = (s) ->
      hex = [];
      j = 0;
      while j < s.length
        hex.push hex4 s.charCodeAt(j++)
      return (hex.join "")

### Exports

    module.exports = {
      trim, before, after, between, validated, toHex
      midpoint: -> MIDPOINT
    }
