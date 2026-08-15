from pathlib import Path

path = Path('.github/fix-long-fixtures-0.1.7.py')
text = path.read_text()
start = text.index('old_adjacent =')
end = text.index('marker = ', start)
replacement = r"""adjacent_anchor = tests.find('2.718+7.389+20.086')
if adjacent_anchor < 0:
    raise SystemExit('adjacent-display test case anchor not found')
without_merge = tests.find('    const withoutMerge =', adjacent_anchor)
if without_merge < 0:
    raise SystemExit('adjacent-display withoutMerge anchor not found')
assert_start = tests.rfind('    assert.equal(out, `$$', 0, without_merge)
assert_end = tests.find('$$`);', assert_start)
if assert_start < 0 or assert_end < 0:
    raise SystemExit('adjacent-display assertion boundaries not found')
assert_end += len('$$`);')
new_adjacent = r'''    assert.equal(out, `$$
\\begin{gathered}
=\\log(2.718+7.389+20.086)
\\\\
=\\log(30.193)
\\approx3.4076.
\\end{gathered}
$$`);'''
tests = tests[:assert_start] + new_adjacent + tests[assert_end:]

"""
path.write_text(text[:start] + replacement + text[end:])
