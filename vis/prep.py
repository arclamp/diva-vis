import json
import sys


def good(row):
    return row['Project'] == 'DIVA' and all(row[k] is not None for k in row)


def prep(stream):
    return filter(good, json.loads(stream.read()))


if __name__ == '__main__':
    data = prep(sys.stdin)
    print json.dumps(data, indent=2)
