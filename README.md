# Betwixt

`Betwixt` implements three operations on (a subset of) JavaScript strings:

* `Betwixt.before(s)` returns a string less than `s`
* `Betwixt.after(s)` returns a string greater than `s`
* `Betwixt.between(s,t)` returns
    - a string greater than `s` and less than `t` if `s < t`,
    - a string greater than `t` and less than `s` if `t < s`, and
    - `s` if `s` and `t` are equal.

(We say a *subset* of JavaScript strings because Betwixt strings are nonempty
and have no trailing null (`\u0000`) characters.)

The use case is this: suppose we have a reorderable list — an ordered list
where the order can be manually changed by the user. Furthermore, each list
item is an independent database record. We want to be able to change the
position of an item by changing its order field, without changing any other
records in the database (as well as to add an item to the beginning or end of
the list, or between any two items in the list).

If we could order the list using real numbers we could do this easily.  For
instance, suppose the list is sorted by a field called `order`, and there are
two records `a` and `z` with `a.order < z.order`.  If we have a fresh record
call `new`, we can put it at the start of the list by setting `new.order =
a.order-1`. We can put it at the end of the list by setting `new.order =
z.order+1`. And we can put it between `a` and `z` by setting `new.order =
(a.order+z.order)/2`. If we have a list with elements `a`, `b`, and `c` in that
order, we can move `c` between `a` and `b` by changing `c.order` to
`(a.order+b.order)/2`.

Unfortunately, we can't get our hands on actual real numbers, and JavaScript's
Number type (IEEE 64-bit floating point) can run out of precision relatively
quickly: Suppose `a.order` is 1 and `b.order` is 2, and we insert `new1`
between `a` and `z`, `new2` between `a` and `new1`, `new3` between `a` and
`new2`, and so forth, using the method of averaging given above. By the time we
get to `new53`, floating point precision limitations will cause `new53.order`
to be 1 — the same as `a.order`. We'll no longer be able to guarantee that our
list is ordered as the user wishes.

But we don't need actual real numbers -- we need what mathematicians call a
*dense linear order* (without endpoints). `Betwixt` implements that — see the
annotated [CoffeeScript source](src/lib/betwixt.coffee.md) for information
about how it's done. The [specs](src/spec/betwixt-spec.coffee.md) may also be
informative.

## Other Methods

* `Betwixt.trim(s)` returns `s` with trailing null characters removed
* `Betwixt.validated(s)` is like `Betwixt.trim(s)`, but throws an error if the
  result would be the empty string
* `Betwixt.toHex(s)` returns a hexadecimal representation of `s`.
* `Betwixt.midpoint()` returns a string that's a good initial value for the
  rank of the item in a one-item list — representations of the values above
  and below the midpoint are equally space-efficient.

## Warning

One caveat: using Betwixt strings, we can do almost unlimited numbers of the
insertions described above; but if we do, say a million of them, then the
`new1000000.order` string will be something like 125,000 bytes long. Things
will probably not be that bad in practice, since changes and insertions are
likely to be more random in real-world applications. And Betwixt tries to
minimize string explosion where it can. In particular, the before and after
methods optimize the common cases where an item is inserted at the beginning or
end of a list.

## See also

Dominic Tarr's [between](https://www.npmjs.com/package/between) npm module
is very similar to Betwixt, though less space-efficient.
