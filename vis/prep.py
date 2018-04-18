# -*- coding: utf-8 -*-

import json
import sys


def good(row):
    return row['Project'] == 'DIVA' and all(row[k] is not None for k in row)


names = {
    'Aimee': 'Aimee Nuñez',
    'Caroline': 'Caroline LaFleche',
    'Lauren': 'Lauren MacPherson',
    'MAryann Olstad': 'Maryann Olstad',
    'Matt': 'Matt Burnham'
}


def repair(row):
    for field in ['Annotator', 'Auditor']:
        row[field] = names.get(row[field], row[field])

    return row


def prep(stream):
    return map(repair, filter(good, json.loads(stream.read())))


if __name__ == '__main__':
    data = prep(sys.stdin)
    print json.dumps(data, indent=2)
